import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  CalendarCheck,
  Wallet,
  Percent,
  BedDouble,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  DateRangeControl,
  CustomDateRangePicker,
  StatusBadge,
  BadgeTone,
} from '../../components/ui/PageControls';
import {
  formatCompactCurrency,
  formatCurrency,
  exportToCsv,
  isDateInRange,
  TODAY_STR,
  addDays,
} from '../../utils/formatters';

type SectionTimeRange = 'last7' | 'last30' | 'last12m' | 'custom';

function getBoundsForSectionRange(
  range: SectionTimeRange,
  custom: { startDate: string; endDate: string }
): { startDate: string; endDate: string } {
  if (range === 'last7') {
    return { startDate: addDays(TODAY_STR, -6), endDate: TODAY_STR };
  }
  if (range === 'last30') {
    return { startDate: addDays(TODAY_STR, -29), endDate: TODAY_STR };
  }
  if (range === 'last12m') {
    return { startDate: '2025-11-01', endDate: '2026-10-31' };
  }
  return custom;
}

export const HotelReportsPage: React.FC = () => {
  const {
    bookings,
    rooms,
    roomTypes,
    selectedBranchId,
    globalDateFilter,
    setGlobalDateFilter,
    settings,
    notify,
  } = useHotel();

  const sym = settings.currencySymbol;

  // Local section filters & refresh states
  const [perfTimeRange, setPerfTimeRange] =
    useState<SectionTimeRange>('last30');
  const [perfCustomRange, setPerfCustomRange] = useState({
    startDate: '2026-10-01',
    endDate: TODAY_STR,
  });
  const [perfRefreshTick, setPerfRefreshTick] = useState(0);
  const [perfRefreshing, setPerfRefreshing] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  const [statusTimeRange, setStatusTimeRange] =
    useState<SectionTimeRange>('last30');
  const [statusCustomRange, setStatusCustomRange] = useState({
    startDate: '2026-10-01',
    endDate: TODAY_STR,
  });
  const [statusRefreshTick, setStatusRefreshTick] = useState(0);
  const [statusRefreshing, setStatusRefreshing] = useState(false);

  const [matrixTimeRange, setMatrixTimeRange] =
    useState<SectionTimeRange>('last30');
  const [matrixCustomRange, setMatrixCustomRange] = useState({
    startDate: '2026-10-01',
    endDate: TODAY_STR,
  });
  const [matrixCategoryFilter, setMatrixCategoryFilter] =
    useState<string>('ALL');
  const [matrixPaymentMethodFilter, setMatrixPaymentMethodFilter] =
    useState<string>('ALL');

  // Sync section time ranges when global header filter changes
  useEffect(() => {
    if (globalDateFilter.preset === 'last7') {
      setPerfTimeRange('last7');
      setStatusTimeRange('last7');
      setMatrixTimeRange('last7');
    } else if (globalDateFilter.preset === 'month') {
      setPerfTimeRange('last30');
      setStatusTimeRange('last30');
      setMatrixTimeRange('last30');
    } else {
      setPerfTimeRange('custom');
      setStatusTimeRange('custom');
      setMatrixTimeRange('custom');
      const customBounds = {
        startDate: globalDateFilter.startDate,
        endDate: globalDateFilter.endDate,
      };
      setPerfCustomRange(customBounds);
      setStatusCustomRange(customBounds);
      setMatrixCustomRange(customBounds);
    }
  }, [
    globalDateFilter.preset,
    globalDateFilter.startDate,
    globalDateFilter.endDate,
  ]);

  const handleRefreshPerf = () => {
    setPerfRefreshing(true);
    setPerfRefreshTick((t) => t + 1);
    window.setTimeout(() => setPerfRefreshing(false), 320);
  };

  const handleRefreshStatus = () => {
    setStatusRefreshing(true);
    setStatusRefreshTick((t) => t + 1);
    window.setTimeout(() => setStatusRefreshing(false), 320);
  };

  const allBranchBookings = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? bookings
        : bookings.filter((b) => b.branchId === selectedBranchId),
    [bookings, selectedBranchId]
  );

  const branchBookings = useMemo(() => {
    return allBranchBookings.filter(
      (b) =>
        isDateInRange(b.checkInDate, globalDateFilter) ||
        (b.checkInDate <= globalDateFilter.endDate &&
          b.checkOutDate >= globalDateFilter.startDate)
    );
  }, [allBranchBookings, globalDateFilter]);

  const branchRooms = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? rooms
        : rooms.filter((r) => r.branchId === selectedBranchId),
    [rooms, selectedBranchId]
  );

  const metrics = useMemo(() => {
    const activeStays = branchBookings.filter(
      (b) => b.bookingStatus !== 'Cancelled'
    );
    const totalRoomRevenue = activeStays.reduce((s, b) => s + b.totalAmount, 0);
    const totalNightsSold = activeStays.reduce((s, b) => s + b.nights, 0);
    const adr =
      totalNightsSold > 0 ? Math.round(totalRoomRevenue / totalNightsSold) : 0;
    const occupiedCount = branchRooms.filter(
      (r) => r.status === 'Occupied'
    ).length;
    const occupancyPct = Math.round(
      (occupiedCount / Math.max(1, branchRooms.length)) * 100
    );

    return {
      totalBookings: branchBookings.length,
      totalRoomRevenue,
      totalNightsSold,
      adr,
      occupancyPct,
    };
  }, [branchBookings, branchRooms]);

  // 6.2 Room Type Revenue Performance data filtered by perfTimeRange
  const roomTypePerformanceChartData = useMemo(() => {
    void perfRefreshTick;
    const bounds = getBoundsForSectionRange(perfTimeRange, perfCustomRange);
    const inPeriod = allBranchBookings.filter(
      (b) =>
        b.bookingStatus !== 'Cancelled' &&
        b.checkInDate <= bounds.endDate &&
        b.checkOutDate >= bounds.startDate
    );

    return roomTypes.map((rt) => {
      const typeRooms = branchRooms.filter((r) => r.roomTypeId === rt.id);
      const typeBookings = inPeriod.filter((b) => b.roomTypeId === rt.id);
      const nights = typeBookings.reduce((s, b) => s + b.nights, 0);
      const revenue = typeBookings.reduce((s, b) => s + b.totalAmount, 0);
      return {
        id: rt.id,
        name: rt.name,
        roomsCount: typeRooms.length,
        bookingsCount: typeBookings.length,
        nightsSold: nights,
        revenue,
        avgRate: rt.defaultRate,
      };
    });
  }, [
    roomTypes,
    branchRooms,
    allBranchBookings,
    perfTimeRange,
    perfCustomRange,
    perfRefreshTick,
  ]);

  // 6.3 Booking Status Breakdown filtered by statusTimeRange with exact status colour mapping
  const statusBreakdown = useMemo(() => {
    void statusRefreshTick;
    const bounds = getBoundsForSectionRange(statusTimeRange, statusCustomRange);
    const inPeriod = allBranchBookings.filter(
      (b) =>
        b.checkInDate <= bounds.endDate && b.checkOutDate >= bounds.startDate
    );

    const statusConfig: {
      name: string;
      color: string;
      tone: BadgeTone;
    }[] = [
      { name: 'Confirmed', color: '#16A34A', tone: 'green' },
      { name: 'Checked In', color: '#7463A6', tone: 'purple' },
      { name: 'Checked Out', color: '#8A8A84', tone: 'grey' },
      { name: 'Pending', color: '#D97706', tone: 'amber' },
      { name: 'Cancelled', color: '#DC2626', tone: 'red' },
    ];

    return statusConfig.map((st) => ({
      name: st.name,
      count: inPeriod.filter((b) => b.bookingStatus === st.name).length,
      color: st.color,
      tone: st.tone,
    }));
  }, [allBranchBookings, statusTimeRange, statusCustomRange, statusRefreshTick]);

  // 6.4 Room Category Yield & Utilization Matrix data filtered by matrixTimeRange, matrixCategoryFilter & matrixPaymentMethodFilter
  const matrixRows = useMemo(() => {
    const bounds = getBoundsForSectionRange(matrixTimeRange, matrixCustomRange);
    const inPeriod = allBranchBookings.filter(
      (b) =>
        b.bookingStatus !== 'Cancelled' &&
        b.checkInDate <= bounds.endDate &&
        b.checkOutDate >= bounds.startDate &&
        (matrixPaymentMethodFilter === 'ALL' ||
          b.paymentMethod === matrixPaymentMethodFilter)
    );

    const filteredTypes =
      matrixCategoryFilter === 'ALL'
        ? roomTypes
        : roomTypes.filter((rt) => rt.id === matrixCategoryFilter);

    return filteredTypes.map((rt, idx) => {
      const typeRooms = branchRooms.filter((r) => r.roomTypeId === rt.id);
      const typeBookings = inPeriod.filter((b) => b.roomTypeId === rt.id);
      const nights = typeBookings.reduce((s, b) => s + b.nights, 0);
      const revenue = typeBookings.reduce((s, b) => s + b.totalAmount, 0);
      const roomBreakdown = typeRooms.map((rm) => {
        const rmBks = typeBookings.filter((b) => b.roomId === rm.id);
        return {
          roomId: rm.id,
          roomNumber: rm.roomNumber,
          floor: rm.floor,
          status: rm.status,
          rate: rm.rate,
          bookingsCount: rmBks.length,
          nightsSold: rmBks.reduce((s, b) => s + b.nights, 0),
          revenue: rmBks.reduce((s, b) => s + b.totalAmount, 0),
        };
      });
      return {
        seqId: idx + 1,
        id: rt.id,
        name: rt.name,
        roomsCount: typeRooms.length,
        bookingsCount: typeBookings.length,
        nightsSold: nights,
        avgRate: rt.defaultRate,
        revenue,
        roomBreakdown,
      };
    });
  }, [
    roomTypes,
    branchRooms,
    allBranchBookings,
    matrixTimeRange,
    matrixCustomRange,
    matrixCategoryFilter,
    matrixPaymentMethodFilter,
  ]);

  const timeRangeOptions = [
    { value: 'last7', label: 'Last 7 Days' },
    { value: 'last30', label: 'Last 30 Days' },
    { value: 'last12m', label: 'Last 12 Months' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const categoryFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Room Categories' },
      ...roomTypes.map((rt) => ({ value: rt.id, label: rt.name })),
    ],
    [roomTypes]
  );

  const paymentMethodFilterOptions = [
    { value: 'ALL', label: 'All Payment Methods' },
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
    { value: 'Card', label: 'Card' },
  ];

  const handleExportCsv = () => {
    const rows = branchBookings.map((b) => ({
      BookingID: b.id,
      GuestName: b.guestName,
      Phone: b.guestPhone,
      Room: b.roomNumber,
      CheckIn: b.checkInDate,
      CheckOut: b.checkOutDate,
      Nights: b.nights,
      Rate: b.roomRate,
      TotalAmount: b.totalAmount,
      AmountPaid: b.amountPaid,
      PaymentStatus: b.paymentStatus,
      BookingStatus: b.bookingStatus,
    }));
    exportToCsv(
      `lumina-hotel-operations-report-${globalDateFilter.startDate}.csv`,
      rows
    );
    notify(
      'CSV Exported',
      `Exported ${rows.length} booking records to CSV.`
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hotel Operation Report"
        actions={
          <>
            <DateRangeControl
              value={globalDateFilter}
              onChange={setGlobalDateFilter}
            />
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </>
        }
      />

      {/* 4 KPI Cards — Only Title, Icon, and Main Figure */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Room Revenue"
          value={formatCompactCurrency(metrics.totalRoomRevenue, sym)}
          fullValueTooltip={formatCurrency(metrics.totalRoomRevenue, sym)}
          icon={Wallet}
          iconTone="purple"
        />
        <KpiCard
          label="Period Bookings"
          value={metrics.totalBookings}
          icon={CalendarCheck}
          iconTone="teal"
        />
        <KpiCard
          label="Average Daily Rate (ADR)"
          value={formatCompactCurrency(metrics.adr, sym)}
          fullValueTooltip={formatCurrency(metrics.adr, sym)}
          icon={BedDouble}
          iconTone="amber"
        />
        <KpiCard
          label="Current Occupancy"
          value={`${metrics.occupancyPct}%`}
          icon={Percent}
          iconTone="blue"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* 6.2 Room Type Revenue Performance */}
        <div className="lg:col-span-2 bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col">
          <div className="px-3.5 pt-2 pb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15.5px] font-medium text-[#1E1E1E]">
              Room Type Revenue Performance
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Dropdown
                value={perfTimeRange}
                options={timeRangeOptions}
                onChange={(v) => setPerfTimeRange(v as SectionTimeRange)}
                size="sm"
                className="w-[138px]"
              />
              {perfTimeRange === 'custom' && (
                <CustomDateRangePicker
                  startDate={perfCustomRange.startDate}
                  endDate={perfCustomRange.endDate}
                  onApply={(startDate, endDate) =>
                    setPerfCustomRange({ startDate, endDate })
                  }
                />
              )}
              <button
                type="button"
                onClick={handleRefreshPerf}
                title="Refresh revenue performance"
                aria-label="Refresh revenue performance"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    perfRefreshing ? 'rotate-180 text-[#7463A6]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[11.5px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 flex flex-col justify-between">
            <div className="h-[310px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roomTypePerformanceChartData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 2 }}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#EFEFEA"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#4A4A46', fontSize: 12 }}
                    axisLine={{ stroke: '#EAEAE4' }}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompactCurrency(v, sym)}
                    tick={{ fill: '#6E6E6A', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={68}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(value: any) => [
                      formatCurrency(Number(value || 0), sym),
                      'Revenue',
                    ]}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '11px',
                      border: '1px solid #E6E6E0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12.5px',
                    }}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={64}
                    onMouseEnter={(_, index) => setHoveredBarIndex(index)}
                  >
                    {roomTypePerformanceChartData.map((entry, idx) => (
                      <Cell
                        key={entry.id}
                        fill={hoveredBarIndex === idx ? '#5D4B8E' : '#7463A6'}
                        className="transition-colors duration-150 cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* 6.3 Booking Status Breakdown */}
        <div className="bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col">
          <div className="px-3.5 pt-2 pb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15.5px] font-medium text-[#1E1E1E]">
              Booking Status Breakdown
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Dropdown
                value={statusTimeRange}
                options={timeRangeOptions}
                onChange={(v) => setStatusTimeRange(v as SectionTimeRange)}
                size="sm"
                className="w-[136px]"
              />
              {statusTimeRange === 'custom' && (
                <CustomDateRangePicker
                  startDate={statusCustomRange.startDate}
                  endDate={statusCustomRange.endDate}
                  onApply={(startDate, endDate) =>
                    setStatusCustomRange({ startDate, endDate })
                  }
                />
              )}
              <button
                type="button"
                onClick={handleRefreshStatus}
                title="Refresh booking status breakdown"
                aria-label="Refresh booking status breakdown"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-white/80 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    statusRefreshing ? 'rotate-180 text-[#7463A6]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[11.5px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 flex flex-col justify-between">
            <div className="h-[188px] my-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      statusBreakdown.some((s) => s.count > 0)
                        ? statusBreakdown
                        : [{ name: 'No Bookings', count: 1, color: '#E6E6E0' }]
                    }
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {(statusBreakdown.some((s) => s.count > 0)
                      ? statusBreakdown
                      : [{ name: 'No Bookings', count: 1, color: '#E6E6E0' }]
                    ).map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '11px',
                      border: '1px solid #E6E6E0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 border-t border-[#F0F0EC] pt-3">
              {statusBreakdown.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[13px]"
                >
                  <StatusBadge status={item.name} tone={item.tone} />
                  <span className="font-medium text-[#1E1E1E] tabular-nums">
                    {item.count} {item.count === 1 ? 'booking' : 'bookings'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 6.4 Room Category Yield & Utilization Matrix */}
      <div className="bg-[#F0F0F0] p-[2.5px] rounded-[14px]">
        <div className="px-3.5 pt-2 pb-1.5 flex flex-wrap items-center justify-between gap-2.5">
          <h2 className="text-[15.5px] font-medium text-[#1E1E1E]">
            Room Category Yield & Utilization Matrix
          </h2>

          <div className="flex items-center gap-2 flex-wrap">
            <Dropdown
              value={matrixCategoryFilter}
              options={categoryFilterOptions}
              onChange={setMatrixCategoryFilter}
              size="sm"
              className="w-[176px]"
            />
            <Dropdown
              value={matrixPaymentMethodFilter}
              options={paymentMethodFilterOptions}
              onChange={setMatrixPaymentMethodFilter}
              size="sm"
              className="w-[172px]"
            />
            <Dropdown
              value={matrixTimeRange}
              options={timeRangeOptions}
              onChange={(v) => setMatrixTimeRange(v as SectionTimeRange)}
              size="sm"
              className="w-[140px]"
            />
            {matrixTimeRange === 'custom' && (
              <CustomDateRangePicker
                startDate={matrixCustomRange.startDate}
                endDate={matrixCustomRange.endDate}
                onApply={(startDate, endDate) =>
                  setMatrixCustomRange({ startDate, endDate })
                }
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-[11.5px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#EFEFEA] text-[12px] font-normal text-[#6E6E6A]">
                <th className="py-3 pr-3 w-12 font-normal">ID</th>
                <th className="py-3 px-4 font-normal">Room Category</th>
                <th className="py-3 px-4 text-right font-normal">
                  Inventory Count
                </th>
                <th className="py-3 px-4 text-right font-normal">Bookings</th>
                <th className="py-3 px-4 text-right font-normal">
                  Nights Sold
                </th>
                <th className="py-3 px-4 text-right font-normal">
                  Standard Rate
                </th>
                <th className="py-3 pl-4 text-right font-normal">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2EE] text-[13.5px] tabular-nums">
              {matrixRows.map((row) => (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-[#F8F8F5]">
                    <td className="py-3.5 pr-3 font-normal text-[#6E6E6A]">
                      {row.seqId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#1E1E1E]">
                      {row.name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-normal text-[#4A4A46]">
                      {row.roomsCount} rooms
                    </td>
                    <td className="py-3.5 px-4 text-right font-normal text-[#4A4A46]">
                      {row.bookingsCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-normal text-[#4A4A46]">
                      {row.nightsSold} nights
                    </td>
                    <td className="py-3.5 px-4 text-right font-normal text-[#4A4A46]">
                      {formatCurrency(row.avgRate, sym)}
                    </td>
                    <td className="py-3.5 pl-4 text-right font-medium text-[#1E1E1E]">
                      {formatCurrency(row.revenue, sym)}
                    </td>
                  </tr>
                  {matrixCategoryFilter !== 'ALL' &&
                    row.roomBreakdown.map((rm, rIdx) => (
                      <tr
                        key={rm.roomId}
                        className="bg-[#FAF9F6] text-[12.5px] text-[#4A4A46]"
                      >
                        <td className="py-2.5 pr-3 pl-3 text-[#8E8E88]">
                          {row.seqId}.{rIdx + 1}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-[#1E1E1E]">
                            Room {rm.roomNumber}
                          </span>{' '}
                          <span className="text-[#6E6E6A]">· {rm.floor}</span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <StatusBadge status={rm.status} />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {rm.bookingsCount}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {rm.nightsSold} nights
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {formatCurrency(rm.rate, sym)}
                        </td>
                        <td className="py-2.5 pl-4 text-right font-medium text-[#1E1E1E]">
                          {formatCurrency(rm.revenue, sym)}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
