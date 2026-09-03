import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
} from 'firebase/firestore';

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [query]);
  return matches;
};

// Get current date in East Africa Time (UTC+3)
const getEATDate = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala' }).format(new Date());
};

// Login component with password visibility toggle
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#cbd5e1',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#faf9f7',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '30px',
        width: '100%',
        maxWidth: '400px',
        border: '1px solid #d1d5db',
      }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '20px',
          fontWeight: '900',
          color: '#111827',
          textAlign: 'center'
        }}>
          Sign In
        </h2>
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '13px',
          color: '#4b5563',
          textAlign: 'center'
        }}>
          Mother Mary Primary School Limited
        </p>
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: '700'
          }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '900',
              color: '#4b5563',
              marginBottom: '6px'
            }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="admin@school.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontWeight: '700',
                boxSizing: 'border-box',
                background: '#f3f4f6'
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: '900',
              color: '#4b5563',
              marginBottom: '6px'
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 45px 12px 12px',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  fontWeight: '700',
                  boxSizing: 'border-box',
                  background: '#f3f4f6'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px',
              background: '#991b1b',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '900',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Firestore data states – removed admins
  const [pupils, setPupils] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [nonTeaching, setNonTeaching] = useState([]);

  useEffect(() => {
    const unsubPupils = onSnapshot(collection(db, 'pupils'), (snapshot) => {
      setPupils(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      setTeachers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    const unsubNonTeaching = onSnapshot(collection(db, 'nonTeaching'), (snapshot) => {
      setNonTeaching(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPupils();
      unsubTeachers();
      unsubNonTeaching();
    };
  }, []);

  // Daily reset when app loads
  const resetDailyIfNeeded = async () => {
    const eatDate = getEATDate();
    const settingsRef = doc(db, 'settings', 'dailyReset');
    const settingsSnap = await getDoc(settingsRef);
    const lastResetDate = settingsSnap.exists() ? settingsSnap.data().lastResetDate : null;

    if (lastResetDate !== eatDate) {
      const allCols = ['pupils', 'teachers', 'nonTeaching'];
      for (const col of allCols) {
        const snapshot = await getDocs(collection(db, col));
        snapshot.docs.forEach(async (docSnap) => {
          const data = docSnap.data();
          if (data.category !== 'Administrator') {
            await updateDoc(doc(db, col, docSnap.id), {
              status: 'Absent',
              arrivalTime: '--',
              morningStatus: 'Absent',
              departureTime: '--',
              eveningStatus: 'Absent',
            });
          }
        });
      }
      await setDoc(settingsRef, { lastResetDate: eatDate }, { merge: true });
    }
  };

  useEffect(() => {
    if (user) {
      resetDailyIfNeeded();
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  const today = getEATDate();
  const [selectedDate, setSelectedDate] = useState(today);

  const [termStartDate, setTermStartDate] = useState('2026-01-01');
  const [termEndDate, setTermEndDate] = useState('2026-12-31');
  const [publicHolidays, setPublicHolidays] = useState([
    { date: '2026-01-01', name: 'New Year' },
    { date: '2026-12-25', name: 'Christmas' },
  ]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  const [arrivalDeadline, setArrivalDeadline] = useState('08:00');

  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyDate, setHistoryDate] = useState(today);
  const [modalCategory, setModalCategory] = useState(null);
  const [selectedPersonForAction, setSelectedPersonForAction] = useState(null);

  const [scanLog, setScanLog] = useState([]);
  const lastScanTimeRef = useRef({});

  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  const [regType, setRegType] = useState('pupil');
  const [nameInput, setNameInput] = useState('');
  const [classInput, setClassInput] = useState('Baby Class');
  const [sexInput, setSexInput] = useState('Male');
  const [telInput, setTelInput] = useState('');
  const [roleInput, setRoleInput] = useState('Security');

  const schoolClasses = ["Baby Class", "Middle Class", "Top Class", "P.1", "P.2", "P.3", "P.4", "P.5", "P.6", "P.7"];
  const [selectedClassView, setSelectedClassView] = useState("P.2");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [classFilterStatus, setClassFilterStatus] = useState('all');
  const [teacherFilterStatus, setTeacherFilterStatus] = useState("all");
  const [nonTeachingFilterStatus, setNonTeachingFilterStatus] = useState("all");

  const [idSearchQuery, setIdSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [idCategoryFilter, setIdCategoryFilter] = useState("All");
  const [idClassFilter, setIdClassFilter] = useState("All");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // NEW STATE for Manual Attendance Entry modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualEntryName, setManualEntryName] = useState('');
  const [manualEntryStatus, setManualEntryStatus] = useState('');
  const [manualEntrySelectedPerson, setManualEntrySelectedPerson] = useState(null);
  const [manualSuggestions, setManualSuggestions] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth >= 260 && newWidth <= 500) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = () => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const allUsers = useMemo(
    () => [...pupils, ...teachers, ...nonTeaching],
    [pupils, teachers, nonTeaching]
  );
  const allUserNames = useMemo(() => allUsers.map((u) => u.name), [allUsers]);
  const filteredSuggestions = idSearchQuery.trim() === ""
    ? []
    : allUserNames.filter((name) => name.toLowerCase().includes(idSearchQuery.toLowerCase())).slice(0, 8);

  const isLateArrival = (currentDate) => {
    const [deadlineHour, deadlineMinute] = arrivalDeadline.split(':').map(Number);
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();
    return currentHour > deadlineHour || (currentHour === deadlineHour && currentMinute > deadlineMinute);
  };

  const isWithinCooldown = (personKey) => {
    const last = lastScanTimeRef.current[personKey];
    if (!last) return false;
    return Date.now() - last < 20000;
  };

  const handleScan = async (result) => {
    if (!result || !result[0]?.rawValue) return;
    try {
      const parsed = JSON.parse(result[0].rawValue);
      const matchingPerson = allUsers.find(
        (u) => u.name === parsed.name && u.category === parsed.type
      );
      if (!matchingPerson) return;
      const personKey = `${matchingPerson.category}-${matchingPerson.id}`;
      if (isWithinCooldown(personKey)) return;
      lastScanTimeRef.current[personKey] = Date.now();

      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateKey = getEATDate();
      const morningStatus = isLateArrival(now) ? 'Late' : 'Present';

      let collectionName = '';
      if (matchingPerson.category === 'Pupil') collectionName = 'pupils';
      else if (matchingPerson.category === 'Teacher') collectionName = 'teachers';
      else if (matchingPerson.category === 'Non-Teaching') collectionName = 'nonTeaching';

      const docRef = doc(db, collectionName, matchingPerson.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      const person = docSnap.data();
      let action = null;
      let updatedPerson = { ...person };

      if (person.status === 'Absent') {
        action = 'arrival';
        updatedPerson = {
          ...person,
          status: 'Present',
          morningStatus,
          arrivalTime: timeString,
          eveningStatus: 'On Campus',
          attendanceCount: (person.attendanceCount || 0) + 1,
          attendanceHistory: {
            ...(person.attendanceHistory || {}),
            [dateKey]: { arrivalTime: timeString, morningStatus, departureTime: '--', eveningStatus: 'On Campus' },
          },
        };
        await addDoc(collection(db, 'attendance'), {
          name: person.name,
          category: person.category,
          date: dateKey,
          arrivalTime: timeString,
          morningStatus,
          departureTime: '--',
          eveningStatus: 'On Campus',
          timestamp: now.toISOString(),
        });
      } else if (person.status === 'Present' && person.eveningStatus !== 'Departed') {
        action = 'departure';
        updatedPerson = {
          ...person,
          departureTime: timeString,
          eveningStatus: 'Departed',
          attendanceHistory: {
            ...(person.attendanceHistory || {}),
            [dateKey]: {
              ...(person.attendanceHistory?.[dateKey] || {}),
              departureTime: timeString,
              eveningStatus: 'Departed',
            },
          },
        };
      } else {
        setScanLog((prev) => [
          { name: person.name, category: person.category, time: timeString, status: 'Already Departed for Today' },
          ...prev,
        ].slice(0, 10));
        return;
      }

      await updateDoc(docRef, updatedPerson);
      const logStatus = action === 'arrival' ? morningStatus : 'Departed';
      setScanLog((prev) => [
        { name: person.name, category: person.category, time: timeString, status: logStatus },
        ...prev,
      ].slice(0, 10));
    } catch (e) {
      console.error('Scan error:', e);
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      alert('Please enter a name!');
      return;
    }

    const newPerson = {
      name: nameInput,
      category: regType === 'teacher' ? 'Teacher' : regType === 'non-teaching' ? 'Non-Teaching' : 'Pupil',
      status: 'Absent',
      arrivalTime: '--',
      morningStatus: 'Absent',
      departureTime: '--',
      eveningStatus: 'Absent',
      attendanceCount: 0,
      attendanceHistory: {},
      qrCodeData: JSON.stringify({
        type: regType === 'teacher' ? 'Teacher' : regType === 'non-teaching' ? 'Non-Teaching' : 'Pupil',
        name: nameInput,
        ...(regType === 'pupil' && { class: classInput }),
        ...(regType === 'non-teaching' && { role: roleInput }),
      }),
    };

    if (regType === 'pupil') {
      newPerson.class = classInput;
      newPerson.sex = sexInput;
      newPerson.parentTel = telInput;
    } else if (regType === 'teacher') {
      newPerson.lastSeen = 'Never';
    } else if (regType === 'non-teaching') {
      newPerson.role = roleInput;
    }

    const collectionName = regType === 'pupil' ? 'pupils' : regType === 'teacher' ? 'teachers' : 'nonTeaching';

    try {
      await addDoc(collection(db, collectionName), newPerson);
      setNameInput('');
      setTelInput('');
      setRegistrationSuccess(newPerson.name);
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register. Please try again.');
    }
  };

  const handleDeletePerson = async (id, category, name) => {
    if (window.confirm(`Are you sure you want to delete ${name} from the system records?`)) {
      const collectionName = category === 'Pupil' ? 'pupils' : category === 'Teacher' ? 'teachers' : 'nonTeaching';
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete record.');
      }
    }
  };

  // Existing manual mark present function
  const handleManualMarkPresent = async (personId, category, tag) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const morningStatus = tag === 'Forgot Badge' ? 'Present' : 'Late';
    const dateKey = getEATDate();

    const collectionName = category === 'pupil' ? 'pupils' : category === 'teacher' ? 'teachers' : 'nonTeaching';
    if (!collectionName) return;

    const docRef = doc(db, collectionName, personId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const person = docSnap.data();
      const updatedPerson = {
        ...person,
        status: 'Present',
        morningStatus,
        arrivalTime: timeString,
        eveningStatus: 'On Campus',
        attendanceCount: (person.attendanceCount || 0) + 1,
        attendanceHistory: {
          ...(person.attendanceHistory || {}),
          [dateKey]: { arrivalTime: timeString, morningStatus, departureTime: '--', eveningStatus: 'On Campus' },
        },
      };
      await updateDoc(docRef, updatedPerson);
    }
  };

  // NEW: Handle manual attendance entry from dashboard absent click
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualEntryName.trim() || !manualEntryStatus) {
      alert('Please fill in all fields.');
      return;
    }

    const name = manualEntryName.trim();
    const status = manualEntryStatus;

    let person = manualEntrySelectedPerson;
    if (!person) {
      const allPeople = [...pupils, ...teachers, ...nonTeaching];
      person = allPeople.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (!person) {
        alert('Person not found. Please check the name and try again.');
        return;
      }
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateKey = getEATDate();
    const morningStatus = status === 'Forgot/Lost ID' ? 'Present' : 'Late';

    let collectionName = '';
    if (person.category === 'Pupil') collectionName = 'pupils';
    else if (person.category === 'Teacher') collectionName = 'teachers';
    else if (person.category === 'Non-Teaching') collectionName = 'nonTeaching';

    if (!collectionName) {
      alert('Invalid category.');
      return;
    }

    const docRef = doc(db, collectionName, person.id);
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        alert('Person record not found in database.');
        return;
      }

      const existing = docSnap.data();
      const updatedPerson = {
        ...existing,
        status: 'Present',
        morningStatus,
        arrivalTime: timeString,
        eveningStatus: 'On Campus',
        attendanceCount: (existing.attendanceCount || 0) + 1,
        attendanceHistory: {
          ...(existing.attendanceHistory || {}),
          [dateKey]: {
            arrivalTime: timeString,
            morningStatus,
            departureTime: '--',
            eveningStatus: 'On Campus',
          },
        },
      };

      await updateDoc(docRef, updatedPerson);

      await addDoc(collection(db, 'attendance'), {
        name: existing.name,
        category: existing.category,
        date: dateKey,
        arrivalTime: timeString,
        morningStatus,
        departureTime: '--',
        eveningStatus: 'On Campus',
        timestamp: now.toISOString(),
      });

      setManualEntryName('');
      setManualEntryStatus('');
      setManualEntrySelectedPerson(null);
      setManualModalOpen(false);
    } catch (error) {
      console.error('Manual entry error:', error);
      alert('Failed to save attendance. Please try again.');
    }
  };

  // Live search for manual modal
  const handleManualNameChange = (e) => {
    const value = e.target.value;
    setManualEntryName(value);
    setManualEntrySelectedPerson(null);

    if (value.trim() === '') {
      setManualSuggestions([]);
      return;
    }
    const query = value.toLowerCase();
    const results = allUsers.filter(person => person.name.toLowerCase().includes(query)).slice(0, 8);
    setManualSuggestions(results);
  };

  const handleSuggestionClick = (person) => {
    setManualEntryName(person.name);
    setManualEntrySelectedPerson(person);
    setManualSuggestions([]);
  };

  const downloadQRCode = (user) => {
    const svgElement = document.getElementById(`qr-svg-${user.id}`);
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    canvas.width = 400;
    canvas.height = 480;
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 6;
      ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
      ctx.fillStyle = '#991b1b';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Mother Mary Primary School Limited', canvas.width / 2, 55);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('P.O. Box 115301 Wakiso', canvas.width / 2, 75);
      ctx.drawImage(img, 75, 100, 250, 250);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(user.name, canvas.width / 2, 385);
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 14px Inter, sans-serif';
      let subtitle = user.category;
      if (user.class) subtitle = `Pupil • Class: ${user.class}`;
      if (user.role) subtitle = `Non-Teaching • Role: ${user.role}`;
      ctx.fillText(subtitle, canvas.width / 2, 415);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${user.name.replace(/\s+/g, '_')}_Badge.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
  };

  const filteredBadges = useMemo(() => {
    return allUsers
      .filter((user) => {
        const matchesSearch = submittedSearch.trim() === '' || user.name.toLowerCase().includes(submittedSearch.toLowerCase());
        const matchesCategory = idCategoryFilter === 'All' || user.category === idCategoryFilter;
        const matchesClass = idCategoryFilter !== 'Pupil' || idClassFilter === 'All' || user.class === idClassFilter;
        return matchesSearch && matchesCategory && matchesClass;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, submittedSearch, idCategoryFilter, idClassFilter]);

  const totalPupils = pupils.length;
  const presentPupils = pupils.filter((p) => p.status === 'Present').length;
  const absentPupils = totalPupils - presentPupils;

  const totalTeachers = teachers.length;
  const presentTeachers = teachers.filter((t) => t.status === 'Present').length;
  const absentTeachers = totalTeachers - presentTeachers;

  const totalNonTeaching = nonTeaching.length;
  const presentNonTeaching = nonTeaching.filter((n) => n.status === 'Present').length;
  const absentNonTeaching = totalNonTeaching - presentNonTeaching;

  // Detailed report for selected date
  const dailyReport = useMemo(() => {
    const allPersons = [...pupils, ...teachers, ...nonTeaching];
    return allPersons.map((person) => {
      const attendance = person.attendanceHistory?.[selectedDate];
      if (attendance) {
        return {
          name: person.name,
          category: person.category,
          arrivalTime: attendance.arrivalTime || '--',
          morningStatus: attendance.morningStatus || 'Absent',
          departureTime: attendance.departureTime || '--',
          eveningStatus: attendance.eveningStatus || 'Absent',
        };
      } else if (selectedDate === today) {
        return {
          name: person.name,
          category: person.category,
          arrivalTime: person.arrivalTime || '--',
          morningStatus: person.morningStatus || 'Absent',
          departureTime: person.departureTime || '--',
          eveningStatus: person.eveningStatus || 'Absent',
        };
      } else {
        return {
          name: person.name,
          category: person.category,
          arrivalTime: '--',
          morningStatus: 'Absent',
          departureTime: '--',
          eveningStatus: 'Absent',
        };
      }
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [pupils, teachers, nonTeaching, selectedDate, today]);

  // Filter to only arrived individuals
  const arrivedReport = dailyReport.filter(row => row.morningStatus === 'Present' || row.morningStatus === 'Late');

  const totalRows = arrivedReport.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRows);
  const pageRows = arrivedReport.slice(startIndex, endIndex);

  const handleExportCSV = () => {
    const headers = ['Name', 'Category', 'Arrival Time', 'Morning Status', 'Departure Time', 'Evening Status'];
    const csvRows = arrivedReport.map(row => [
      row.name, row.category, row.arrivalTime, row.morningStatus, row.departureTime, row.eveningStatus
    ]);
    const csvContent = [headers, ...csvRows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_${selectedDate}.csv`;
    link.click();
  };

  const classPupils = pupils.filter((p) => p.class === selectedClassView);
  const totalInClass = classPupils.length;
  const presentInClass = classPupils.filter((p) => p.morningStatus === 'Present' || p.morningStatus === 'Late').length;
  const absentInClass = totalInClass - presentInClass;

  const filteredClassPupils = classPupils.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(studentSearchQuery.toLowerCase());
    if (classFilterStatus === 'present') return matchesSearch && (p.morningStatus === 'Present' || p.morningStatus === 'Late');
    if (classFilterStatus === 'absent') return matchesSearch && p.morningStatus === 'Absent';
    return matchesSearch;
  });

  const filteredTeachers = teachers.filter((t) => {
    if (teacherFilterStatus === 'present') return t.status === 'Present';
    if (teacherFilterStatus === 'absent') return t.status === 'Absent';
    return true;
  });
  const filteredNonTeaching = nonTeaching.filter((n) => {
    if (nonTeachingFilterStatus === 'present') return n.status === 'Present';
    if (nonTeachingFilterStatus === 'absent') return n.status === 'Absent';
    return true;
  });

  const closeModal = () => setModalCategory(null);
  const resetIdFilters = () => {
    setIdSearchQuery('');
    setSubmittedSearch('');
    setIdCategoryFilter('All');
    setIdClassFilter('All');
    setShowSuggestions(false);
  };

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;
  const isHoliday = (date) => publicHolidays.some((h) => h.date === date.toISOString().split('T')[0]);
  const isValidSchoolDay = (date) => !isWeekend(date) && !isHoliday(date);
  const calculateBusinessDays = (start, end) => {
    let count = 0;
    let cur = new Date(start);
    const endDate = new Date(end);
    while (cur <= endDate) {
      if (isValidSchoolDay(cur)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };
  const getAttendanceStats = (person) => {
    const start = new Date(termStartDate);
    const end = new Date(Math.min(new Date(), new Date(termEndDate)));
    const expectedDays = calculateBusinessDays(start, end);
    const presentDays = person.attendanceCount || 0;
    const absentDays = Math.max(0, expectedDays - presentDays);
    const attendanceRate = expectedDays > 0 ? ((presentDays / expectedDays) * 100).toFixed(1) : 0;
    return { expectedDays, presentDays, absentDays, attendanceRate };
  };

  const openHistoryModal = (person, category) => {
    setHistoryModal({ person, category });
    setHistoryDate(today);
  };
  const closeHistoryModal = () => setHistoryModal(null);

  const handleBulkDelete = (type, label) => setBulkDeleteTarget({ type, label });
  const confirmBulkDelete = async () => {
    if (!bulkDeleteTarget) return;
    const { type, label } = bulkDeleteTarget;
    try {
      if (type === 'class') {
        const pupilsToDelete = pupils.filter((p) => p.class === label);
        for (const pupil of pupilsToDelete) {
          await deleteDoc(doc(db, 'pupils', pupil.id));
        }
      } else if (type === 'category') {
        let collectionName = '';
        if (label === 'Pupils') collectionName = 'pupils';
        else if (label === 'Teaching Staff') collectionName = 'teachers';
        else if (label === 'Non-Teaching Staff') collectionName = 'nonTeaching';
        if (collectionName) {
          const docsToDelete =
            collectionName === 'pupils' ? pupils : collectionName === 'teachers' ? teachers : nonTeaching;
          for (const item of docsToDelete) {
            await deleteDoc(doc(db, collectionName, item.id));
          }
        }
      }
      setBulkDeleteTarget(null);
    } catch (error) {
      console.error('Bulk delete error:', error);
      alert('Failed to delete records.');
    }
  };

  const formatRegType = (type) => type.charAt(0).toUpperCase() + type.slice(1);

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#e2e8f0' }}>
        <div style={{ fontSize: '24px', fontWeight: '900', color: '#991b1b' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const sidebarContent = (
    <aside
      style={{
        width: isMobile ? '280px' : `${sidebarWidth}px`,
        minWidth: isMobile ? '280px' : `${sidebarWidth}px`,
        background: '#d1d5db',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '28px 22px',
        boxSizing: 'border-box',
        height: '100vh',
        zIndex: isMobile ? 1001 : 10,
        boxShadow: '4px 0 20px rgba(0,0,0,0.06)',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        transform: isMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile ? 'transform 0.3s ease' : 'none',
        ...(isMobile ? { left: 0 } : {}),
      }}
    >
      <div>
        <div style={{ marginBottom: '28px', paddingBottom: '18px', borderBottom: '2px solid #9ca3af' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#991b1b', lineHeight: '1.3' }}>
            Mother Mary Primary School Limited
          </h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: '700', color: '#4b5563' }}>P.O. Box 115301 Wakiso</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* General Overview */}
          <button
            onClick={() => { setActiveTab('dashboard'); setOpenDropdown(null); setMobileMenuOpen(false); }}
            className="sidebar-main-btn pop-card"
            style={{
              width: '100%', padding: '15px 18px',
              background: activeTab === 'dashboard' ? '#f3f4f6' : '#d1d5db',
              border: activeTab === 'dashboard' ? '2px solid #991b1b' : '1px solid #9ca3af',
              borderRadius: '12px', color: activeTab === 'dashboard' ? '#991b1b' : '#1f2937',
              fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left',
              transform: activeTab === 'dashboard' ? 'translateX(4px)' : 'none',
            }}
          >
            📊 General Overview
          </button>

          {/* Attendance Directory */}
          <div>
            <button
              onClick={() => toggleDropdown('attendance')}
              className="sidebar-main-btn pop-card"
              style={{
                width: '100%', padding: '15px 18px',
                background: activeTab === 'classes' || activeTab === 'teacher-logs' ? '#f3f4f6' : '#d1d5db',
                border: activeTab === 'classes' || activeTab === 'teacher-logs' ? '2px solid #991b1b' : '1px solid #9ca3af',
                borderRadius: '12px', color: activeTab === 'classes' || activeTab === 'teacher-logs' ? '#991b1b' : '#1f2937',
                fontWeight: '900', cursor: 'pointer', fontSize: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>📅 Attendance Directory</span>
              <span>{openDropdown === 'attendance' ? '▲' : '▼'}</span>
            </button>
            {openDropdown === 'attendance' && (
              <div className="animated-pane" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', marginTop: '10px', borderLeft: '3px solid #991b1b' }}>
                <button onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }} className="submenu-btn" style={{ padding: '11px 14px', background: activeTab === 'classes' ? '#fee2e2' : '#e5e7eb', border: '1px solid #9ca3af', borderRadius: '9px', fontSize: '13px', fontWeight: '900', color: activeTab === 'classes' ? '#991b1b' : '#1f2937', cursor: 'pointer', textAlign: 'left' }}>🏫 Pupil Attendance</button>
                <button onClick={() => { setActiveTab('teacher-logs'); setMobileMenuOpen(false); }} className="submenu-btn" style={{ padding: '11px 14px', background: activeTab === 'teacher-logs' ? '#fee2e2' : '#e5e7eb', border: '1px solid #9ca3af', borderRadius: '9px', fontSize: '13px', fontWeight: '900', color: activeTab === 'teacher-logs' ? '#991b1b' : '#1f2937', cursor: 'pointer', textAlign: 'left' }}>👩‍🏫 Staff Attendance</button>
              </div>
            )}
          </div>

          {/* Live QR Scanner */}
          <button onClick={() => { setActiveTab('scanner'); setOpenDropdown(null); setMobileMenuOpen(false); }} className="sidebar-main-btn pop-card" style={{ width: '100%', padding: '15px 18px', background: activeTab === 'scanner' ? '#f3f4f6' : '#d1d5db', border: activeTab === 'scanner' ? '2px solid #991b1b' : '1px solid #9ca3af', borderRadius: '12px', color: activeTab === 'scanner' ? '#991b1b' : '#1f2937', fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transform: activeTab === 'scanner' ? 'translateX(4px)' : 'none' }}>📷 Live QR Scanner</button>

          {/* Registration Hub */}
          <div>
            <button
              onClick={() => toggleDropdown('registration')}
              className="sidebar-main-btn pop-card"
              style={{
                width: '100%', padding: '15px 18px',
                background: activeTab === 'registration' ? '#f3f4f6' : '#d1d5db',
                border: activeTab === 'registration' ? '2px solid #991b1b' : '1px solid #9ca3af',
                borderRadius: '12px', color: activeTab === 'registration' ? '#991b1b' : '#1f2937',
                fontWeight: '900', cursor: 'pointer', fontSize: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>📝 Registration Hub</span>
              <span>{openDropdown === 'registration' ? '▲' : '▼'}</span>
            </button>
            {openDropdown === 'registration' && (
              <div className="animated-pane" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', marginTop: '10px', borderLeft: '3px solid #991b1b' }}>
                {['pupil', 'teacher', 'non-teaching'].map((type) => (
                  <button key={type} onClick={() => { setActiveTab('registration'); setRegType(type); setMobileMenuOpen(false); }} className="submenu-btn" style={{ padding: '11px 14px', background: regType === type && activeTab === 'registration' ? '#fee2e2' : '#e5e7eb', border: regType === type && activeTab === 'registration' ? '1px solid #fecaca' : '1px solid #9ca3af', borderRadius: '9px', fontSize: '13px', fontWeight: '900', color: regType === type && activeTab === 'registration' ? '#991b1b' : '#1f2937', cursor: 'pointer', textAlign: 'left' }}>+ Register {formatRegType(type)}</button>
                ))}
              </div>
            )}
          </div>

          {/* QR Badges & IDs */}
          <button onClick={() => { setActiveTab('ids'); setOpenDropdown(null); setMobileMenuOpen(false); }} className="sidebar-main-btn pop-card" style={{ width: '100%', padding: '15px 18px', background: activeTab === 'ids' ? '#f3f4f6' : '#d1d5db', border: activeTab === 'ids' ? '2px solid #991b1b' : '1px solid #9ca3af', borderRadius: '12px', color: activeTab === 'ids' ? '#991b1b' : '#1f2937', fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transform: activeTab === 'ids' ? 'translateX(4px)' : 'none' }}>🖨️ QR Badges & IDs</button>

          {/* Calendar Settings */}
          <button onClick={() => { setActiveTab('calendar'); setOpenDropdown(null); setMobileMenuOpen(false); }} className="sidebar-main-btn pop-card" style={{ width: '100%', padding: '15px 18px', background: activeTab === 'calendar' ? '#f3f4f6' : '#d1d5db', border: activeTab === 'calendar' ? '2px solid #991b1b' : '1px solid #9ca3af', borderRadius: '12px', color: activeTab === 'calendar' ? '#991b1b' : '#1f2937', fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transform: activeTab === 'calendar' ? 'translateX(4px)' : 'none' }}>🗓️ Calendar Settings</button>
        </div>
      </div>

      <div style={{ background: '#e5e7eb', border: '1px solid #9ca3af', padding: '14px', borderRadius: '12px' }} className="pop-card">
        <p style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#111827' }}>Admin Portal Active</p>
        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#16a34a', fontWeight: '900' }}>● System Secure</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#4b5563', fontWeight: '700' }}>Today: {formattedSelectedDate}</p>
        <button
          onClick={handleLogout}
          style={{
            marginTop: '12px', width: '100%', padding: '8px', background: '#fee2e2', color: '#991b1b',
            border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '12px',
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );

  // Refined nested-box card styles (with soft warm off-white and improved inner box contrast)
  const cardContainerStyle = {
    background: '#faf9f7',
    borderRadius: '16px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid #d1d5db',
    position: 'relative',
    transition: 'all 0.3s ease',
  };

  const cardTopAccentStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '6px',
    background: '#991b1b',
    borderRadius: '16px 16px 0 0',
  };

  const metricBoxStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    background: '#e5e7eb',
    border: '1px solid #cbd5e1',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
    fontSize: '14px',
    fontWeight: '700',
    color: '#111827',
  };

  const absentBoxStyle = {
    ...metricBoxStyle,
    cursor: 'pointer',
    background: '#fee2e2',
    border: '1px solid #fecaca',
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#cbd5e1', fontFamily: 'Inter, system-ui, sans-serif', color: '#111827', display: 'flex', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animated-pane { animation: fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-card { box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .pop-card:hover { transform: translateY(-4px); box-shadow: 0 16px 35px rgba(0,0,0,0.12), 0 6px 15px rgba(0,0,0,0.06); }
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .modal-content { background: #e5e7eb; border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
        .submenu-btn:hover { background-color: #fee2e2 !important; color: #991b1b !important; }
        .divider-bar:hover { background-color: #7f1d1d; }
        .sidebar-main-btn { transition: all 0.2s ease; }
        .sidebar-main-btn:hover { background-color: #fee2e2 !important; border-color: #991b1b !important; color: #991b1b !important; transform: translateX(4px); }
        .button-delete { transition: all 0.15s ease; }
        .button-delete:hover { background-color: #dc2626 !important; color: white !important; box-shadow: 0 4px 8px rgba(0,0,0,0.15); transform: translateY(-2px); }
        .button-delete:active { transform: translateY(0); box-shadow: none; }
        .date-picker { transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .date-picker:hover { transform: translateY(-2px); box-shadow: 0 6px 12px -2px rgba(0,0,0,0.2); }
        .history-btn { transition: all 0.15s ease; }
        .history-btn:hover { background-color: #d1d5db !important; color: #991b1b !important; }
        .pop-card, input, select, button, textarea { border: 1px solid #d1d5db; }
        input, select, textarea { border: 1px solid #9ca3af; background: #e5e7eb; }
        button { border: 1px solid #d1d5db; }
        .mobile-menu-btn { display: none; }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block; }
          .resizer { display: none; }
        }
      `}</style>

      {isMobile && mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 }} />
      )}

      {sidebarContent}

      {!isMobile && (
        <div onMouseDown={startResizing} className="divider-bar resizer" style={{ width: '8px', background: '#991b1b', cursor: 'col-resize', zIndex: 20 }} />
      )}

      <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto', ...(isMobile ? { marginLeft: 0, width: '100%' } : {}) }}>
        <header style={{ background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)', color: 'white', padding: isMobile ? '16px 20px' : '26px 36px', display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '10px' : '0', boxShadow: '0 6px 20px rgba(0,0,0,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'transparent', border: '1px solid white', color: 'white', fontSize: '24px', cursor: 'pointer', padding: '4px 10px', borderRadius: '6px' }}>☰</button>
            )}
            <h1 style={{ margin: 0, fontSize: isMobile ? '18px' : '22px', fontWeight: '900' }}>School Attendance Management System</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', opacity: 0.9 }}>Select Date:</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-picker" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid white', background: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: '700', outline: 'none', cursor: 'pointer' }} />
          </div>
        </header>

        <main className="animated-pane" style={{ padding: isMobile ? '16px' : '36px', boxSizing: 'border-box', background: '#cbd5e1' }}>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: 0 }}>Attendance Overview</h2>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: '4px 0 0 0' }}>{formattedSelectedDate}</p>
              </div>

              {/* Horizontal summary cards - refined nested boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                {/* Pupils Card */}
                <div className="pop-card" style={cardContainerStyle}>
                  <div style={cardTopAccentStyle}></div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#991b1b' }}>Pupils</p>
                  <div style={metricBoxStyle}>
                    <span>Total</span>
                    <strong style={{ fontSize: '18px', color: '#111827' }}>{totalPupils}</strong>
                  </div>
                  <div style={metricBoxStyle}>
                    <span>Present</span>
                    <strong style={{ fontSize: '18px', color: '#16a34a' }}>
                      {presentPupils} ({totalPupils > 0 ? Math.round((presentPupils / totalPupils) * 100) : 0}%)
                    </strong>
                  </div>
                  <div style={absentBoxStyle} onClick={() => setManualModalOpen(true)} title="Click to manually enter attendance">
                    <span>Absent</span>
                    <strong style={{ fontSize: '18px', color: '#dc2626' }}>{absentPupils}</strong>
                  </div>
                </div>

                {/* Teachers Card */}
                <div className="pop-card" style={cardContainerStyle}>
                  <div style={cardTopAccentStyle}></div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#991b1b' }}>Teaching Staff</p>
                  <div style={metricBoxStyle}>
                    <span>Total</span>
                    <strong style={{ fontSize: '18px', color: '#111827' }}>{totalTeachers}</strong>
                  </div>
                  <div style={metricBoxStyle}>
                    <span>Present</span>
                    <strong style={{ fontSize: '18px', color: '#16a34a' }}>
                      {presentTeachers} ({totalTeachers > 0 ? Math.round((presentTeachers / totalTeachers) * 100) : 0}%)
                    </strong>
                  </div>
                  <div style={absentBoxStyle} onClick={() => setManualModalOpen(true)} title="Click to manually enter attendance">
                    <span>Absent</span>
                    <strong style={{ fontSize: '18px', color: '#dc2626' }}>{absentTeachers}</strong>
                  </div>
                </div>

                {/* Non-Teaching Card */}
                <div className="pop-card" style={cardContainerStyle}>
                  <div style={cardTopAccentStyle}></div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#991b1b' }}>Non-Teaching Staff</p>
                  <div style={metricBoxStyle}>
                    <span>Total</span>
                    <strong style={{ fontSize: '18px', color: '#111827' }}>{totalNonTeaching}</strong>
                  </div>
                  <div style={metricBoxStyle}>
                    <span>Present</span>
                    <strong style={{ fontSize: '18px', color: '#16a34a' }}>
                      {presentNonTeaching} ({totalNonTeaching > 0 ? Math.round((presentNonTeaching / totalNonTeaching) * 100) : 0}%)
                    </strong>
                  </div>
                  <div style={absentBoxStyle} onClick={() => setManualModalOpen(true)} title="Click to manually enter attendance">
                    <span>Absent</span>
                    <strong style={{ fontSize: '18px', color: '#dc2626' }}>{absentNonTeaching}</strong>
                  </div>
                </div>
              </div>

              {/* Export button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                  onClick={handleExportCSV}
                  style={{
                    padding: '8px 16px',
                    background: '#991b1b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  ⬇ Export CSV
                </button>
              </div>

              {/* Detailed Report Table - only arrived individuals */}
              <div className="pop-card" style={{ background: '#e5e7eb', borderRadius: '12px', border: '1px solid #d1d5db', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: '#991b1b', color: 'white' }}>
                      <th style={{ padding: '12px 16px', fontWeight: '900' }}>Name</th>
                      <th style={{ padding: '12px 16px', fontWeight: '900' }}>Category</th>
                      <th style={{ padding: '12px 16px', fontWeight: '900' }}>Arrival Time</th>
                      <th style={{ padding: '12px 16px', fontWeight: '900' }}>Morning Status</th>
                      <th style={{ padding: '12px 16px', fontWeight: '900' }}>Departure Time</th>
                      <th style={{ padding: '12px 16px', fontWeight: '900' }}>Evening Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#4b5563', fontWeight: '700' }}>
                          No arrivals recorded for this date.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #d1d5db', background: idx % 2 === 0 ? '#f3f4f6' : '#e5e7eb' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '900', color: '#111827' }}>{row.name}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#4b5563' }}>{row.category}</td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#4b5563' }}>{row.arrivalTime}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '900',
                              background: row.morningStatus === 'Present' ? '#dcfce7' : row.morningStatus === 'Late' ? '#fef9c3' : '#fee2e2',
                              color: row.morningStatus === 'Present' ? '#166534' : row.morningStatus === 'Late' ? '#854d0e' : '#991b1b',
                            }}>
                              {row.morningStatus}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#4b5563' }}>{row.departureTime}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '900',
                              background: row.eveningStatus === 'Departed' ? '#e0f2fe' : row.eveningStatus === 'On Campus' ? '#fef9c3' : '#f1f5f9',
                              color: row.eveningStatus === 'Departed' ? '#0369a1' : row.eveningStatus === 'On Campus' ? '#854d0e' : '#4b5563',
                            }}>
                              {row.eveningStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', fontWeight: '700' }}>
                  {startIndex + 1} - {endIndex} of {totalRows}
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === 1 ? '#e5e7eb' : '#f3f4f6', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: '700' }}
                  >
                    ‹ Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: page === currentPage ? '#991b1b' : '#f3f4f6',
                        color: page === currentPage ? 'white' : '#1f2937',
                        cursor: 'pointer',
                        fontWeight: '700',
                      }}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db', background: currentPage === totalPages ? '#e5e7eb' : '#f3f4f6', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: '700' }}
                  >
                    Next ›
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR SETTINGS TAB */}
          {activeTab === 'calendar' && (
            <div className="animated-pane" style={{ background: '#e5e7eb', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #d1d5db', maxWidth: '700px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', marginBottom: '20px' }}>Calendar Settings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Term Start Date</label>
                  <input type="date" value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Term End Date</label>
                  <input type="date" value={termEndDate} onChange={(e) => setTermEndDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Late Threshold Time</label>
                  <input type="time" value={arrivalDeadline} onChange={(e) => setArrivalDeadline(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} />
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#4b5563' }}>Any check-in after this time will be marked as 'Late'.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Public Holidays</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} />
                    <input type="text" placeholder="Holiday Name" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} style={{ flex: 2, minWidth: '200px', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} />
                    <button onClick={() => { if (newHolidayDate && newHolidayName.trim() && !publicHolidays.some(h => h.date === newHolidayDate)) { setPublicHolidays([...publicHolidays, { date: newHolidayDate, name: newHolidayName.trim() }]); setNewHolidayDate(''); setNewHolidayName(''); } }} style={{ padding: '12px 20px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>Add</button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {publicHolidays.map((holiday, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '6px' }}>
                        <span><strong>{holiday.name}</strong> — {holiday.date}</span>
                        <button onClick={() => setPublicHolidays(publicHolidays.filter(h => h.date !== holiday.date))} className="button-delete" style={{ padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* CLASS METRICS TAB */}
          {activeTab === 'classes' && (
            <div className="animated-pane" style={{ background: '#e5e7eb', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #d1d5db', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: '0 0 6px 0' }}>Pupil Attendance ({selectedClassView})</h2>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: '0 0 4px 0' }}>{formattedSelectedDate}</p>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: 0 }}>Select a class below to view scan-in/scan-out metrics and logs</p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px' }}>
                {schoolClasses.map((cls) => {
                  const isActive = selectedClassView === cls;
                  return (
                    <button key={cls} onClick={() => { setSelectedClassView(cls); setClassFilterStatus('all'); }} className="pop-card" style={{ padding: '12px 20px', background: isActive ? '#991b1b' : '#f3f4f6', color: isActive ? '#ffffff' : '#1f2937', border: isActive ? '2px solid #7f1d1d' : '1px solid #d1d5db', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>{cls}</button>
                  );
                })}
              </div>

              {/* Apply refined nested-box style to summary cards in Pupil Attendance */}
              <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <div onClick={() => setClassFilterStatus('all')} className="pop-card" style={cardContainerStyle}>
                  <div style={cardTopAccentStyle}></div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>TOTAL IN {selectedClassView.toUpperCase()}</p>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#111827' }}>{totalInClass}</h3>
                </div>
                <div onClick={() => setClassFilterStatus('present')} className="pop-card" style={cardContainerStyle}>
                  <div style={cardTopAccentStyle}></div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>PRESENT (CLICK TO FILTER)</p>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{presentInClass}</h3>
                </div>
                <div onClick={() => setClassFilterStatus('absent')} className="pop-card" style={cardContainerStyle}>
                  <div style={cardTopAccentStyle}></div>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>ABSENT (CLICK TO VIEW LIST)</p>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>{absentInClass}</h3>
                </div>
              </div>

              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
                <input type="text" placeholder={`Search student in ${selectedClassView}...`} value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px', border: '1px solid #d1d5db', background: '#f3f4f6', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: isMobile ? '700px' : 'auto' }}>
                  <thead>
                    <tr style={{ background: '#991b1b', color: 'white' }}>
                      <th style={{ padding: '14px 18px', fontWeight: '900' }}>Student Name</th>
                      <th style={{ padding: '14px 18px', fontWeight: '900' }}>Arrival Time</th>
                      <th style={{ padding: '14px 18px', fontWeight: '900' }}>Morning Status</th>
                      <th style={{ padding: '14px 18px', fontWeight: '900' }}>Departure Time</th>
                      <th style={{ padding: '14px 18px', fontWeight: '900' }}>Evening Status</th>
                      <th style={{ padding: '14px 18px', fontWeight: '900' }}>History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClassPupils.length === 0 ? (
                      <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#4b5563', fontWeight: '700' }}>No students found matching your criteria in {selectedClassView}.</td></tr>
                    ) : (
                      filteredClassPupils.map((pupil, idx) => {
                        const isPresent = pupil.morningStatus === 'Present';
                        const isLate = pupil.morningStatus === 'Late';
                        const isDeparted = pupil.eveningStatus === 'Departed';
                        const isOnCampus = pupil.eveningStatus === 'On Campus';
                        return (
                          <tr key={pupil.id} style={{ borderBottom: '1px solid #d1d5db', background: idx % 2 === 0 ? '#f3f4f6' : '#e5e7eb' }}>
                            <td style={{ padding: '14px 18px', fontWeight: '900', color: '#111827' }}>{pupil.name}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{pupil.arrivalTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2', color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b', display: 'inline-block' }}>{pupil.morningStatus}</span></td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{pupil.departureTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isDeparted ? '#e0f2fe' : isOnCampus ? '#fef9c3' : '#f1f5f9', color: isDeparted ? '#0369a1' : isOnCampus ? '#854d0e' : '#4b5563', display: 'inline-block' }}>{pupil.eveningStatus}</span></td>
                            <td style={{ padding: '14px 18px' }}><button onClick={() => openHistoryModal(pupil, 'Pupil')} className="history-btn" style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>📊 View</button></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STAFF ATTENDANCE LOGS TAB */}
          {activeTab === 'teacher-logs' && (
            <div className="animated-pane">
              {/* Teaching Staff */}
              <div style={{ background: '#e5e7eb', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #d1d5db', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: '0 0 6px 0' }}>Teaching Staff Attendance</h2>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: '0 0 4px 0' }}>{formattedSelectedDate}</p>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: '0 0 24px 0' }}>Real-time scan-in/scan-out tracking for teachers</p>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  <div onClick={() => setTeacherFilterStatus('all')} className="pop-card" style={cardContainerStyle}>
                    <div style={cardTopAccentStyle}></div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>TOTAL REGISTERED</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#111827' }}>{totalTeachers}</h3>
                  </div>
                  <div onClick={() => setTeacherFilterStatus('present')} className="pop-card" style={cardContainerStyle}>
                    <div style={cardTopAccentStyle}></div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>PRESENT (CLICK TO FILTER)</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{presentTeachers}</h3>
                  </div>
                  <div onClick={() => setTeacherFilterStatus('absent')} className="pop-card" style={cardContainerStyle}>
                    <div style={cardTopAccentStyle}></div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>ABSENT (CLICK TO VIEW LIST)</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>{absentTeachers}</h3>
                  </div>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: isMobile ? '700px' : 'auto' }}>
                    <thead><tr style={{ background: '#991b1b', color: 'white' }}><th style={{ padding: '14px 18px', fontWeight: '900' }}>Name</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Arrival Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Morning Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Departure Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Evening Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>History</th></tr></thead>
                    <tbody>
                      {filteredTeachers.length === 0 ? <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#4b5563', fontWeight: '700' }}>No teachers found matching filter.</td></tr> : filteredTeachers.map((teacher, idx) => {
                        const isPresent = teacher.morningStatus === 'Present';
                        const isLate = teacher.morningStatus === 'Late';
                        const isDeparted = teacher.eveningStatus === 'Departed';
                        const isOnCampus = teacher.eveningStatus === 'On Campus';
                        return (
                          <tr key={teacher.id} style={{ borderBottom: '1px solid #d1d5db', background: idx % 2 === 0 ? '#f3f4f6' : '#e5e7eb' }}>
                            <td style={{ padding: '14px 18px', fontWeight: '900', color: '#111827' }}>{teacher.name}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{teacher.arrivalTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2', color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b', display: 'inline-block' }}>{teacher.morningStatus}</span></td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{teacher.departureTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isDeparted ? '#e0f2fe' : isOnCampus ? '#fef9c3' : '#f1f5f9', color: isDeparted ? '#0369a1' : isOnCampus ? '#854d0e' : '#4b5563', display: 'inline-block' }}>{teacher.eveningStatus}</span></td>
                            <td style={{ padding: '14px 18px' }}><button onClick={() => openHistoryModal(teacher, 'Teacher')} className="history-btn" style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>📊 View</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-Teaching Staff */}
              <div style={{ background: '#e5e7eb', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #d1d5db', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', margin: '0 0 6px 0' }}>Non-Teaching Staff Attendance</h2>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: '0 0 4px 0' }}>{formattedSelectedDate}</p>
                <p style={{ fontSize: '13px', color: '#4b5563', fontWeight: '700', margin: '0 0 24px 0' }}>Real-time scan-in/scan-out tracking for support staff</p>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  <div onClick={() => setNonTeachingFilterStatus('all')} className="pop-card" style={cardContainerStyle}>
                    <div style={cardTopAccentStyle}></div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>TOTAL REGISTERED</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#111827' }}>{totalNonTeaching}</h3>
                  </div>
                  <div onClick={() => setNonTeachingFilterStatus('present')} className="pop-card" style={cardContainerStyle}>
                    <div style={cardTopAccentStyle}></div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>PRESENT (CLICK TO FILTER)</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{presentNonTeaching}</h3>
                  </div>
                  <div onClick={() => setNonTeachingFilterStatus('absent')} className="pop-card" style={cardContainerStyle}>
                    <div style={cardTopAccentStyle}></div>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#991b1b' }}>ABSENT (CLICK TO VIEW LIST)</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#dc2626' }}>{absentNonTeaching}</h3>
                  </div>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #d1d5db', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: isMobile ? '800px' : 'auto' }}>
                    <thead><tr style={{ background: '#991b1b', color: 'white' }}><th style={{ padding: '14px 18px', fontWeight: '900' }}>Name</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Role</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Arrival Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Morning Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Departure Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Evening Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>History</th></tr></thead>
                    <tbody>
                      {filteredNonTeaching.length === 0 ? <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#4b5563', fontWeight: '700' }}>No non-teaching staff found matching filter.</td></tr> : filteredNonTeaching.map((staff, idx) => {
                        const isPresent = staff.morningStatus === 'Present';
                        const isLate = staff.morningStatus === 'Late';
                        const isDeparted = staff.eveningStatus === 'Departed';
                        const isOnCampus = staff.eveningStatus === 'On Campus';
                        return (
                          <tr key={staff.id} style={{ borderBottom: '1px solid #d1d5db', background: idx % 2 === 0 ? '#f3f4f6' : '#e5e7eb' }}>
                            <td style={{ padding: '14px 18px', fontWeight: '900', color: '#111827' }}>{staff.name}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{staff.role}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{staff.arrivalTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2', color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b', display: 'inline-block' }}>{staff.morningStatus}</span></td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#4b5563' }}>{staff.departureTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isDeparted ? '#e0f2fe' : isOnCampus ? '#fef9c3' : '#f1f5f9', color: isDeparted ? '#0369a1' : isOnCampus ? '#854d0e' : '#4b5563', display: 'inline-block' }}>{staff.eveningStatus}</span></td>
                            <td style={{ padding: '14px 18px' }}><button onClick={() => openHistoryModal(staff, 'Non-Teaching')} className="history-btn" style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>📊 View</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REGISTRATION TAB */}
          {activeTab === 'registration' && (
            <div className="animated-pane" style={{ background: '#e5e7eb', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #d1d5db', maxWidth: '700px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', marginBottom: '20px' }}>Register New {formatRegType(regType)}</h2>
              <form onSubmit={handleRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Full Name</label>
                  <input type="text" placeholder="Enter full name..." value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', boxSizing: 'border-box', fontWeight: '700', background: '#f3f4f6' }} />
                </div>

                {regType === 'pupil' && (
                  <>
                    <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Class</label><select value={classInput} onChange={(e) => setClassInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }}>{schoolClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Sex</label><select value={sexInput} onChange={(e) => setSexInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }}><option value="Male">Male</option><option value="Female">Female</option></select></div>
                    <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Parent Tel</label><input type="text" placeholder="0770000000" value={telInput} onChange={(e) => setTelInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} /></div>
                  </>
                )}

                {regType === 'non-teaching' && (
                  <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Role</label><select value={roleInput} onChange={(e) => setRoleInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }}><option value="Security">Security</option><option value="Cook">Cook</option><option value="Cleaner">Cleaner</option><option value="Driver">Driver</option></select></div>
                )}

                <button type="submit" style={{ padding: '14px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }}>Complete Registration & Generate QR</button>
              </form>
            </div>
          )}

          {/* QR & ID BADGES TAB */}
          {activeTab === 'ids' && (
            <div className="animated-pane">
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', marginBottom: '20px' }}>Printable ID Badges & QR Codes</h2>
              
              <div style={{ position: 'relative', display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <input type="text" placeholder="Search name for ID badge..." value={idSearchQuery} onChange={(e) => { setIdSearchQuery(e.target.value); setShowSuggestions(true); if (e.target.value.trim() === '') setSubmittedSearch(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setSubmittedSearch(idSearchQuery); setShowSuggestions(false); } }} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', boxSizing: 'border-box', background: '#f3f4f6' }} />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '45px', left: 0, right: 0, background: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: '8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                      {filteredSuggestions.map((suggestion, idx) => (
                        <div key={idx} onMouseDown={() => { setIdSearchQuery(suggestion); setSubmittedSearch(suggestion); setShowSuggestions(false); }} style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', color: '#1f2937', borderBottom: idx < filteredSuggestions.length - 1 ? '1px solid #d1d5db' : 'none', background: idx % 2 === 0 ? '#f3f4f6' : '#e5e7eb' }} onMouseEnter={(e) => e.target.style.background = '#fee2e2'} onMouseLeave={(e) => e.target.style.background = idx % 2 === 0 ? '#f3f4f6' : '#e5e7eb'}>{suggestion}</div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => { setSubmittedSearch(idSearchQuery); setShowSuggestions(false); }} style={{ padding: '12px 24px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap' }}>Search</button>
                <button onClick={resetIdFilters} style={{ padding: '12px 20px', background: '#d1d5db', color: '#1f2937', border: '1px solid #9ca3af', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear</button>
              </div>

              {idCategoryFilter !== 'All' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {idCategoryFilter === 'Pupil' && idClassFilter !== 'All' && <button onClick={() => handleBulkDelete('class', idClassFilter)} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All {idClassFilter} Records</button>}
                  {idCategoryFilter === 'Pupil' && idClassFilter === 'All' && <button onClick={() => handleBulkDelete('category', 'Pupils')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Pupils</button>}
                  {idCategoryFilter === 'Teacher' && <button onClick={() => handleBulkDelete('category', 'Teaching Staff')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Teaching Staff</button>}
                  {idCategoryFilter === 'Non-Teaching' && <button onClick={() => handleBulkDelete('category', 'Non-Teaching Staff')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Non-Teaching Staff</button>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <select value={idCategoryFilter} onChange={(e) => { setIdCategoryFilter(e.target.value); if (e.target.value !== 'Pupil') setIdClassFilter('All'); }} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }}>
                  <option value="All">All Categories</option><option value="Pupil">Pupils</option><option value="Teacher">Teaching Staff</option><option value="Non-Teaching">Non-Teaching Staff</option>
                </select>
                {idCategoryFilter === 'Pupil' && (
                  <select value={idClassFilter} onChange={(e) => setIdClassFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }}>
                    <option value="All">All Classes</option>{schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                )}
              </div>

              <div className="badge-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredBadges.map((user) => (
                  <div key={user.id} className="pop-card" style={{ background: '#f3f4f6', padding: '20px', borderRadius: '16px', border: '2px solid #991b1b', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '900', color: '#991b1b' }}>Mother Mary Primary School Limited</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#4b5563', fontWeight: '700' }}>P.O. Box 115301 Wakiso</p>
                    <div style={{ background: '#e5e7eb', padding: '10px', border: '1px solid #d1d5db', borderRadius: '8px', marginBottom: '14px' }}>
                      <QRCode id={`qr-svg-${user.id}`} value={user.qrCodeData} size={80} level="H" />
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '900', color: '#111827' }}>{user.name}</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#4b5563', fontWeight: '700' }}>{user.category} {user.class ? `• ${user.class}` : ''}</p>
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button onClick={() => downloadQRCode(user)} style={{ flex: 1, padding: '10px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>Download PNG</button>
                      <button onClick={() => handleDeletePerson(user.id, user.category, user.name)} className="button-delete" style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LIVE SCANNER TAB */}
          {activeTab === 'scanner' && (
            <div className="animated-pane" style={{ background: '#e5e7eb', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #d1d5db', maxWidth: '900px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#111827', marginBottom: '10px' }}>Live QR Code Attendance Scanner</h2>
              <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '20px', fontWeight: '700' }}>Hold student or staff QR badge in front of camera to log arrival / scan-in</p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1, minWidth: isMobile ? '100%' : '250px', height: '350px', background: '#1f2937', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Scanner onScan={handleScan} onError={(error) => console.log(error)} />
                </div>
                <div style={{ width: isMobile ? '100%' : '250px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', maxHeight: '350px', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '900', color: '#111827' }}>Recent Scans</h3>
                  {scanLog.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>No scans yet.</p> : scanLog.map((entry, idx) => (
                    <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid #d1d5db', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a', fontWeight: '900' }}>✓</span>
                      <span style={{ fontWeight: '900', color: '#111827' }}>{entry.name}</span>
                      <span style={{ color: '#4b5563' }}> - {entry.time}</span>
                      <span style={{ marginLeft: 'auto', color: entry.status === 'Late' ? '#b45309' : entry.status === 'Departed' ? '#0369a1' : entry.status === 'Already Departed for Today' ? '#dc2626' : '#166534', fontWeight: '900', fontSize: '11px' }}>{entry.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MANUAL ATTENDANCE ENTRY MODAL - with live search suggestions */}
      {manualModalOpen && (
        <div className="modal-overlay" onClick={() => setManualModalOpen(false)}>
          <div className="modal-content animated-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#111827' }}>Manual Attendance Entry</h2>
              <button onClick={() => setManualModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#4b5563', fontWeight: '900' }}>×</button>
            </div>
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={manualEntryName}
                  onChange={handleManualNameChange}
                  onFocus={() => { if (manualEntryName.trim() !== '') handleManualNameChange({ target: { value: manualEntryName } }); }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', boxSizing: 'border-box', background: '#f3f4f6' }}
                  required
                />
                {manualSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '70px', left: 0, right: 0, background: '#e5e7eb', border: '1px solid #d1d5db', borderRadius: '8px', zIndex: 100, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                    {manualSuggestions.map((person) => {
                      const context = person.category === 'Pupil' ? `Class: ${person.class}` : person.category === 'Teacher' ? 'Teacher' : `Role: ${person.role}`;
                      return (
                        <div
                          key={person.id}
                          onMouseDown={() => handleSuggestionClick(person)}
                          style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', color: '#1f2937', borderBottom: '1px solid #d1d5db', background: '#f3f4f6' }}
                          onMouseEnter={(e) => e.target.style.background = '#fee2e2'}
                          onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                        >
                          {person.name} - <span style={{ fontSize: '12px', color: '#4b5563' }}>{context}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Status / Arrival</label>
                <select
                  value={manualEntryStatus}
                  onChange={(e) => setManualEntryStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }}
                  required
                >
                  <option value="" disabled>Select status...</option>
                  <option value="Forgot/Lost ID">Forgot/Lost ID</option>
                  <option value="Late">Late</option>
                </select>
              </div>
              <button type="submit" style={{ padding: '14px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }}>
                Submit Attendance
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PENDING ATTENDANCE CONFIRMATION MODAL */}
      {modalCategory && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content animated-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#111827' }}>Pending Confirmation - {modalCategory === 'pupil' ? 'Pupils' : modalCategory === 'teacher' ? 'Teaching Staff' : 'Non-Teaching Staff'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#4b5563', fontWeight: '900' }}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', fontWeight: '700' }}>The following individuals are currently marked as absent/pending. Click "Mark Present" to manually confirm their attendance.</p>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {modalCategory === 'pupil' && pupils.filter(p => p.status === 'Absent').map((pupil) => (
                <div key={pupil.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #d1d5db' }}>
                  <div><p style={{ margin: 0, fontWeight: '900', color: '#111827' }}>{pupil.name}</p><p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>{pupil.class}</p></div>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) handleManualMarkPresent(pupil.id, 'pupil', e.target.value); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: '700', cursor: 'pointer', background: '#f3f4f6' }}><option value="" disabled>Mark Present...</option><option value="Forgot Badge">Forgot Badge / Lost Card</option><option value="Late Arrival">Late Arrival</option></select>
                </div>
              ))}
              {modalCategory === 'teacher' && teachers.filter(t => t.status === 'Absent').map((teacher) => (
                <div key={teacher.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #d1d5db' }}>
                  <div><p style={{ margin: 0, fontWeight: '900', color: '#111827' }}>{teacher.name}</p><p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>Teaching Staff</p></div>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) handleManualMarkPresent(teacher.id, 'teacher', e.target.value); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: '700', cursor: 'pointer', background: '#f3f4f6' }}><option value="" disabled>Mark Present...</option><option value="Forgot Badge">Forgot Badge / Lost Card</option><option value="Late Arrival">Late Arrival</option></select>
                </div>
              ))}
              {modalCategory === 'non-teaching' && nonTeaching.filter(n => n.status === 'Absent').map((staff) => (
                <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #d1d5db' }}>
                  <div><p style={{ margin: 0, fontWeight: '900', color: '#111827' }}>{staff.name}</p><p style={{ margin: 0, fontSize: '12px', color: '#4b5563' }}>{staff.role}</p></div>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) handleManualMarkPresent(staff.id, 'non-teaching', e.target.value); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontWeight: '700', cursor: 'pointer', background: '#f3f4f6' }}><option value="" disabled>Mark Present...</option><option value="Forgot Badge">Forgot Badge / Lost Card</option><option value="Late Arrival">Late Arrival</option></select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL HISTORY MODAL */}
      {historyModal && (
        <div className="modal-overlay" onClick={closeHistoryModal}>
          <div className="modal-content animated-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#111827' }}>Attendance History: {historyModal.person.name}</h2>
              <button onClick={closeHistoryModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#4b5563', fontWeight: '900' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div className="pop-card" style={{ background: '#f3f4f6', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#4b5563' }}>PRESENT DAYS</p><h3 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '900', color: '#16a34a' }}>{historyModal.person.attendanceCount || 0}</h3></div>
              <div className="pop-card" style={{ background: '#f3f4f6', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#4b5563' }}>ABSENT DAYS</p><h3 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '900', color: '#ea580c' }}>{getAttendanceStats(historyModal.person).absentDays}</h3></div>
              <div className="pop-card" style={{ background: '#f3f4f6', padding: '16px', borderRadius: '12px', border: '1px solid #d1d5db', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#4b5563' }}>ATTENDANCE RATE</p><h3 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '900', color: '#991b1b' }}>{getAttendanceStats(historyModal.person).attendanceRate}%</h3></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#4b5563', marginBottom: '6px' }}>Inspect Specific Date</label>
              <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #d1d5db', fontWeight: '700', background: '#f3f4f6' }} />
              {historyModal.person.attendanceHistory && historyModal.person.attendanceHistory[historyDate] ? (
                <div style={{ marginTop: '12px', background: '#f3f4f6', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '900', color: '#111827' }}>Details for {historyDate}:</p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#4b5563' }}>Arrival Time: <strong>{historyModal.person.attendanceHistory[historyDate].arrivalTime}</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#4b5563' }}>Morning Status: <strong>{historyModal.person.attendanceHistory[historyDate].morningStatus}</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#4b5563' }}>Departure Time: <strong>{historyModal.person.attendanceHistory[historyDate].departureTime === '--' ? 'Not scanned out' : historyModal.person.attendanceHistory[historyDate].departureTime}</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#4b5563' }}>Evening Status: <strong>{historyModal.person.attendanceHistory[historyDate].eveningStatus}</strong></p>
                </div>
              ) : <p style={{ marginTop: '12px', fontSize: '13px', color: '#4b5563' }}>No record for this date.</p>}
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {bulkDeleteTarget && (
        <div className="modal-overlay" onClick={() => setBulkDeleteTarget(null)}>
          <div className="modal-content animated-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>⚠️ DANGER: Bulk Deletion</h2>
              <button onClick={() => setBulkDeleteTarget(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#4b5563', fontWeight: '900' }}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', fontWeight: '700' }}>You are about to permanently delete ALL records for: <strong>{bulkDeleteTarget.label}</strong>. This action cannot be undone. Please confirm to proceed.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setBulkDeleteTarget(null)} style={{ padding: '10px 20px', background: '#d1d5db', color: '#1f2937', border: '1px solid #9ca3af', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmBulkDelete} className="button-delete" style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Delete All Permanently</button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTRATION SUCCESS MODAL */}
      {registrationSuccess && (
        <div className="modal-overlay" onClick={() => setRegistrationSuccess(null)}>
          <div className="modal-content animated-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#16a34a' }}>✓ Registration Successful</h2>
              <button onClick={() => setRegistrationSuccess(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#4b5563', fontWeight: '900' }}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#4b5563', marginBottom: '16px', fontWeight: '700' }}>
              {registrationSuccess} has been successfully registered. Their QR badge is now available in the QR Badges & IDs section.
            </p>
            <button onClick={() => setRegistrationSuccess(null)} style={{ padding: '10px 20px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;