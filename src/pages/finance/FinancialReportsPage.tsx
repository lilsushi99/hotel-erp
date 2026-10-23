import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import {
  PageHeader,
  SecondaryButton,
  TableToolbar,
  SearchInput,
} from '../../components/ui/PageControls';
import { Dropdown } from '../../components/ui/Dropdown';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DateRangeControl } from '../../components/ui/CustomDatePicker';
import { DateRangeFilter } from '../../types/hotel';
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  isDateInRange,
  getPresetDateRange,
  exportToCsv,
  getExpenseDepartment,
} from '../../utils/formatters';

const DEPT_COLORS = ['#7463A6', '#2563EB', '#0D9488', '#D97706'];
const PAYMENT_BAR_COLORS = [
  '#7463A6',
  '#2563EB',
  '#0D9488',
  '#D97706',
  '#4F46E5',
  '#15803D',
  '#DB2777',
];

const DEFAULT_EXPENSE_COLORS: Record<string, string> = {
  'Utilities & Power': '#7463A6',
  'Utilities & Diesel': '#7463A6',
  'Kitchen & F&B Procurement': '#0D9488',
  'Maintenance & Repairs': '#D97706',
  'Housekeeping & Laundry': '#285A84',
  'IT & Subscriptions': '#4F46E5',
  'Staff Welfare & Training': '#16A34A',
  'Marketing & Guest Relations': '#DB2777',
};

const LEDGER_PAGE_SIZE = 10;

interface LedgerRow {
  id: string;
  date: string;
  department: string;
  type: 'Revenue' | 'Expense';
  description: string;
  party: string;
  paymentMethod: string;
  totalAmount: number;
  amountPaid: number;
  status: string;
}

