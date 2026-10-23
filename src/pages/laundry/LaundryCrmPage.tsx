import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Wallet,
  Eye,
  Shirt,
  Phone,
  MapPin,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { LaundryOrder, LaundryServiceType } from '../../types/hotel';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import { Drawer } from '../../components/ui/Overlay';
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
  formatDate,
} from '../../utils/formatters';

interface LaundryCustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerType: 'Hotel Guest' | 'Walk-in Customer';
  ordersCount: number;
  totalGarments: number;
  totalSpend: number;
  firstOrderDate: string;
  lastOrderDate: string;
  orders: LaundryOrder[];
}

const SERVICE_TYPES: LaundryServiceType[] = [
  'Wash Only',
  'Dry Cleaning',
  'Iron Only',
  'Washing & Ironing',
];

export const LaundryCrmPage: React.FC = () => {
  const { laundryOrders, guests, selectedBranchId, settings } = useHotel();
  const sym = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [sortMode, setSortMode] = useState<'highest_spender' | 'newest'>(
    'highest_spender'
  );
  const [dateFrom, setDateFrom] = useState<string>('2026-10-01');
  const [dateTo, setDateTo] = useState<string>('2026-10-31');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [selectedProfile, setSelectedProfile] =
    useState<LaundryCustomerProfile | null>(null);

  const branchLaundryOrders = useMemo(
    () =>
      laundryOrders.filter((o) => {
        if (selectedBranchId !== 'ALL' && o.branchId !== selectedBranchId)
          return false;
        if (dateFrom && o.receivedDate < dateFrom) return false;
        if (dateTo && o.receivedDate > dateTo) return false;
        if (
          serviceFilter !== 'ALL' &&
          !o.garments.some((g) => g.serviceType === serviceFilter)
        ) {
          return false;
        }
        return true;
      }),
    [laundryOrders, selectedBranchId, dateFrom, dateTo, serviceFilter]
  );

  const laundryCustomers = useMemo(() => {
    const map = new Map<string, LaundryCustomerProfile>();

    branchLaundryOrders.forEach((order) => {
      const key =
        order.guestId ||
        order.customerPhone.trim().toLowerCase() ||
        order.customerName.trim().toLowerCase();
      const garmentQty = order.garments.reduce((s, g) => s + g.quantity, 0);
      const addressLabel = order.roomNumber
        ? `Room ${order.roomNumber}`
        : order.customerAddress || 'Walk-in';

      const existing = map.get(key);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalGarments += garmentQty;
        existing.totalSpend += order.totalAmount;
        if (order.receivedDate < existing.firstOrderDate) {
          existing.firstOrderDate = order.receivedDate;
        }
        if (order.receivedDate > existing.lastOrderDate) {
          existing.lastOrderDate = order.receivedDate;
        }
        existing.orders.push(order);
      } else {
        const matchedGuest = guests.find((g) => g.id === order.guestId);
        map.set(key, {
          id: matchedGuest?.id || `LC-${String(map.size + 101)}`,
          name: order.customerName,
          phone: order.customerPhone,
          email: matchedGuest?.email || '',
          address: addressLabel,
          customerType:
            order.guestId || order.roomNumber
              ? 'Hotel Guest'
              : 'Walk-in Customer',
          ordersCount: 1,
          totalGarments: garmentQty,
          totalSpend: order.totalAmount,
          firstOrderDate: order.receivedDate,
          lastOrderDate: order.receivedDate,
          orders: [order],
        });
      }
    });

    return Array.from(map.values());
  }, [branchLaundryOrders, guests]);

  const kpis = useMemo(() => {
    const total = laundryCustomers.length;
    const returning = laundryCustomers.filter((c) => c.ordersCount > 1).length;
    const newCustomers = laundryCustomers.filter(
      (c) => c.ordersCount <= 1
    ).length;
    const totalRevenue = laundryCustomers.reduce(
      (s, c) => s + c.totalSpend,
      0
    );
    return { total, returning, newCustomers, totalRevenue };
  }, [laundryCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return laundryCustomers
      .filter((c) => {
        if (!q) return true;
        return (
          c.id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortMode === 'highest_spender') {
          if (b.totalSpend !== a.totalSpend) return b.totalSpend - a.totalSpend;
          return b.ordersCount - a.ordersCount;
        }
        return b.lastOrderDate.localeCompare(a.lastOrderDate);
      });
  }, [laundryCustomers, search, sortMode]);

  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laundry CRM"
        actions={
          <DateRangeControl
            fromDate={dateFrom}
            toDate={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
              setPage(1);
            }}
          />
        }
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Laundry Customers"
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
          label="Total Laundry Spend"
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

      {/* Filter Bar */}
      <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search customer ID, name, phone, or room/address..."
            className="w-full sm:w-72"
          />

          <Dropdown
            value={serviceFilter}
            onChange={(v) => {
              setServiceFilter(v);
              setPage(1);
            }}
            size="sm"
            className="w-48"
            options={[
              { value: 'ALL', label: 'All Service Types' },
              ...SERVICE_TYPES.map((st) => ({ value: st, label: st })),
            ]}
          />
        </div>

        <Dropdown
          value={sortMode}
          onChange={(v) => {
            setSortMode(v as 'highest_spender' | 'newest');
            setPage(1);
          }}
          size="sm"
          className="w-64"
          options={[
            {
              value: 'highest_spender',
              label: 'Sort: Highest Spender to Lowest',
            },
            { value: 'newest', label: 'Sort: Newest to Oldest' },
          ]}
        />
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No laundry customer profiles match your filter"
            description="Customer profiles are automatically built from hotel guest and walk-in laundry orders."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#EFEFEA] text-[11.5px] font-medium text-[#6E6E6A] whitespace-nowrap">
                    <th className="px-5 py-3.5">Customer ID</th>
                    <th className="px-4 py-3.5">Customer Name</th>
                    <th className="px-4 py-3.5">Phone Number</th>
                    <th className="px-4 py-3.5">Address / Room</th>
                    <th className="px-4 py-3.5">Customer Type</th>
                    <th className="px-4 py-3.5 text-right">Laundry Orders</th>
                    <th className="px-4 py-3.5 text-right">Total Garments</th>
                    <th className="px-4 py-3.5 text-right">Total Spend</th>
                    <th className="px-4 py-3.5">Last Order</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFEFEA] text-[13px]">
                  {paginatedCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedProfile(c)}
                      className="hover:bg-[#FAF9F6]/80 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <td className="px-5 py-3.5 font-medium text-[#7463A6] tabular-nums">
                        {c.id}
                      </td>
                      <td className="px-4 py-3.5 font-normal text-[#1E1E1E]">
                        {c.name}
                      </td>
                      <td className="px-4 py-3.5 text-[#4A4A46] tabular-nums">
                        {c.phone}
                      </td>
                      <td className="px-4 py-3.5 text-[#4A4A46]">
                        {c.address}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-[11.5px] font-medium ${
                            c.customerType === 'Hotel Guest'
                              ? 'bg-[#F1EEF8] text-[#7463A6]'
                              : 'bg-[#F2F2EE] text-[#4A4A46]'
                          }`}
                        >
                          {c.customerType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#1E1E1E] tabular-nums">
                        {c.ordersCount}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[#4A4A46] tabular-nums">
                        {c.totalGarments} pcs
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-[#1E1E1E] tabular-nums">
                        {formatCurrency(c.totalSpend, sym)}
                      </td>
                      <td className="px-4 py-3.5 text-[#6E6E6A] tabular-nums">
                        {formatDate(c.lastOrderDate)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedProfile(c)}
                          title="View Laundry Profile"
                          className="p-1.5 rounded-[8px] text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#F2F2EE] transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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

      {/* Customer Laundry Profile Drawer */}
      <Drawer
        isOpen={!!selectedProfile}
        onClose={() => setSelectedProfile(null)}
        title={selectedProfile ? selectedProfile.name : 'Laundry Customer'}
        subtitle={
          selectedProfile
            ? `${selectedProfile.id} · ${selectedProfile.customerType}`
            : ''
        }
      >
        {selectedProfile && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-[14px] bg-[#FAF9F6] border border-[#EFEFEA] text-[12.5px]">
              <div className="flex items-start gap-2">
                <Phone className="w-3.5 h-3.5 text-[#7463A6] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[#6E6E6A]">Phone Number</p>
                  <p className="font-medium text-[#1E1E1E] tabular-nums">
                    {selectedProfile.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#7463A6] mt-0.5 shrink-0" />
                <div>
                  <p className="text-[#6E6E6A]">Address / Room</p>
                  <p className="font-medium text-[#1E1E1E]">
                    {selectedProfile.address}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Total Laundry Orders</p>
                <p className="font-medium text-[#1E1E1E] tabular-nums">
                  {selectedProfile.ordersCount} orders (
                  {selectedProfile.totalGarments} pcs)
                </p>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Total Laundry Spend</p>
                <p className="font-medium text-[#7463A6] tabular-nums">
                  {formatCurrency(selectedProfile.totalSpend, sym)}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-medium text-[#1E1E1E] mb-2.5 flex items-center gap-1.5">
                <Shirt className="w-4 h-4 text-[#7463A6]" />
                Laundry Order History ({selectedProfile.orders.length})
              </h4>
              <div className="space-y-2.5">
                {selectedProfile.orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-[12px] border border-[#EFEFEA] bg-white space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium text-[#1E1E1E] tabular-nums">
                        {ord.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge
                          status={
                            ord.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
                          }
                        />
                        <StatusBadge status={ord.workflowStatus} />
                      </div>
                    </div>
                    <p className="text-[12px] text-[#4A4A46]">
                      {ord.garments
                        .map(
                          (g) =>
                            `${g.quantity}x ${g.garmentType} (${g.serviceType})`
                        )
                        .join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-[11.5px] text-[#6E6E6A] pt-1 border-t border-[#F5F5F2]">
                      <span>Received {formatDate(ord.receivedDate)}</span>
                      <span className="font-medium text-[#1E1E1E] tabular-nums">
                        {formatCurrency(ord.totalAmount, sym)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
