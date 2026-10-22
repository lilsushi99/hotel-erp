import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Shield,
  Plus,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { StaffMember, StaffRole, PermissionAction } from '../../types/hotel';
import { KpiCard } from '../../components/ui/KpiCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal } from '../../components/ui/Overlay';
import { EmptyState } from '../../components/ui/PageControls';

const ROLES: StaffRole[] = [
  'Administrator',
  'Manager',
  'Front Desk',
  'Accountant',
  'Inventory Officer',
  'Housekeeping',
  'Restaurant Staff',
  'Laundry Staff',
];

const DEPARTMENTS: string[] = [
  'Administration',
  'Front Desk',
  'Housekeeping',
  'Kitchen & Restaurant',
  'Bar & POS',
  'Laundry',
  'Finance',
  'Inventory',
];

const PERMISSION_KEYS: { key: PermissionAction; label: string }[] = [
  { key: 'View', label: 'View Records' },
  { key: 'Create', label: 'Create Records' },
  { key: 'Edit', label: 'Edit Records' },
  { key: 'Delete', label: 'Delete Records' },
  { key: 'Approve', label: 'Approve Actions' },
  { key: 'Manage Settings', label: 'Manage Settings' },
];

export const StaffPermissionsPage: React.FC = () => {
  const {
    staff,
    rolePermissions,
    selectedBranchId,
    branches,
    createStaff,
    updateStaff,
    deleteStaff,
    toggleRolePermission,
    notify,
  } = useHotel();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  // Add/Edit Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Front Desk' as StaffRole,
    department: 'Front Desk',
    jobTitle: '',
    status: 'Active' as StaffMember['status'],
    branchId: selectedBranchId === 'ALL' ? branches[0]?.id || 'BR-01' : selectedBranchId,
  });

  // Delete confirmation
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q) ||
        (member.jobTitle || '').toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'All' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || member.status === statusFilter;
      const matchesDept = departmentFilter === 'All' || member.department === departmentFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });
  }, [staff, searchQuery, roleFilter, statusFilter, departmentFilter]);

  const kpis = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((s) => s.status === 'Active' || s.status === 'On Shift').length;
    const rolesCount = new Set(staff.map((s) => s.role)).size;
    return { total, active, rolesCount };
  }, [staff]);

  const openAddStaff = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Front Desk',
      department: 'Front Desk',
      jobTitle: '',
      status: 'Active',
      branchId: selectedBranchId === 'ALL' ? branches[0]?.id || 'BR-01' : selectedBranchId,
    });
    setIsStaffModalOpen(true);
  };

  const openEditStaff = (member: StaffMember) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      department: member.department,
      jobTitle: member.jobTitle || '',
      status: member.status,
      branchId: member.branchId,
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    if (editingStaff) {
      updateStaff(editingStaff.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        department: formData.department,
        jobTitle: formData.jobTitle.trim() || formData.role,
        status: formData.status,
        branchId: formData.branchId,
      });
      notify('Staff Updated', `${formData.name.trim()} updated.`, 'success');
    } else {
      createStaff({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        department: formData.department,
        jobTitle: formData.jobTitle.trim() || formData.role,
        status: formData.status,
        branchId: formData.branchId,
      });
      notify('Staff Added', `${formData.name.trim()} added to staff directory.`, 'success');
    }
    setIsStaffModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!staffToDelete) return;
    deleteStaff(staffToDelete.id);
    notify('Staff Removed', `${staffToDelete.name} removed from staff directory.`, 'info');
    setStaffToDelete(null);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">
            Staff & Permissions
          </h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Manage team directory, department assignments, and role-based access rules.
          </p>
        </div>

        <button
          onClick={openAddStaff}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-[#7D53DE] text-white hover:bg-[#6B43C8] shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* KPIs (3 cards, no supporting subtext) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Staff"
          value={String(kpis.total)}
          icon={Users}
          tone="purple"
        />
        <KpiCard
          label="Active Staff"
          value={String(kpis.active)}
          icon={UserCheck}
          tone="emerald"
        />
        <KpiCard
          label="Configured Roles"
          value={String(kpis.rolesCount)}
          icon={Shield}
          tone="blue"
        />
      </div>

      {/* Staff Directory Table */}
      <div className="bg-[#F0F0F0] p-[3px] rounded-[20px]">
        <div className="px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#111827]">Staff Directory</h2>
            <p className="text-[12px] text-[#6B7280]">
              {filteredStaff.length} team member{filteredStaff.length === 1 ? '' : 's'} shown
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, role, email..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200/80 rounded-[10px] text-[12.5px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7D53DE]"
              />
            </div>

            <Dropdown
              value={departmentFilter}
              onChange={(val: string) => setDepartmentFilter(val)}
              options={[
                { label: 'All Departments', value: 'All' },
                ...DEPARTMENTS.map((d) => ({ label: d, value: d })),
              ]}
              size="sm"
            />

            <Dropdown
              value={roleFilter}
              onChange={(val: string) => setRoleFilter(val)}
              options={[
                { label: 'All Roles', value: 'All' },
                ...ROLES.map((r) => ({ label: r, value: r })),
              ]}
              size="sm"
            />

            <Dropdown
              value={statusFilter}
              onChange={(val: string) => setStatusFilter(val)}
              options={[
                { label: 'All Statuses', value: 'All' },
                { label: 'Active', value: 'Active' },
                { label: 'On Shift', value: 'On Shift' },
                { label: 'Inactive', value: 'Inactive' },
              ]}
              size="sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          {filteredStaff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff members found"
              description="Try adjusting your search or filter criteria."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Job Title & Dept</th>
                    <th className="py-3 px-4">Access Role</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-[13px]">
                  {filteredStaff.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-[#F9FAFB]/80 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#F3EEFF] text-[#7D53DE] flex items-center justify-center font-bold text-[12px] shrink-0">
                            {member.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111827]">{member.name}</div>
                            <div className="text-[11.5px] text-[#6B7280] mt-0.5">
                              {member.email} · {member.phone}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#111827]">
                          {member.jobTitle || member.role}
                        </div>
                        <div className="text-[11.5px] text-[#6B7280] mt-0.5">
                          {member.department}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-[11.5px] font-medium bg-gray-100 text-[#374151]">
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B7280] text-[12.5px]">
                        {member.lastActivity}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditStaff(member)}
                            className="p-1.5 rounded-[8px] text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setStaffToDelete(member)}
                            className="p-1.5 rounded-[8px] text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Role Permissions Matrix */}
      <div className="bg-[#F0F0F0] p-[3px] rounded-[20px]">
        <div className="px-4 py-3">
          <h2 className="text-[15px] font-bold text-[#111827]">Role Permissions Matrix</h2>
          <p className="text-[12px] text-[#6B7280] mt-0.5">
            Click any cell to grant or revoke module permissions for that role.
          </p>
        </div>

        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                <th className="py-3 px-4">Role / Modules Access</th>
                {PERMISSION_KEYS.map((perm) => (
                  <th key={perm.key} className="py-3 px-3 text-center">
                    {perm.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-[12.5px]">
              {rolePermissions.map((rp) => (
                <tr
                  key={rp.role}
                  className="hover:bg-[#F9FAFB]/80 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#111827]">{rp.role}</div>
                    <div className="text-[11px] text-[#6B7280]">
                      {rp.modulesAccess.join(' · ')}
                    </div>
                  </td>
                  {PERMISSION_KEYS.map((perm) => {
                    const allowed = rp.permissions[perm.key];
                    const isSuperAdmin = rp.role === 'Administrator';
                    return (
                      <td key={perm.key} className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={isSuperAdmin}
                          onClick={() => {
                            toggleRolePermission(rp.role, perm.key);
                          }}
                          className={`w-7 h-7 rounded-[8px] inline-flex items-center justify-center transition-colors ${
                            allowed
                              ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          } ${isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                          title={
                            isSuperAdmin
                              ? 'Administrator permissions cannot be revoked'
                              : `Toggle ${perm.label} for ${rp.role}`
                          }
                        >
                          {allowed ? (
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        title={editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Chinedu Okafor"
                className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:border-[#7D53DE]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Job Title / Position *
              </label>
              <input
                type="text"
                required
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="e.g., Head Chef, Waiter, Security Lead"
                className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:border-[#7D53DE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="staff@luminasuites.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:border-[#7D53DE]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+234 803 000 0000"
                className="w-full px-3 py-2 border border-gray-200 rounded-[10px] text-[13px] focus:outline-none focus:border-[#7D53DE]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Department
              </label>
              <Dropdown
                value={formData.department}
                onChange={(val: string) =>
                  setFormData({ ...formData, department: val })
                }
                options={DEPARTMENTS.map((d) => ({ label: d, value: d }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                System Access Role
              </label>
              <Dropdown
                value={formData.role}
                onChange={(val: string) => setFormData({ ...formData, role: val as StaffRole })}
                options={ROLES.map((r) => ({ label: r, value: r }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#374151] mb-1">
                Status
              </label>
              <Dropdown
                value={formData.status}
                onChange={(val: string) =>
                  setFormData({
                    ...formData,
                    status: val as StaffMember['status'],
                  })
                }
                options={[
                  { label: 'Active', value: 'Active' },
                  { label: 'On Shift', value: 'On Shift' },
                  { label: 'Inactive', value: 'Inactive' },
                ]}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsStaffModalOpen(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#4B5563] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-[#7D53DE] text-white hover:bg-[#6B43C8] transition-colors cursor-pointer"
            >
              {editingStaff ? 'Save Changes' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Confirmation Modal */}
      <Modal
        isOpen={Boolean(staffToDelete)}
        onClose={() => setStaffToDelete(null)}
        title="Remove Staff Member"
      >
        {staffToDelete && (
          <div className="space-y-4">
            <p className="text-[13px] text-[#4B5563]">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-[#111827]">{staffToDelete.name}</span> from
              the staff directory?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 rounded-[10px] text-[13px] font-medium text-[#4B5563] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Remove Staff
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default StaffPermissionsPage;
