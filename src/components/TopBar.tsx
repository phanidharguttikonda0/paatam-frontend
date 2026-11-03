import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  ChevronDown,
  Building2,
  LogOut,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkSystemHealth, API_BASE_URL } from '../config/api';

export default function TopBar() {
  const navigate = useNavigate();
  const {
    currentUser,
    role,
    branches,
    currentBranchId,
    setCurrentBranchId,
    logout
  } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ status: string; timestamp?: string } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    checkSystemHealth().then(setHealthStatus);
    const interval = setInterval(() => {
      checkSystemHealth().then(setHealthStatus);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live notifications strictly from backend API (GET /api/notifications or GET /api/student/notifications)
  useEffect(() => {
    if (!currentUser) return;
    const fetchLiveNotifications = async () => {
      try {
        const ep = role === 'STUDENT' ? `${API_BASE_URL}/api/student/notifications` : `${API_BASE_URL}/api/notifications`;
        const res = await fetch(ep);
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json.data) ? json.data : Array.isArray(json.notifications) ? json.notifications : [];
          setNotifications(list);
          setHasUnreadNotifications(list.length > 0);
        } else {
          setNotifications([]);
          setHasUnreadNotifications(false);
        }
      } catch {
        setNotifications([]);
        setHasUnreadNotifications(false);
      }
    };
    fetchLiveNotifications();
  }, [role, currentUser]);

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close popups on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute initials (e.g. "Mohit Yadav" -> "MY")
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();

    if (role === 'STUDENT') {
      navigate('/student');
      return;
    }

    if (role === 'CORPORATE_ADMIN' || role === 'SUPER_ADMIN') {
      if (q.includes('faculty') || q.includes('teacher') || q.includes('staff')) {
        navigate('/teachers');
      } else if (q.includes('class') || q.includes('grade') || q.includes('section')) {
        navigate('/classes');
      } else if (q.includes('submi') || q.includes('grade') || q.includes('review')) {
        navigate('/submissions');
      } else if (q.includes('analytic') || q.includes('report')) {
        navigate('/analytics');
      } else {
        navigate(`/campuses?search=${encodeURIComponent(searchQuery)}`);
      }
      return;
    }

    if (q.includes('student') || q.includes('roster')) {
      navigate('/students');
    } else if (q.includes('paper') || q.includes('exam')) {
      navigate('/generator');
    } else if (q.includes('class') || q.includes('section')) {
      navigate('/classes');
    } else if (q.includes('submi') || q.includes('grade') || q.includes('review')) {
      navigate('/submissions');
    } else {
      navigate(`/students?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getRoleLabel = (r?: string) => {
    switch (r?.toUpperCase()) {
      case 'CORPORATE_ADMIN':
      case 'SUPER_ADMIN':
        return 'Corporate Admin';
      case 'BRANCH_ADMIN':
      case 'DEAN':
      case 'PRINCIPAL':
      case 'VICE_PRINCIPAL':
      case 'ADMIN':
        return 'Dean & Principal';
      case 'TEACHER':
        return 'Faculty Teacher';
      case 'PARENT':
        return 'Parent';
      case 'STUDENT':
        return 'Student';
      default:
        return r || 'Dean & Principal';
    }
  };

  const roleLabel = getRoleLabel(role);

  // Zero mock notifications - mapped directly from backend GET /api/notifications

  if (!currentUser) return null;

  return (
    <header className="app-topbar no-print">
      {/* Left: Search input */}
      <form onSubmit={handleSearchSubmit} className="topbar-search-form">
        <div className="topbar-search-wrapper">
          <Search className="topbar-search-icon" size={17} />
          <input
            type="text"
            className="topbar-search-input"
            placeholder={
              role === 'CORPORATE_ADMIN' || role === 'SUPER_ADMIN'
                ? 'Search campuses, faculty, or classes...'
                : role === 'STUDENT'
                ? 'Search my test papers...'
                : 'Search students, papers, or classes...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </form>

      {/* Right: Notification Bell & User Profile */}
      <div className="topbar-right-group">
        {/* System Health Status Indicator (GET /api/health) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 9px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            background: healthStatus?.status === 'offline' ? '#FEF2F2' : '#ECFDF5',
            color: healthStatus?.status === 'offline' ? '#991B1B' : '#065F46',
            border: `1px solid ${healthStatus?.status === 'offline' ? '#FECACA' : '#A7F3D0'}`,
            cursor: 'default'
          }}
          title={healthStatus?.timestamp ? `Paatam API Live (${healthStatus.timestamp})` : 'Paatam Cloud Connection'}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: healthStatus?.status === 'offline' ? '#EF4444' : '#10B981',
              display: 'inline-block'
            }}
          />
          <span style={{ textTransform: 'capitalize' }}>
            {healthStatus?.status === 'ok' ? 'Cloud Online' : healthStatus?.status || 'Online'}
          </span>
        </div>

        {/* Notification Bell */}
        <div className="topbar-relative-container" ref={notificationsRef}>
          <button
            type="button"
            className="topbar-icon-button"
            title="Notifications"
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
              setHasUnreadNotifications(false);
            }}
          >
            <Bell size={18} className="text-slate-600" />
            {hasUnreadNotifications && <span className="topbar-badge-dot" />}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="topbar-dropdown-menu notifications-menu animate-fade-in">
              <div className="dropdown-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
                    Notifications
                  </h4>
                  <span style={{ fontSize: '0.6875rem', color: '#2563EB', fontWeight: 600 }}>
                    {notifications.length} Alert(s)
                  </span>
                </div>
              </div>

              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748B', fontSize: '0.8125rem' }}>
                    No unread notifications from server
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id || notif._id}
                      className="notification-item"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        if (notif.path) navigate(notif.path);
                      }}
                    >
                      <div className="notification-item-icon">
                        <FileCheck2 size={15} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="notification-item-title">{notif.title || notif.type || 'Notification'}</div>
                        <div className="notification-item-desc">{notif.desc || notif.message || notif.recipient || 'Delivery update'}</div>
                        <div className="notification-item-time">{notif.time || notif.created_at || notif.status || ''}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill Capsule */}
        <div className="topbar-relative-container" ref={profileRef}>
          <button
            type="button"
            className={`topbar-profile-capsule ${isProfileOpen ? 'active' : ''}`}
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            title="Switch User Persona or Campus"
          >
            <div className="topbar-avatar-circle">
              {getInitials(currentUser.name)}
            </div>
            <div className="topbar-user-text">
              <span className="topbar-user-name">{currentUser.name}</span>
              <span className="topbar-user-role">{roleLabel}</span>
            </div>
            <ChevronDown size={15} className={`topbar-chevron ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Profile & Persona Switcher Menu */}
          {isProfileOpen && (
            <div className="topbar-dropdown-menu profile-menu animate-fade-in">
              {/* User Header Details */}
              <div className="profile-menu-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="topbar-avatar-circle large">
                    {getInitials(currentUser.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0F172A' }}>
                      {currentUser.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {currentUser.email}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className={`role-tag role-${role.toLowerCase()}`}>
                    {roleLabel}
                  </span>
                  <span className="branch-tag">
                    {branches.find(b => b.id === currentBranchId)?.name || (['CORPORATE_ADMIN', 'SUPER_ADMIN'].includes(role) ? 'Institutional Network' : 'Assigned Campus')}
                  </span>
                </div>
              </div>

              {/* Persona Switcher Section */}
              {/* Campus / Branch Selector */}
              {role !== 'STUDENT' && branches.length > 0 && (
                <div className="profile-menu-section">
                  <div className="section-label">ACTIVE CAMPUS / BRANCH</div>
                  <div className="campus-select-wrapper">
                    <Building2 size={14} className="text-slate-400" />
                    <select
                      value={currentBranchId}
                      onChange={(e) => setCurrentBranchId(e.target.value)}
                      className="topbar-campus-select"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Bottom Menu Actions */}
              <div className="profile-menu-footer">
                <button
                  type="button"
                  className="dropdown-action-btn text-destructive"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                    navigate('/login');
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
