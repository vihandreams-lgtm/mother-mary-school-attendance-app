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

/**
 * DutyTeacherScanner
 * ------------------
 * A dedicated, battery-friendly attendance scanning interface for the
 * Teacher On Duty.
 *
 * Features:
 *  - Verifies role against Firestore on mount
 *  - Manual camera pause/resume toggle (unmounts the video stream when paused)
 *  - Loads today's scans from Firestore on mount so refresh keeps the count
 *  - SHARED scan count — shows ALL scans for the day (single shared account)
 *  - OFFLINE QUEUE — failed scans are stored locally and auto-synced when back online
 *  - Recent Scans shows only the most recent 5
 */
export default function DutyTeacherScanner({
  onScan,      // (parsedQR, rawValue) => Promise<void> — called to save a scan
  onLogout,    // called after sign-out
}) {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authorized' | 'denied'
  const [profile, setProfile] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanLog, setScanLog] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
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

  // ---------- 2. Load ALL of today's scans from Firestore on mount ----------
  // SHARED across all users of this account, so no per-user filter.
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

      // Newest first
      records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

      // Only keep the most recent 5 for display
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

  // Flush queued scans whenever we come back online or on mount
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
        // Refresh the log so the synced records show up properly
        reloadTodayScans();
      }
    };

    flushQueue();
  }, [authState, isOnline]);

  // ---------- 4. Scan Handler ----------
  const handleScan = async (result) => {
    if (!result || !result[0]?.rawValue) return;
    const rawValue = result[0].rawValue;

    // Cooldown per QR to avoid duplicate scans
    const now = Date.now();
    const last = lastScanTimeRef.current[rawValue];
    if (last && now - last < 15000) return;
    lastScanTimeRef.current[rawValue] = now;

    let parsed = null;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      parsed = { name: rawValue, type: 'Unknown' };
    }

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Add to the local display log immediately (most recent 5 only)
    const localEntry = {
      id: `local-${now}`,
      name: parsed?.name || rawValue,
      category: parsed?.type || 'Unknown',
      time: timeString,
      status: 'Present',
    };
    setScanLog((prev) => [localEntry, ...prev].slice(0, 5));
    setScanCount((c) => c + 1);

    // Try to save via the parent handler; on failure or offline, queue it
    const queueItem = { parsed, rawValue, timestamp: new Date().toISOString() };

    if (typeof onScanRef.current === 'function') {
      if (!navigator.onLine) {
        // Offline → queue
        const q = loadQueue();
        q.push(queueItem);
        saveQueue(q);
        setPendingCount(q.length);
        setStatusMessage(`⏳ Offline — ${parsed?.name || 'scan'} queued for sync`);
      } else {
        try {
          await onScanRef.current(parsed, rawValue);
          setStatusMessage(`✓ ${parsed?.name || 'Scan'} logged at ${timeString}`);
        } catch (err) {
          console.error('Parent onScan error — queueing:', err);
          const q = loadQueue();
          q.push(queueItem);
          saveQueue(q);
          setPendingCount(q.length);
          setStatusMessage(`⚠️ Saved locally — will retry when back online`);
        }
      }
    } else {
      // Standalone fallback: log to a `dutyScans` collection
      try {
        await addDoc(collection(db, 'dutyScans'), {
          agentUid: auth.currentUser?.uid || null,
          agentName: profile?.name || 'Teacher On Duty',
          name: parsed?.name || rawValue,
          category: parsed?.type || 'Unknown',
          timestamp: new Date().toISOString(),
          time: timeString,
        });
        setStatusMessage(`✓ ${parsed?.name || 'Scan'} logged at ${timeString}`);
      } catch (err) {
        console.error('Fallback log error — queueing:', err);
        const q = loadQueue();
        q.push(queueItem);
        saveQueue(q);
        setPendingCount(q.length);
        setStatusMessage(`⚠️ Saved locally — will retry when back online`);
      }
    }
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
      setStatusMessage(next ? 'Camera ready — point at a QR badge.' : 'Camera paused.');
      return next;
    });
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
      {/* Header — subtitle removed, only the title remains */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎓</span>
          <h1 style={styles.headerTitle}>Teacher On Duty</h1>
        </div>
        <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
      </div>

      {/* Connection + Pending Sync Banner */}
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

      {/* Stats Strip */}
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

      {/* Manual Camera Toggle */}
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

      {/* Scanner Area — only mounted when cameraOn is true (releases camera hardware) */}
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

      {/* Status Message */}
      {statusMessage && (
        <div style={styles.statusBar}>{statusMessage}</div>
      )}

      {/* Recent Scans — most recent 5 only */}
      <div style={styles.logPanel}>
        <h3 style={styles.logTitle}>Recent Scans</h3>
        {loadingLogs ? (
          <p style={styles.logEmpty}>Loading today's scans…</p>
        ) : scanLog.length === 0 ? (
          <p style={styles.logEmpty}>No scans yet.</p>
        ) : (
          scanLog.map((entry, idx) => (
            <div key={entry.id || idx} style={styles.logRow}>
              <span style={styles.logName}>{entry.name}</span>
              <span style={styles.logCat}>{entry.category}</span>
              <span style={styles.logTime}>{entry.time}</span>
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
  headerSub: { margin: '2px 0 0 0', fontSize: 11, opacity: 0.85, fontWeight: 600 },
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
  statusBar: {
    padding: '10px 14px', background: '#fef9c3', color: '#854d0e',
    borderRadius: 10, fontSize: 12, fontWeight: 800, textAlign: 'center',
    border: '1px solid #fde68a',
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
  logName: { fontWeight: 900, fontSize: 13, flex: 1, color: '#111827' },
  logCat: { fontSize: 11, color: '#4b5563', fontWeight: 700 },
  logTime: { fontSize: 11, color: '#991b1b', fontWeight: 900 },
};