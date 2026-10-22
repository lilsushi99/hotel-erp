import React, { useState, useMemo } from 'react';
import { Archive, Eye, Users } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  SearchInput,
  StatusTabs,
  EmptyState,
  Pagination,
} from '../../components/ui/PageControls';
import { Drawer } from '../../components/ui/Overlay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LaundryOrder } from '../../types/hotel';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const LaundryStoragePage: React.FC = () => {
  const { laundryOrders, guests, selectedBranchId, settings } = useHotel();

  const [activeTab, setActiveTab] = useState<string>('Ready for Collection');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);

  // Storage page displays orders that have reached 'Ready for Collection' or 'Collected'
  const storageEligibleOrders = useMemo(
    () =>
      laundryOrders.filter(
        (o) =>
          (selectedBranchId === 'ALL' || o.branchId === selectedBranchId) &&
          (o.workflowStatus === 'Ready for Collection' ||
            o.workflowStatus === 'Collected')
      ),
    [laundryOrders, selectedBranchId]
  );

  const awaitingCollectionOrders = useMemo(
    () =>
      storageEligibleOrders.filter(
        (o) => o.workflowStatus === 'Ready for Collection'
      ),
    [storageEligibleOrders]
  );

  const collectedOrders = useMemo(
    () =>
      storageEligibleOrders.filter((o) => o.workflowStatus === 'Collected'),
    [storageEligibleOrders]
  );

  // Laundry CRM records derived from shared customers with laundry orders
  const laundryCrmCustomers = useMemo(() => {
    const branchLaundry = laundryOrders.filter(
      (o) => selectedBranchId === 'ALL' || o.branchId === selectedBranchId
    );
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        address: string;
        ordersCount: number;
        totalGarments: number;
        totalSpend: number;
        lastOrderDate: string;
      }
    >();

    branchLaundry.forEach((o) => {
      const key = o.guestId || o.customerPhone || o.customerName;
      const existing = map.get(key);
      const garmentCount = o.garments.reduce((s, g) => s + g.quantity, 0);
      const addr = o.roomNumber
        ? `Room ${o.roomNumber}`
        : o.customerAddress || 'Walk-in';
      if (existing) {
        existing.ordersCount += 1;
        existing.totalGarments += garmentCount;
        existing.totalSpend += o.totalAmount;
        if (o.receivedDate > existing.lastOrderDate) {
          existing.lastOrderDate = o.receivedDate;
        }
      } else {
        const matchedGuest = guests.find((g) => g.id === o.guestId);
        map.set(key, {
          id: matchedGuest?.id || `LND-CUST-${map.size + 1}`,
          name: o.customerName,
          phone: o.customerPhone,
          address: addr,
          ordersCount: 1,
          totalGarments: garmentCount,
          totalSpend: o.totalAmount,
          lastOrderDate: o.receivedDate,
        });
      }
    });

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        sortOrder === 'newest'
          ? b.lastOrderDate.localeCompare(a.lastOrderDate)
          : a.lastOrderDate.localeCompare(b.lastOrderDate)
      );
  }, [laundryOrders, guests, selectedBranchId, search, sortOrder]);

  const tabs = [
    {
      id: 'Ready for Collection',
      label: 'Awaiting Collection',
      count: awaitingCollectionOrders.length,
    },
    {
      id: 'Collected',
      label: 'Collected',
      count: collectedOrders.length,
    },
    {
      id: 'ALL',
      label: 'All',
      count: storageEligibleOrders.length,
    },
    {
      id: 'CRM',
      label: 'Laundry CRM',
      count: laundryCrmCustomers.length,
    },
  ];

  const filteredOrders = useMemo(() => {
    return storageEligibleOrders
      .filter((o) => {
        if (activeTab === 'Ready for Collection' || activeTab === 'Collected') {
          if (o.workflowStatus !== activeTab) return false;
        }
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchOrder = o.id.toLowerCase().includes(q);
          const matchGuest = o.customerName.toLowerCase().includes(q);
          const matchPhone = o.customerPhone.toLowerCase().includes(q);
          const matchDesc = o.garments
            .map((i) => i.garmentType)
            .join(' ')
            .toLowerCase()
            .includes(q);
          if (!matchOrder && !matchGuest && !matchPhone && !matchDesc)
            return false;
        }
        return true;
      })
      .sort((a, b) =>
        sortOrder === 'newest'
          ? b.receivedDate.localeCompare(a.receivedDate)
          : a.receivedDate.localeCompare(b.receivedDate)
      );
  }, [storageEligibleOrders, activeTab, search, sortOrder]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  const paginatedCrm = useMemo(() => {
    const start = (page - 1) * pageSize;
    return laundryCrmCustomers.slice(start, start + pageSize);
  }, [laundryCrmCustomers, page]);

  return (
    <div className="space-y-5">
      <PageHeader title="Laundry Storage" />

      {/* Main Storage Card (No KPI cards) */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-5 pt-4">
          <StatusTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(t) => {
              setActiveTab(t);
              setPage(1);
            }}
          />
        </div>

        <div className="p-4 border-b border-[#EFEFEA] flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder={
              activeTab === 'CRM'
                ? 'Search laundry customer name, phone, or room/address...'
                : 'Search order ID, customer name, phone, or garment description...'
            }
            className="w-full sm:w-80"
          />

          <Dropdown
            value={sortOrder}
            onChange={(v) => {
              setSortOrder(v as 'newest' | 'oldest');
              setPage(1);
            }}
            size="sm"
            className="w-52"
            options={[
              { value: 'newest', label: 'Sort: Newest to Oldest' },
              { value: 'oldest', label: 'Sort: Oldest to Newest' },
            ]}
          />
        </div>

        {activeTab === 'CRM' ? (
          /* Laundry CRM View */
          laundryCrmCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No laundry customers found"
              description="Customer profiles created or linked through Laundry Logger appear here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A] whitespace-nowrap">
                      <th className="py-3.5 px-5 whitespace-nowrap">Customer ID</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Customer</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                      <th className="py-3.5 px-4 whitespace-nowrap">Address</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        Laundry Orders
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        Total Garments
                      </th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">
                        Total Spend
                      </th>
                      <th className="py-3.5 px-5 whitespace-nowrap">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                    {paginatedCrm.map((c) => (
                      <tr key={c.id} className="hover:bg-[#F8F8F5] transition-colors">
                        <td className="py-3.5 px-5 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                          {c.id}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#1E1E1E] whitespace-nowrap">
                          {c.name}
                        </td>
                        <td className="py-3.5 px-4 text-[#4A4A46] tabular-nums whitespace-nowrap">
                          {c.phone}
                        </td>
                        <td className="py-3.5 px-4 text-[#4A4A46] whitespace-nowrap">
                          {c.address}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                          {c.ordersCount}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#4A4A46] tabular-nums whitespace-nowrap">
                          {c.totalGarments} pcs
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                          {formatCurrency(c.totalSpend, settings.currencySymbol)}
                        </td>
                        <td className="py-3.5 px-5 text-[#6E6E6A] tabular-nums whitespace-nowrap">
                          {formatDate(c.lastOrderDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={page}
                totalItems={laundryCrmCustomers.length}
                pageSize={pageSize}
                onPageChange={setPage}
              />
            </>
          )
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Archive}
            title={
              activeTab === 'Ready for Collection'
                ? 'No garments awaiting collection'
                : 'No laundry storage records found'
            }
            description={
              activeTab === 'Ready for Collection'
                ? 'Orders appear here once their workflow status reaches Ready for Collection in Laundry Logger.'
                : 'Completed orders marked as Collected in Laundry Logger appear here.'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A] whitespace-nowrap">
                    <th className="py-3.5 px-5 whitespace-nowrap">Order ID</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Customer</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Phone Number</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      Number of Garments
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      Garment Description
                    </th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date Received</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Pickup Date</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">
                      Collection Status
                    </th>
                    <th className="py-3.5 px-5 text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                  {paginatedOrders.map((order) => {
                    const totalPcs = order.garments.reduce(
                      (s, i) => s + i.quantity,
                      0
                    );
                    const descriptionText = order.garments
                      .map((i) => `${i.quantity}x ${i.garmentType}`)
                      .join(', ');

                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="hover:bg-[#F8F8F5] transition-colors cursor-pointer"
                      >
                        <td className="py-3.5 px-5 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                          {order.id}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#1E1E1E] whitespace-nowrap">
                          {order.customerName}
                        </td>
                        <td className="py-3.5 px-4 text-[#4A4A46] tabular-nums whitespace-nowrap">
                          {order.customerPhone}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                          {totalPcs} {totalPcs === 1 ? 'pc' : 'pcs'}
                        </td>
                        <td className="py-3.5 px-4 text-[#4A4A46] max-w-[240px] truncate whitespace-nowrap">
                          <span title={descriptionText}>{descriptionText}</span>
                        </td>
                        <td className="py-3.5 px-4 text-[#4A4A46] tabular-nums whitespace-nowrap">
                          {formatDate(order.receivedDate)}
                        </td>
                        <td className="py-3.5 px-4 text-[#1E1E1E] font-medium tabular-nums whitespace-nowrap">
                          {formatDate(order.promisedDate)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={order.workflowStatus} />
                        </td>
                        <td
                          className="py-3.5 px-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            title="View Details"
                            className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#EFEFEA]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalItems={filteredOrders.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Order Detail Drawer (Read-only Collection Status, no Mark Collected button) */}
      <Drawer
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.id}` : 'Order Details'}
        subtitle={
          selectedOrder
            ? `${selectedOrder.customerName} · ${selectedOrder.customerPhone}`
            : ''
        }
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-[14px] bg-[#FAF9F6] border border-[#EFEFEA] text-[12.5px]">
              <div>
                <p className="text-[#6E6E6A]">Customer</p>
                <p className="font-medium text-[#1E1E1E] mt-0.5">
                  {selectedOrder.customerName}
                </p>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Phone Number</p>
                <p className="font-medium text-[#1E1E1E] mt-0.5 tabular-nums">
                  {selectedOrder.customerPhone}
                </p>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Date Received</p>
                <p className="font-medium text-[#1E1E1E] mt-0.5 tabular-nums">
                  {formatDate(selectedOrder.receivedDate)}
                </p>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Pickup Date</p>
                <p className="font-medium text-[#1E1E1E] mt-0.5 tabular-nums">
                  {formatDate(selectedOrder.promisedDate)}
                </p>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Collection Status</p>
                <div className="mt-1">
                  <StatusBadge status={selectedOrder.workflowStatus} />
                </div>
              </div>
              <div>
                <p className="text-[#6E6E6A]">Payment Status</p>
                <div className="mt-1">
                  <StatusBadge
                    status={
                      selectedOrder.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border border-[#EFEFEA] rounded-[14px] overflow-hidden">
              <div className="bg-[#FAF9F6] px-4 py-2.5 border-b border-[#EFEFEA] flex justify-between items-center">
                <span className="text-[12px] font-medium text-[#6E6E6A]">
                  Garments
                </span>
                <span className="text-[12px] font-medium text-[#1E1E1E]">
                  {selectedOrder.garments.reduce((s, i) => s + i.quantity, 0)}{' '}
                  pcs
                </span>
              </div>
              <div className="divide-y divide-[#F2F2EE]">
                {selectedOrder.garments.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 flex items-center justify-between text-[13px]"
                  >
                    <div>
                      <p className="font-medium text-[#1E1E1E]">
                        {item.quantity} × {item.garmentType}
                      </p>
                      <p className="text-[11.5px] text-[#6E6E6A]">
                        {item.serviceType}
                      </p>
                    </div>
                    <span className="font-semibold text-[#1E1E1E] tabular-nums">
                      {formatCurrency(item.subtotal, settings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-[#FAF9F6] px-4 py-3 border-t border-[#EFEFEA] flex justify-between text-[13.5px] font-semibold text-[#1E1E1E] tabular-nums">
                <span>Total Amount</span>
                <span>
                  {formatCurrency(
                    selectedOrder.totalAmount,
                    settings.currencySymbol
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
