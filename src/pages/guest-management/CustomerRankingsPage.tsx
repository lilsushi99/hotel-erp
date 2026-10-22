import React, { useState, useMemo } from 'react';
import { Eye } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Dropdown } from '../../components/ui/Dropdown';
import { Drawer } from '../../components/ui/Overlay';
import {
  PageHeader,
  SearchInput,
  StatusBadge,
  CustomDateRangePicker,
  EmptyState,
} from '../../components/ui/PageControls';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateReadable,
} from '../../utils/formatters';

type SortOption =
  | 'revenue_desc'
  | 'revenue_asc'
  | 'visits_desc'
  | 'visits_asc';

type ServiceFilterOption =
  | 'ALL'
  | 'Rooms'
  | 'Laundry'
  | 'Bar & POS'
  | 'Restaurant';

export const CustomerRankingsPage: React.FC = () => {
  const { guests, bookings, posTransactions, laundryOrders, settings } = useHotel();
  const sym = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('revenue_desc');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilterOption>('ALL');
  const [dateStart, setDateStart] = useState<string>('');
  const [dateEnd, setDateEnd] = useState<string>('');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  const isWithinDateRange = (dateStr: string) => {
    if (dateStart && dateStr < dateStart) return false;
    if (dateEnd && dateStr > dateEnd) return false;
    return true;
  };

  const customerReportRows = useMemo(() => {
    const computed = guests.map((g) => {
      const allBookings = bookings.filter(
        (b) => b.guestId === g.id && b.bookingStatus !== 'Cancelled'
      );
      const allPos = posTransactions.filter((t) => t.guestId === g.id);
      const allLaundry = laundryOrders.filter((l) => l.guestId === g.id);

      const gBookings = allBookings.filter((b) =>
        isWithinDateRange(b.checkInDate)
      );
      const gPos = allPos.filter((t) => isWithinDateRange(t.date));
      const gLaundry = allLaundry.filter((l) =>
        isWithinDateRange(l.receivedDate)
      );

      const servicesUsed: ServiceFilterOption[] = [];
      if (allBookings.length > 0) servicesUsed.push('Rooms');
      if (allPos.some((t) => t.department === 'Bar & POS')) {
        servicesUsed.push('Bar & POS');
      }
      if (allPos.some((t) => t.department === 'Kitchen & Restaurant')) {
        servicesUsed.push('Restaurant');
      }
      if (allLaundry.length > 0) servicesUsed.push('Laundry');
      if (servicesUsed.length === 0) servicesUsed.push('Rooms');

      const roomSpend = gBookings.reduce((s, b) => s + b.totalAmount, 0);
      const barSpend = gPos
        .filter((t) => t.department === 'Bar & POS')
        .reduce((s, t) => s + t.totalAmount, 0);
      const restaurantSpend = gPos
        .filter((t) => t.department === 'Kitchen & Restaurant')
        .reduce((s, t) => s + t.totalAmount, 0);
      const laundrySpend = gLaundry.reduce((s, l) => s + l.totalAmount, 0);

      let lifetimeRevenue = roomSpend + barSpend + restaurantSpend + laundrySpend;
      if (serviceFilter === 'Rooms') lifetimeRevenue = roomSpend;
      if (serviceFilter === 'Bar & POS') lifetimeRevenue = barSpend;
      if (serviceFilter === 'Restaurant') lifetimeRevenue = restaurantSpend;
      if (serviceFilter === 'Laundry') lifetimeRevenue = laundrySpend;

      const totalPeriodRecords =
        gBookings.length + gPos.length + gLaundry.length;
      const visits = Math.max(
        dateStart || dateEnd ? 0 : 1,
        gBookings.length > 0 ? gBookings.length : totalPeriodRecords
      );

      const dates = [
        ...gBookings.map((b) => b.checkInDate),
        ...gPos.map((t) => t.date),
        ...gLaundry.map((l) => l.receivedDate),
      ].sort((a, b) => b.localeCompare(a));

      const lastVisit = dates[0] || g.createdAt;

      const outstandingBalance =
        allBookings.reduce(
          (s, b) => s + Math.max(0, b.totalAmount - b.amountPaid),
          0
        ) +
        allPos.reduce(
          (s, t) => s + Math.max(0, t.totalAmount - t.amountPaid),
          0
        ) +
        allLaundry.reduce(
          (s, l) => s + Math.max(0, l.totalAmount - l.amountPaid),
          0
        );

      return {
        ...g,
        servicesUsed,
        serviceLabel: servicesUsed.join(' · '),
        visits,
        roomSpend,
        barSpend,
        restaurantSpend,
        laundrySpend,
        lifetimeRevenue,
        outstandingBalance,
        lastVisit,
        allBookings,
        allPos,
        allLaundry,
        hasActivityInRange:
          !dateStart && !dateEnd ? true : totalPeriodRecords > 0,
      };
    });

    const filtered = computed.filter((item) => {
      if (!item.hasActivityInRange) return false;
      if (
        serviceFilter !== 'ALL' &&
        !item.servicesUsed.includes(serviceFilter)
      ) {
        return false;
      }
      const q = search.trim().toLowerCase();
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.id.toLowerCase().includes(q) &&
        !item.email.toLowerCase().includes(q) &&
        !item.phone.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'revenue_desc') return b.lifetimeRevenue - a.lifetimeRevenue;
      if (sortBy === 'revenue_asc') return a.lifetimeRevenue - b.lifetimeRevenue;
      if (sortBy === 'visits_desc') {
        return b.visits - a.visits || b.lifetimeRevenue - a.lifetimeRevenue;
      }
      return a.visits - b.visits || a.lifetimeRevenue - b.lifetimeRevenue;
    });
  }, [
    guests,
    bookings,
    posTransactions,
    laundryOrders,
    dateStart,
    dateEnd,
    serviceFilter,
    search,
    sortBy,
  ]);

  const selectedCustomer = useMemo(
    () => customerReportRows.find((g) => g.id === selectedGuestId) || null,
    [customerReportRows, selectedGuestId]
  );

  return (
    <div className="space-y-5">
      {/* 10.1 Page Header — Customer Report with No Subtitle and No KPI Cards */}
      <PageHeader title="Customer Report" />

      {/* 10.3 Controls and Filters: Search + Sort Dropdown + Service Dropdown + Date Range Filter */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search customer ID, name, email, or phone..."
          className="w-full sm:w-72"
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <Dropdown
            value={sortBy}
            onChange={(v) => setSortBy(v as SortOption)}
            size="sm"
            className="w-52"
            options={[
              { value: 'revenue_desc', label: 'Highest Lifetime Revenue' },
              { value: 'revenue_asc', label: 'Lowest Lifetime Revenue' },
              { value: 'visits_desc', label: 'Most Visits' },
              { value: 'visits_asc', label: 'Fewest Visits' },
            ]}
          />

          <Dropdown
            value={serviceFilter}
            onChange={(v) => setServiceFilter(v as ServiceFilterOption)}
            size="sm"
            className="w-44"
            options={[
              { value: 'ALL', label: 'All Services' },
              { value: 'Rooms', label: 'Rooms' },
              { value: 'Laundry', label: 'Laundry' },
              { value: 'Bar & POS', label: 'Bar & POS' },
              { value: 'Restaurant', label: 'Restaurant' },
            ]}
          />

          <CustomDateRangePicker
            startDate={dateStart}
            endDate={dateEnd}
            allowClear={true}
            placeholder="All Dates"
            onApply={(start, end) => {
              setDateStart(start);
              setDateEnd(end);
            }}
            onClear={() => {
              setDateStart('');
              setDateEnd('');
            }}
          />
        </div>
      </div>

      {/* 10.4 Customer Report Table */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {customerReportRows.length === 0 ? (
          <EmptyState
            title="No matching customer records"
            description="Adjust your search, service filter, or date range."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A]">
                  <th className="py-3.5 px-5">Customer ID</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone Number</th>
                  <th className="py-3.5 px-4 text-right">Lifetime Revenue</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-5 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                {customerReportRows.map((g) => (
                  <tr
                    key={g.id}
                    onClick={() => setSelectedGuestId(g.id)}
                    className="hover:bg-[#F8F8F5] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                      {g.id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#1E1E1E]">
                      {g.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#6E6E6A] truncate max-w-[200px]">
                      {g.email || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-[#4A4A46] tabular-nums whitespace-nowrap">
                      {g.phone}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                      {formatCurrency(g.lifetimeRevenue, sym)}
                    </td>
                    <td className="py-3.5 px-4 text-[#6E6E6A] tabular-nums whitespace-nowrap">
                      {formatDateReadable(g.lastVisit)}
                    </td>
                    <td
                      className="py-3.5 px-5 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedGuestId(g.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[12px] font-medium text-[#7463A6] hover:bg-[#F1EEF8] transition-colors cursor-pointer"
                        title="View Customer Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Profile Drawer (Clean — No VIP & Concierge Notes) */}
      <Drawer
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedGuestId(null)}
        title={selectedCustomer ? selectedCustomer.name : 'Customer Summary'}
        subtitle={
          selectedCustomer
            ? `${selectedCustomer.id} · ${selectedCustomer.phone}`
            : ''
        }
      >
        {selectedCustomer && (
          <div className="space-y-5">
            <div className="p-4 rounded-[12px] bg-[#F6F6F4] grid grid-cols-3 gap-3 tabular-nums">
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
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Email</span>
                  <span className="text-[#1E1E1E]">
                    {selectedCustomer.email || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Address</span>
                  <span className="text-[#1E1E1E] text-right max-w-[220px]">
                    {selectedCustomer.address || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Services Used</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {selectedCustomer.serviceLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Revenue Breakdown by Service
              </h3>
              <div className="p-4 rounded-[12px] border border-[#EFEFEA] space-y-2 text-[13px] tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Rooms</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {formatCurrency(selectedCustomer.roomSpend, sym)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Bar & POS</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {formatCurrency(selectedCustomer.barSpend, sym)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Restaurant</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {formatCurrency(selectedCustomer.restaurantSpend, sym)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Laundry</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {formatCurrency(selectedCustomer.laundrySpend, sym)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                Booking History ({selectedCustomer.allBookings.length})
              </h3>
              {selectedCustomer.allBookings.length === 0 ? (
                <div className="p-4 rounded-[12px] border border-[#EFEFEA] text-[13px] text-[#6E6E6A]">
                  No room bookings recorded.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.allBookings.map((bk) => (
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
          </div>
        )}
      </Drawer>
    </div>
  );
};
