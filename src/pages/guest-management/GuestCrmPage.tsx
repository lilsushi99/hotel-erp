import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Wallet,
  UserPlus,
  Eye,
  Edit3,
  Trash2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Guest, GuestStatus } from '../../types/hotel';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal, Drawer, ConfirmDialog } from '../../components/ui/Overlay';
import {
  PageHeader,
  SearchInput,
  StatusBadge,
  Pagination,
  EmptyState,
  DateRangeControl,
} from '../../components/ui/PageControls';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateReadable,
} from '../../utils/formatters';

type ServiceCategory = 'Rooms' | 'Laundry' | 'Bar & POS' | 'Restaurant';

export const GuestCrmPage: React.FC = () => {
  const {
    guests,
    bookings,
    roomTypes,
    posTransactions,
    laundryOrders,
    settings,
    updateGuest,
    deleteGuest,
    notify,
  } = useHotel();

  const sym = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  const [dateStart, setDateStart] = useState<string>('2026-10-01');
  const [dateEnd, setDateEnd] = useState<string>('2026-10-31');
  const [sortMode, setSortMode] = useState<'newest' | 'highest_spender'>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Profile Drawer & Modal states
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);

  // Edit Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<GuestStatus>('Active');

  const isWithinSelectedDates = (dateStr: string) => {
    if (dateStart && dateStr < dateStart) return false;
    if (dateEnd && dateStr > dateEnd) return false;
    return true;
  };

  // Enrich customers with dynamically computed visits, lifetime spend, last visit, room types booked, and multi-service activity
  const enrichedCustomers = useMemo(() => {
    return guests.map((g) => {
      const allGuestBookings = bookings.filter(
        (b) => b.guestId === g.id && b.bookingStatus !== 'Cancelled'
      );
      const allGuestPos = posTransactions.filter((t) => t.guestId === g.id);
      const allGuestLaundry = laundryOrders.filter((l) => l.guestId === g.id);

      const guestBookings = allGuestBookings.filter((b) =>
        isWithinSelectedDates(b.checkInDate)
      );
      const guestPos = allGuestPos.filter((t) => isWithinSelectedDates(t.date));
      const guestLaundry = allGuestLaundry.filter((l) =>
        isWithinSelectedDates(l.receivedDate)
      );

      const servicesUsed: ServiceCategory[] = [];
      if (allGuestBookings.length > 0) servicesUsed.push('Rooms');
      if (allGuestPos.some((t) => t.department === 'Bar & POS')) {
        servicesUsed.push('Bar & POS');
      }
      if (allGuestPos.some((t) => t.department === 'Kitchen & Restaurant')) {
        servicesUsed.push('Restaurant');
      }
      if (allGuestLaundry.length > 0) servicesUsed.push('Laundry');
      if (servicesUsed.length === 0) servicesUsed.push('Rooms');

      const bookedRoomTypeIds = Array.from(
        new Set(allGuestBookings.map((b) => b.roomTypeId))
      );

      const bookingSpend = guestBookings.reduce((s, b) => s + b.totalAmount, 0);
      const barSpend = guestPos
        .filter((t) => t.department === 'Bar & POS')
        .reduce((s, t) => s + t.totalAmount, 0);
      const restaurantSpend = guestPos
        .filter((t) => t.department === 'Kitchen & Restaurant')
        .reduce((s, t) => s + t.totalAmount, 0);
      const laundrySpend = guestLaundry.reduce((s, l) => s + l.totalAmount, 0);

      const lifetimeRevenue =
        bookingSpend + barSpend + restaurantSpend + laundrySpend;

      const totalTransactionsCount =
        guestBookings.length + guestPos.length + guestLaundry.length;
      const visits = Math.max(
        1,
        guestBookings.length > 0
          ? guestBookings.length
          : totalTransactionsCount
      );

      const activityDates = [
        ...allGuestBookings.map((b) => b.checkInDate),
        ...allGuestPos.map((t) => t.date),
        ...allGuestLaundry.map((l) => l.receivedDate),
      ].sort((a, b) => b.localeCompare(a));

      const lastVisit = activityDates[0] || g.createdAt;

      const outstandingBalance =
        allGuestBookings.reduce(
          (s, b) => s + Math.max(0, b.totalAmount - b.amountPaid),
          0
        ) +
        allGuestPos.reduce(
          (s, t) => s + Math.max(0, t.totalAmount - t.amountPaid),
          0
        ) +
        allGuestLaundry.reduce(
          (s, l) => s + Math.max(0, l.totalAmount - l.amountPaid),
          0
        );

      return {
        ...g,
        servicesUsed,
        serviceLabel: servicesUsed.join(' · '),
        bookedRoomTypeIds,
        visits,
        lifetimeRevenue,
        lastVisit,
        outstandingBalance,
        guestBookings: allGuestBookings,
        guestPos: allGuestPos,
        guestLaundry: allGuestLaundry,
        hasActivityInPeriod:
          !dateStart && !dateEnd
            ? true
            : totalTransactionsCount > 0 || isWithinSelectedDates(g.createdAt),
      };
    });
  }, [
    guests,
    bookings,
    posTransactions,
    laundryOrders,
    dateStart,
    dateEnd,
  ]);

  const periodCustomers = useMemo(
    () => enrichedCustomers.filter((c) => c.hasActivityInPeriod),
    [enrichedCustomers]
  );

  // 4 KPI Cards — Total Customers, Returning Customers, Total Customer Revenue, New Customers
  const kpis = useMemo(() => {
    const total = periodCustomers.length;
    const returning = periodCustomers.filter((g) => g.visits > 1).length;
    const totalRevenue = periodCustomers.reduce((s, g) => s + g.lifetimeRevenue, 0);
    const newCustomers = periodCustomers.filter(
      (g) => g.visits <= 1 || g.createdAt >= '2026-10-01'
    ).length;
    return { total, returning, totalRevenue, newCustomers };
  }, [periodCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodCustomers
      .filter((g) => {
        if (
          q &&
          !g.name.toLowerCase().includes(q) &&
          !g.id.toLowerCase().includes(q) &&
          !g.phone.toLowerCase().includes(q) &&
          !g.email.toLowerCase().includes(q)
        ) {
          return false;
        }
        if (
          roomTypeFilter !== 'ALL' &&
          !g.bookedRoomTypeIds.includes(roomTypeFilter)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'highest_spender') {
          return b.lifetimeRevenue - a.lifetimeRevenue;
        }
        return b.lastVisit.localeCompare(a.lastVisit);
      });
  }, [periodCustomers, search, roomTypeFilter, sortMode]);

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page]);

  const selectedCustomer = useMemo(
    () => enrichedCustomers.find((g) => g.id === selectedGuestId) || null,
    [enrichedCustomers, selectedGuestId]
  );

  const openEditCustomer = (g: Guest) => {
    setEditingGuest(g);
    setName(g.name);
    setPhone(g.phone);
    setSecondaryPhone(g.secondaryPhone || '');
    setEmail(g.email);
    setAddress(g.address);
    setStatus(g.status);
    setIsFormOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuest || !name.trim() || !phone.trim()) return;
    updateGuest(editingGuest.id, {
      name: name.trim(),
      phone: phone.trim(),
      secondaryPhone: secondaryPhone.trim() || undefined,
      email: email.trim(),
      address: address.trim(),
      status,
    });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Page Header with Date Range Filter (No Add Customer Profile button) */}
      <PageHeader
        title="Customer CRM"
        actions={
          <DateRangeControl
            fromDate={dateStart}
            toDate={dateEnd}
            onChange={(from, to) => {
              setDateStart(from);
              setDateEnd(to);
              setPage(1);
            }}
          />
        }
      />

      {/* 4 KPI Cards — Only Title, Icon, and Figure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Customers"
          value={kpis.total}
          icon={Users}
          iconTone="purple"
        />
        <KpiCard
          label="Returning Customers"
          value={kpis.returning}
          icon={UserCheck}
          iconTone="teal"
        />
        <KpiCard
          label="Total Customer Revenue"
          value={formatCompactCurrency(kpis.totalRevenue, sym)}
          fullValueTooltip={formatCurrency(kpis.totalRevenue, sym)}
          icon={Wallet}
          iconTone="green"
        />
        <KpiCard
          label="New Customers"
          value={kpis.newCustomers}
          icon={UserPlus}
          iconTone="amber"
        />
      </div>

      {/* Filters: Search, Room Type Filter, Date Range Filter, and Sort Dropdown */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search customer ID, name, phone, or email..."
            className="w-full sm:w-72"
          />

          <Dropdown
            value={roomTypeFilter}
            onChange={(v) => {
              setRoomTypeFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-48"
            options={[
              { value: 'ALL', label: 'All Room Types' },
              ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
            ]}
          />
        </div>

        <Dropdown
          value={sortMode}
          onChange={(v) => {
            setSortMode(v as 'newest' | 'highest_spender');
            setPage(1);
          }}
          size="sm"
          className="w-64"
          options={[
            { value: 'newest', label: 'Sort: Newest to Oldest' },
            {
              value: 'highest_spender',
              label: 'Sort: Highest Spender to Lowest Spender',
            },
          ]}
        />
      </div>

      {/* Customer CRM Table (Status column removed, all headers on one line) */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            title="No customer profiles found"
            description="Adjust your search, room type filter, or selected date range."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A] whitespace-nowrap">
                    <th className="py-3.5 px-5 whitespace-nowrap">Customer ID</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Name</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Email</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Visits</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">
                      Lifetime Revenue
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Last Visit</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Service Type</th>
                    <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                  {paginatedCustomers.map((g) => (
                    <tr
                      key={g.id}
                      onClick={() => setSelectedGuestId(g.id)}
                      className="hover:bg-[#F8F8F5] transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                        {g.id}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#1E1E1E] whitespace-nowrap">
                        {g.name}
                      </td>
                      <td className="py-3.5 px-4 text-[#4A4A46] tabular-nums whitespace-nowrap">
                        {g.phone}
                      </td>
                      <td className="py-3.5 px-4 text-[#6E6E6A] truncate max-w-[180px] whitespace-nowrap">
                        {g.email || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                        {g.visits}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                        <div>{formatCurrency(g.lifetimeRevenue, sym)}</div>
                        {g.outstandingBalance > 0 && (
                          <div className="text-[11px] font-normal text-[#B93829]">
                            Due: {formatCurrency(g.outstandingBalance, sym)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#6E6E6A] tabular-nums whitespace-nowrap">
                        {formatDateReadable(g.lastVisit)}
                      </td>
                      <td className="py-3.5 px-4 text-[12px] text-[#4A4A46] whitespace-nowrap">
                        {g.serviceLabel}
                      </td>
                      <td
                        className="py-3.5 px-5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedGuestId(g.id)}
                            className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#EFEFEA]"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditCustomer(g)}
                            className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#EFEFEA]"
                            title="Edit Customer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(g)}
                            className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#B93829] hover:bg-[#FCECE9]"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* VIEW CUSTOMER PROFILE SIDE DRAWER */}
      <Drawer
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedGuestId(null)}
        title={selectedCustomer ? selectedCustomer.name : 'Customer Profile'}
        subtitle={
          selectedCustomer
            ? `${selectedCustomer.id} · Since ${formatDateReadable(
                selectedCustomer.createdAt
              )}`
            : ''
        }
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 p-4 rounded-[12px] bg-[#F6F6F4] tabular-nums">
              <div>
                <div className="text-[11px] text-[#6E6E6A]">Lifetime Spend</div>
                <div className="text-[15px] font-medium text-[#1E1E1E] mt-0.5">
                  {formatCompactCurrency(selectedCustomer.lifetimeRevenue, sym)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E6E6A]">Total Visits</div>
                <div className="text-[15px] font-medium text-[#1E1E1E] mt-0.5">
                  {selectedCustomer.visits}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#6E6E6A]">Outstanding</div>
                <div
                  className={`text-[15px] font-medium mt-0.5 ${
                    selectedCustomer.outstandingBalance > 0
                      ? 'text-[#B93829]'
                      : 'text-[#1F7A4C]'
                  }`}
                >
                  {formatCurrency(selectedCustomer.outstandingBalance, sym)}
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Contact Details
              </h3>
              <div className="p-4 rounded-[12px] border border-[#EFEFEA] space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Phone Number</span>
                  <span className="font-medium text-[#1E1E1E] tabular-nums">
                    {selectedCustomer.phone}
                  </span>
                </div>
                {selectedCustomer.secondaryPhone && (
                  <div className="flex justify-between">
                    <span className="text-[#6E6E6A]">Secondary Phone</span>
                    <span className="text-[#1E1E1E] tabular-nums">
                      {selectedCustomer.secondaryPhone}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Email</span>
                  <span className="text-[#1E1E1E]">{selectedCustomer.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Address</span>
                  <span className="text-[#1E1E1E] text-right max-w-[220px]">
                    {selectedCustomer.address || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Services Used</span>
                  <span className="text-[#1E1E1E] font-medium">
                    {selectedCustomer.serviceLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Room Booking History */}
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Room Booking History ({selectedCustomer.guestBookings.length})
              </h3>
              {selectedCustomer.guestBookings.length === 0 ? (
                <div className="p-4 rounded-[12px] border border-[#EFEFEA] text-[13px] text-[#6E6E6A]">
                  No room bookings recorded.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.guestBookings.map((bk) => (
                    <div
                      key={bk.id}
                      className="p-3.5 rounded-[12px] border border-[#EFEFEA] flex items-center justify-between text-[13px]"
                    >
                      <div>
                        <div className="font-medium text-[#1E1E1E] tabular-nums">
                          {bk.id} · Room {bk.roomNumber}
                        </div>
                        <div className="text-[12px] text-[#6E6E6A] tabular-nums">
                          {formatDateReadable(bk.checkInDate)} →{' '}
                          {formatDateReadable(bk.checkOutDate)} ({bk.nights}n)
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-medium text-[#1E1E1E]">
                          {formatCurrency(bk.totalAmount, sym)}
                        </div>
                        <StatusBadge status={bk.bookingStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* POS & Laundry Service History */}
            {(selectedCustomer.guestPos.length > 0 ||
              selectedCustomer.guestLaundry.length > 0) && (
              <div className="space-y-2.5">
                <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                  Bar, Restaurant & Laundry Activity (
                  {selectedCustomer.guestPos.length +
                    selectedCustomer.guestLaundry.length}
                  )
                </h3>
                <div className="space-y-2">
                  {selectedCustomer.guestPos.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3.5 rounded-[12px] border border-[#EFEFEA] flex items-center justify-between text-[13px]"
                    >
                      <div>
                        <div className="font-medium text-[#1E1E1E] tabular-nums">
                          {tx.id} · {tx.department}
                        </div>
                        <div className="text-[12px] text-[#6E6E6A] tabular-nums">
                          {tx.dateTime}
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-medium text-[#1E1E1E]">
                          {formatCurrency(tx.totalAmount, sym)}
                        </div>
                        <StatusBadge status={tx.paymentStatus} />
                      </div>
                    </div>
                  ))}
                  {selectedCustomer.guestLaundry.map((lnd) => (
                    <div
                      key={lnd.id}
                      className="p-3.5 rounded-[12px] border border-[#EFEFEA] flex items-center justify-between text-[13px]"
                    >
                      <div>
                        <div className="font-medium text-[#1E1E1E] tabular-nums">
                          {lnd.id} · Laundry ({lnd.garmentTag})
                        </div>
                        <div className="text-[12px] text-[#6E6E6A] tabular-nums">
                          {formatDateReadable(lnd.receivedDate)}
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-medium text-[#1E1E1E]">
                          {formatCurrency(lnd.totalAmount, sym)}
                        </div>
                        <StatusBadge status={lnd.workflowStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* EDIT CUSTOMER MODAL */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={
          editingGuest
            ? `Edit Customer: ${editingGuest.name}`
            : 'Edit Customer Profile'
        }
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Full Name <span className="text-[#B93829]">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chidi Nwosu"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#E2E2DC] text-[13.5px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Phone Number <span className="text-[#B93829]">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 000 0000"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#E2E2DC] text-[13.5px] tabular-nums focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@domain.com"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#E2E2DC] text-[13.5px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Victoria Island, Lagos"
                className="w-full px-3.5 py-2 rounded-[10px] border border-[#E2E2DC] text-[13.5px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EFEFEA]">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 rounded-[10px] text-[13px] font-normal bg-[#F6F6F4] text-[#4A4A46] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-[10px] text-[13px] font-medium bg-[#7463A6] hover:bg-[#635394] text-white cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            const res = deleteGuest(deleteTarget.id);
            if (!res.ok && res.error) {
              notify('Cannot Delete Customer', res.error, 'error');
            }
          }
        }}
        title="Delete Customer Profile"
        description={`Remove ${deleteTarget?.name} from the Customer CRM directory?`}
        confirmLabel="Delete Profile"
      />
    </div>
  );
};
