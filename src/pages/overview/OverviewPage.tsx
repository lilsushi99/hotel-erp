import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  CalendarCheck2,
  Percent,
  BedDouble,
  TrendingUp,
  Receipt,
  ReceiptText,
  AlertTriangle,
  Shirt,
  Wrench,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  StatusBadge,
} from '../../components/ui/PageControls';
import { DateRangeFilter } from '../../types/hotel';
import {
  computeFinancialSummary,
  getPreviousPeriodFilter,
} from '../../utils/analytics';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateReadable,
  formatShortDate,
  getDatesArray,
  addDays,
  TODAY_STR,
} from '../../utils/formatters';

type RevenueSourceOption =
  | 'ALL'
  | 'Rooms'
  | 'Bar & POS'
  | 'Restaurant'
  | 'Laundry';
type LocalChartTimeRange = 'last7' | 'last30' | 'last12m' | 'custom';

const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  'Staff Welfare & Training': '#7463A6',
  'Utilities & Power': '#0D9488',
  'Kitchen & F&B Procurement': '#D97706',
  'Maintenance & Repairs': '#E11D48',
  'Housekeeping & Laundry': '#2563EB',
  'IT & Subscriptions': '#0891B2',
  'Marketing & Guest Relations': '#16A34A',
};

const FALLBACK_PIE_COLORS = [
  '#7463A6',
  '#0D9488',
  '#D97706',
  '#E11D48',
  '#2563EB',
  '#0891B2',
  '#16A34A',
];

