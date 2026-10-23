import React, { useState, useMemo } from 'react';
import { FileBarChart2, RotateCcw } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  DateRangeControl,
  EmptyState,
} from '../../components/ui/PageControls';
import { formatCurrency } from '../../utils/formatters';

export const HotelOperationsReportsPage: React.FC = () => {
  const { bookings, rooms, roomTypes, guests, selectedBranchId, settings } = useHotel();
  const sym = settings.currencySymbol;

  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('2026-10-01');
  const [dateTo, setDateTo] = useState<string>('2026-10-31');

  const branchBookings = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? bookings
        : bookings.filter((b) => b.branchId === selectedBranchId),
    [bookings, selectedBranchId]
  );

  // Determine total historical bookings per guest to classify Returning vs New
  const guestBookingCounts = useMemo(() => {
    const counts = new Map<string, number>();
    branchBookings
      .filter((b) => b.bookingStatus !== 'Cancelled')
      .forEach((b) => {
        const key = b.guestId || b.guestName.trim().toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    return counts;
  }, [branchBookings]);

  // Filtered non-cancelled bookings in reporting period
  const filteredBookings = useMemo(() => {
    return branchBookings.filter((b) => {
      if (b.bookingStatus === 'Cancelled') return false;
      if (dateFrom && b.checkOutDate < dateFrom) return false;
      if (dateTo && b.checkInDate > dateTo) return false;
      if (paymentMethodFilter !== 'ALL' && b.paymentMethod !== paymentMethodFilter) {
        return false;
      }
      if (roomTypeFilter !== 'ALL') {
        const rm = rooms.find((r) => r.id === b.roomId);
        if (!rm || rm.roomTypeId !== roomTypeFilter) return false;
      }
      return true;
    });
  }, [branchBookings, rooms, roomTypeFilter, paymentMethodFilter, dateFrom, dateTo]);

  // Pivot rows grouped by Room Type
  const pivotRows = useMemo(() => {
    const visibleRoomTypes =
      roomTypeFilter === 'ALL'
        ? roomTypes
        : roomTypes.filter((rt) => rt.id === roomTypeFilter);

    const totalRevenueAll = filteredBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    return visibleRoomTypes.map((rt) => {
      const rtRoomIds = new Set(
        rooms.filter((r) => r.roomTypeId === rt.id).map((r) => r.id)
      );
      const rtBookings = filteredBookings.filter((b) => rtRoomIds.has(b.roomId));

      const uniqueGuestKeys = new Set<string>();
      const returningGuestKeys = new Set<string>();
      const newGuestKeys = new Set<string>();

      let cashRevenue = 0;
      let transferRevenue = 0;
      let cardRevenue = 0;
      let totalRevenue = 0;
      let totalNights = 0;

      rtBookings.forEach((b) => {
        const key = b.guestId || b.guestName.trim().toLowerCase();
        uniqueGuestKeys.add(key);

        const guestProfile = guests.find((g) => g.id === b.guestId);
        const totalStays = guestBookingCounts.get(key) || 1;
        const isReturning =
          totalStays > 1 ||
          guestProfile?.guestType === 'VIP' ||
          guestProfile?.guestType === 'Regular' ||
          guestProfile?.guestType === 'Corporate';

        if (isReturning) {
          returningGuestKeys.add(key);
        } else {
          newGuestKeys.add(key);
        }

        if (b.paymentMethod === 'Cash') cashRevenue += b.totalAmount;
        else if (b.paymentMethod === 'Bank Transfer') transferRevenue += b.totalAmount;
        else if (b.paymentMethod === 'Card') cardRevenue += b.totalAmount;

        totalRevenue += b.totalAmount;
        totalNights += b.nights || 1;
      });

      const sharePct =
        totalRevenueAll > 0 ? Math.round((totalRevenue / totalRevenueAll) * 100) : 0;

      return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        bookingsCount: rtBookings.length,
        totalNights,
        uniqueCustomers: uniqueGuestKeys.size,
        returningCustomers: returningGuestKeys.size,
        newCustomers: newGuestKeys.size,
        cashRevenue,
        transferRevenue,
        cardRevenue,
        totalRevenue,
        sharePct,
      };
    });
  }, [roomTypes, rooms, filteredBookings, guests, guestBookingCounts, roomTypeFilter]);

  // Overall Totals & Highlights
  const summary = useMemo(() => {
    const allUniqueGuests = new Set<string>();
    const allReturningGuests = new Set<string>();
    const allNewGuests = new Set<string>();

    filteredBookings.forEach((b) => {
      const key = b.guestId || b.guestName.trim().toLowerCase();
      allUniqueGuests.add(key);
      const guestProfile = guests.find((g) => g.id === b.guestId);
      const totalStays = guestBookingCounts.get(key) || 1;
      const isReturning =
        totalStays > 1 ||
        guestProfile?.guestType === 'VIP' ||
        guestProfile?.guestType === 'Regular' ||
        guestProfile?.guestType === 'Corporate';
      if (isReturning) allReturningGuests.add(key);
      else allNewGuests.add(key);
    });

    const totalBookings = pivotRows.reduce((s, r) => s + r.bookingsCount, 0);
    const totalNights = pivotRows.reduce((s, r) => s + r.totalNights, 0);
    const cashRevenue = pivotRows.reduce((s, r) => s + r.cashRevenue, 0);
    const transferRevenue = pivotRows.reduce((s, r) => s + r.transferRevenue, 0);
    const cardRevenue = pivotRows.reduce((s, r) => s + r.cardRevenue, 0);
    const totalRevenue = pivotRows.reduce((s, r) => s + r.totalRevenue, 0);

    const bestByRevenue =
      [...pivotRows].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || null;
    const mostBooked =
      [...pivotRows].sort((a, b) => b.bookingsCount - a.bookingsCount)[0] || null;

    return {
      totalBookings,
      totalNights,
      uniqueCustomers: allUniqueGuests.size,
      returningCustomers: allReturningGuests.size,
      newCustomers: allNewGuests.size,
      cashRevenue,
      transferRevenue,
      cardRevenue,
      totalRevenue,
      bestByRevenue:
        bestByRevenue && bestByRevenue.totalRevenue > 0 ? bestByRevenue : null,
      mostBooked: mostBooked && mostBooked.bookingsCount > 0 ? mostBooked : null,
    };
  }, [pivotRows, filteredBookings, guests, guestBookingCounts]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Booking & Room Performance Report"
        actions={
          <DateRangeControl
            fromDate={dateFrom}
            toDate={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
        }
      />

      {/* Filter Bar & Summary Highlights */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Dropdown
            value={roomTypeFilter}
            onChange={setRoomTypeFilter}
            size="sm"
            className="w-48"
            options={[
              { value: 'ALL', label: 'All Room Types' },
              ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
            ]}
          />

          <Dropdown
            value={paymentMethodFilter}
            onChange={setPaymentMethodFilter}
            size="sm"
            className="w-48"
            options={[
              { value: 'ALL', label: 'All Payment Methods' },
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Card', label: 'Card' },
            ]}
          />

          {(roomTypeFilter !== 'ALL' || paymentMethodFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setRoomTypeFilter('ALL');
                setPaymentMethodFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] text-[#7463A6] hover:bg-[#F1EEF8] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Inline Performance Highlights (No KPI Cards) */}
        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[#6E6E6A]">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Top Revenue Room Type:</span>
            <span className="text-[#1E1E1E] font-medium">
              {summary.bestByRevenue
                ? `${summary.bestByRevenue.roomTypeName} (${formatCurrency(
                    summary.bestByRevenue.totalRevenue,
                    sym
                  )})`
                : '—'}
            </span>
          </div>
          <span className="text-[#E2E2DC] hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Most Booked Room Type:</span>
            <span className="text-[#1E1E1E] font-medium">
              {summary.mostBooked
                ? `${summary.mostBooked.roomTypeName} (${summary.mostBooked.bookingsCount} bookings)`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Pivot Summary Table */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {pivotRows.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="No booking records match the selected filters"
            description="Adjust the room type, payment method, or reporting period to inspect booking performance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EFEFEA] text-[11.5px] font-medium text-[#6E6E6A] whitespace-nowrap">
                  <th className="px-5 py-3.5">Room Type</th>
                  <th className="px-4 py-3.5 text-right">Bookings</th>
                  <th className="px-4 py-3.5 text-right">Room Nights</th>
                  <th className="px-4 py-3.5 text-right">Unique Customers</th>
                  <th className="px-4 py-3.5 text-right">Returning Customers</th>
                  <th className="px-4 py-3.5 text-right">New Customers</th>
                  <th className="px-4 py-3.5 text-right">Cash</th>
                  <th className="px-4 py-3.5 text-right">Bank Transfer</th>
                  <th className="px-4 py-3.5 text-right">Card</th>
                  <th className="px-5 py-3.5 text-right">Revenue Generated</th>
                  <th className="px-5 py-3.5 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2EE] text-[13px]">
                {pivotRows.map((row) => {
                  const isTopRevenue =
                    summary.bestByRevenue?.roomTypeId === row.roomTypeId &&
                    row.totalRevenue > 0;
                  const isMostBooked =
                    summary.mostBooked?.roomTypeId === row.roomTypeId &&
                    row.bookingsCount > 0;

                  return (
                    <tr
                      key={row.roomTypeId}
                      className="hover:bg-[#FAF9F6]/70 transition-colors whitespace-nowrap"
                    >
                      <td className="px-5 py-3.5 text-[#1E1E1E] font-normal">
                        <div className="flex items-center gap-2">
                          <span>{row.roomTypeName}</span>
                          {isTopRevenue && (
                            <span className="px-2 py-0.5 rounded-[5px] bg-[#F1EEF8] text-[#7463A6] text-[10.5px] font-medium">
                              Top Revenue
                            </span>
                          )}
                          {isMostBooked && !isTopRevenue && (
                            <span className="px-2 py-0.5 rounded-[5px] bg-[#E8F5F3] text-[#1D7A6E] text-[10.5px] font-medium">
                              Most Booked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#1E1E1E] tabular-nums">
                        {row.bookingsCount}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#6E6E6A] tabular-nums">
                        {row.totalNights}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#1E1E1E] tabular-nums">
                        {row.uniqueCustomers}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#1D7A6E] tabular-nums">
                        {row.returningCustomers}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#7463A6] tabular-nums">
                        {row.newCustomers}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#6E6E6A] tabular-nums">
                        {formatCurrency(row.cashRevenue, sym)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#6E6E6A] tabular-nums">
                        {formatCurrency(row.transferRevenue, sym)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#6E6E6A] tabular-nums">
                        {formatCurrency(row.cardRevenue, sym)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#1E1E1E] font-medium tabular-nums">
                        {formatCurrency(row.totalRevenue, sym)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#6E6E6A] tabular-nums">
                        {row.sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAF9F6] border-t border-[#E6E6E0] text-[13px] font-medium text-[#1E1E1E] whitespace-nowrap">
                  <td className="px-5 py-3.5">Total</td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {summary.totalBookings}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {summary.totalNights}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {summary.uniqueCustomers}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#1D7A6E] tabular-nums">
                    {summary.returningCustomers}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[#7463A6] tabular-nums">
                    {summary.newCustomers}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {formatCurrency(summary.cashRevenue, sym)}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {formatCurrency(summary.transferRevenue, sym)}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {formatCurrency(summary.cardRevenue, sym)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[#7463A6] tabular-nums">
                    {formatCurrency(summary.totalRevenue, sym)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums">
                    {summary.totalRevenue > 0 ? '100%' : '0%'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