function splitChartLabel(label: string): [string, string | null] {
  const clean = (label || '').trim();
  if (clean.length <= 14) return [clean, null];
  if (clean.includes('/')) {
    const [a, b] = clean.split('/');
    return [`${a}/`, b || null];
  }
  const words = clean.split(/\s+/);
  if (words.length <= 1) return [clean, null];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export const FinancialReportsPage: React.FC = () => {
  const {
    bookings,
    posTransactions,
    laundryOrders,
    expenses,
    selectedBranchId,
    settings,
  } = useHotel();

  const [dateFilter, setDateFilter] = useState<DateRangeFilter>(() =>
    getPresetDateRange('month')
  );

  const [expenseGrouping, setExpenseGrouping] = useState<'category' | 'department'>('category');
  const [ledgerDeptFilter, setLedgerDeptFilter] = useState<string>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered datasets
  const fBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.bookingStatus !== 'Cancelled' &&
          (selectedBranchId === 'ALL' || b.branchId === selectedBranchId) &&
          isDateInRange(b.checkInDate, dateFilter)
      ),
    [bookings, selectedBranchId, dateFilter]
  );

  const fPos = useMemo(
    () =>
      posTransactions.filter(
        (t) =>
          (selectedBranchId === 'ALL' || t.branchId === selectedBranchId) &&
          isDateInRange(t.date, dateFilter)
      ),
    [posTransactions, selectedBranchId, dateFilter]
  );

  const fLaundry = useMemo(
    () =>
      laundryOrders.filter(
        (l) =>
          (selectedBranchId === 'ALL' || l.branchId === selectedBranchId) &&
          isDateInRange(l.receivedDate, dateFilter)
      ),
    [laundryOrders, selectedBranchId, dateFilter]
  );

  const fExpenses = useMemo(
    () =>
      expenses.filter(
        (e) =>
          e.status !== 'Rejected' &&
          (selectedBranchId === 'ALL' || e.branchId === selectedBranchId) &&
          isDateInRange(e.date, dateFilter)
      ),
    [expenses, selectedBranchId, dateFilter]
  );

  // Departmental Revenue Totals (without double-counting)
  const roomsRev = fBookings.reduce((s, b) => s + b.totalAmount, 0);
  const barRev = fPos
    .filter((t) => t.department === 'Bar & POS')
    .reduce((s, t) => s + t.totalAmount, 0);
  const kitchenRev = fPos
    .filter((t) => t.department === 'Kitchen & Restaurant')
    .reduce((s, t) => s + t.totalAmount, 0);
  const laundryRev = fLaundry.reduce((s, l) => s + l.totalAmount, 0);

  const totalRevenue = roomsRev + barRev + kitchenRev + laundryRev;
  const totalExpenses = fExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Outstanding Receivables
  const bookingReceivables = fBookings.reduce(
    (s, b) => s + Math.max(0, b.totalAmount - b.amountPaid),
    0
  );
  const posReceivables = fPos.reduce(
    (s, t) => s + Math.max(0, t.totalAmount - t.amountPaid),
    0
  );
  const laundryReceivables = fLaundry.reduce(
    (s, l) => s + Math.max(0, l.totalAmount - l.amountPaid),
    0
  );
  const totalReceivables =
    bookingReceivables + posReceivables + laundryReceivables;

  // Chart 1: Revenue vs Expense Daily Trend
  const dailyFinancialSeries = useMemo(() => {
    const dates = new Set<string>();
    fBookings.forEach((b) => dates.add(b.checkInDate));
    fPos.forEach((t) => dates.add(t.date));
    fLaundry.forEach((l) => dates.add(l.receivedDate));
    fExpenses.forEach((e) => dates.add(e.date));
    const sorted = Array.from(dates).sort();

    return sorted.map((d) => {
      const rB = fBookings
        .filter((b) => b.checkInDate === d)
        .reduce((s, b) => s + b.totalAmount, 0);
      const rP = fPos
        .filter((t) => t.date === d)
        .reduce((s, t) => s + t.totalAmount, 0);
      const rL = fLaundry
        .filter((l) => l.receivedDate === d)
        .reduce((s, l) => s + l.totalAmount, 0);
      const exp = fExpenses
        .filter((e) => e.date === d)
        .reduce((s, e) => s + e.amount, 0);
      const rev = rB + rP + rL;
      return {
        date: formatDate(d).replace(', 2026', ''),
        Revenue: rev,
        Expense: exp,
        Net: rev - exp,
      };
    });
  }, [fBookings, fPos, fLaundry, fExpenses]);

  // Chart 2: Revenue by Department
  const deptBreakdown = [
    { name: 'Rooms', value: roomsRev },
    { name: 'Bar & POS', value: barRev },
    { name: 'Restaurant', value: kitchenRev },
    { name: 'Laundry', value: laundryRev },
  ];

  // Chart 3: Expense by Category or Expense by Department
  const expenseChartData = useMemo(() => {
    const colorMap: Record<string, string> = { ...DEFAULT_EXPENSE_COLORS };
    (settings.expenseCategoryConfigs || []).forEach((c) => {
      colorMap[c.name] = c.color;
    });

    const map: Record<string, number> = {};
    fExpenses.forEach((e) => {
      const key =
        expenseGrouping === 'department' ? getExpenseDepartment(e) : e.category;
      map[key] = (map[key] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color:
          colorMap[name] ||
          PAYMENT_BAR_COLORS[idx % PAYMENT_BAR_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [fExpenses, settings.expenseCategoryConfigs, expenseGrouping]);

  // Chart 4: Revenue by Payment Method
  const revenueByPaymentMethod = useMemo(() => {
    const map: Record<string, number> = {};
    fBookings.forEach((b) => {
      map[b.paymentMethod] = (map[b.paymentMethod] || 0) + b.totalAmount;
    });
    fPos.forEach((t) => {
      map[t.paymentMethod] = (map[t.paymentMethod] || 0) + t.totalAmount;
    });
    fLaundry.forEach((l) => {
      map[l.paymentMethod] = (map[l.paymentMethod] || 0) + l.totalAmount;
    });
    return Object.entries(map)
      .map(([method, amount], idx) => ({
        method,
        amount,
        color: PAYMENT_BAR_COLORS[idx % PAYMENT_BAR_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [fBookings, fPos, fLaundry]);

  // Financial Transaction Ledger
  const consolidatedLedger: LedgerRow[] = useMemo(() => {
    const rows: LedgerRow[] = [];

    fBookings.forEach((b) => {
      rows.push({
        id: b.id,
        date: b.checkInDate,
        department: 'Rooms',
        type: 'Revenue',
        description: `Room Stay (${b.nights} nights)`,
        party: b.guestName,
        paymentMethod: b.paymentMethod,
        totalAmount: b.totalAmount,
        amountPaid: b.amountPaid,
        status: b.paymentStatus,
      });
    });

    fPos.forEach((t) => {
      rows.push({
        id: t.id,
        date: t.date,
        department: t.department,
        type: 'Revenue',
        description: t.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
        party: t.guestName,
        paymentMethod: t.paymentMethod,
        totalAmount: t.totalAmount,
        amountPaid: t.amountPaid,
        status: t.paymentStatus,
      });
    });

    fLaundry.forEach((l) => {
      const primarySvc = l.garments[0]?.serviceType || 'Wash & Iron';
      rows.push({
        id: l.id,
        date: l.receivedDate,
        department: 'Laundry',
        type: 'Revenue',
        description: `${primarySvc} (${l.garments.reduce(
          (s, i) => s + i.quantity,
          0
        )} pcs)`,
        party: l.customerName,
        paymentMethod: l.paymentMethod,
        totalAmount: l.totalAmount,
        amountPaid: l.amountPaid,
        status: l.paymentStatus,
      });
    });

    fExpenses.forEach((e) => {
      const expDept = getExpenseDepartment(e);
      rows.push({
        id: e.reference,
        date: e.date,
        department: expDept,
        type: 'Expense',
        description: `${e.category}: ${e.description}`,
        party: e.responsibleStaff,
        paymentMethod: e.paymentMethod,
        totalAmount: e.amount,
        amountPaid: e.amount,
        status: 'Approved',
      });
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [fBookings, fPos, fLaundry, fExpenses]);

  const filteredLedger = useMemo(() => {
    return consolidatedLedger.filter((r) => {
      if (ledgerDeptFilter !== 'ALL') {
        const matchesExact = r.department === ledgerDeptFilter;
        const matchesBarAlias =
          ledgerDeptFilter === 'Bar & POS' && r.department === 'Bar';
        const matchesResAlias =
          ledgerDeptFilter === 'Kitchen & Restaurant' &&
          r.department === 'Restaurant';
        if (!matchesExact && !matchesBarAlias && !matchesResAlias) return false;
      }
      if (ledgerSearch.trim()) {
        const q = ledgerSearch.toLowerCase();
        if (
          !r.id.toLowerCase().includes(q) &&
          !r.description.toLowerCase().includes(q) &&
          !r.party.toLowerCase().includes(q) &&
          !r.department.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [consolidatedLedger, ledgerDeptFilter, ledgerSearch]);

  // Reset pagination to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    ledgerDeptFilter,
    ledgerSearch,
    dateFilter,
    selectedBranchId,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLedger.length / LEDGER_PAGE_SIZE)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedLedger = useMemo(() => {
    const start = (safeCurrentPage - 1) * LEDGER_PAGE_SIZE;
    return filteredLedger.slice(start, start + LEDGER_PAGE_SIZE);
  }, [filteredLedger, safeCurrentPage]);

  const handleExportReport = () => {
    exportToCsv(
      'lumina-financial-ledger.csv',
      filteredLedger.map((r) => ({
        Reference: r.id,
        Date: r.date,
        Department: r.department,
        Type: r.type,
        Description: r.description,
        CustomerOrStaff: r.party,
        PaymentMethod: r.paymentMethod,
        TotalAmount: r.totalAmount,
        AmountSettled: r.amountPaid,
        Status: r.status,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Reports"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DateRangeControl value={dateFilter} onChange={setDateFilter} />
            <SecondaryButton onClick={handleExportReport}>
              <Download className="w-4 h-4" />
              Export CSV Report
            </SecondaryButton>
          </div>
        }
      />

      {/* 4 KPI Cards — Overview height standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue, settings.currencySymbol)}
          icon={TrendingUp}
          tone="emerald"
        />
        <KpiCard
          label="Total Expense"
          value={formatCurrency(totalExpenses, settings.currencySymbol)}
          icon={TrendingDown}
          tone="red"
        />
        <KpiCard
          label="Net Profit"
          value={formatCurrency(netProfit, settings.currencySymbol)}
          icon={DollarSign}
          tone="purple"
        />
        <KpiCard
          label="Outstanding Receivables"
          value={formatCurrency(totalReceivables, settings.currencySymbol)}
          icon={CreditCard}
          tone="amber"
        />
      </div>

      {/* Charts Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Revenue vs Expense Trend — balanced outer & inner container padding */}
        <div className="lg:col-span-2 bg-[#F0F0F0] p-1 rounded-[20px] flex flex-col">
          <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between flex-1">
            <div className="mb-3">
              <h3 className="text-[15px] font-semibold text-[#111111]">
                Revenue vs Expense Trends
              </h3>
            </div>
            <div className="flex-1 min-h-[268px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyFinancialSeries}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F3F4F6"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      formatCompactCurrency(v, settings.currencySymbol)
                    }
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ stroke: '#E5E7EB', strokeWidth: 1 }}
                    formatter={(val) =>
                      formatCurrency(
                        Number(val || 0),
                        settings.currencySymbol
                      )
                    }
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #EFEFEF',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenue"
                    stroke="#15803D"
                    fill="#15803D"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Expense"
                    stroke="#DC2626"
                    fill="#DC2626"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Revenue by Department */}
        <div className="bg-[#F0F0F0] p-1 rounded-[20px] flex flex-col">
          <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between flex-1">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111111]">
                Revenue by Department
              </h3>
            </div>
            <div className="h-48 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={74}
                    paddingAngle={3}
                  >
                    {deptBreakdown.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={DEPT_COLORS[idx % DEPT_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) =>
                      formatCurrency(
                        Number(val || 0),
                        settings.currencySymbol
                      )
                    }
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #EFEFEF',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 border-t border-[#F3F4F6] pt-3">
              {deptBreakdown.map((d, idx) => {
                const share =
                  totalRevenue > 0
                    ? Math.round((d.value / totalRevenue) * 100)
                    : 0;
                return (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-[12px]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: DEPT_COLORS[idx] }}
                      />
                      <span className="font-normal text-[#374151]">
                        {d.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#111111] tabular-nums">
                        {formatCurrency(d.value, settings.currencySymbol)}
                      </span>
                      <span className="text-[11px] text-[#9CA3AF] w-8 text-right">
                        {share}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Expense by Category / Expense by Department */}
        <div className="bg-[#F0F0F0] p-1 rounded-[20px] flex flex-col">
          <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-[15px] font-semibold text-[#111111] whitespace-nowrap">
                {expenseGrouping === 'department'
                  ? 'Expense by Department'
                  : 'Expense by Category'}
              </h3>
              <Dropdown
                value={expenseGrouping}
                onChange={(val) =>
                  setExpenseGrouping(val as 'category' | 'department')
                }
                options={[
                  { value: 'category', label: 'Expense by Category' },
                  { value: 'department', label: 'Expense by Department' },
                ]}
                className="w-52 shrink-0"
              />
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={expenseChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 4, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#F3F4F6"
                  />
                  <XAxis
                    type="number"
                    tickFormatter={(v) =>
                      formatCompactCurrency(v, settings.currencySymbol)
                    }
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={122}
                    tick={({ y, payload }) => {
                      const [line1, line2] = splitChartLabel(
                        String(payload.value || '')
                      );
                      return (
                        <text
                          x={4}
                          y={y}
                          textAnchor="start"
                          fill="#374151"
                          fontSize={11.5}
                          fontWeight={400}
                        >
                          {line2 ? (
                            <>
                              <tspan x={4} dy="-0.3em">
                                {line1}
                              </tspan>
                              <tspan x={4} dy="1.15em">
                                {line2}
                              </tspan>
                            </>
                          ) : (
                            <tspan x={4} dy="0.32em">
                              {line1}
                            </tspan>
                          )}
                        </text>
                      );
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(val) =>
                      formatCurrency(
                        Number(val || 0),
                        settings.currencySymbol
                      )
                    }
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #EFEFEF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Revenue by Payment Method */}
        <div className="bg-[#F0F0F0] p-1 rounded-[20px] flex flex-col">
          <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 flex flex-col justify-between flex-1">
            <h3 className="text-[15px] font-semibold text-[#111111] mb-4">
              Revenue by Payment Method
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={revenueByPaymentMethod}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#F3F4F6"
                  />
                  <XAxis
                    dataKey="method"
                    tick={{ fontSize: 11, fill: '#374151' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      formatCompactCurrency(v, settings.currencySymbol)
                    }
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={false}
                    formatter={(val) =>
                      formatCurrency(
                        Number(val || 0),
                        settings.currencySymbol
                      )
                    }
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #EFEFEF',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={36}>
                    {revenueByPaymentMethod.map((entry, idx) => (
                      <Cell key={`pm-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Transaction Ledger with 10-Row Pagination */}
      <div className="bg-[#F0F0F0] p-1 rounded-[20px]">
        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 pt-5 pb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#111111]">
              Financial Transaction Ledger
            </h3>
            <span className="text-[12px] font-normal text-[#6B7280]">
              {filteredLedger.length} transactions
            </span>
          </div>

          <TableToolbar
            left={
              <SearchInput
                value={ledgerSearch}
                onChange={setLedgerSearch}
                placeholder="Search reference, guest/staff, or description..."
              />
            }
            right={
              <Dropdown
                value={ledgerDeptFilter}
                onChange={setLedgerDeptFilter}
                options={[
                  { value: 'ALL', label: 'All Departments' },
                  { value: 'Rooms', label: 'Rooms' },
                  { value: 'Bar & POS', label: 'Bar & POS' },
                  {
                    value: 'Kitchen & Restaurant',
                    label: 'Kitchen & Restaurant',
                  },
                  { value: 'Laundry', label: 'Laundry' },
                  {
                    value: 'Housekeeping/Cleaning',
                    label: 'Housekeeping/Cleaning',
                  },
                  { value: 'Maintenance', label: 'Maintenance' },
                  { value: 'Administration', label: 'Administration' },
                ]}
                className="w-56"
              />
            }
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EFEFEF] bg-[#FAFAFA]">
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Reference
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Date
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Department
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Description
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Counterparty / Staff
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Method
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] text-right whitespace-nowrap">
                    Amount
                  </th>
                  <th className="py-3 px-4 text-[11px] font-medium uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6] text-[13px]">
                {paginatedLedger.map((row, idx) => (
                  <tr
                    key={`${row.id}-${idx}`}
                    className="hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-normal text-[#111111] text-[12px] whitespace-nowrap">
                      {row.id}
                    </td>
                    <td className="py-3 px-4 font-normal text-[#4B5563] whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td className="py-3 px-4 font-normal text-[#374151] whitespace-nowrap">
                      {row.department}
                    </td>
                    <td className="py-3 px-4 font-normal text-[#111111] whitespace-nowrap">
                      {row.description}
                    </td>
                    <td className="py-3 px-4 font-normal text-[#4B5563] whitespace-nowrap">
                      {row.party}
                    </td>
                    <td className="py-3 px-4 font-normal text-[#374151] text-[12.5px] whitespace-nowrap">
                      {row.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-normal tabular-nums whitespace-nowrap">
                      <span
                        className={
                          row.type === 'Revenue'
                            ? 'text-[#15803D]'
                            : 'text-[#DC2626]'
                        }
                      >
                        {row.type === 'Revenue' ? '+' : '-'}
                        {formatCurrency(
                          row.totalAmount,
                          settings.currencySymbol
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {filteredLedger.length > 0 && (
            <div className="px-5 py-3.5 border-t border-[#EFEFEF] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 text-[12px]">
              <span className="text-[#6B7280]">
                Showing{' '}
                <strong className="font-medium text-[#111111]">
                  {(safeCurrentPage - 1) * LEDGER_PAGE_SIZE + 1}
                </strong>
                –
                <strong className="font-medium text-[#111111]">
                  {Math.min(
                    safeCurrentPage * LEDGER_PAGE_SIZE,
                    filteredLedger.length
                  )}
                </strong>{' '}
                of{' '}
                <strong className="font-medium text-[#111111]">
                  {filteredLedger.length}
                </strong>{' '}
                entries
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[#374151] font-medium hover:bg-[#F3F4F6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-[8px] font-medium transition-colors cursor-pointer ${
                        pageNum === safeCurrentPage
                          ? 'bg-[#7463A6] text-white'
                          : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] border border-[#E5E7EB] bg-white text-[#374151] font-medium hover:bg-[#F3F4F6] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