function computePctChange(
  current: number,
  previous: number
): {
  text: string;
  direction: 'up' | 'down' | 'neutral';
  rawDelta: number;
} {
  if (previous === 0 && current === 0) {
    return { text: '0.0%', direction: 'neutral', rawDelta: 0 };
  }
  if (previous === 0) {
    return {
      text: current > 0 ? '+100.0%' : '0.0%',
      direction: current > 0 ? 'up' : 'neutral',
      rawDelta: current,
    };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (Math.abs(rounded) < 0.1) {
    return { text: '0.0%', direction: 'neutral', rawDelta: 0 };
  }
  const sign = rounded > 0 ? '+' : '';
  return {
    text: `${sign}${rounded.toFixed(1)}%`,
    direction: rounded > 0 ? 'up' : 'down',
    rawDelta: rounded,
  };
}

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    bookings,
    posTransactions,
    laundryOrders,
    expenses,
    rooms,
    beverages,
    foodIngredients,
    supplies,
    selectedBranchId,
    globalDateFilter,
    setGlobalDateFilter,
    settings,
  } = useHotel();

  const sym = settings.currencySymbol;

  // Independent chart filter states (synced initially and when the main Overview date filter changes)
  const [revenueSource, setRevenueSource] =
    useState<RevenueSourceOption>('ALL');
  const [revDateFilter, setRevDateFilter] =
    useState<DateRangeFilter>(globalDateFilter);

  const [expenseCategoryFilter, setExpenseCategoryFilter] =
    useState<string>('ALL');
  const [expDateFilter, setExpDateFilter] =
    useState<DateRangeFilter>(globalDateFilter);

  // Sync local chart periods when the user changes the global Overview date filter
  useEffect(() => {
    setRevDateFilter(globalDateFilter);
    setExpDateFilter(globalDateFilter);
  }, [
    globalDateFilter.preset,
    globalDateFilter.startDate,
    globalDateFilter.endDate,
  ]);

  // Refresh state counters & brief rotation feedback for the 3 lower panels
  const [roomStatusRefreshTick, setRoomStatusRefreshTick] = useState(0);
  const [roomStatusRefreshing, setRoomStatusRefreshing] = useState(false);

  const [bookingsRefreshTick, setBookingsRefreshTick] = useState(0);
  const [bookingsRefreshing, setBookingsRefreshing] = useState(false);

  const [alertsRefreshTick, setAlertsRefreshTick] = useState(0);
  const [alertsRefreshing, setAlertsRefreshing] = useState(false);

  const handleRefreshRoomStatus = () => {
    setRoomStatusRefreshing(true);
    setRoomStatusRefreshTick((t) => t + 1);
    window.setTimeout(() => setRoomStatusRefreshing(false), 320);
  };

  const handleRefreshBookings = () => {
    setBookingsRefreshing(true);
    setBookingsRefreshTick((t) => t + 1);
    window.setTimeout(() => setBookingsRefreshing(false), 320);
  };

  const handleRefreshAlerts = () => {
    setAlertsRefreshing(true);
    setAlertsRefreshTick((t) => t + 1);
    window.setTimeout(() => setAlertsRefreshing(false), 320);
  };

  // Current period summary
  const summary = useMemo(
    () =>
      computeFinancialSummary({
        bookings,
        posTransactions,
        laundryOrders,
        expenses,
        rooms,
        branchId: selectedBranchId,
        dateFilter: globalDateFilter,
      }),
    [
      bookings,
      posTransactions,
      laundryOrders,
      expenses,
      rooms,
      selectedBranchId,
      globalDateFilter,
    ]
  );

  // Previous period summary for accurate KPI comparisons
  const prevDateFilter = useMemo(
    () => getPreviousPeriodFilter(globalDateFilter),
    [globalDateFilter]
  );

  const prevSummary = useMemo(
    () =>
      computeFinancialSummary({
        bookings,
        posTransactions,
        laundryOrders,
        expenses,
        rooms,
        branchId: selectedBranchId,
        dateFilter: prevDateFilter,
      }),
    [
      bookings,
      posTransactions,
      laundryOrders,
      expenses,
      rooms,
      selectedBranchId,
      prevDateFilter,
    ]
  );

  // KPI Comparisons (Current vs Previous Period)
  const revenueDelta = useMemo(
    () => computePctChange(summary.totalRevenue, prevSummary.totalRevenue),
    [summary.totalRevenue, prevSummary.totalRevenue]
  );

  const bookingsDelta = useMemo(
    () =>
      computePctChange(
        summary.totalBookingsCount,
        prevSummary.totalBookingsCount
      ),
    [summary.totalBookingsCount, prevSummary.totalBookingsCount]
  );

  const occupancyDelta = useMemo(
    () =>
      computePctChange(
        summary.occupancyRate,
        prevSummary.periodOccupancyRate || 50
      ),
    [summary.occupancyRate, prevSummary.periodOccupancyRate]
  );

  const prevAvgAvailableRooms = useMemo(() => {
    if (!prevSummary.dailySeries.length) return summary.availableRoomsCount;
    const avg =
      prevSummary.dailySeries.reduce((s, d) => s + d.availableRooms, 0) /
      prevSummary.dailySeries.length;
    return Math.max(1, Math.round(avg));
  }, [prevSummary.dailySeries, summary.availableRoomsCount]);

  const availableRoomsDelta = useMemo(
    () => computePctChange(summary.availableRoomsCount, prevAvgAvailableRooms),
    [summary.availableRoomsCount, prevAvgAvailableRooms]
  );

  const netProfitDelta = useMemo(
    () => computePctChange(summary.netProfit, prevSummary.netProfit),
    [summary.netProfit, prevSummary.netProfit]
  );

  const expensesDelta = useMemo(
    () => computePctChange(summary.totalExpenses, prevSummary.totalExpenses),
    [summary.totalExpenses, prevSummary.totalExpenses]
  );

  // Sparkline series for each of the 6 KPIs
  const kpiSparklineSeries = useMemo(() => {
    if (summary.dailySeries.length >= 4) {
      return summary.dailySeries;
    }
    const fallback7d = computeFinancialSummary({
      bookings,
      posTransactions,
      laundryOrders,
      expenses,
      rooms,
      branchId: selectedBranchId,
      dateFilter: {
        preset: 'last7',
        startDate: addDays(TODAY_STR, -6),
        endDate: TODAY_STR,
      },
    });
    return fallback7d.dailySeries;
  }, [
    summary.dailySeries,
    bookings,
    posTransactions,
    laundryOrders,
    expenses,
    rooms,
    selectedBranchId,
  ]);

  // Helper to filter by selected branch
  const filterByBranch = <T extends { branchId: string }>(items: T[]) =>
    selectedBranchId === 'ALL'
      ? items
      : items.filter((i) => i.branchId === selectedBranchId);

  // Revenue Trend chart series based on revenueSource & revDateFilter
  const revenueTrendData = useMemo(() => {
    const bBookings = filterByBranch(bookings).filter(
      (b) => b.bookingStatus !== 'Cancelled'
    );
    const bPos = filterByBranch(posTransactions);
    const bLaundry = filterByBranch(laundryOrders);

    const getSourceValueForDateMatch = (
      matchFn: (dateStr: string) => boolean
    ) => {
      const roomsVal = bBookings
        .filter((b) => matchFn(b.checkInDate))
        .reduce((s, b) => s + b.totalAmount, 0);
      const barVal = bPos
        .filter((t) => t.department === 'Bar & POS' && matchFn(t.date))
        .reduce((s, t) => s + t.totalAmount, 0);
      const restVal = bPos
        .filter(
          (t) => t.department === 'Kitchen & Restaurant' && matchFn(t.date)
        )
        .reduce((s, t) => s + t.totalAmount, 0);
      const laundryVal = bLaundry
        .filter((l) => matchFn(l.receivedDate))
        .reduce((s, l) => s + l.totalAmount, 0);

      if (revenueSource === 'Rooms') return roomsVal;
      if (revenueSource === 'Bar & POS') return barVal;
      if (revenueSource === 'Restaurant') return restVal;
      if (revenueSource === 'Laundry') return laundryVal;
      return roomsVal + barVal + restVal + laundryVal;
    };

    const start = revDateFilter.startDate || TODAY_STR;
    const end = revDateFilter.endDate || TODAY_STR;
    const d1 = new Date(start + 'T00:00:00');
    const d2 = new Date(end + 'T00:00:00');
    const days = Math.min(
      60,
      Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1)
    );
    const dateList = getDatesArray(start, days);

    return dateList.map((d) => ({
      date: d,
      label: formatShortDate(d),
      value: getSourceValueForDateMatch((dt) => dt === d),
    }));
  }, [
    bookings,
    posTransactions,
    laundryOrders,
    selectedBranchId,
    revenueSource,
    revDateFilter,
  ]);

  const revenueTrendPeriodTotal = useMemo(
    () => revenueTrendData.reduce((sum, pt) => sum + pt.value, 0),
    [revenueTrendData]
  );

  // Expenses Donut Chart data based on expDateFilter & expenseCategoryFilter
  const expensesChartData = useMemo(() => {
    const bExpenses = filterByBranch(expenses).filter(
      (e) =>
        e.status !== 'Rejected' &&
        (expenseCategoryFilter === 'ALL' || e.category === expenseCategoryFilter)
    );

    const start = expDateFilter.startDate || '2026-10-01';
    const end = expDateFilter.endDate || TODAY_STR;

    const inRange = bExpenses.filter((e) => e.date >= start && e.date <= end);
    const categoryTotals: Record<string, number> = {};
    inRange.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const total = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

    const items = Object.entries(categoryTotals)
      .map(([name, value], idx) => {
        const cfgColor = settings.expenseCategoryConfigs?.find(
          (c) => c.name === name
        )?.color;
        return {
          name,
          value,
          color:
            cfgColor ||
            EXPENSE_CATEGORY_COLORS[name] ||
            FALLBACK_PIE_COLORS[idx % FALLBACK_PIE_COLORS.length],
          pct: total > 0 ? Math.round((value / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    return { items, total };
  }, [
    expenses,
    selectedBranchId,
    expDateFilter,
    expenseCategoryFilter,
    settings.expenseCategoryConfigs,
  ]);

  // Room Status breakdown (no circular dots beside labels, #7463A6 for Occupied)
  const roomStatusRows = useMemo(() => {
    void roomStatusRefreshTick;
    const total = Math.max(1, summary.totalRoomsCount);
    return [
      {
        label: 'Available',
        count: summary.availableRoomsCount,
        pct: Math.round((summary.availableRoomsCount / total) * 100),
        barColor: '#16A34A',
        trackColor: 'bg-[#16A34A]/12',
      },
      {
        label: 'Occupied',
        count: summary.occupiedRoomsCount,
        pct: Math.round((summary.occupiedRoomsCount / total) * 100),
        barColor: '#7463A6',
        trackColor: 'bg-[#7463A6]/12',
      },
      {
        label: 'Cleaning',
        count: summary.cleaningRoomsCount,
        pct: Math.round((summary.cleaningRoomsCount / total) * 100),
        barColor: '#D97706',
        trackColor: 'bg-[#D97706]/12',
      },
      {
        label: 'Maintenance',
        count: summary.maintenanceRoomsCount,
        pct: Math.round((summary.maintenanceRoomsCount / total) * 100),
        barColor: '#DC2626',
        trackColor: 'bg-[#DC2626]/12',
      },
    ];
  }, [
    summary.availableRoomsCount,
    summary.occupiedRoomsCount,
    summary.cleaningRoomsCount,
    summary.maintenanceRoomsCount,
    summary.totalRoomsCount,
    roomStatusRefreshTick,
  ]);

  // Recent Bookings list (sorted newest/active first, 4 rows visible + scroll)
  const recentBookings = useMemo(() => {
    void bookingsRefreshTick;
    const list =
      selectedBranchId === 'ALL'
        ? bookings
        : bookings.filter((b) => b.branchId === selectedBranchId);
    return [...list].slice(0, 10);
  }, [bookings, selectedBranchId, bookingsRefreshTick]);

  // Operational Alerts & Exceptions with distinct danger/warning icon treatments
  const operationalAlerts = useMemo(() => {
    void alertsRefreshTick;
    const items: {
      id: string;
      category: string;
      title: string;
      meta: string;
      status: string;
      badgeTone: 'red' | 'amber' | 'purple' | 'green';
      path: string;
      icon: React.FC<{ className?: string }>;
      iconBgClass: string;
    }[] = [];

    // 1. Out of stock & Low stock beverages
    filterByBranch(beverages).forEach((b) => {
      if (b.availableQuantity <= b.reorderThreshold) {
        const isOut = b.availableQuantity === 0;
        items.push({
          id: `AL-BEV-${b.id}`,
          category: 'Inventory',
          title: b.name,
          meta: `${b.availableQuantity} ${b.unit} left (Reorder at ${b.reorderThreshold})`,
          status: isOut ? 'Out of Stock' : 'Low Stock',
          badgeTone: isOut ? 'red' : 'amber',
          path: '/inventory/beverages',
          icon: AlertTriangle,
          iconBgClass: isOut
            ? 'bg-[#FEE2E2] text-[#DC2626]'
            : 'bg-[#FEF3C7] text-[#D97706]',
        });
      }
    });

    // 2. Low/Out of stock kitchen ingredients
    filterByBranch(foodIngredients).forEach((f) => {
      if (f.availableQuantity <= f.reorderLevel) {
        const isOut = f.availableQuantity === 0;
        items.push({
          id: `AL-FD-${f.id}`,
          category: 'Kitchen',
          title: f.name,
          meta: `${f.availableQuantity}${f.unit} remaining in ${f.storageLocation}`,
          status: isOut ? 'Out of Stock' : 'Low Stock',
          badgeTone: isOut ? 'red' : 'amber',
          path: '/inventory/food',
          icon: AlertTriangle,
          iconBgClass: isOut
            ? 'bg-[#FEE2E2] text-[#DC2626]'
            : 'bg-[#FEF3C7] text-[#D97706]',
        });
      }
    });

    // 3. Low/Out of stock supplies
    filterByBranch(supplies).forEach((s) => {
      if (s.availableQuantity <= s.reorderLevel) {
        const isOut = s.availableQuantity === 0;
        items.push({
          id: `AL-SUP-${s.id}`,
          category: 'Supplies',
          title: s.name,
          meta: `${s.availableQuantity} ${s.unit} remaining`,
          status: isOut ? 'Out of Stock' : 'Low Stock',
          badgeTone: isOut ? 'red' : 'amber',
          path: '/inventory/supplies',
          icon: AlertTriangle,
          iconBgClass: isOut
            ? 'bg-[#FEE2E2] text-[#DC2626]'
            : 'bg-[#FEF3C7] text-[#D97706]',
        });
      }
    });

    // 4. Maintenance rooms
    filterByBranch(rooms).forEach((r) => {
      if (r.status === 'Maintenance') {
        items.push({
          id: `AL-MNT-${r.id}`,
          category: 'Maintenance',
          title: `Room ${r.roomNumber} (${r.floor})`,
          meta: r.notes || 'Scheduled engineering check',
          status: 'Maintenance',
          badgeTone: 'red',
          path: '/rooms',
          icon: Wrench,
          iconBgClass: 'bg-[#FFEDD5] text-[#EA580C]',
        });
      }
    });

    // 5. Pending payments / Unpaid booking balances
    filterByBranch(bookings).forEach((bk) => {
      if (bk.bookingStatus !== 'Cancelled' && bk.paymentStatus !== 'Paid') {
        items.push({
          id: `AL-UNP-${bk.id}`,
          category: 'Bookings',
          title: `${bk.guestName} · Room ${bk.roomNumber}`,
          meta: `${formatCurrency(
            Math.max(0, bk.totalAmount - bk.amountPaid) || bk.totalAmount,
            sym
          )} unpaid on ${bk.id}`,
          status: 'Unpaid',
          badgeTone: 'red',
          path: '/bookings',
          icon: Receipt,
          iconBgClass: 'bg-[#F1EEF8] text-[#7463A6]',
        });
      }
    });

    // 6. Unpaid POS & Restaurant invoices
    filterByBranch(posTransactions).forEach((tx) => {
      if (tx.paymentStatus !== 'Paid') {
        items.push({
          id: `AL-POS-${tx.id}`,
          category: tx.department,
          title: `${tx.guestName} (${tx.id})`,
          meta: `${formatCurrency(
            Math.max(0, tx.totalAmount - tx.amountPaid) || tx.totalAmount,
            sym
          )} unpaid invoice`,
          status: 'Unpaid',
          badgeTone: 'red',
          path:
            tx.department === 'Bar & POS'
              ? '/sales/bar-pos'
              : '/sales/kitchen-restaurant',
          icon: Receipt,
          iconBgClass: 'bg-[#FCECE9] text-[#DC2626]',
        });
      }
    });

    // 7. Laundry ready for collection
    filterByBranch(laundryOrders).forEach((l) => {
      if (l.workflowStatus === 'Ready for Collection') {
        items.push({
          id: `AL-LND-${l.id}`,
          category: 'Laundry Ready',
          title: `${l.customerName} (${l.id})`,
          meta: `${l.customerAddress || (l.roomNumber ? `Room ${l.roomNumber}` : 'Walk-in')} · Tag ${l.garmentTag}`,
          status: 'Ready',
          badgeTone: 'green',
          path: '/laundry/storage',
          icon: Shirt,
          iconBgClass: 'bg-[#DCFCE7] text-[#16A34A]',
        });
      }
    });

    return items.slice(0, 10);
  }, [
    beverages,
    foodIngredients,
    supplies,
    rooms,
    bookings,
    posTransactions,
    laundryOrders,
    selectedBranchId,
    sym,
    alertsRefreshTick,
  ]);

  const expenseCategoryOptions = useMemo(() => {
    const cats = settings.expenseCategories || [];
    return [
      { value: 'ALL', label: 'All Categories' },
      ...cats.map((c) => ({ value: c, label: c })),
    ];
  }, [settings.expenseCategories]);

  const revenueSourceOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'Rooms', label: 'Rooms' },
    { value: 'Bar & POS', label: 'Bar & POS' },
    { value: 'Restaurant', label: 'Restaurant' },
    { value: 'Laundry', label: 'Laundry' },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        subtitle="A summary of your hotel performance and operations."
        actions={
          <DateRangeControl
            value={globalDateFilter}
            onChange={setGlobalDateFilter}
          />
        }
      />

      {/* 6 Mandatory Double-Surface KPI Cards — 3 Columns x 2 Rows on Desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Total Revenue"
          value={formatCompactCurrency(summary.totalRevenue, sym)}
          fullValueTooltip={formatCurrency(summary.totalRevenue, sym)}
          icon={Wallet}
          iconTone="purple"
          trendText={revenueDelta.text}
          trendDirection={revenueDelta.direction}
          isTrendFavourable={revenueDelta.rawDelta >= 0}
          supportingText="vs previous period"
          sparklineData={kpiSparklineSeries.map((d) => d.revenue)}
        />
        <KpiCard
          label="Total Bookings"
          value={summary.totalBookingsCount}
          icon={CalendarCheck2}
          iconTone="teal"
          trendText={bookingsDelta.text}
          trendDirection={bookingsDelta.direction}
          isTrendFavourable={bookingsDelta.rawDelta >= 0}
          supportingText="vs previous period"
          sparklineData={kpiSparklineSeries.map((d) => d.bookingsCount)}
        />
        <KpiCard
          label="Occupancy"
          value={`${summary.occupancyRate}%`}
          icon={Percent}
          iconTone="blue"
          trendText={occupancyDelta.text}
          trendDirection={occupancyDelta.direction}
          isTrendFavourable={occupancyDelta.rawDelta >= 0}
          supportingText="vs previous period"
          sparklineData={kpiSparklineSeries.map((d) => d.occupancyPct)}
        />
        <KpiCard
          label="Available Rooms"
          value={summary.availableRoomsCount}
          icon={BedDouble}
          iconTone="amber"
          trendText={availableRoomsDelta.text}
          trendDirection={
            availableRoomsDelta.rawDelta > 0 ? 'up' : 'neutral'
          }
          isTrendFavourable={true}
          supportingText="vs previous period"
          sparklineData={kpiSparklineSeries.map((d) => d.availableRooms)}
        />
        <KpiCard
          label="Net Profit"
          value={formatCompactCurrency(summary.netProfit, sym)}
          fullValueTooltip={formatCurrency(summary.netProfit, sym)}
          icon={TrendingUp}
          iconTone="green"
          trendText={netProfitDelta.text}
          trendDirection={netProfitDelta.direction}
          isTrendFavourable={netProfitDelta.rawDelta >= 0}
          supportingText="vs previous period"
          sparklineData={kpiSparklineSeries.map((d) => d.profit)}
        />
        <KpiCard
          label="Expenses"
          value={formatCompactCurrency(summary.totalExpenses, sym)}
          fullValueTooltip={formatCurrency(summary.totalExpenses, sym)}
          icon={ReceiptText}
          iconTone="rose"
          trendText={expensesDelta.text}
          trendDirection={expensesDelta.direction}
          isTrendFavourable={expensesDelta.rawDelta <= 0}
          supportingText="vs previous period"
          sparklineData={kpiSparklineSeries.map((d) => d.expenses)}
        />
      </div>

      {/* Middle Row: Revenue Trend & Expenses by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* 1. Revenue Trend (Double-Surface, No Subtitle) */}
        <div className="lg:col-span-2 bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col">
          {/* Outer Shell Header */}
          <div className="px-3.5 pt-2 pb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15.5px] font-medium text-[#1E1E1E] leading-snug">
              Revenue Trend
            </h2>

            {/* Right-aligned Revenue Source & Independent Date Range Dropdown */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Dropdown
                value={revenueSource}
                options={revenueSourceOptions}
                onChange={(val) => setRevenueSource(val as RevenueSourceOption)}
                size="sm"
                className="w-[128px]"
              />
              <DateRangeControl
                value={revDateFilter}
                onChange={setRevDateFilter}
              />
            </div>
          </div>

          {/* Inner White Chart Surface */}
          <div className="bg-white rounded-[11.5px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 flex flex-col justify-between">
            <div className="h-[296px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={revenueTrendData}
                  margin={{ top: 8, right: 10, left: 0, bottom: 2 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#EFEFEA"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#6E6E6A', fontSize: 11.5 }}
                    axisLine={{ stroke: '#EAEAE4' }}
                    tickLine={false}
                    tickMargin={8}
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={(v) => formatCompactCurrency(v, sym)}
                    tick={{ fill: '#6E6E6A', fontSize: 11.5 }}
                    axisLine={false}
                    tickLine={false}
                    width={64}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value || 0), sym),
                      revenueSource === 'ALL' ? 'Total Revenue' : revenueSource,
                    ]}
                    labelFormatter={(label) => `Period: ${label}`}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '11px',
                      border: '1px solid #E6E6E0',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      fontSize: '12.5px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#7463A6"
                    strokeWidth={2}
                    fill="#7463A6"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Total Revenue footer inside the inner white container below the chart */}
            <div className="mt-3 pt-3 border-t border-[#F0F0EC] flex items-center justify-between gap-2">
              <span className="text-[13px] font-normal text-[#6E6E6A]">
                Total Revenue
              </span>
              <span className="text-[16px] font-medium text-[#1E1E1E] tabular-nums">
                {formatCurrency(revenueTrendPeriodTotal, sym)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Expenses by Category (Double-Surface, No Subtitle) */}
        <div className="bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col">
          {/* Outer Shell Header */}
          <div className="px-3.5 pt-2 pb-1.5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15.5px] font-medium text-[#1E1E1E] leading-snug">
              Expenses
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Dropdown
                value={expenseCategoryFilter}
                options={expenseCategoryOptions}
                onChange={setExpenseCategoryFilter}
                size="sm"
                className="w-[142px] shrink-0"
              />
              <DateRangeControl
                value={expDateFilter}
                onChange={setExpDateFilter}
              />
            </div>
          </div>

          {/* Inner White Surface */}
          <div className="bg-white rounded-[11.5px] p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 flex flex-col justify-between">
            <div className="h-[186px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      expensesChartData.items.length > 0
                        ? expensesChartData.items
                        : [{ name: 'No Expenses', value: 1, color: '#E6E6E0' }]
                    }
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {(expensesChartData.items.length > 0
                      ? expensesChartData.items
                      : [{ name: 'No Expenses', value: 1, color: '#E6E6E0' }]
                    ).map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      expensesChartData.items.length > 0
                        ? formatCurrency(Number(value || 0), sym)
                        : formatCurrency(0, sym)
                    }
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

            {/* Category Legend */}
            <div className="space-y-2 pt-2">
              {expensesChartData.items.length === 0 ? (
                <div className="text-[12.5px] font-normal text-[#8E8E88] text-center py-4">
                  No expenses recorded in selected period
                </div>
              ) : (
                expensesChartData.items.map((cat) => (
                  <div
                    key={cat.name}
                    className="flex items-center justify-between gap-2 text-[12.5px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-[#3A3A36] font-normal truncate">
                        {cat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 tabular-nums shrink-0">
                      <span className="font-medium text-[#1E1E1E]">
                        {formatCompactCurrency(cat.value, sym)}
                      </span>
                      <span className="text-[#8E8E88] font-normal w-8 text-right">
                        {cat.pct}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Total Expenses Footer */}
            <div className="mt-3 pt-3 border-t border-[#F0F0EC] flex items-center justify-between text-[13px]">
              <span className="text-[#6E6E6A] font-normal">Total Expenses</span>
              <span className="font-medium text-[#1E1E1E] tabular-nums">
                {formatCurrency(expensesChartData.total, sym)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Coordinated Equal-Height Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/*
          1. Room Status (Temporarily commented out per design spec; roomStatusRows & handleRefreshRoomStatus preserved above)
          <div className="lg:col-span-3 bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col h-[336px]">
            <div className="px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 shrink-0">
              <h2 className="text-[15px] font-medium text-[#1E1E1E] leading-snug">
                Room Status
              </h2>
              <button
                type="button"
                onClick={handleRefreshRoomStatus}
                title="Refresh room status"
                aria-label="Refresh room status"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-white/80 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    roomStatusRefreshing ? 'rotate-180 text-[#7463A6]' : ''
                  }`}
                />
              </button>
            </div>
            <div className="bg-white rounded-[11.5px] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 min-h-0 flex flex-col justify-between">
              <div className="space-y-4 my-auto">
                {roomStatusRows.map((row) => (
                  <div
                    key={row.label}
                    onClick={() => navigate('/hotel-operations/rooms')}
                    className="cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-normal text-[#1E1E1E]">{row.label}</span>
                      <div className="tabular-nums text-[13px]">
                        <span className="font-medium text-[#1E1E1E]">{row.count}</span>{' '}
                        <span className="text-[12px] font-normal text-[#6E6E6A]">
                          {row.count === 1 ? 'room' : 'rooms'}
                        </span>
                      </div>
                    </div>
                    <div className={`w-full h-2 rounded-full overflow-hidden ${row.trackColor}`}>
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${row.count > 0 ? Math.max(6, row.pct) : 0}%`,
                          backgroundColor: row.barColor,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-[#F0F0EC] flex items-center justify-between text-[12px] text-[#6E6E6A] shrink-0">
                <span className="font-normal">Total Room Inventory</span>
                <span className="font-medium text-[#1E1E1E] tabular-nums">
                  {summary.totalRoomsCount} rooms
                </span>
              </div>
            </div>
          </div>
        */}

        {/* 2. Recent Bookings (Expanded to lg:col-span-8 to match Revenue Trend width above) */}
        <div className="lg:col-span-8 bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col h-[336px]">
          {/* Outer Shell Header */}
          <div className="px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-[15px] font-medium text-[#1E1E1E] leading-snug">
              Recent Bookings
            </h2>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => navigate('/bookings')}
                className="px-2.5 py-1 rounded-[8px] text-[12px] font-medium text-[#7463A6] hover:bg-white/80 transition-colors cursor-pointer"
              >
                View All
              </button>
              <button
                type="button"
                onClick={handleRefreshBookings}
                title="Refresh recent bookings"
                aria-label="Refresh recent bookings"
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-white/80 transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${
                    bookingsRefreshing ? 'rotate-180 text-[#7463A6]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Inner White Surface with fixed-height vertical scroll */}
          <div className="bg-white rounded-[11.5px] px-4 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto pr-1">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-[#EFEFEA] text-[11px] font-normal text-[#6E6E6A] whitespace-nowrap">
                    <th className="py-2 pr-2 font-normal">Booking ID</th>
                    <th className="py-2 px-2 font-normal">Guest</th>
                    <th className="py-2 px-2 font-normal">Room</th>
                    <th className="py-2 px-2 font-normal">Check-in</th>
                    <th className="py-2 px-2 text-right font-normal">Amount</th>
                    <th className="py-2 pl-2 text-right font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2EE] text-[12.5px]">
                  {recentBookings.map((bk) => (
                    <tr
                      key={bk.id}
                      onClick={() => navigate('/bookings')}
                      className="hover:bg-[#F8F8F6] transition-colors cursor-pointer h-[56px]"
                    >
                      <td className="py-2.5 pr-2 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                        {bk.id}
                      </td>
                      <td className="py-2.5 px-2 font-normal text-[#3A3A36] truncate max-w-[115px]">
                        {bk.guestName}
                      </td>
                      <td className="py-2.5 px-2 font-normal text-[#6E6E6A] tabular-nums whitespace-nowrap">
                        Rm {bk.roomNumber}
                      </td>
                      <td className="py-2.5 px-2 font-normal text-[#6E6E6A] tabular-nums whitespace-nowrap">
                        {formatDateReadable(bk.checkInDate)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                        {formatCompactCurrency(bk.totalAmount, sym)}
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <StatusBadge status={bk.bookingStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 3. Alerts & Exceptions (Equal-Height Double-Surface Panel, max 10 rows + link to full Notifications/Alerts view) */}
        <div className="lg:col-span-4 bg-[#F0F0F0] p-[2.5px] rounded-[14px] flex flex-col h-[336px]">
          {/* Outer Shell Header */}
          <div className="px-3.5 pt-2 pb-1.5 flex items-center justify-between gap-2 shrink-0">
            <h2 className="text-[15px] font-medium text-[#1E1E1E] leading-snug">
              Alerts & Exceptions
            </h2>
            <button
              type="button"
              onClick={handleRefreshAlerts}
              title="Refresh alerts and exceptions"
              aria-label="Refresh alerts and exceptions"
              className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-white/80 transition-colors shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  alertsRefreshing ? 'rotate-180 text-[#7463A6]' : ''
                }`}
              />
            </button>
          </div>

          {/* Inner White Surface with fixed-height vertical scroll and View All Alerts link */}
          <div className="bg-white rounded-[11.5px] px-3.5 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.025)] flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#F2F2EE] pr-1">
              {operationalAlerts.map((alert) => {
                const Icon = alert.icon;
                return (
                  <div
                    key={alert.id}
                    onClick={() => navigate(alert.path)}
                    className="py-2.5 px-2 rounded-[9px] hover:bg-[#F8F8F6] transition-colors flex items-center justify-between gap-3 cursor-pointer min-h-[64px]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 ${alert.iconBgClass}`}
                      >
                        <Icon className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#1E1E1E] truncate">
                          {alert.title}
                        </div>
                        <div className="text-[11.5px] font-normal text-[#6E6E6A] truncate mt-0.5">
                          {alert.category} · {alert.meta}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge
                        status={alert.status}
                        tone={alert.badgeTone}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 mt-1 border-t border-[#F0F0EC] shrink-0">
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('lumina:open-alerts'))
                }
                className="w-full flex items-center justify-between px-2 py-1 rounded-[7px] text-[12px] font-medium text-[#7463A6] hover:bg-[#F1EEF8] transition-colors cursor-pointer"
              >
                <span>View All Notifications & Alerts</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

