import React, { useState, useMemo } from 'react';
import {
  FileBarChart2,
  RotateCcw,
  Wine,
  UtensilsCrossed,
  Award,
  TrendingUp,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  DateRangeControl,
  SearchInput,
  EmptyState,
} from '../../components/ui/PageControls';
import { formatCompactCurrency, formatCurrency } from '../../utils/formatters';

interface SalesPivotRow {
  key: string;
  itemId: string;
  itemName: string;
  department: 'Bar & POS' | 'Kitchen & Restaurant';
  orderCount: number;
  quantitySold: number;
  cashRevenue: number;
  transferRevenue: number;
  cardRevenue: number;
  roomChargeRevenue: number;
  totalRevenue: number;
}

export const SalesReportsPage: React.FC = () => {
  const { posTransactions, selectedBranchId, settings } = useHotel();
  const sym = settings.currencySymbol;

  const [search, setSearch] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('2026-10-01');
  const [dateTo, setDateTo] = useState<string>('2026-10-31');

  const filteredTransactions = useMemo(() => {
    return posTransactions.filter((tx) => {
      if (selectedBranchId !== 'ALL' && tx.branchId !== selectedBranchId) return false;
      const txDate = tx.date || tx.dateTime.slice(0, 10);
      if (dateFrom && txDate < dateFrom) return false;
      if (dateTo && txDate > dateTo) return false;
      if (departmentFilter !== 'ALL' && tx.department !== departmentFilter) {
        return false;
      }
      return true;
    });
  }, [posTransactions, selectedBranchId, departmentFilter, dateFrom, dateTo]);

  const pivotRows = useMemo(() => {
    const map = new Map<string, SalesPivotRow>();
    const orderSetByItem = new Map<string, Set<string>>();

    filteredTransactions.forEach((tx) => {
      const rawSubtotal = tx.items.reduce((s, i) => s + i.subtotal, 0);
      const scale = rawSubtotal > 0 ? tx.totalAmount / rawSubtotal : 1;
      const collectedRatio =
        tx.paymentStatus === 'Paid'
          ? 1
          : tx.totalAmount > 0
          ? Math.max(0, Math.min(1, (tx.amountPaid || 0) / tx.totalAmount))
          : 0;

      tx.items.forEach((item) => {
        const key = `${tx.department}::${item.itemId || item.name}`;
        const allocatedRevenue = Math.round(item.subtotal * scale);
        const collectedRevenue = Math.round(allocatedRevenue * collectedRatio);

        let ordersSet = orderSetByItem.get(key);
        if (!ordersSet) {
          ordersSet = new Set<string>();
          orderSetByItem.set(key, ordersSet);
        }
        ordersSet.add(tx.id);

        const addCash = tx.paymentMethod === 'Cash' ? collectedRevenue : 0;
        const addTransfer =
          tx.paymentMethod === 'Bank Transfer' ? collectedRevenue : 0;
        const addCard =
          tx.paymentMethod === 'Card' || tx.paymentMethod === 'POS Terminal'
            ? collectedRevenue
            : 0;
        const addRoomCharge =
          tx.paymentMethod === 'Room Charge' ? allocatedRevenue : 0;

        const existing = map.get(key);
        if (existing) {
          existing.orderCount = ordersSet.size;
          existing.quantitySold += item.quantity;
          existing.cashRevenue += addCash;
          existing.transferRevenue += addTransfer;
          existing.cardRevenue += addCard;
          existing.roomChargeRevenue += addRoomCharge;
          existing.totalRevenue += allocatedRevenue;
        } else {
          map.set(key, {
            key,
            itemId: item.itemId,
            itemName: item.name,
            department: tx.department,
            orderCount: 1,
            quantitySold: item.quantity,
            cashRevenue: addCash,
            transferRevenue: addTransfer,
            cardRevenue: addCard,
            roomChargeRevenue: addRoomCharge,
            totalRevenue: allocatedRevenue,
          });
        }
      });
    });

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((row) => {
        if (!q) return true;
        return (
          row.itemName.toLowerCase().includes(q) ||
          row.department.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredTransactions, search]);

  const summary = useMemo(() => {
    const totalOrders = filteredTransactions.length;
    const totalQuantity = pivotRows.reduce((s, r) => s + r.quantitySold, 0);
    const cashRevenue = pivotRows.reduce((s, r) => s + r.cashRevenue, 0);
    const transferRevenue = pivotRows.reduce((s, r) => s + r.transferRevenue, 0);
    const cardRevenue = pivotRows.reduce((s, r) => s + r.cardRevenue, 0);
    const roomChargeRevenue = pivotRows.reduce((s, r) => s + r.roomChargeRevenue, 0);
    const totalRevenue = pivotRows.reduce((s, r) => s + r.totalRevenue, 0);

    const barRows = pivotRows.filter((r) => r.department === 'Bar & POS');
    const restaurantRows = pivotRows.filter(
      (r) => r.department === 'Kitchen & Restaurant'
    );

    const barRevenue = barRows.reduce((s, r) => s + r.totalRevenue, 0);
    const restaurantRevenue = restaurantRows.reduce((s, r) => s + r.totalRevenue, 0);

    const topBarItem =
      [...barRows].sort((a, b) => b.quantitySold - a.quantitySold)[0] || null;
    const topRestaurantItem =
      [...restaurantRows].sort((a, b) => b.quantitySold - a.quantitySold)[0] || null;

    return {
      totalOrders,
      totalQuantity,
      cashRevenue,
      transferRevenue,
      cardRevenue,
      roomChargeRevenue,
      totalRevenue,
      barRevenue,
      restaurantRevenue,
      topBarItem,
      topRestaurantItem,
    };
  }, [pivotRows, filteredTransactions.length]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales & Services Report"
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

      {/* Top Filter Control Row (Above KPI Cards): Search Input + Department Dropdown */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search beverage or food item..."
            className="w-full sm:w-72"
          />

          <Dropdown
            value={departmentFilter}
            onChange={setDepartmentFilter}
            size="sm"
            className="w-52"
            options={[
              { value: 'ALL', label: 'All Departments' },
              { value: 'Bar & POS', label: 'Bar & POS' },
              { value: 'Kitchen & Restaurant', label: 'Kitchen & Restaurant' },
            ]}
          />

          {(departmentFilter !== 'ALL' || search) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDepartmentFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] text-[#7463A6] hover:bg-[#F1EEF8] font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards Below Top Control Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Bar & POS Revenue"
          value={formatCompactCurrency(summary.barRevenue, sym)}
          fullValueTooltip={formatCurrency(summary.barRevenue, sym)}
          icon={Wine}
          iconTone="purple"
        />
        <KpiCard
          label="Kitchen & Restaurant Revenue"
          value={formatCompactCurrency(summary.restaurantRevenue, sym)}
          fullValueTooltip={formatCurrency(summary.restaurantRevenue, sym)}
          icon={UtensilsCrossed}
          iconTone="teal"
        />
        <KpiCard
          label="Top Item Sold (Bar & POS)"
          value={
            summary.topBarItem
              ? `${summary.topBarItem.itemName} (${summary.topBarItem.quantitySold})`
              : '—'
          }
          fullValueTooltip={
            summary.topBarItem
              ? `${summary.topBarItem.itemName} · ${summary.topBarItem.quantitySold} sold`
              : undefined
          }
          icon={Award}
          iconTone="amber"
        />
        <KpiCard
          label="Top Item Sold (Kitchen & Restaurant)"
          value={
            summary.topRestaurantItem
              ? `${summary.topRestaurantItem.itemName} (${summary.topRestaurantItem.quantitySold})`
              : '—'
          }
          fullValueTooltip={
            summary.topRestaurantItem
              ? `${summary.topRestaurantItem.itemName} · ${summary.topRestaurantItem.quantitySold} sold`
              : undefined
          }
          icon={TrendingUp}
          iconTone="green"
        />
      </div>

      {/* Pivot Summary Table */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {pivotRows.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="No sales records match the selected filters"
            description="Adjust the department or reporting period to inspect Bar & POS and Restaurant sales."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EFEFEA] text-[11.5px] font-medium text-[#6E6E6A] whitespace-nowrap">
                  <th className="px-5 py-3.5">Product / Item Name</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5 text-right">Number of Orders</th>
                  <th className="px-4 py-3.5 text-right">Quantity Sold</th>
                  <th className="px-4 py-3.5 text-right">Cash</th>
                  <th className="px-4 py-3.5 text-right">Bank Transfer</th>
                  <th className="px-4 py-3.5 text-right">Card</th>
                  <th className="px-4 py-3.5 text-right">Room Charge</th>
                  <th className="px-5 py-3.5 text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2EE] text-[13px]">
                {pivotRows.map((row) => (
                  <tr
                    key={row.key}
                    className="hover:bg-[#FAF9F6]/70 transition-colors whitespace-nowrap"
                  >
                    <td className="px-5 py-3.5 text-[#1E1E1E] font-normal">
                      {row.itemName}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-[11.5px] font-medium ${
                          row.department === 'Bar & POS'
                            ? 'bg-[#F1EEF8] text-[#7463A6]'
                            : 'bg-[#E8F5F3] text-[#1D7A6E]'
                        }`}
                      >
                        {row.department}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#1E1E1E] tabular-nums">
                      {row.orderCount}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[#1E1E1E] tabular-nums">
                      {row.quantitySold}
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
                    <td className="px-4 py-3.5 text-right text-[#6E6E6A] tabular-nums">
                      {formatCurrency(row.roomChargeRevenue, sym)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[#1E1E1E] font-medium tabular-nums">
                      {formatCurrency(row.totalRevenue, sym)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#FAF9F6] border-t border-[#E6E6E0] text-[13px] font-medium text-[#1E1E1E] whitespace-nowrap">
                  <td className="px-5 py-3.5">Total</td>
                  <td className="px-4 py-3.5 text-[#6E6E6A]">
                    {pivotRows.length} items
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {summary.totalOrders}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {summary.totalQuantity}
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
                  <td className="px-4 py-3.5 text-right tabular-nums">
                    {formatCurrency(summary.roomChargeRevenue, sym)}
                  </td>
                  <td className="px-5 py-3.5 text-right text-[#7463A6] tabular-nums">
                    {formatCurrency(summary.totalRevenue, sym)}
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

