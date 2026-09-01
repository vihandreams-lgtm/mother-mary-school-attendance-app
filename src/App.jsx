import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import Login from './components/Login';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from 'firebase/firestore';

// Responsive detection hook
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

function App() {
  // ------------------------- AUTH STATE -------------------------
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

  // ------------------------- FIRESTORE DATA STATE -------------------------
  const [pupils, setPupils] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [nonTeaching, setNonTeaching] = useState([]);
  const [admins, setAdmins] = useState([]);

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
    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      setAdmins(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubPupils();
      unsubTeachers();
      unsubNonTeaching();
      unsubAdmins();
    };
  }, []);

  // ------------------------- UI STATE -------------------------
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  const today = new Date().toISOString().split('T')[0];
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

  // Registration success modal
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  // Registration form
  const [regType, setRegType] = useState('pupil');
  const [nameInput, setNameInput] = useState('');
  const [classInput, setClassInput] = useState('Baby Class');
  const [sexInput, setSexInput] = useState('Male');
  const [telInput, setTelInput] = useState('');
  const [roleInput, setRoleInput] = useState('Security');
  const [postInput, setPostInput] = useState('Director');

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

  // Desktop resize effect
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

  // Derived data
  const allUsers = useMemo(
    () => [...pupils, ...teachers, ...nonTeaching, ...admins],
    [pupils, teachers, nonTeaching, admins]
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
      const dateKey = now.toISOString().split('T')[0];
      const morningStatus = isLateArrival(now) ? 'Late' : 'Present';

      let collectionName = '';
      if (matchingPerson.category === 'Pupil') collectionName = 'pupils';
      else if (matchingPerson.category === 'Teacher') collectionName = 'teachers';
      else if (matchingPerson.category === 'Non-Teaching') collectionName = 'nonTeaching';
      else collectionName = 'admins';

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
      category: regType === 'admin' ? 'Administrator' : regType === 'teacher' ? 'Teacher' : regType === 'non-teaching' ? 'Non-Teaching' : 'Pupil',
      status: 'Absent',
      arrivalTime: '--',
      morningStatus: 'Absent',
      departureTime: '--',
      eveningStatus: 'Absent',
      attendanceCount: 0,
      attendanceHistory: {},
      qrCodeData: JSON.stringify({
        type: regType === 'admin' ? 'Admin' : regType === 'teacher' ? 'Teacher' : regType === 'non-teaching' ? 'Non-Teaching' : 'Pupil',
        name: nameInput,
        ...(regType === 'pupil' && { class: classInput }),
        ...(regType === 'non-teaching' && { role: roleInput }),
        ...(regType === 'admin' && { post: postInput }),
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
    } else if (regType === 'admin') {
      newPerson.post = postInput;
    }

    const collectionName = regType === 'pupil' ? 'pupils' : regType === 'teacher' ? 'teachers' : regType === 'non-teaching' ? 'nonTeaching' : 'admins';

    try {
      await addDoc(collection(db, collectionName), newPerson);
      setNameInput('');
      setTelInput('');
      setRegistrationSuccess(newPerson.name); // show modal instead of alert
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register. Please try again.');
    }
  };

  const handleDeletePerson = async (id, category, name) => {
    if (window.confirm(`Are you sure you want to delete ${name} from the system records?`)) {
      const collectionName = category === 'Pupil' ? 'pupils' : category === 'Teacher' ? 'teachers' : category === 'Non-Teaching' ? 'nonTeaching' : 'admins';
      try {
        await deleteDoc(doc(db, collectionName, id));
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete record.');
      }
    }
  };

  const handleManualMarkPresent = async (personId, category, tag) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const morningStatus = tag === 'Forgot Badge' ? 'Present' : 'Late';
    const dateKey = now.toISOString().split('T')[0];

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
      if (user.post) subtitle = `Administrator • Post: ${user.post}`;
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
        else if (label === 'Administrators') collectionName = 'admins';
        if (collectionName) {
          const docsToDelete =
            collectionName === 'pupils' ? pupils : collectionName === 'teachers' ? teachers : collectionName === 'nonTeaching' ? nonTeaching : admins;
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

  const formatRegType = (type) => (type === 'admin' ? 'Administrator' : type.charAt(0).toUpperCase() + type.slice(1));

  const toggleDropdown = (menu) => {
    setOpenDropdown(openDropdown === menu ? null : menu);
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ fontSize: '24px', fontWeight: '900', color: '#991b1b' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const sidebarContent = (
    <aside
      style={{
        width: isMobile ? '280px' : `${sidebarWidth}px`,
        minWidth: isMobile ? '280px' : `${sidebarWidth}px`,
        background: '#edf2f7',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '28px 22px',
        boxSizing: 'border-box',
        height: '100vh',
        zIndex: isMobile ? 1001 : 10, // FIX: ensure sidebar above overlay on mobile
        boxShadow: '4px 0 20px rgba(0,0,0,0.06)',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        transform: isMobile ? (mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile ? 'transform 0.3s ease' : 'none',
        ...(isMobile ? { left: 0 } : {}),
      }}
    >
      <div>
        <div style={{ marginBottom: '28px', paddingBottom: '18px', borderBottom: '2px solid #cbd5e1' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#991b1b', lineHeight: '1.3' }}>
            Mother Mary Primary School Limited
          </h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', fontWeight: '700', color: '#475569' }}>P.O. Box 115301 Wakiso</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* General Overview */}
          <button
            onClick={() => { setActiveTab('dashboard'); setOpenDropdown(null); setMobileMenuOpen(false); }}
            className="sidebar-main-btn pop-card"
            style={{
              width: '100%', padding: '15px 18px',
              background: activeTab === 'dashboard' ? '#ffffff' : '#edf2f7',
              border: activeTab === 'dashboard' ? '2px solid #991b1b' : '1px solid #cbd5e1',
              borderRadius: '12px', color: activeTab === 'dashboard' ? '#991b1b' : '#334155',
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
                background: activeTab === 'classes' || activeTab === 'teacher-logs' ? '#ffffff' : '#edf2f7',
                border: activeTab === 'classes' || activeTab === 'teacher-logs' ? '2px solid #991b1b' : '1px solid #cbd5e1',
                borderRadius: '12px', color: activeTab === 'classes' || activeTab === 'teacher-logs' ? '#991b1b' : '#334155',
                fontWeight: '900', cursor: 'pointer', fontSize: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>📅 Attendance Directory</span>
              <span>{openDropdown === 'attendance' ? '▲' : '▼'}</span>
            </button>
            {openDropdown === 'attendance' && (
              <div className="animated-pane" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', marginTop: '10px', borderLeft: '3px solid #991b1b' }}>
                <button onClick={() => { setActiveTab('classes'); setMobileMenuOpen(false); }} className="submenu-btn" style={{ padding: '11px 14px', background: activeTab === 'classes' ? '#fee2e2' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '13px', fontWeight: '900', color: activeTab === 'classes' ? '#991b1b' : '#475569', cursor: 'pointer', textAlign: 'left' }}>🏫 Pupil Attendance</button>
                <button onClick={() => { setActiveTab('teacher-logs'); setMobileMenuOpen(false); }} className="submenu-btn" style={{ padding: '11px 14px', background: activeTab === 'teacher-logs' ? '#fee2e2' : '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '13px', fontWeight: '900', color: activeTab === 'teacher-logs' ? '#991b1b' : '#475569', cursor: 'pointer', textAlign: 'left' }}>👩‍🏫 Staff Attendance</button>
              </div>
            )}
          </div>

          {/* Live QR Scanner */}
          <button onClick={() => { setActiveTab('scanner'); setOpenDropdown(null); setMobileMenuOpen(false); }} className="sidebar-main-btn pop-card" style={{ width: '100%', padding: '15px 18px', background: activeTab === 'scanner' ? '#ffffff' : '#edf2f7', border: activeTab === 'scanner' ? '2px solid #991b1b' : '1px solid #cbd5e1', borderRadius: '12px', color: activeTab === 'scanner' ? '#991b1b' : '#334155', fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transform: activeTab === 'scanner' ? 'translateX(4px)' : 'none' }}>📷 Live QR Scanner</button>

          {/* Registration Hub */}
          <div>
            <button
              onClick={() => toggleDropdown('registration')}
              className="sidebar-main-btn pop-card"
              style={{
                width: '100%', padding: '15px 18px',
                background: activeTab === 'registration' ? '#ffffff' : '#edf2f7',
                border: activeTab === 'registration' ? '2px solid #991b1b' : '1px solid #cbd5e1',
                borderRadius: '12px', color: activeTab === 'registration' ? '#991b1b' : '#334155',
                fontWeight: '900', cursor: 'pointer', fontSize: '14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>📝 Registration Hub</span>
              <span>{openDropdown === 'registration' ? '▲' : '▼'}</span>
            </button>
            {openDropdown === 'registration' && (
              <div className="animated-pane" style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px', marginTop: '10px', borderLeft: '3px solid #991b1b' }}>
                {['pupil', 'teacher', 'non-teaching', 'admin'].map((type) => (
                  <button key={type} onClick={() => { setActiveTab('registration'); setRegType(type); setMobileMenuOpen(false); }} className="submenu-btn" style={{ padding: '11px 14px', background: regType === type && activeTab === 'registration' ? '#fee2e2' : '#f8fafc', border: regType === type && activeTab === 'registration' ? '1px solid #fecaca' : '1px solid #cbd5e1', borderRadius: '9px', fontSize: '13px', fontWeight: '900', color: regType === type && activeTab === 'registration' ? '#991b1b' : '#475569', cursor: 'pointer', textAlign: 'left' }}>+ Register {formatRegType(type)}</button>
                ))}
              </div>
            )}
          </div>

          {/* QR Badges & IDs */}
          <button onClick={() => { setActiveTab('ids'); setOpenDropdown(null); setMobileMenuOpen(false); }} className="sidebar-main-btn pop-card" style={{ width: '100%', padding: '15px 18px', background: activeTab === 'ids' ? '#ffffff' : '#edf2f7', border: activeTab === 'ids' ? '2px solid #991b1b' : '1px solid #cbd5e1', borderRadius: '12px', color: activeTab === 'ids' ? '#991b1b' : '#334155', fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transform: activeTab === 'ids' ? 'translateX(4px)' : 'none' }}>🖨️ QR Badges & IDs</button>

          {/* Calendar Settings */}
          <button onClick={() => { setActiveTab('calendar'); setOpenDropdown(null); setMobileMenuOpen(false); }} className="sidebar-main-btn pop-card" style={{ width: '100%', padding: '15px 18px', background: activeTab === 'calendar' ? '#ffffff' : '#edf2f7', border: activeTab === 'calendar' ? '2px solid #991b1b' : '1px solid #cbd5e1', borderRadius: '12px', color: activeTab === 'calendar' ? '#991b1b' : '#334155', fontWeight: '900', cursor: 'pointer', fontSize: '14px', textAlign: 'left', transform: activeTab === 'calendar' ? 'translateX(4px)' : 'none' }}>🗓️ Calendar Settings</button>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '14px', borderRadius: '12px' }} className="pop-card">
        <p style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#0f172a' }}>Admin Portal Active</p>
        <p style={{ margin: '3px 0 0 0', fontSize: '11px', color: '#16a34a', fontWeight: '900' }}>● System Secure</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#475569', fontWeight: '700' }}>Today: {formattedSelectedDate}</p>
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

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#d8dee4', fontFamily: 'Inter, system-ui, sans-serif', color: '#1e293b', display: 'flex', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeInScale { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animated-pane { animation: fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-card { box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04); transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .pop-card:hover { transform: translateY(-4px); box-shadow: 0 16px 35px rgba(0,0,0,0.12), 0 6px 15px rgba(0,0,0,0.06); }
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; } /* FIX: increase z-index above sidebar */
        .modal-content { background: #f8fafc; border-radius: 16px; padding: 24px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
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
        .history-btn:hover { background-color: #e2e8f0 !important; color: #991b1b !important; }
        .pop-card, input, select, button, textarea { border: 1px solid #cbd5e1; }
        input, select, textarea { border: 1px solid #94a3b8; }
        button { border: 1px solid #cbd5e1; }
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

        <main className="animated-pane" style={{ padding: isMobile ? '16px' : '36px', boxSizing: 'border-box', background: '#e2e8f0' }}>

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Attendance Overview</h2>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: '4px 0 0 0' }}>{formattedSelectedDate}</p>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#991b1b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pupils</h3>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="pop-card" style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #991b1b' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>TOTAL REGISTERED</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{totalPupils}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#475569', fontWeight: '700' }}>Active database profiles</p>
                  </div>
                  <div className="pop-card" style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #16a34a' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>PRESENT TODAY</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#16a34a' }}>{presentPupils}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#16a34a', fontWeight: '900' }}>{Math.round((presentPupils / (totalPupils || 1)) * 100)}%</p>
                  </div>
                  <div className="pop-card" onClick={() => setModalCategory('pupil')} style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #ea580c', cursor: 'pointer' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>ABSENT / PENDING</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#ea580c' }}>{absentPupils}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ea580c', fontWeight: '900', textDecoration: 'underline' }}>Requires confirmation (Click)</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#991b1b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Teaching Staff</h3>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="pop-card" style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #991b1b' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>TOTAL REGISTERED</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{totalTeachers}</h3>
                  </div>
                  <div className="pop-card" style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #16a34a' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>PRESENT TODAY</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#16a34a' }}>{presentTeachers}</h3>
                  </div>
                  <div className="pop-card" onClick={() => setModalCategory('teacher')} style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #ea580c', cursor: 'pointer' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>ABSENT / PENDING</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#ea580c' }}>{absentTeachers}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ea580c', fontWeight: '900', textDecoration: 'underline' }}>Requires confirmation (Click)</p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '900', color: '#991b1b', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Non Teaching Staff</h3>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div className="pop-card" style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #991b1b' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>TOTAL REGISTERED</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#0f172a' }}>{totalNonTeaching}</h3>
                  </div>
                  <div className="pop-card" style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #16a34a' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>PRESENT TODAY</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#16a34a' }}>{presentNonTeaching}</h3>
                  </div>
                  <div className="pop-card" onClick={() => setModalCategory('non-teaching')} style={{ background: '#f8fafc', padding: '22px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #ea580c', cursor: 'pointer' }}>
                    <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569', letterSpacing: '0.5px' }}>ABSENT / PENDING</p>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '32px', fontWeight: '900', color: '#ea580c' }}>{absentNonTeaching}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#ea580c', fontWeight: '900', textDecoration: 'underline' }}>Requires confirmation (Click)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR SETTINGS TAB */}
          {activeTab === 'calendar' && (
            <div className="animated-pane" style={{ background: '#f8fafc', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #cbd5e1', maxWidth: '700px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '20px' }}>Calendar Settings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Term Start Date</label>
                  <input type="date" value={termStartDate} onChange={(e) => setTermStartDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Term End Date</label>
                  <input type="date" value={termEndDate} onChange={(e) => setTermEndDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Late Threshold Time</label>
                  <input type="time" value={arrivalDeadline} onChange={(e) => setArrivalDeadline(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>Any check-in after this time will be marked as 'Late'.</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Public Holidays</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <input type="date" value={newHolidayDate} onChange={(e) => setNewHolidayDate(e.target.value)} style={{ flex: 1, minWidth: '150px', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
                    <input type="text" placeholder="Holiday Name" value={newHolidayName} onChange={(e) => setNewHolidayName(e.target.value)} style={{ flex: 2, minWidth: '200px', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
                    <button onClick={() => { if (newHolidayDate && newHolidayName.trim() && !publicHolidays.some(h => h.date === newHolidayDate)) { setPublicHolidays([...publicHolidays, { date: newHolidayDate, name: newHolidayName.trim() }]); setNewHolidayDate(''); setNewHolidayName(''); } }} style={{ padding: '12px 20px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>Add</button>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {publicHolidays.map((holiday, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '6px' }}>
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
            <div className="animated-pane" style={{ background: '#f8fafc', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Pupil Attendance ({selectedClassView})</h2>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: '0 0 4px 0' }}>{formattedSelectedDate}</p>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: 0 }}>Select a class below to view scan-in/scan-out metrics and logs</p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '30px' }}>
                {schoolClasses.map((cls) => {
                  const isActive = selectedClassView === cls;
                  return (
                    <button key={cls} onClick={() => { setSelectedClassView(cls); setClassFilterStatus('all'); }} className="pop-card" style={{ padding: '12px 20px', background: isActive ? '#991b1b' : '#f8fafc', color: isActive ? '#ffffff' : '#334155', border: isActive ? '2px solid #7f1d1d' : '1px solid #cbd5e1', borderRadius: '12px', fontWeight: '900', fontSize: '13px', cursor: 'pointer' }}>{cls}</button>
                  );
                })}
              </div>

              <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                <div onClick={() => setClassFilterStatus('all')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #991b1b', cursor: 'pointer' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>TOTAL IN {selectedClassView.toUpperCase()}</p>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{totalInClass}</h3>
                </div>
                <div onClick={() => setClassFilterStatus('present')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #16a34a', cursor: 'pointer' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>PRESENT (CLICK TO FILTER)</p>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{presentInClass}</h3>
                </div>
                <div onClick={() => setClassFilterStatus('absent')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #ea580c', cursor: 'pointer' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>ABSENT (CLICK TO VIEW LIST)</p>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#ea580c' }}>{absentInClass}</h3>
                </div>
              </div>

              <div style={{ position: 'relative', marginBottom: '24px' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px' }}>🔍</span>
                <input type="text" placeholder={`Search student in ${selectedClassView}...`} value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 48px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
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
                      <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>No students found matching your criteria in {selectedClassView}.</td></tr>
                    ) : (
                      filteredClassPupils.map((pupil, idx) => {
                        const isPresent = pupil.morningStatus === 'Present';
                        const isLate = pupil.morningStatus === 'Late';
                        const isDeparted = pupil.eveningStatus === 'Departed';
                        const isOnCampus = pupil.eveningStatus === 'On Campus';
                        return (
                          <tr key={pupil.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '14px 18px', fontWeight: '900', color: '#0f172a' }}>{pupil.name}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{pupil.arrivalTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2', color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b', display: 'inline-block' }}>{pupil.morningStatus}</span></td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{pupil.departureTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isDeparted ? '#e0f2fe' : isOnCampus ? '#fef9c3' : '#f1f5f9', color: isDeparted ? '#0369a1' : isOnCampus ? '#854d0e' : '#475569', display: 'inline-block' }}>{pupil.eveningStatus}</span></td>
                            <td style={{ padding: '14px 18px' }}><button onClick={() => openHistoryModal(pupil, 'Pupil')} className="history-btn" style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>📊 View</button></td>
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
              <div style={{ background: '#f8fafc', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Teaching Staff Attendance</h2>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: '0 0 4px 0' }}>{formattedSelectedDate}</p>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: '0 0 24px 0' }}>Real-time scan-in/scan-out tracking for teachers</p>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  <div onClick={() => setTeacherFilterStatus('all')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #991b1b', cursor: 'pointer' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>TOTAL REGISTERED</p><h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{totalTeachers}</h3></div>
                  <div onClick={() => setTeacherFilterStatus('present')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #16a34a', cursor: 'pointer' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>PRESENT (CLICK TO FILTER)</p><h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{presentTeachers}</h3></div>
                  <div onClick={() => setTeacherFilterStatus('absent')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #ea580c', cursor: 'pointer' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>ABSENT (CLICK TO VIEW LIST)</p><h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#ea580c' }}>{absentTeachers}</h3></div>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: isMobile ? '700px' : 'auto' }}>
                    <thead><tr style={{ background: '#991b1b', color: 'white' }}><th style={{ padding: '14px 18px', fontWeight: '900' }}>Name</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Arrival Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Morning Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Departure Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Evening Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>History</th></tr></thead>
                    <tbody>
                      {filteredTeachers.length === 0 ? <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>No teachers found matching filter.</td></tr> : filteredTeachers.map((teacher, idx) => {
                        const isPresent = teacher.morningStatus === 'Present';
                        const isLate = teacher.morningStatus === 'Late';
                        const isDeparted = teacher.eveningStatus === 'Departed';
                        const isOnCampus = teacher.eveningStatus === 'On Campus';
                        return (
                          <tr key={teacher.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '14px 18px', fontWeight: '900', color: '#0f172a' }}>{teacher.name}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{teacher.arrivalTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2', color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b', display: 'inline-block' }}>{teacher.morningStatus}</span></td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{teacher.departureTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isDeparted ? '#e0f2fe' : isOnCampus ? '#fef9c3' : '#f1f5f9', color: isDeparted ? '#0369a1' : isOnCampus ? '#854d0e' : '#475569', display: 'inline-block' }}>{teacher.eveningStatus}</span></td>
                            <td style={{ padding: '14px 18px' }}><button onClick={() => openHistoryModal(teacher, 'Teacher')} className="history-btn" style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>📊 View</button></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-Teaching Staff */}
              <div style={{ background: '#f8fafc', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0' }}>Non-Teaching Staff Attendance</h2>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: '0 0 4px 0' }}>{formattedSelectedDate}</p>
                <p style={{ fontSize: '13px', color: '#475569', fontWeight: '700', margin: '0 0 24px 0' }}>Real-time scan-in/scan-out tracking for support staff</p>
                <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                  <div onClick={() => setNonTeachingFilterStatus('all')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #991b1b', cursor: 'pointer' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>TOTAL REGISTERED</p><h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#0f172a' }}>{totalNonTeaching}</h3></div>
                  <div onClick={() => setNonTeachingFilterStatus('present')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #16a34a', cursor: 'pointer' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>PRESENT (CLICK TO FILTER)</p><h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#16a34a' }}>{presentNonTeaching}</h3></div>
                  <div onClick={() => setNonTeachingFilterStatus('absent')} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #cbd5e1', borderLeft: '7px solid #ea580c', cursor: 'pointer' }}><p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '900', color: '#475569' }}>ABSENT (CLICK TO VIEW LIST)</p><h3 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '900', color: '#ea580c' }}>{absentNonTeaching}</h3></div>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #cbd5e1', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', minWidth: isMobile ? '800px' : 'auto' }}>
                    <thead><tr style={{ background: '#991b1b', color: 'white' }}><th style={{ padding: '14px 18px', fontWeight: '900' }}>Name</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Role</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Arrival Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Morning Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Departure Time</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>Evening Status</th><th style={{ padding: '14px 18px', fontWeight: '900' }}>History</th></tr></thead>
                    <tbody>
                      {filteredNonTeaching.length === 0 ? <tr><td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>No non-teaching staff found matching filter.</td></tr> : filteredNonTeaching.map((staff, idx) => {
                        const isPresent = staff.morningStatus === 'Present';
                        const isLate = staff.morningStatus === 'Late';
                        const isDeparted = staff.eveningStatus === 'Departed';
                        const isOnCampus = staff.eveningStatus === 'On Campus';
                        return (
                          <tr key={staff.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '14px 18px', fontWeight: '900', color: '#0f172a' }}>{staff.name}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{staff.role}</td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{staff.arrivalTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isPresent ? '#dcfce7' : isLate ? '#fef9c3' : '#fee2e2', color: isPresent ? '#166534' : isLate ? '#854d0e' : '#991b1b', display: 'inline-block' }}>{staff.morningStatus}</span></td>
                            <td style={{ padding: '14px 18px', fontWeight: '700', color: '#475569' }}>{staff.departureTime || '--'}</td>
                            <td style={{ padding: '14px 18px' }}><span style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', background: isDeparted ? '#e0f2fe' : isOnCampus ? '#fef9c3' : '#f1f5f9', color: isDeparted ? '#0369a1' : isOnCampus ? '#854d0e' : '#475569', display: 'inline-block' }}>{staff.eveningStatus}</span></td>
                            <td style={{ padding: '14px 18px' }}><button onClick={() => openHistoryModal(staff, 'Non-Teaching')} className="history-btn" style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>📊 View</button></td>
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
            <div className="animated-pane" style={{ background: '#f8fafc', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #cbd5e1', maxWidth: '700px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '20px' }}>Register New {formatRegType(regType)}</h2>
              <form onSubmit={handleRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Full Name</label>
                  <input type="text" placeholder="Enter full name..." value={nameInput} onChange={(e) => setNameInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', boxSizing: 'border-box', fontWeight: '700' }} />
                </div>

                {regType === 'pupil' && (
                  <>
                    <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Class</label><select value={classInput} onChange={(e) => setClassInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }}>{schoolClasses.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Sex</label><select value={sexInput} onChange={(e) => setSexInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }}><option value="Male">Male</option><option value="Female">Female</option></select></div>
                    <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Parent Tel</label><input type="text" placeholder="0770000000" value={telInput} onChange={(e) => setTelInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} /></div>
                  </>
                )}

                {regType === 'non-teaching' && (
                  <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Role</label><select value={roleInput} onChange={(e) => setRoleInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }}><option value="Security">Security</option><option value="Cook">Cook</option><option value="Cleaner">Cleaner</option><option value="Driver">Driver</option></select></div>
                )}

                {regType === 'admin' && (
                  <div><label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Post</label><select value={postInput} onChange={(e) => setPostInput(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }}><option value="Headteacher">Headteacher</option><option value="Director">Director</option><option value="Deputy Headteacher">Deputy Headteacher</option></select></div>
                )}

                <button type="submit" style={{ padding: '14px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', marginTop: '10px' }}>Complete Registration & Generate QR</button>
              </form>
            </div>
          )}

          {/* QR & ID BADGES TAB */}
          {activeTab === 'ids' && (
            <div className="animated-pane">
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '20px' }}>Printable ID Badges & QR Codes</h2>
              
              <div style={{ position: 'relative', display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <input type="text" placeholder="Search name for ID badge..." value={idSearchQuery} onChange={(e) => { setIdSearchQuery(e.target.value); setShowSuggestions(true); if (e.target.value.trim() === '') setSubmittedSearch(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setSubmittedSearch(idSearchQuery); setShowSuggestions(false); } }} onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', boxSizing: 'border-box', background: '#ffffff' }} />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div style={{ position: 'absolute', top: '45px', left: 0, right: 0, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', zIndex: 50, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                      {filteredSuggestions.map((suggestion, idx) => (
                        <div key={idx} onMouseDown={() => { setIdSearchQuery(suggestion); setSubmittedSearch(suggestion); setShowSuggestions(false); }} style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', color: '#334155', borderBottom: idx < filteredSuggestions.length - 1 ? '1px solid #e2e8f0' : 'none', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }} onMouseEnter={(e) => e.target.style.background = '#fee2e2'} onMouseLeave={(e) => e.target.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'}>{suggestion}</div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => { setSubmittedSearch(idSearchQuery); setShowSuggestions(false); }} style={{ padding: '12px 24px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap' }}>Search</button>
                <button onClick={resetIdFilters} style={{ padding: '12px 20px', background: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap' }}>Clear</button>
              </div>

              {idCategoryFilter !== 'All' && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  {idCategoryFilter === 'Pupil' && idClassFilter !== 'All' && <button onClick={() => handleBulkDelete('class', idClassFilter)} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All {idClassFilter} Records</button>}
                  {idCategoryFilter === 'Pupil' && idClassFilter === 'All' && <button onClick={() => handleBulkDelete('category', 'Pupils')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Pupils</button>}
                  {idCategoryFilter === 'Teacher' && <button onClick={() => handleBulkDelete('category', 'Teaching Staff')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Teaching Staff</button>}
                  {idCategoryFilter === 'Non-Teaching' && <button onClick={() => handleBulkDelete('category', 'Non-Teaching Staff')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Non-Teaching Staff</button>}
                  {idCategoryFilter === 'Administrator' && <button onClick={() => handleBulkDelete('category', 'Administrators')} className="button-delete" style={{ padding: '8px 14px', background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '8px', fontWeight: '900', cursor: 'pointer', fontSize: '12px' }}>🗑️ Delete All Administrators</button>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <select value={idCategoryFilter} onChange={(e) => { setIdCategoryFilter(e.target.value); if (e.target.value !== 'Pupil') setIdClassFilter('All'); }} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', background: '#f8fafc' }}>
                  <option value="All">All Categories</option><option value="Pupil">Pupils</option><option value="Teacher">Teaching Staff</option><option value="Non-Teaching">Non-Teaching Staff</option><option value="Administrator">Administrators</option>
                </select>
                {idCategoryFilter === 'Pupil' && (
                  <select value={idClassFilter} onChange={(e) => setIdClassFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', background: '#f8fafc' }}>
                    <option value="All">All Classes</option>{schoolClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
                  </select>
                )}
              </div>

              <div className="badge-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredBadges.map((user) => (
                  <div key={user.id} className="pop-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '2px solid #991b1b', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '900', color: '#991b1b' }}>Mother Mary Primary School Limited</h3>
                    <p style={{ margin: '0 0 16px 0', fontSize: '11px', color: '#475569', fontWeight: '700' }}>P.O. Box 115301 Wakiso</p>
                    <div style={{ background: '#ffffff', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '14px' }}>
                      <QRCode id={`qr-svg-${user.id}`} value={user.qrCodeData} size={80} level="H" />
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '900', color: '#0f172a' }}>{user.name}</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748b', fontWeight: '700' }}>{user.category} {user.class ? `• ${user.class}` : ''}</p>
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
            <div className="animated-pane" style={{ background: '#f8fafc', padding: isMobile ? '16px' : '32px', borderRadius: '20px', border: '1px solid #cbd5e1', maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', marginBottom: '10px' }}>Live QR Code Attendance Scanner</h2>
              <p style={{ fontSize: '13px', color: '#475569', marginBottom: '20px', fontWeight: '700' }}>Hold student or staff QR badge in front of camera to log arrival / scan-in</p>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1, minWidth: isMobile ? '100%' : '250px', height: '350px', background: '#0f172a', borderRadius: '12px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Scanner onScan={handleScan} onError={(error) => console.log(error)} />
                </div>
                <div style={{ width: isMobile ? '100%' : '250px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', maxHeight: '350px', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>Recent Scans</h3>
                  {scanLog.length === 0 ? <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>No scans yet.</p> : scanLog.map((entry, idx) => (
                    <div key={idx} style={{ padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#16a34a', fontWeight: '900' }}>✓</span>
                      <span style={{ fontWeight: '900', color: '#0f172a' }}>{entry.name}</span>
                      <span style={{ color: '#475569' }}> - {entry.time}</span>
                      <span style={{ marginLeft: 'auto', color: entry.status === 'Late' ? '#b45309' : entry.status === 'Departed' ? '#0369a1' : entry.status === 'Already Departed for Today' ? '#dc2626' : '#166534', fontWeight: '900', fontSize: '11px' }}>{entry.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* PENDING ATTENDANCE CONFIRMATION MODAL */}
      {modalCategory && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content animated-pane" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>Pending Confirmation - {modalCategory === 'pupil' ? 'Pupils' : modalCategory === 'teacher' ? 'Teaching Staff' : 'Non-Teaching Staff'}</h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', fontWeight: '900' }}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', fontWeight: '700' }}>The following individuals are currently marked as absent/pending. Click "Mark Present" to manually confirm their attendance.</p>
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {modalCategory === 'pupil' && pupils.filter(p => p.status === 'Absent').map((pupil) => (
                <div key={pupil.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div><p style={{ margin: 0, fontWeight: '900', color: '#0f172a' }}>{pupil.name}</p><p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{pupil.class}</p></div>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) handleManualMarkPresent(pupil.id, 'pupil', e.target.value); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700', cursor: 'pointer' }}><option value="" disabled>Mark Present...</option><option value="Forgot Badge">Forgot Badge / Lost Card</option><option value="Late Arrival">Late Arrival</option></select>
                </div>
              ))}
              {modalCategory === 'teacher' && teachers.filter(t => t.status === 'Absent').map((teacher) => (
                <div key={teacher.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div><p style={{ margin: 0, fontWeight: '900', color: '#0f172a' }}>{teacher.name}</p><p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Teaching Staff</p></div>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) handleManualMarkPresent(teacher.id, 'teacher', e.target.value); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700', cursor: 'pointer' }}><option value="" disabled>Mark Present...</option><option value="Forgot Badge">Forgot Badge / Lost Card</option><option value="Late Arrival">Late Arrival</option></select>
                </div>
              ))}
              {modalCategory === 'non-teaching' && nonTeaching.filter(n => n.status === 'Absent').map((staff) => (
                <div key={staff.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div><p style={{ margin: 0, fontWeight: '900', color: '#0f172a' }}>{staff.name}</p><p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{staff.role}</p></div>
                  <select defaultValue="" onChange={(e) => { if (e.target.value) handleManualMarkPresent(staff.id, 'non-teaching', e.target.value); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '700', cursor: 'pointer' }}><option value="" disabled>Mark Present...</option><option value="Forgot Badge">Forgot Badge / Lost Card</option><option value="Late Arrival">Late Arrival</option></select>
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
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>Attendance History: {historyModal.person.name}</h2>
              <button onClick={closeHistoryModal} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', fontWeight: '900' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div className="pop-card" style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#475569' }}>PRESENT DAYS</p><h3 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '900', color: '#16a34a' }}>{historyModal.person.attendanceCount || 0}</h3></div>
              <div className="pop-card" style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#475569' }}>ABSENT DAYS</p><h3 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '900', color: '#ea580c' }}>{getAttendanceStats(historyModal.person).absentDays}</h3></div>
              <div className="pop-card" style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', textAlign: 'center' }}><p style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#475569' }}>ATTENDANCE RATE</p><h3 style={{ margin: '6px 0 0', fontSize: '24px', fontWeight: '900', color: '#991b1b' }}>{getAttendanceStats(historyModal.person).attendanceRate}%</h3></div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '900', color: '#475569', marginBottom: '6px' }}>Inspect Specific Date</label>
              <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700' }} />
              {historyModal.person.attendanceHistory && historyModal.person.attendanceHistory[historyDate] ? (
                <div style={{ marginTop: '12px', background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: '900', color: '#0f172a' }}>Details for {historyDate}:</p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>Arrival Time: <strong>{historyModal.person.attendanceHistory[historyDate].arrivalTime}</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>Morning Status: <strong>{historyModal.person.attendanceHistory[historyDate].morningStatus}</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>Departure Time: <strong>{historyModal.person.attendanceHistory[historyDate].departureTime === '--' ? 'Not scanned out' : historyModal.person.attendanceHistory[historyDate].departureTime}</strong></p>
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#475569' }}>Evening Status: <strong>{historyModal.person.attendanceHistory[historyDate].eveningStatus}</strong></p>
                </div>
              ) : <p style={{ marginTop: '12px', fontSize: '13px', color: '#475569' }}>No record for this date.</p>}
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
              <button onClick={() => setBulkDeleteTarget(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', fontWeight: '900' }}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', fontWeight: '700' }}>You are about to permanently delete ALL records for: <strong>{bulkDeleteTarget.label}</strong>. This action cannot be undone. Please confirm to proceed.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setBulkDeleteTarget(null)} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '900', cursor: 'pointer' }}>Cancel</button>
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
              <button onClick={() => setRegistrationSuccess(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b', fontWeight: '900' }}>×</button>
            </div>
            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', fontWeight: '700' }}>
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