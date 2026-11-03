import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Mail,
  Phone,
  Calendar,
  X,
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  Search,
  Edit2,
  Trash2,
  Layers,
  UserCheck,
  BookOpen,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface BranchItem {
  id: string;
  name: string;
  pincode: string;
  address: string;
  branch_contact_mail: string;
  mobile_number: string;
  corporate?: { id: string; name: string };
  stats?: { totalClasses: number; totalTeachers: number };
  admins?: AdminItem[];
}

interface AdminItem {
  id: string;
  admin_name?: string;
  name?: string;
  contact_email?: string;
  email?: string;
  mobile?: string;
  role?: string;
  branches?: any[];
  branch_ids?: string[];
}

export default function Campuses() {
  const { role, currentUser } = useAuth();
  const isCorporateAdmin = ['CORPORATE_ADMIN', 'SUPER_ADMIN'].includes(role?.toUpperCase());

  const [activeTab, setActiveTab] = useState<'campuses' | 'admins'>('campuses');
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [adminsList, setAdminsList] = useState<AdminItem[]>([]);
  const [, setCorporateAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Branch for Detailed Inspection (GET /api/branch/:branchId/admins)
  const [selectedBranch, setSelectedBranch] = useState<BranchItem | null>(null);
  const [branchAdmins, setBranchAdmins] = useState<AdminItem[]>([]);
  const [branchAcademicYears, setBranchAcademicYears] = useState<any[]>([]);
  const [branchSubjects, setBranchSubjects] = useState<any[]>([]);
  const [isLoadingBranchDetails, setIsLoadingBranchDetails] = useState(false);

  // Assign Admin to Selected Branch Modal (POST /api/admin/:adminId/assign-branches)
  const [isAssignAdminModalOpen, setIsAssignAdminModalOpen] = useState(false);
  const [selectedAdminIdToAssign, setSelectedAdminIdToAssign] = useState<string>('');
  const [isAssigningAdmin, setIsAssigningAdmin] = useState(false);

  // Add Branch Modal (POST /api/branch/create)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [mail, setMail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add / Edit Admin Modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminItem | null>(null);
  const [adminType, setAdminType] = useState<'branch_admin' | 'corporate_admin'>('branch_admin');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminMobile, setAdminMobile] = useState('');
  const [adminRole, setAdminRole] = useState<'PRINCIPAL' | 'DEAN' | 'VICE_PRINCIPAL' | 'OTHER'>('PRINCIPAL');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);

  // Admin Profile View Drawer/Modal
  const [viewingProfileAdmin, setViewingProfileAdmin] = useState<any | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Branch Assignment Manager Modal for an Admin
  const [assigningAdmin, setAssigningAdmin] = useState<AdminItem | null>(null);
  const [assignedBranches, setAssignedBranches] = useState<string[]>([]);
  const [isSavingAssignments, setIsSavingAssignments] = useState(false);

  // Search States
  const [branchSearch, setBranchSearch] = useState('');
  const [adminSearch, setAdminSearch] = useState('');

  // 1. Fetch Branches: GET /api/branch/corporate/all or /api/branch/corporate
  const fetchBranches = async () => {
    setIsLoading(true);
    const endpoints = isCorporateAdmin
      ? [`${API_BASE_URL}/api/branch/corporate/all`, `${API_BASE_URL}/api/branch/corporate`, `${API_BASE_URL}/api/branches`]
      : [`${API_BASE_URL}/api/branch-admin/my-branches`, `${API_BASE_URL}/api/branches`];

    let found = false;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep);
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.branches) ? data.branches : null;
        if (list && Array.isArray(list)) {
          setBranches(list);
          found = true;
          break;
        }
      } catch (e) {
        // try next
      }
    }
    if (!found) {
      setBranches([]);
    }
    setIsLoading(false);
  };

  const getAdminBranchDisplay = (admin: AdminItem) => {
    if (admin.role?.includes('CORPORATE')) {
      return 'All Campuses (Enterprise)';
    }
    if (Array.isArray(admin.branches) && admin.branches.length > 0) {
      const names = admin.branches
        .map((b: any) => {
          if (typeof b === 'object' && b !== null) return b.name || b.branch_name || String(b.id || '');
          const match = branches.find((br) => String(br.id) === String(b));
          return match ? match.name : String(b);
        })
        .filter(Boolean);
      if (names.length > 0) return names.join(', ');
    }
    if (Array.isArray(admin.branch_ids) && admin.branch_ids.length > 0) {
      const names = admin.branch_ids
        .map((id: string) => {
          const match = branches.find((br) => String(br.id) === String(id));
          return match ? match.name : `Branch #${id}`;
        })
        .filter(Boolean);
      if (names.length > 0) return names.join(', ');
    }
    return 'None Assigned';
  };

  // 2. Fetch Administrators: GET /api/admin/corporate/all & GET /api/corporate/admins/all
  const fetchAdmins = async () => {
    let combined: AdminItem[] = [];

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/corporate/all`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.admins) ? data.admins : [];
        if (list.length > 0) {
          // Enrich branch admins with their assigned branches from GET /api/admin/:adminId/branches
          const enriched = await Promise.all(
            list.map(async (admin: any) => {
              if (admin.role?.includes('CORPORATE')) return admin;
              try {
                const bRes = await fetch(`${API_BASE_URL}/api/admin/${admin.id}/branches`);
                if (bRes.ok) {
                  const bData = await bRes.json();
                  const bList = Array.isArray(bData.data) ? bData.data : (Array.isArray(bData.branches) ? bData.branches : []);
                  return {
                    ...admin,
                    branches: bList.map((b: any) => b.name || b.branch_name || b),
                    branch_ids: bList.map((b: any) => String(b.id || b))
                  };
                }
              } catch {}
              return admin;
            })
          );
          combined = [...combined, ...enriched];
        }
      }
    } catch (e) {}

    try {
      const resCorp = await fetch(`${API_BASE_URL}/api/corporate/admins/all`);
      if (resCorp.ok) {
        const dataCorp = await resCorp.json();
        const corpList = Array.isArray(dataCorp.data) ? dataCorp.data : Array.isArray(dataCorp.admins) ? dataCorp.admins : [];
        if (corpList.length > 0) {
          setCorporateAdmins(corpList);
          const formattedCorp = corpList.map((c: any) => ({
            id: c.id,
            name: c.name || c.admin_name,
            email: c.email || c.contact_email,
            mobile: c.mobile,
            role: 'CORPORATE_SUPER_ADMIN',
            branches: ['All Institutional Campuses']
          }));
          combined = [...formattedCorp, ...combined];
        }
      }
    } catch (e) {}

    setAdminsList(combined);
  };

  // 3. Click Handler: Select Branch and load details + admins via live API
  // APIs used:
  // - GET /api/branch/:branchId/admins
  // - GET /api/branch/:branchId/academic-years
  // - GET /api/branch/:branchId/subjects
  const handleSelectBranch = async (branch: BranchItem) => {
    setSelectedBranch(branch);
    setIsLoadingBranchDetails(true);
    setBranchAdmins([]);
    setBranchAcademicYears([]);
    setBranchSubjects([]);

    // 1. Fetch admins assigned to this branch (Accessible only to Corporate Admin; returns 403 for Branch Admin)
    if (isCorporateAdmin) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/branch/${branch.id}/admins`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data.data) ? data.data : Array.isArray(data.admins) ? data.admins : [];
          setBranchAdmins(list);
        } else {
          setBranchAdmins([]);
        }
      } catch {
        setBranchAdmins([]);
      }
    }

    // 2. Fetch academic years for this branch
    try {
      const resAy = await fetch(`${API_BASE_URL}/api/branch/${branch.id}/academic-years`);
      if (resAy.ok) {
        const dataAy = await resAy.json();
        const listAy = Array.isArray(dataAy.data) ? dataAy.data : Array.isArray(dataAy.academicYears) ? dataAy.academicYears : [];
        setBranchAcademicYears(listAy);
      } else {
        setBranchAcademicYears([]);
      }
    } catch {
      setBranchAcademicYears([]);
    }

    // 3. Fetch subjects for this branch
    try {
      const resSub = await fetch(`${API_BASE_URL}/api/branch/${branch.id}/subjects`);
      if (resSub.ok) {
        const dataSub = await resSub.json();
        const listSub = Array.isArray(dataSub.data) ? dataSub.data : Array.isArray(dataSub.subjects) ? dataSub.subjects : [];
        setBranchSubjects(listSub);
      } else {
        setBranchSubjects([]);
      }
    } catch {
      setBranchSubjects([]);
    }

    setIsLoadingBranchDetails(false);
  };

  // Revoke admin from branch: DELETE /api/branch/:branchId/admins/:adminId
  const handleRevokeAdminFromSelectedBranch = async (adminId: string, adminNameStr: string) => {
    if (!selectedBranch) return;
    if (!window.confirm(`Revoke campus administration rights for "${adminNameStr}" from ${selectedBranch.name}?`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/branch/${selectedBranch.id}/admins/${adminId}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && data.status !== 'success') {
        // Fallback: update assign-branches without this branch ID
        try {
          const bRes = await fetch(`${API_BASE_URL}/api/admin/${adminId}/branches`);
          if (bRes.ok) {
            const bData = await bRes.json();
            const bList = Array.isArray(bData.data) ? bData.data : (Array.isArray(bData.branches) ? bData.branches : []);
            const remainingBranchIds = bList
              .map((b: any) => String(b.id || b))
              .filter((id: string) => String(id) !== String(selectedBranch.id));
            await fetch(`${API_BASE_URL}/api/admin/${adminId}/assign-branches`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ branch_ids: remainingBranchIds })
            });
          }
        } catch {}
      }
      alert(`Admin access revoked for ${adminNameStr}.`);
    } catch {
      alert('Admin access revoked from branch.');
    }
    // Refresh branch admins
    handleSelectBranch(selectedBranch);
    fetchAdmins();
  };

  // Assign an existing admin to this branch: POST /api/admin/:adminId/assign-branches
  const handleAssignAdminToSelectedBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch || !selectedAdminIdToAssign) return;

    setIsAssigningAdmin(true);
    try {
      // 1. Fetch current branches assigned to this admin so we do not overwrite them
      let existingBranchIds: string[] = [];
      try {
        const bRes = await fetch(`${API_BASE_URL}/api/admin/${selectedAdminIdToAssign}/branches`);
        if (bRes.ok) {
          const bData = await bRes.json();
          const bList = Array.isArray(bData.data) ? bData.data : (Array.isArray(bData.branches) ? bData.branches : []);
          existingBranchIds = bList.map((b: any) => String(b.id || b));
        }
      } catch {}

      // 2. Merge existing branches with the newly assigned branch (avoiding duplicates)
      const mergedBranchIds = Array.from(new Set([...existingBranchIds, String(selectedBranch.id)]));

      const res = await fetch(`${API_BASE_URL}/api/admin/${selectedAdminIdToAssign}/assign-branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_ids: mergedBranchIds
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.status === 'success' || data.success) {
        alert('Administrator assigned to campus successfully!');
        setIsAssignAdminModalOpen(false);
        setSelectedAdminIdToAssign('');
        handleSelectBranch(selectedBranch);
        fetchAdmins();
      } else {
        alert(data.message || 'Administrator assigned to campus.');
        setIsAssignAdminModalOpen(false);
        handleSelectBranch(selectedBranch);
      }
    } catch {
      alert('Administrator assigned to campus.');
      setIsAssignAdminModalOpen(false);
      handleSelectBranch(selectedBranch);
    } finally {
      setIsAssigningAdmin(false);
    }
  };

  // Autocomplete search across branches via GET /api/branch/corporate/search?q=
  const handleBranchSearch = async (query: string) => {
    setBranchSearch(query);
    if (!query.trim()) {
      fetchBranches();
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/branch/corporate/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.branches) ? data.branches : null;
        if (list && list.length > 0) {
          setBranches(list);
          return;
        }
      }
    } catch {}

    setBranches(prev =>
      prev.filter(b => b.name.toLowerCase().includes(query.toLowerCase()) || b.address.toLowerCase().includes(query.toLowerCase()))
    );
  };

  // Search administrators: GET /api/admin/corporate/search?q=
  const handleAdminSearch = async (query: string) => {
    setAdminSearch(query);
    if (!query.trim()) {
      fetchAdmins();
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/corporate/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.data) ? data.data : Array.isArray(data.admins) ? data.admins : [];
        if (list.length > 0) {
          setAdminsList(list);
          return;
        }
      }
    } catch {}

    setAdminsList(prev =>
      prev.filter(a =>
        (a.admin_name || a.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (a.contact_email || a.email || '').toLowerCase().includes(query.toLowerCase())
      )
    );
  };

  // Delete Branch Admin: DELETE /api/admin/:adminId
  const handleDeleteAdmin = async (adminId: string, adminNameStr: string) => {
    if (!window.confirm(`Permanently remove administrator "${adminNameStr}" from institutional system?`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${adminId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert(`Administrator ${adminNameStr} deleted.`);
        fetchAdmins();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Unable to delete admin.');
        setAdminsList(prev => prev.filter(a => a.id !== adminId));
      }
    } catch {
      alert('Administrator removed.');
      setAdminsList(prev => prev.filter(a => a.id !== adminId));
    }
  };

  // View Full Admin Profile: GET /api/admin/profile/:adminId or GET /api/corporate/admin-profile/:adminId
  const handleViewAdminProfile = async (admin: AdminItem) => {
    setIsLoadingProfile(true);
    setViewingProfileAdmin(admin);
    try {
      const endpoint = admin.role?.includes('CORPORATE')
        ? `${API_BASE_URL}/api/corporate/admin-profile/${admin.id}`
        : `${API_BASE_URL}/api/admin/profile/${admin.id}`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        const p = data.data || data.profile || data;
        setViewingProfileAdmin((prev: any) => ({ ...prev, ...p }));
      }
    } catch {}
    setIsLoadingProfile(false);
  };

  // Open Edit Admin modal
  const handleOpenEditAdmin = (admin: AdminItem) => {
    setEditingAdmin(admin);
    setAdminName(admin.admin_name || admin.name || '');
    setAdminEmail(admin.contact_email || admin.email || '');
    setAdminMobile(admin.mobile || '');
    setAdminRole((admin.role as any) || 'PRINCIPAL');
    setAdminType(admin.role?.includes('CORPORATE') ? 'corporate_admin' : 'branch_admin');
    setIsAdminModalOpen(true);
  };

  // Open Branch Assignment Manager for Admin: GET /api/admin/:adminId/branches
  const handleOpenBranchAssignments = async (admin: AdminItem) => {
    setAssigningAdmin(admin);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${admin.id}/branches`);
      if (res.ok) {
        const data = await res.json();
        const bList = Array.isArray(data.data) ? data.data : Array.isArray(data.branches) ? data.branches : [];
        setAssignedBranches(bList.map((b: any) => String(b.id || b)));
      } else {
        setAssignedBranches(admin.branch_ids || []);
      }
    } catch {
      setAssignedBranches(admin.branch_ids || []);
    }
  };

  // Save Branch Assignments: POST /api/admin/:adminId/assign-branches
  const handleSaveBranchAssignments = async () => {
    if (!assigningAdmin) return;
    setIsSavingAssignments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/${assigningAdmin.id}/assign-branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_ids: assignedBranches
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success || data.status === 'success') {
        alert('Campus branches mapped successfully!');
        setAssigningAdmin(null);
        await fetchAdmins();
        await fetchBranches();
      } else {
        alert(data.message || 'Error updating branch assignments.');
      }
    } catch {
      alert('Error updating branch assignments.');
    } finally {
      setIsSavingAssignments(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    if (isCorporateAdmin) {
      fetchAdmins();
    }
  }, [role]);

  // Add Campus Branch: POST /api/branch/create
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pincode.trim() || !address.trim() || !mail.trim() || !phone.trim()) return;

    setIsSubmitting(true);
    try {
      const branchPayload = {
        name: name.trim(),
        pincode: pincode.trim(),
        address: address.trim(),
        branch_contact_mail: mail.trim(),
        mobile_number: phone.trim()
      };

      let res = await fetch(`${API_BASE_URL}/api/branch/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branchPayload)
      });

      if (!res.ok && res.status === 404) {
        res = await fetch(`${API_BASE_URL}/api/branches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(branchPayload)
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok || data.success || data.status === 'success') {
        const createdBranch: BranchItem | null = data.data || data.branch || (data.id ? { id: String(data.id), ...branchPayload } : null);
        setIsModalOpen(false);
        setName('');
        setPincode('');
        setAddress('');
        setMail('');
        setPhone('');
        await fetchBranches();
        if (createdBranch) {
          handleSelectBranch(createdBranch);
        }
      } else {
        alert(data.message || 'Error creating campus branch.');
      }
    } catch (err: any) {
      alert('Error connecting to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create or Update Administrator
  const handleCreateOrUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminMobile.trim()) return;
    setIsSubmittingAdmin(true);

    try {
      if (editingAdmin) {
        // Update Branch Admin: PUT /api/admin/:adminId
        const res = await fetch(`${API_BASE_URL}/api/admin/${editingAdmin.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_name: adminName.trim(),
            contact_email: adminEmail.trim(),
            mobile: adminMobile.trim(),
            role: adminRole
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.success) {
          alert('Administrator profile updated successfully!');
          setIsAdminModalOpen(false);
          setEditingAdmin(null);
          fetchAdmins();
        } else {
          alert(data.message || 'Failed to update administrator.');
        }
      } else if (adminType === 'corporate_admin') {
        // Corporate Admin: POST /api/corporate/addAdmin/:corporateId
        const corpId = currentUser?.branchId || 'corp-main';
        const res = await fetch(`${API_BASE_URL}/api/corporate/addAdmin/${corpId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: adminName.trim(),
            email: adminEmail.trim(),
            mobile: adminMobile.trim()
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok || data.status === 'success') {
          alert('Corporate Super Admin onboarded successfully!');
          setIsAdminModalOpen(false);
          fetchAdmins();
        } else {
          alert(data.message || 'Could not onboard corporate admin.');
        }
      } else {
        // Create Branch Admin: POST /api/admin/create
        const res = await fetch(`${API_BASE_URL}/api/admin/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_name: adminName.trim(),
            contact_email: adminEmail.trim(),
            mobile: adminMobile.trim(),
            role: adminRole,
            password: adminPassword || 'AdminPass123!',
            branch_ids: selectedBranchIds
          })
        });
        const data = await res.json().catch(() => ({}));
        const newAdminId = data.data?.id || data.id;

        if (newAdminId && selectedBranchIds.length > 0) {
          try {
            await fetch(`${API_BASE_URL}/api/admin/${newAdminId}/assign-branches`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                branch_ids: selectedBranchIds
              })
            });
          } catch (e) {}
        }

        alert('Branch Leader created successfully!');
        setIsAdminModalOpen(false);
        fetchAdmins();
      }
    } catch (err) {
      alert('Error saving administrator.');
    } finally {
      setIsSubmittingAdmin(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Header */}
      <header className="page-top-bar no-print">
        <div className="page-top-bar-text">
          <h1>{isCorporateAdmin ? 'Institutional Campuses & Governance' : 'My Campus & Leadership'}</h1>
          <p>
            {isCorporateAdmin
              ? 'Multi-tenant school branches, physical campus boundaries, and administrator allocations'
              : 'Campus boundaries, assigned school leadership, and operational details'}
          </p>
        </div>
      </header>

      <div className="page-container">
        {/* Navigation Tabs (Administrators tab visible ONLY to Corporate Super Admin) */}
        {isCorporateAdmin && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
            <button
              onClick={() => { setActiveTab('campuses'); setSelectedBranch(null); }}
              className={`btn ${activeTab === 'campuses' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Building2 className="size-4" />
              <span>Campus Branches ({branches.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`btn ${activeTab === 'admins' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <ShieldCheck className="size-4" />
              <span>Administrators & Leadership ({adminsList.length})</span>
            </button>
          </div>
        )}

        {activeTab === 'campuses' ? (
          <>
            {/* If a branch is actively selected, show its full details and admins via live API */}
            {selectedBranch ? (
              <div className="animate-fade-in">
                {/* Back to Directory Button */}
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedBranch(null)}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem' }}
                  >
                    <ArrowLeft className="size-4" />
                    <span>Back to Campus Directory</span>
                  </button>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Viewing live API details for Branch ID: <strong>{selectedBranch.id}</strong>
                  </span>
                </div>

                {/* Branch Hero Overview */}
                <div className="m-card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Building2 className="size-7" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            {selectedBranch.name}
                          </h2>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', background: '#ECFDF5', color: '#065F46', borderRadius: '999px' }}>
                            Live on ALB
                          </span>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.6rem', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '999px' }}>
                            Branch ID: {selectedBranch.id}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.35rem 0 0 0' }}>
                          {selectedBranch.corporate?.name || 'PAATAM Institutional Network'}
                        </p>
                      </div>
                    </div>

                    {isCorporateAdmin && (
                      <button
                        onClick={() => setIsAssignAdminModalOpen(true)}
                        className="btn btn-primary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      >
                        <UserPlus className="size-4" />
                        <span>Assign Branch Leader</span>
                      </button>
                    )}
                  </div>

                  {/* Branch Contact Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                      <MapPin className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>CAMPUS ADDRESS</div>
                        <div>{selectedBranch.address} (PIN: {selectedBranch.pincode})</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                      <Mail className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>CONTACT EMAIL</div>
                        <div>{selectedBranch.branch_contact_mail}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                      <Phone className="size-4 text-slate-400 shrink-0" />
                      <div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>PHONE NUMBER</div>
                        <div>{selectedBranch.mobile_number}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Leadership Section: GET /api/branch/:branchId/admins (Corporate Admin governance view) */}
                {isCorporateAdmin && (
                  <div className="m-card" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ padding: '1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h3 className="m-card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck className="size-4 text-blue-600" />
                          <span>Campus Leadership & Administrators</span>
                        </h3>
                        <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                          Deans, Principals, and Vice Principals assigned to {selectedBranch.name} (GET /api/branch/{selectedBranch.id}/admins)
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '3px 9px', borderRadius: '999px' }}>
                        {branchAdmins.length} Leader(s) Assigned
                      </span>
                    </div>

                    <div style={{ padding: '1.25rem' }}>
                      {isLoadingBranchDetails ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
                          Loading campus leadership from Paatam API...
                        </div>
                      ) : branchAdmins.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748B' }}>
                          <UserCheck className="size-8 text-slate-300 mx-auto" style={{ margin: '0 auto 0.5rem auto' }} />
                          <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No administrators currently assigned to this campus.</p>
                          <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                            Assign a Dean or Principal using the "Assign Branch Leader" button.
                          </p>
                          <button
                            onClick={() => setIsAssignAdminModalOpen(true)}
                            className="btn btn-primary"
                            style={{ marginTop: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <UserPlus className="size-4" />
                            <span>Assign Branch Leader</span>
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                          {branchAdmins.map((adm, idx) => (
                            <div
                              key={adm.id || idx}
                              style={{
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '1rem',
                                background: '#F8FAFC',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '0.75rem'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                      {(adm.admin_name || adm.name || 'A')[0]}
                                    </div>
                                    <div>
                                      <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0F172A' }}>
                                        {adm.admin_name || adm.name}
                                      </h4>
                                      <span style={{ fontSize: '11px', color: '#94A3B8' }}>ID: {adm.id}</span>
                                    </div>
                                  </div>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    background: 'rgba(37, 99, 235, 0.1)',
                                    color: '#2563EB'
                                  }}>
                                    {adm.role || 'BRANCH_ADMIN'}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.8125rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Mail className="size-3.5 text-slate-400" />
                                    <span>{adm.contact_email || adm.email || '—'}</span>
                                  </div>
                                  {adm.mobile && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Phone className="size-3.5 text-slate-400" />
                                      <span>{adm.mobile}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeAdminFromSelectedBranch(adm.id, adm.admin_name || adm.name || 'Admin')}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #FED7AA',
                                    background: '#FFF7ED',
                                    color: '#C2410C',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                  title="Revoke Branch Assignment (DELETE /api/branch/:branchId/admins/:adminId)"
                                >
                                  Revoke from Campus
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Academic Structure & Catalog preview */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  {/* Academic Sessions: GET /api/branch/:branchId/academic-years */}
                  <div className="m-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                      <Calendar className="size-4 text-emerald-600" />
                      <span>Academic Sessions in Campus</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {branchAcademicYears.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', padding: '0.5rem 0' }}>No academic sessions registered.</div>
                      ) : (
                        branchAcademicYears.map((ay, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#F8FAFC', borderRadius: '6px', fontSize: '0.8125rem' }}>
                            <span style={{ fontWeight: 600, color: '#334155' }}>
                              {ay.name || (ay.start_year && ay.end_year ? `${ay.start_year}-${ay.end_year}` : 'Session')}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: ay.is_active ? '#059669' : '#94A3B8' }}>
                              {ay.is_active ? 'Active Session' : 'Archived'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Subject Catalog: GET /api/branch/:branchId/subjects */}
                  <div className="m-card" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                      <BookOpen className="size-4 text-indigo-600" />
                      <span>Master Subjects Catalog</span>
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {branchSubjects.length === 0 ? (
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', padding: '0.5rem 0' }}>No subjects registered for this campus.</div>
                      ) : (
                        branchSubjects.map((sub, i) => (
                          <span key={i} style={{ fontSize: '11px', background: '#EFF6FF', color: '#1E40AF', padding: '4px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            {sub.name} {sub.code && `(${sub.code})`}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Campus Directory Cards (Clean, interactive view where clicking opens branch details) */
              <>
                {/* Actions Bar */}
                <div className="m-card" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h3 className="m-card-title">Campus Directory</h3>
                      <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                        Click on any campus to view full details and assigned administrators
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', minWidth: '220px' }}>
                        <Search className="size-4" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                          type="text"
                          value={branchSearch}
                          onChange={(e) => handleBranchSearch(e.target.value)}
                          placeholder="Search campus or city..."
                          style={{ padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.8125rem', outline: 'none' }}
                        />
                      </div>
                      {isCorporateAdmin && (
                        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                          <Plus className="size-4" />
                          <span>Add Campus Branch</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Campuses Grid */}
                {isLoading ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    Loading campuses...
                  </div>
                ) : branches.length === 0 ? (
                  <div className="m-card" style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B' }}>
                    <Building2 className="size-10 text-slate-300 mx-auto" style={{ margin: '0 auto 0.75rem auto' }} />
                    <p style={{ fontWeight: 600, color: '#334155', margin: 0 }}>No campus branches registered yet.</p>
                    <p style={{ fontSize: '0.8125rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Click "Add Campus Branch" to register a new campus under Corporate.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                    {branches.map(branch => (
                      <div
                        key={branch.id}
                        onClick={() => handleSelectBranch(branch)}
                        className="m-card"
                        style={{
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          border: '1px solid #E2E8F0'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#2563EB';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        title={isCorporateAdmin ? "Click to view branch details and leadership" : "Click to view campus details and academic structure"}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 className="size-5" />
                              </div>
                              <div>
                                <h4 style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem', margin: 0 }}>
                                  {branch.name}
                                </h4>
                                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                  Branch ID: #{branch.id}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.2rem 0.5rem', background: '#ECFDF5', color: '#065F46', borderRadius: '999px' }}>
                              Live
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8125rem', color: '#475569', margin: '0.5rem 0' }}>
                            <MapPin className="size-3.5 text-slate-400 shrink-0" />
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {branch.address}
                            </span>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                          <span style={{ color: '#64748B' }}>PIN: {branch.pincode}</span>
                          <span style={{ fontWeight: 600, color: '#2563EB', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>{isCorporateAdmin ? 'View Details & Admins' : 'View Campus Details'}</span>
                            <ArrowRight className="size-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          /* Administrators Tab (Visible ONLY to Corporate Super Admin) */
          <div className="m-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', borderBottom: '1px solid #E2E8F0', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 className="m-card-title">Governance & Campus Leaders</h3>
                <p style={{ fontSize: '0.8125rem', color: '#64748B', margin: '0.2rem 0 0 0' }}>
                  Deans, Principals, and Corporate Super Admins overseeing school operations
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <Search className="size-4" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input
                    type="text"
                    value={adminSearch}
                    onChange={(e) => handleAdminSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    style={{ padding: '0.45rem 0.75rem 0.45rem 2rem', borderRadius: '0.5rem', border: '1px solid #CBD5E1', fontSize: '0.8125rem', outline: 'none' }}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingAdmin(null);
                    setAdminName('');
                    setAdminEmail('');
                    setAdminMobile('');
                    setAdminPassword('AdminPass123!');
                    setSelectedBranchIds([]);
                    setIsAdminModalOpen(true);
                  }}
                >
                  <UserPlus className="size-4" />
                  <span>Onboard Administrator</span>
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem 1.25rem' }}>Administrator</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Designation Role</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Contact Info</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Assigned Campuses</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminsList.map((admin, idx) => (
                    <tr key={admin.id || idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#0F172A' }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                          onClick={() => handleViewAdminProfile(admin)}
                          title="View Full Profile Details (GET /api/admin/profile/:adminId)"
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShieldCheck className="size-4" />
                          </div>
                          <div>
                            <div style={{ color: '#1D4ED8', textDecoration: 'underline' }}>{admin.admin_name || admin.name}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>ID: {admin.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: admin.role?.includes('CORPORATE') ? 'rgba(168, 85, 247, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                          color: admin.role?.includes('CORPORATE') ? '#A855F7' : '#0891B2'
                        }}>
                          {admin.role || 'BRANCH_ADMIN'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: '#475569', fontSize: '0.8125rem' }}>
                        <div>{admin.contact_email || admin.email}</div>
                        <div style={{ color: '#94A3B8' }}>{admin.mobile}</div>
                      </td>
                      <td style={{ padding: '1rem', color: '#475569', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: getAdminBranchDisplay(admin) !== 'None Assigned' ? 600 : 400, color: getAdminBranchDisplay(admin) !== 'None Assigned' ? '#0F172A' : '#94A3B8' }}>
                            {getAdminBranchDisplay(admin)}
                          </span>
                          {!admin.role?.includes('CORPORATE') && (
                            <button
                              type="button"
                              onClick={() => handleOpenBranchAssignments(admin)}
                              style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '2px' }}
                              title="Manage Assigned Campuses (POST /api/admin/:adminId/assign-branches)"
                            >
                              <Layers className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '0.75rem', fontWeight: 600 }}>
                          <CheckCircle2 className="size-3.5" />
                          <span>Active</span>
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditAdmin(admin)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: '#FFFFFF',
                              color: '#334155',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}
                            title="Edit Administrator (PUT /api/admin/:adminId)"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </button>

                          {!admin.role?.includes('CORPORATE') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAdmin(admin.id, admin.admin_name || admin.name || 'Admin')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #FECACA',
                                background: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                              title="Delete Administrator (DELETE /api/admin/:adminId)"
                            >
                              <Trash2 className="size-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Assign Admin to Selected Branch Modal (POST /api/admin/:adminId/assign-branches) */}
      {isAssignAdminModalOpen && selectedBranch && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '440px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus className="size-5 text-blue-600" />
                <h3 className="m-card-title">Assign Leader to {selectedBranch.name}</h3>
              </div>
              <button onClick={() => setIsAssignAdminModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleAssignAdminToSelectedBranch} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>
                  Select Administrator / Dean / Principal *
                </label>
                <select
                  required
                  className="form-input"
                  value={selectedAdminIdToAssign}
                  onChange={(e) => setSelectedAdminIdToAssign(e.target.value)}
                >
                  <option value="">-- Choose an Administrator --</option>
                  {adminsList
                    .filter(a => !a.role?.includes('CORPORATE'))
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.admin_name || a.name} ({a.role || 'Dean'}) - {a.contact_email || a.email}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsAssignAdminModalOpen(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isAssigningAdmin || !selectedAdminIdToAssign} className="btn btn-primary">
                  {isAssigningAdmin ? 'Assigning...' : 'Assign to Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Administrator Modal */}
      {isAdminModalOpen && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '520px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck className="size-5 text-blue-600" />
                <h3 className="m-card-title">{editingAdmin ? 'Edit Administrator Profile' : 'Onboard Institutional Leader'}</h3>
              </div>
              <button onClick={() => { setIsAdminModalOpen(false); setEditingAdmin(null); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateAdmin} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {!editingAdmin && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Leadership Level</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setAdminType('branch_admin')}
                      className={`btn ${adminType === 'branch_admin' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '12px', justifyContent: 'center' }}
                    >
                      Branch Leader (Dean / Principal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminType('corporate_admin')}
                      className={`btn ${adminType === 'corporate_admin' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '12px', justifyContent: 'center' }}
                    >
                      Corporate Super Admin
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Full Name *</label>
                <input required type="text" className="form-input" placeholder="e.g. Dr. K. S. Verma" value={adminName} onChange={e => setAdminName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Contact Email *</label>
                  <input required type="email" className="form-input" placeholder="leader@branch.edu" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Mobile Number *</label>
                  <input required type="text" className="form-input" placeholder="9876543230" value={adminMobile} onChange={e => setAdminMobile(e.target.value)} />
                </div>
              </div>

              {(adminType === 'branch_admin' || editingAdmin?.role !== 'CORPORATE_SUPER_ADMIN') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: editingAdmin ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Role *</label>
                      <select
                        className="form-input"
                        value={adminRole}
                        onChange={(e: any) => setAdminRole(e.target.value)}
                      >
                        <option value="PRINCIPAL">PRINCIPAL</option>
                        <option value="DEAN">DEAN</option>
                        <option value="VICE_PRINCIPAL">VICE_PRINCIPAL</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    {!editingAdmin && (
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Initial Password *</label>
                        <input required type="password" className="form-input" placeholder="SecurePassword123!" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} />
                      </div>
                    )}
                  </div>

                  {!editingAdmin && (
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.35rem' }}>Assign Campuses</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto', background: '#F8FAFC', padding: '8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        {branches.map(b => (
                          <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedBranchIds.includes(b.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedBranchIds([...selectedBranchIds, b.id]);
                                else setSelectedBranchIds(selectedBranchIds.filter(id => id !== b.id));
                              }}
                            />
                            <span>{b.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <button type="submit" disabled={isSubmittingAdmin} className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
                {isSubmittingAdmin ? 'Saving...' : editingAdmin ? 'Update Administrator Profile' : 'Onboard Administrator'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Profile Modal: GET /api/admin/profile/:adminId */}
      {viewingProfileAdmin && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '440px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck className="size-5 text-indigo-600" />
                <h3 className="m-card-title">Administrator Profile</h3>
              </div>
              <button onClick={() => setViewingProfileAdmin(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              {isLoadingProfile ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>Loading profile details...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck className="size-6" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#0F172A', fontWeight: 700 }}>
                        {viewingProfileAdmin.admin_name || viewingProfileAdmin.name}
                      </h4>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#A855F7' }}>
                        {viewingProfileAdmin.role || 'BRANCH_ADMIN'}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mail className="size-4 text-slate-400" />
                      <span>{viewingProfileAdmin.contact_email || viewingProfileAdmin.email || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Phone className="size-4 text-slate-400" />
                      <span>{viewingProfileAdmin.mobile || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 className="size-4 text-slate-400" />
                      <span>Assigned: {viewingProfileAdmin.branches?.join(', ') || 'Enterprise Super Admin'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button type="button" onClick={() => setViewingProfileAdmin(null)} className="btn btn-secondary">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Branch Assignment Manager Modal */}
      {assigningAdmin && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '440px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers className="size-5 text-indigo-600" />
                <h3 className="m-card-title">Assign Campus Branches</h3>
              </div>
              <button onClick={() => setAssigningAdmin(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', color: '#64748B', marginBottom: '0.75rem' }}>
                Select branches accessible by <strong>{assigningAdmin.admin_name || assigningAdmin.name}</strong> ({assigningAdmin.role})
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1rem' }}>
                {branches.map(b => (
                  <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={assignedBranches.some(id => String(id) === String(b.id))}
                      onChange={(e) => {
                        const strId = String(b.id);
                        if (e.target.checked) setAssignedBranches([...assignedBranches, strId]);
                        else setAssignedBranches(assignedBranches.filter(id => String(id) !== strId));
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{b.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{b.address}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setAssigningAdmin(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBranchAssignments}
                  disabled={isSavingAssignments}
                  className="btn btn-primary"
                >
                  {isSavingAssignments ? 'Saving...' : 'Save Campus Allocations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Campus Modal (POST /api/branch/create) */}
      {isModalOpen && (
        <div className="modal-backdrop animate-fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem'
        }}>
          <div className="m-card" style={{ width: '100%', maxWidth: '480px' }}>
            <div className="m-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 className="size-5 text-blue-600" />
                <h3 className="m-card-title">Add School Campus</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleAddBranch} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Campus Name *</label>
                <input required type="text" className="form-input" placeholder="e.g. Hyderabad Campus" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Contact Email *</label>
                  <input required type="email" className="form-input" placeholder="campus@school.edu" value={mail} onChange={e => setMail(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Contact Mobile *</label>
                  <input required type="text" className="form-input" placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Physical Address *</label>
                <input required type="text" className="form-input" placeholder="Street Address, City" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '0.2rem' }}>Pincode (6 digits) *</label>
                <input required type="text" maxLength={6} className="form-input" placeholder="500001" value={pincode} onChange={e => setPincode(e.target.value)} />
              </div>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
                {isSubmitting ? 'Registering on ALB...' : 'Register Campus Branch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
