import React, { useState, useMemo, useEffect } from 'react';
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
  const { bookings, rooms, roomTypes, selectedBranchId, settings } = useHotel();
  const sym = settings.currencySymbol;

  const [reportMode, setReportMode] = useState<'roomTypes' | 'rooms'>(
    roomTypes.length > 0 ? 'roomTypes' : 'rooms'
  );
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('2026-10-01');
  const [dateTo, setDateTo] = useState<string>('2026-10-31');

  useEffect(() => {
    if (roomTypes.length === 0 && reportMode === 'roomTypes') {
      setReportMode('rooms');
      setEntityFilter('ALL');
    }
  }, [roomTypes.length, reportMode]);

  const branchRooms = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? rooms
        : rooms.filter((r) => r.branchId === selectedBranchId),
    [rooms, selectedBranchId]
  );

  const branchBookings = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? bookings
        : bookings.filter((b) => b.branchId === selectedBranchId),
    [bookings, selectedBranchId]
  );

  // Filtered non-cancelled bookings in reporting period
  const filteredBookings = useMemo(() => {
    return branchBookings.filter((b) => {
      if (b.bookingStatus === 'Cancelled') return false;
      if (dateFrom && b.checkOutDate < dateFrom) return false;
      if (dateTo && b.checkInDate > dateTo) return false;
      if (entityFilter !== 'ALL') {
        if (reportMode === 'roomTypes') {
          const rm = rooms.find((r) => r.id === b.roomId);
          if (!rm || rm.roomTypeId !== entityFilter) return false;
        } else {
          if (b.roomId !== entityFilter) return false;
        }
      }
      return true;
    });
  }, [branchBookings, rooms, reportMode, entityFilter, dateFrom, dateTo]);

  // Pivot rows grouped by Room Type or Individual Room
  const pivotRows = useMemo(() => {
    const totalRevenueAll = filteredBookings.reduce((sum, b) => sum + b.totalAmount, 0);

    const accumulateBookings = (bList: typeof filteredBookings) => {
      let cashRevenue = 0;
      let transferRevenue = 0;
      let cardRevenue = 0;
      let totalRevenue = 0;

      bList.forEach((b) => {
        const collected =
          b.paymentStatus === 'Paid'
            ? b.totalAmount
            : Math.max(0, Math.min(b.totalAmount, b.amountPaid || 0));

        if (collected > 0) {
          if (b.paymentMethod === 'Cash') {
            cashRevenue += collected;
          } else if (b.paymentMethod === 'Bank Transfer') {
            transferRevenue += collected;
          } else if (b.paymentMethod === 'Card' || b.paymentMethod === 'POS Terminal') {
            cardRevenue += collected;
          }
        }
        totalRevenue += b.totalAmount;
      });

      const sharePct =
        totalRevenueAll > 0 ? Math.round((totalRevenue / totalRevenueAll) * 100) : 0;

      return {
        bookingsCount: bList.length,
        cashRevenue,
        transferRevenue,
        cardRevenue,
        totalRevenue,
        sharePct,
      };
    };

    if (reportMode === 'roomTypes' && roomTypes.length > 0) {
      const visibleRoomTypes =
        entityFilter === 'ALL'
          ? roomTypes
          : roomTypes.filter((rt) => rt.id === entityFilter);

      return visibleRoomTypes.map((rt) => {
        const rtRoomIds = new Set(
          branchRooms.filter((r) => r.roomTypeId === rt.id).map((r) => r.id)
        );
        const rtBookings = filteredBookings.filter(
          (b) => rtRoomIds.has(b.roomId) || b.roomTypeId === rt.id
        );
        return {
          id: rt.id,
          name: rt.name,
          ...accumulateBookings(rtBookings),
        };
      });
    }

    const visibleRooms =
      entityFilter === 'ALL'
        ? branchRooms
        : branchRooms.filter((r) => r.id === entityFilter);

    return visibleRooms.map((rm) => {
      const rt = roomTypes.find((t) => t.id === rm.roomTypeId);
      const rmBookings = filteredBookings.filter(
        (b) => b.roomId === rm.id || b.roomNumber === rm.roomNumber
      );
      return {
        id: rm.id,
        name: rt ? `Room ${rm.roomNumber} (${rt.name})` : `Room ${rm.roomNumber}`,
        ...accumulateBookings(rmBookings),
      };
    });
  }, [reportMode, roomTypes, branchRooms, filteredBookings, entityFilter]);

  // Overall Totals & Highlights
  const summary = useMemo(() => {
    const totalBookings = pivotRows.reduce((s, r) => s + r.bookingsCount, 0);
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
      cashRevenue,
      transferRevenue,
      cardRevenue,
      totalRevenue,
      bestByRevenue:
        bestByRevenue && bestByRevenue.totalRevenue > 0 ? bestByRevenue : null,
      mostBooked: mostBooked && mostBooked.bookingsCount > 0 ? mostBooked : null,
    };
  }, [pivotRows]);

  const entityFilterOptions = useMemo(() => {
    if (reportMode === 'roomTypes' && roomTypes.length > 0) {
      return [
        { value: 'ALL', label: 'All Room Types' },
        ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
      ];
    }
    return [
      { value: 'ALL', label: 'All Rooms' },
      ...branchRooms.map((rm) => ({
        value: rm.id,
        label: `Room ${rm.roomNumber}`,
      })),
    ];
  }, [reportMode, roomTypes, branchRooms]);

  const entityLabel = reportMode === 'roomTypes' && roomTypes.length > 0 ? 'Room Type' : 'Room';

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
          {roomTypes.length > 0 && (
            <Dropdown
              value={reportMode}
              onChange={(v) => {
                setReportMode(v as 'roomTypes' | 'rooms');
                setEntityFilter('ALL');
              }}
              size="sm"
              className="w-44"
              options={[
                { value: 'roomTypes', label: 'By Room Types' },
                { value: 'rooms', label: 'By Rooms' },
              ]}
            />
          )}

          <Dropdown
            value={entityFilter}
            onChange={setEntityFilter}
            size="sm"
            className="w-48"
            options={entityFilterOptions}
          />

          {entityFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setEntityFilter('ALL')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] text-[#7463A6] hover:bg-[#F1EEF8] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          )}
        </div>

        {/* Inline Performance Highlights */}
        <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[#6E6E6A]">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Top Revenue {entityLabel}:</span>
            <span className="text-[#1E1E1E] font-medium">
              {summary.bestByRevenue
                ? `${summary.bestByRevenue.name} (${formatCurrency(
                    summary.bestByRevenue.totalRevenue,
                    sym
                  )})`
                : '—'}
            </span>
          </div>
          <span className="text-[#E2E2DC] hidden sm:inline">|</span>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span>Most Booked {entityLabel}:</span>
            <span className="text-[#1E1E1E] font-medium">
              {summary.mostBooked
                ? `${summary.mostBooked.name} (${summary.mostBooked.bookingsCount} bookings)`
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
            description="Adjust the filter or reporting period to inspect booking performance."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EFEFEA] text-[11.5px] font-medium text-[#6E6E6A] whitespace-nowrap">
                  <th className="px-5 py-3.5">{entityLabel}</th>
                  <th className="px-4 py-3.5 text-right">Bookings</th>
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
                    summary.bestByRevenue?.id === row.id && row.totalRevenue > 0;
                  const isMostBooked =
                    summary.mostBooked?.id === row.id && row.bookingsCount > 0;

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#FAF9F6]/70 transition-colors whitespace-nowrap"
                    >
                      <td className="px-5 py-3.5 text-[#1E1E1E] font-normal">
                        <div className="flex items-center gap-2">
                          <span>{row.name}</span>
                          {isTopRevenue && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#E9F5EE] text-[#15803D] text-[10.5px] font-medium">
                              Top Revenue
                            </span>
                          )}
                          {isMostBooked && !isTopRevenue && (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#E9F5EE] text-[#15803D] text-[10.5px] font-medium">
                              Most Booked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#1E1E1E] tabular-nums">
                        {row.bookingsCount}
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

