import React, { useState, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { auth, db } from '../firebase';
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// Get current date in East Africa Time (UTC+3) — matches App.jsx
const getEATDate = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
};

// localStorage key for the offline queue
const QUEUE_KEY = 'mmps_duty_scan_queue';

const loadQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveQueue = (q) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // ignore storage errors (private mode, etc.)
  }
};

// Hard debounce only prevents the scanner library from firing the SAME QR
// multiple times per second while the badge is held up to the camera.
// The real 20-second business cooldown lives in App.jsx's handleScan — we
// deliberately let the call through so the server-side check can return
// a proper "cooldown" reason and we can show the exact remaining seconds.
const HARD_DEBOUNCE_MS = 2500;

/**
 * DutyTeacherScanner
 * ------------------
 * Context-aware scanning interface for the Teacher On Duty.
 *
 * Now shows the actual result of each scan:
 *   ✓ Arrival  (Present / Late)
 *   ✓ Departure (Departed)
 *   ⏱ Cooldown (please wait Ns before scanning again)
 *   🔒 Already Departed for today
 *   ❓ Unknown QR / empty scan
 *   ⚠️ Error
 */
export default function DutyTeacherScanner({
  onScan,      // (parsedQR, rawValue) => Promise<{ ok, action, name, status, time, reason, remaining }>
  onLogout,
}) {
  const [authState, setAuthState] = useState('checking');
  const [profile, setProfile] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanLog, setScanLog] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTone, setStatusTone] = useState('info'); // info | success | departed | warning | error
  const [scanCount, setScanCount] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const lastScanTimeRef = useRef({});
  const onScanRef = useRef(onScan);

  // Keep the latest onScan in a ref so the flush effect doesn't need to re-bind
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // ---------- 1. Auth + Role Verification ----------
  useEffect(() => {
    const verifyRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setAuthState('denied');
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          if (data.role === 'scanner_agent') {
            setAuthState('authorized');
          } else {
            setAuthState('denied');
          }
        } else {
          setAuthState('denied');
        }
      } catch (err) {
        console.error('Role verification error:', err);
        setAuthState('denied');
      }
    };
    verifyRole();
  }, []);

  // ---------- 2. Load today's arrivals from Firestore on mount ----------
  const reloadTodayScans = async () => {
    setLoadingLogs(true);
    try {
      const today = getEATDate();
      const q = query(
        collection(db, 'attendance'),
        where('date', '==', today)
      );
      const snap = await getDocs(q);
      const records = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || 'Unknown',
          category: data.category || 'Unknown',
          time: data.arrivalTime || '--',
          status: data.morningStatus || 'Present',
          timestamp: data.timestamp || '',
        };
      });

      records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setScanLog(records.slice(0, 5));
      setScanCount(records.length);
    } catch (err) {
      console.error('Failed to load today scans:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (authState !== 'authorized') return;
    reloadTodayScans();
    setPendingCount(loadQueue().length);
  }, [authState]);

  // ---------- 3. Online / Offline tracking + auto-flush ----------
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (authState !== 'authorized') return;
    if (!isOnline) return;

    const flushQueue = async () => {
      const q = loadQueue();
      if (q.length === 0) return;
      if (typeof onScanRef.current !== 'function') return;

      const remaining = [];
      let synced = 0;

      for (const item of q) {
        try {
          await onScanRef.current(item.parsed, item.rawValue);
          synced++;
        } catch (err) {
          console.error('Failed to sync queued scan:', err);
          remaining.push(item);
        }
      }

      saveQueue(remaining);
      setPendingCount(remaining.length);

      if (synced > 0) {
        setStatusMessage(`✓ Synced ${synced} queued scan${synced > 1 ? 's' : ''} from offline.`);
        setStatusTone('success');
        reloadTodayScans();
      }
    };

    flushQueue();
  }, [authState, isOnline]);

  // ---------- 4. Interpret the structured reply from App.jsx ----------
  const interpretScanReply = (reply, parsed, now) => {
    const displayName = parsed?.name || reply?.name || 'Scan';

    // No structured reply — assume success
    if (!reply || typeof reply !== 'object') {
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setStatusMessage(`✓ ${displayName} scanned at ${timeString}`);
      setStatusTone('success');
      setScanLog((prev) => [{
        id: `local-${now}`,
        name: displayName,
        category: parsed?.type || '',
        time: timeString,
        status: 'Scanned',
      }, ...prev].slice(0, 5));
      setScanCount((c) => c + 1);
      return;
    }

    if (reply.ok === true) {
      const isArrival = reply.action === 'arrival';
      const label = isArrival
        ? (reply.status === 'Late' ? 'Late Arrival' : 'Present')
        : 'Departed';
      setStatusMessage(`✓ ${reply.name || displayName} — ${label} at ${reply.time}`);
      setStatusTone(isArrival ? 'success' : 'departed');
      setScanLog((prev) => [{
        id: `local-${now}`,
        name: reply.name || displayName,
        category: reply.category || parsed?.type || '',
        time: reply.time || '--',
        status: label,
      }, ...prev].slice(0, 5));
      setScanCount((c) => c + 1);
      return;
    }

    switch (reply.reason) {
      case 'cooldown': {
        const secs = reply.remaining || 20;
        setStatusMessage(`⏱ ${reply.name || displayName} — please wait ${secs}s before scanning again`);
        setStatusTone('warning');
        return;
      }
      case 'already_departed': {
        setStatusMessage(`🔒 ${reply.name || displayName} — Already Departed for today`);
        setStatusTone('error');
        setScanLog((prev) => [{
          id: `local-${now}`,
          name: reply.name || displayName,
          category: parsed?.type || '',
          time: reply.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Already Departed',
        }, ...prev].slice(0, 5));
        return;
      }
      case 'unknown_qr': {
        setStatusMessage(`❓ QR not recognized — ${reply.name || displayName} is not in the system`);
        setStatusTone('error');
        return;
      }
      case 'empty': {
        setStatusMessage(`❓ Empty scan — please try again`);
        setStatusTone('warning');
        return;
      }
      case 'error': {
        setStatusMessage(`⚠️ Scan error: ${reply.message || 'unknown error'}`);
        setStatusTone('error');
        return;
      }
      default: {
        setStatusMessage(`⚠️ ${displayName} — scan could not be processed`);
        setStatusTone('warning');
        return;
      }
    }
  };

  // ---------- 5. Scan Handler ----------
  const handleScan = async (result) => {
    if (!result || !result[0]?.rawValue) return;
    const rawValue = result[0].rawValue;

    // Hard debounce — the same QR held to the camera shouldn't fire repeatedly
    const now = Date.now();
    const last = lastScanTimeRef.current[rawValue];
    if (last && now - last < HARD_DEBOUNCE_MS) return;
    lastScanTimeRef.current[rawValue] = now;

    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      parsed = { name: rawValue, type: 'Unknown' };
    }

    const displayName = parsed?.name || rawValue;

    // Immediate processing feedback
    setStatusMessage(`⏳ Processing ${displayName}…`);
    setStatusTone('info');

    // Offline — queue and inform
    if (!navigator.onLine) {
      const q = loadQueue();
      q.push({ parsed, rawValue, timestamp: new Date().toISOString() });
      saveQueue(q);
      setPendingCount(q.length);
      setStatusMessage(`📴 Offline — ${displayName} queued for sync`);
      setStatusTone('warning');
      return;
    }

    // No parent handler — fallback log
    if (typeof onScanRef.current !== 'function') {
      try {
        const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await addDoc(collection(db, 'dutyScans'), {
          agentUid: auth.currentUser?.uid || null,
          agentName: profile?.name || 'Teacher On Duty',
          name: displayName,
          category: parsed?.type || 'Unknown',
          timestamp: new Date().toISOString(),
          time: timeString,
        });
        setStatusMessage(`✓ ${displayName} scanned at ${timeString}`);
        setStatusTone('success');
      } catch (err) {
        console.error(err);
        setStatusMessage(`⚠️ Could not log ${displayName}`);
        setStatusTone('error');
      }
      return;
    }

    // Let App.jsx process it and return a structured reply
    let reply;
    try {
      reply = await onScanRef.current(parsed, rawValue);
    } catch (err) {
      console.error('onScan error — queueing:', err);
      const q = loadQueue();
      q.push({ parsed, rawValue, timestamp: new Date().toISOString() });
      saveQueue(q);
      setPendingCount(q.length);
      setStatusMessage(`⚠️ Connection issue — ${displayName} queued for retry`);
      setStatusTone('warning');
      return;
    }

    interpretScanReply(reply, parsed, now);
  };

  const handleLogout = async () => {
    setCameraOn(false);
    try {
      await signOut(auth);
      if (typeof onLogout === 'function') onLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toggleCamera = () => {
    setCameraOn((v) => {
      const next = !v;
      setStatusMessage(next ? '📷 Camera ready — point at a QR badge.' : 'Camera paused.');
      setStatusTone('info');
      return next;
    });
  };

  // ---------- Tones ----------
  const toneStyles = {
    info:     { bg: '#e0f2fe', color: '#075985', border: '#7dd3fc' },
    success:  { bg: '#dcfce7', color: '#166534', border: '#86efac' },
    departed: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
    warning:  { bg: '#fef9c3', color: '#854d0e', border: '#fde68a' },
    error:    { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' },
  };

  const statusPillStyle = (status) => {
    if (status === 'Late' || status === 'Late Arrival') {
      return { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' };
    }
    if (status === 'Departed') {
      return { background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd' };
    }
    if (status === 'Already Departed') {
      return { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
    }
    if (status === 'Present' || status === 'Scanned') {
      return { background: '#dcfce7', color: '#166534', border: '1px solid #86efac' };
    }
    return { background: '#f1f5f9', color: '#4b5563', border: '1px solid #d1d5db' };
  };

  // ---------- UI: Checking ----------
  if (authState === 'checking') {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.spinnerCard}>
          <div style={styles.loadingDot} />
          <p style={styles.loadingText}>Verifying Teacher On Duty credentials…</p>
        </div>
      </div>
    );
  }

  // ---------- UI: Access Denied ----------
  if (authState === 'denied') {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.deniedCard}>
          <h2 style={styles.deniedTitle}>⛔ Access Denied</h2>
          <p style={styles.deniedText}>
            Your account does not have the <strong>scanner_agent</strong> role.
            Please contact the administrator to be assigned Teacher On Duty permissions.
          </p>
          <button onClick={handleLogout} style={styles.dangerBtn}>Sign Out</button>
        </div>
      </div>
    );
  }

  // ---------- UI: Scanner Dashboard ----------
  return (
    <div style={styles.pageWrapper}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎓</span>
          <h1 style={styles.headerTitle}>Teacher On Duty</h1>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
      </div>

      {(!isOnline || pendingCount > 0) && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 800,
            textAlign: 'center',
            background: !isOnline ? '#fef9c3' : '#dbeafe',
            color: !isOnline ? '#854d0e' : '#1e40af',
            border: `1px solid ${!isOnline ? '#fde68a' : '#bfdbfe'}`,
          }}
        >
          {!isOnline
            ? `📴 Offline — scans will sync automatically when you're back online${pendingCount > 0 ? ` (${pendingCount} queued)` : ''}`
            : `⏳ Syncing ${pendingCount} queued scan${pendingCount > 1 ? 's' : ''}…`}
        </div>
      )}

      <div style={styles.strip}>
        <div style={styles.stripItem}>
          <span style={styles.stripLabel}>Scans Today</span>
          <span style={styles.stripValue}>{loadingLogs ? '…' : scanCount}</span>
        </div>
        <div style={styles.stripItem}>
          <span style={styles.stripLabel}>Camera</span>
          <span style={{ ...styles.stripValue, color: cameraOn ? '#16a34a' : '#dc2626' }}>
            {cameraOn ? '● LIVE' : '○ OFF'}
          </span>
        </div>
      </div>

      <div style={styles.toggleWrapper}>
        <button
          onClick={toggleCamera}
          style={{
            ...styles.toggleBtn,
            background: cameraOn ? '#7f1d1d' : '#991b1b',
          }}
        >
          {cameraOn ? '⏸ Pause Camera' : '▶ Start Camera'}
        </button>
        <p style={styles.toggleHint}>
          {cameraOn
            ? 'Camera is live. Tap "Pause" to power down the video stream when idle.'
            : 'Camera is off. Tap "Start" only when you are ready to scan.'}
        </p>
      </div>

      <div style={styles.scannerArea}>
        {cameraOn ? (
          <Scanner
            onScan={handleScan}
            onError={(err) => console.warn('Scanner error:', err)}
            styles={{ container: { width: '100%', height: '100%' } }}
          />
        ) : (
          <div style={styles.scannerOff}>
            <span style={{ fontSize: 48, opacity: 0.4 }}>📷</span>
            <p style={{ color: '#9ca3af', fontWeight: 700, marginTop: 8, fontSize: 13 }}>
              Camera is off
            </p>
          </div>
        )}
      </div>

      {statusMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            textAlign: 'center',
            background: toneStyles[statusTone]?.bg || '#f3f4f6',
            color: toneStyles[statusTone]?.color || '#111827',
            border: `1px solid ${toneStyles[statusTone]?.border || '#d1d5db'}`,
          }}
        >
          {statusMessage}
        </div>
      )}

      <div style={styles.logPanel}>
        <h3 style={styles.logTitle}>Recent Scans</h3>
        {loadingLogs ? (
          <p style={styles.logEmpty}>Loading today's scans…</p>
        ) : scanLog.length === 0 ? (
          <p style={styles.logEmpty}>No scans yet.</p>
        ) : (
          scanLog.map((entry, idx) => (
            <div key={entry.id || idx} style={styles.logRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.logName}>{entry.name}</div>
                <div style={styles.logSub}>
                  {entry.category} • {entry.time}
                </div>
              </div>
              <span style={{ ...styles.logPill, ...statusPillStyle(entry.status) }}>
                {entry.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// Inline styles — kept local so the component is fully portable
// ============================================================
const styles = {
  centerScreen: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', background: '#cbd5e1', padding: 20, boxSizing: 'border-box',
  },
  spinnerCard: {
    background: '#faf9f7', padding: 30, borderRadius: 16, textAlign: 'center',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid #d1d5db',
  },
  loadingDot: {
    width: 40, height: 40, borderRadius: '50%', margin: '0 auto 14px auto',
    border: '4px solid #e5e7eb', borderTopColor: '#991b1b',
    animation: 'spin 1s linear infinite',
  },
  loadingText: { margin: 0, color: '#4b5563', fontWeight: 700 },
  deniedCard: {
    background: '#faf9f7', padding: 30, borderRadius: 16, maxWidth: 420,
    textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '2px solid #991b1b',
  },
  deniedTitle: { margin: '0 0 12px 0', color: '#991b1b', fontSize: 20, fontWeight: 900 },
  deniedText: { color: '#4b5563', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px 0' },
  dangerBtn: {
    padding: '12px 24px', background: '#991b1b', color: 'white', border: 'none',
    borderRadius: 10, fontWeight: 900, cursor: 'pointer', fontSize: 14,
  },
  pageWrapper: {
    minHeight: '100vh', background: '#cbd5e1', padding: 16, boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, sans-serif', color: '#111827',
    display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640, margin: '0 auto',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)',
    color: 'white', padding: '16px 18px', borderRadius: 14, gap: 10, flexWrap: 'wrap',
  },
  headerTitle: { margin: 0, fontSize: 16, fontWeight: 900 },
  logoutBtn: {
    padding: '8px 14px', background: 'rgba(255,255,255,0.15)', color: 'white',
    border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, fontWeight: 900,
    cursor: 'pointer', fontSize: 12,
  },
  strip: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
  },
  stripItem: {
    background: '#faf9f7', padding: '12px 10px', borderRadius: 12,
    border: '1px solid #d1d5db', textAlign: 'center',
  },
  stripLabel: { display: 'block', fontSize: 10, fontWeight: 900, color: '#4b5563', letterSpacing: 0.5 },
  stripValue: { display: 'block', fontSize: 16, fontWeight: 900, color: '#111827', marginTop: 2 },
  toggleWrapper: { display: 'flex', flexDirection: 'column', gap: 6 },
  toggleBtn: {
    padding: '16px', color: 'white', border: 'none', borderRadius: 14,
    fontWeight: 900, cursor: 'pointer', fontSize: 15, letterSpacing: 0.3,
    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  },
  toggleHint: { margin: 0, fontSize: 11, color: '#4b5563', fontWeight: 700, textAlign: 'center' },
  scannerArea: {
    width: '100%', aspectRatio: '1 / 1', background: '#0f172a',
    borderRadius: 16, overflow: 'hidden', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    border: '2px solid #991b1b', boxShadow: '0 6px 18px rgba(0,0,0,0.2)',
  },
  scannerOff: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', width: '100%', height: '100%', background: '#1f2937',
  },
  logPanel: {
    background: '#faf9f7', padding: 14, borderRadius: 12, border: '1px solid #d1d5db',
  },
  logTitle: { margin: '0 0 8px 0', fontSize: 13, fontWeight: 900, color: '#991b1b' },
  logEmpty: { margin: 0, fontSize: 12, color: '#4b5563', fontStyle: 'italic' },
  logRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid #e5e7eb', gap: 8,
  },
  logName: {
    fontWeight: 900, fontSize: 13, color: '#111827',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  logSub: { fontSize: 11, color: '#4b5563', fontWeight: 700, marginTop: 1 },
  logPill: {
    fontSize: 10, fontWeight: 900, padding: '3px 8px',
    borderRadius: 6, whiteSpace: 'nowrap',
  },
};