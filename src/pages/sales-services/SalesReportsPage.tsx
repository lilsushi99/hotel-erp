import React, { useState, useMemo } from 'react';
import { FileBarChart2, RotateCcw } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  DateRangeControl,
  SearchInput,
  EmptyState,
} from '../../components/ui/PageControls';
import { formatCurrency } from '../../utils/formatters';

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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
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
      if (paymentMethodFilter !== 'ALL' && tx.paymentMethod !== paymentMethodFilter) {
        return false;
      }
      return true;
    });
  }, [
    posTransactions,
    selectedBranchId,
    departmentFilter,
    paymentMethodFilter,
    dateFrom,
    dateTo,
  ]);

  const pivotRows = useMemo(() => {
    const map = new Map<string, SalesPivotRow>();
    const orderSetByItem = new Map<string, Set<string>>();

    filteredTransactions.forEach((tx) => {
      // Calculate ratio of net transaction total to item subtotal so discounts/taxes are proportionally reflected
      const rawSubtotal = tx.items.reduce((s, i) => s + i.subtotal, 0);
      const scale = rawSubtotal > 0 ? tx.totalAmount / rawSubtotal : 1;

      tx.items.forEach((item) => {
        const key = `${tx.department}::${item.itemId || item.name}`;
        const allocatedRevenue = Math.round(item.subtotal * scale);

        let ordersSet = orderSetByItem.get(key);
        if (!ordersSet) {
          ordersSet = new Set<string>();
          orderSetByItem.set(key, ordersSet);
        }
        ordersSet.add(tx.id);

        const existing = map.get(key);
        if (existing) {
          existing.orderCount = ordersSet.size;
          existing.quantitySold += item.quantity;
          if (tx.paymentMethod === 'Cash') existing.cashRevenue += allocatedRevenue;
          else if (tx.paymentMethod === 'Bank Transfer')
            existing.transferRevenue += allocatedRevenue;
          else if (tx.paymentMethod === 'Card') existing.cardRevenue += allocatedRevenue;
          else existing.roomChargeRevenue += allocatedRevenue;
          existing.totalRevenue += allocatedRevenue;
        } else {
          map.set(key, {
            key,
            itemId: item.itemId,
            itemName: item.name,
            department: tx.department,
            orderCount: 1,
            quantitySold: item.quantity,
            cashRevenue: tx.paymentMethod === 'Cash' ? allocatedRevenue : 0,
            transferRevenue:
              tx.paymentMethod === 'Bank Transfer' ? allocatedRevenue : 0,
            cardRevenue: tx.paymentMethod === 'Card' ? allocatedRevenue : 0,
            roomChargeRevenue:
              tx.paymentMethod === 'Room Charge' ? allocatedRevenue : 0,
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

    const barRevenue = pivotRows
      .filter((r) => r.department === 'Bar & POS')
      .reduce((s, r) => s + r.totalRevenue, 0);
    const restaurantRevenue = pivotRows
      .filter((r) => r.department === 'Kitchen & Restaurant')
      .reduce((s, r) => s + r.totalRevenue, 0);

    const topByRevenue = pivotRows[0] || null;
    const topByQuantity =
      [...pivotRows].sort((a, b) => b.quantitySold - a.quantitySold)[0] || null;

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
      topByRevenue,
      topByQuantity,
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

      {/* Filter Bar & Inline Highlights (No KPI Cards) */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search beverage or food item..."
              className="w-full sm:w-64"
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
                { value: 'Room Charge', label: 'Room Charge' },
              ]}
            />

            {(departmentFilter !== 'ALL' ||
              paymentMethodFilter !== 'ALL' ||
              search) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setDepartmentFilter('ALL');
                  setPaymentMethodFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[12px] text-[#7463A6] hover:bg-[#F1EEF8] font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[12.5px] text-[#6E6E6A]">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span>Bar & POS:</span>
              <span className="text-[#1E1E1E] font-medium tabular-nums">
                {formatCurrency(summary.barRevenue, sym)}
              </span>
            </div>
            <span className="text-[#E2E2DC] hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span>Kitchen & Restaurant:</span>
              <span className="text-[#1E1E1E] font-medium tabular-nums">
                {formatCurrency(summary.restaurantRevenue, sym)}
              </span>
            </div>
            <span className="text-[#E2E2DC] hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span>Top Item:</span>
              <span className="text-[#1E1E1E] font-medium">
                {summary.topByRevenue
                  ? `${summary.topByRevenue.itemName} (${summary.topByRevenue.quantitySold} sold)`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pivot Summary Table */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {pivotRows.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="No sales records match the selected filters"
            description="Adjust the department, payment method, or reporting period to inspect Bar & POS and Restaurant sales."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#EFEFEA] text-[11.5px] font-medium text-[#6E6E6A] whitespace-nowrap">
                  <th className="px-5 py-3.5">Product / Item Name</th>
                  <th className="px-4 py-3.5">Department</th>
                  <th className="px-4 py-3.5 text-right">Orders</th>
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
