import React, { useState, useMemo } from 'react';
import {
  Shirt,
  Plus,
  Waves,
  CheckCircle2,
  CreditCard,
  Eye,
  Trash2,
  ArrowRight,
  Search,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import {
  PageHeader,
  SearchInput,
  DateRangeControl,
  PrimaryButton,
  EmptyState,
  Pagination,
  CustomSingleDatePicker,
} from '../../components/ui/PageControls';
import { Modal, Drawer } from '../../components/ui/Overlay';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  LaundryOrder,
  LaundryWorkflowStatus,
  LaundryGarmentItem,
  LaundryServiceType,
  PaymentMethod,
  PaymentStatus,
} from '../../types/hotel';
import {
  formatCurrency,
  formatDate,
  TODAY_STR,
  addDays,
  isDateInRange,
} from '../../utils/formatters';

const WORKFLOW_SEQUENCE: LaundryWorkflowStatus[] = [
  'Received',
  'Washing',
  'Drying',
  'Ironing',
  'Ready for Collection',
  'Collected',
];

const PAYMENT_METHODS: PaymentMethod[] = ['Card', 'Bank Transfer', 'Cash'];

const SERVICE_TYPES: LaundryServiceType[] = [
  'Washing',
  'Ironing',
  'Washing & Ironing',
  'Dry Cleaning',
  'Starching',
];

function formatConciseGarmentSummary(garments: LaundryGarmentItem[]): string {
  if (!garments || garments.length === 0) return '—';
  const first = garments[0];
  const remainingCount = garments
    .slice(1)
    .reduce((sum, g) => sum + g.quantity, 0);
  if (garments.length === 1) {
    return `${first.quantity} ${first.garmentType}`;
  }
  return `${first.quantity} ${first.garmentType} (+${remainingCount} more)`;
}

export const LaundryLoggerPage: React.FC = () => {
  const {
    laundryOrders,
    guests,
    bookings,
    rooms,
    selectedBranchId,
    settings,
    createLaundryOrder,
    updateLaundryOrder,
    updateLaundryStatus,
    deleteLaundryOrder,
    createGuest,
    notify,
  } = useHotel();

  const [dateRange, setDateRange] = useState({
    fromDate: '2026-10-01',
    toDate: '2026-10-31',
  });
  const [progressFilter, setProgressFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LaundryOrder | null>(null);

  // Form state for Log Laundry Order
  const [customerMode, setCustomerMode] = useState<'existing' | 'walkin'>(
    'existing'
  );
  const [guestSearchQuery, setGuestSearchQuery] = useState('');
  const [selectedGuestId, setSelectedGuestId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [roomOrAddress, setRoomOrAddress] = useState('');
  const [promisedDate, setPromisedDate] = useState(addDays(TODAY_STR, 1));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [lines, setLines] = useState<
    Array<{
      garmentType: string;
      serviceType: LaundryServiceType;
      quantity: number;
      totalLinePrice: number;
    }>
  >([
    {
      garmentType: "Men's Formal Shirt",
      serviceType: 'Washing & Ironing',
      quantity: 2,
      totalLinePrice: 5000,
    },
  ]);

  const branchOrders = useMemo(
    () =>
      laundryOrders.filter(
        (o) =>
          (selectedBranchId === 'ALL' || o.branchId === selectedBranchId) &&
          isDateInRange(o.receivedDate, dateRange.fromDate, dateRange.toDate)
      ),
    [laundryOrders, selectedBranchId, dateRange]
  );

  // KPIs
  const totalOrdersCount = branchOrders.length;
  const inProgressCount = branchOrders.filter((o) =>
    ['Received', 'Washing', 'Drying', 'Ironing'].includes(o.workflowStatus)
  ).length;
  const readyForPickupCount = branchOrders.filter(
    (o) => o.workflowStatus === 'Ready for Collection'
  ).length;
  const laundryRevenue = branchOrders.reduce((s, o) => s + o.totalAmount, 0);

  const filteredOrders = useMemo(() => {
    return branchOrders.filter((o) => {
      if (progressFilter !== 'ALL' && o.workflowStatus !== progressFilter) {
        return false;
      }
      if (
        serviceFilter !== 'ALL' &&
        !o.garments.some((g) => g.serviceType === serviceFilter)
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = o.id.toLowerCase().includes(q);
        const matchGuest = o.customerName.toLowerCase().includes(q);
        const matchRoom = (o.roomNumber || '').toLowerCase().includes(q);
        const matchAddr = (o.customerAddress || '').toLowerCase().includes(q);
        const matchPhone = o.customerPhone.toLowerCase().includes(q);
        if (!matchId && !matchGuest && !matchRoom && !matchAddr && !matchPhone)
          return false;
      }
      return true;
    });
  }, [branchOrders, progressFilter, serviceFilter, search]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, page]);

  // Existing Hotel Guests lookup (combines guests and active room numbers)
  const hotelGuestDirectory = useMemo(() => {
    return guests.map((g) => {
      const activeBooking = bookings.find(
        (b) =>
          b.guestId === g.id &&
          (b.bookingStatus === 'Checked In' || b.bookingStatus === 'Confirmed')
      );
      const recentBooking =
        activeBooking || bookings.find((b) => b.guestId === g.id);
      const roomObj = recentBooking
        ? rooms.find((r) => r.id === recentBooking.roomId)
        : undefined;
      const roomNum = roomObj?.roomNumber || recentBooking?.roomNumber || '';
      const roomLabel = roomNum ? `Room ${roomNum}` : g.address || '';
      return {
        guestId: g.id,
        fullName: g.name,
        phone: g.phone,
        roomNumber: roomNum,
        roomOrAddress: roomLabel,
      };
    });
  }, [guests, bookings, rooms]);

  // Only show search matches when the user types a non-empty query
  const matchingHotelGuests = useMemo(() => {
    const q = guestSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const normalizedRoomQuery = q.replace(/^room\s+/i, '').trim();
    return hotelGuestDirectory
      .filter(
        (g) =>
          g.fullName.toLowerCase().includes(q) ||
          g.roomNumber.toLowerCase().includes(q) ||
          (normalizedRoomQuery &&
            g.roomNumber.toLowerCase().includes(normalizedRoomQuery)) ||
          `room ${g.roomNumber.toLowerCase()}`.includes(q) ||
          g.phone.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [hotelGuestDirectory, guestSearchQuery]);

  const handleSelectExistingGuest = (entry: (typeof hotelGuestDirectory)[0]) => {
    setSelectedGuestId(entry.guestId);
    setCustomerName(entry.fullName);
    setCustomerPhone(entry.phone);
    setRoomOrAddress(
      entry.roomNumber ? `Room ${entry.roomNumber}` : entry.roomOrAddress
    );
    setGuestSearchQuery('');
  };

  const handleSwitchCustomerMode = (mode: 'existing' | 'walkin') => {
    setCustomerMode(mode);
    setSelectedGuestId('');
    setGuestSearchQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setRoomOrAddress('');
  };

  const addEmptyGarmentLine = () => {
    setLines((prev) => [
      ...prev,
      {
        garmentType: '',
        serviceType: 'Washing & Ironing',
        quantity: 1,
        totalLinePrice: 2500,
      },
    ]);
  };

  const updateLine = (
    idx: number,
    patch: Partial<{
      garmentType: string;
      serviceType: LaundryServiceType;
      quantity: number;
      totalLinePrice: number;
    }>
  ) => {
    setLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
    );
  };

  const removeLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Crucial: The entered price IS the total price for that garment line (do NOT multiply by quantity)
  const calculatedLines: LaundryGarmentItem[] = lines.map((l, idx) => {
    const qty = Math.max(1, Number(l.quantity) || 1);
    const lineTotal = Math.max(0, Number(l.totalLinePrice) || 0);
    return {
      id: `GRM-${idx + 1}`,
      garmentType: l.garmentType,
      serviceType: l.serviceType,
      quantity: qty,
      unitPrice: lineTotal,
      subtotal: lineTotal,
    };
  });

  const formTotalAmount = calculatedLines.reduce((s, l) => s + l.subtotal, 0);
  const formTotalGarments = calculatedLines.reduce((s, l) => s + l.quantity, 0);

  const handleOpenNewModal = () => {
    setCustomerMode('existing');
    setSelectedGuestId('');
    setGuestSearchQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setRoomOrAddress('');
    setPromisedDate(addDays(TODAY_STR, 1));
    setPaymentMethod('Card');
    setPaymentStatus('Paid');
    setLines([
      {
        garmentType: "Men's Formal Shirt",
        serviceType: 'Washing & Ironing',
        quantity: 2,
        totalLinePrice: 5000,
      },
    ]);
    setShowNewModal(true);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      notify(
        'Customer Required',
        'Please select or enter a customer name.',
        'error'
      );
      return;
    }
    if (customerMode === 'walkin' && !customerPhone.trim()) {
      notify(
        'Phone Required',
        'Please enter a phone number for the walk-in customer.',
        'error'
      );
      return;
    }
    const validLines = calculatedLines.filter(
      (l) => l.garmentType.trim() !== ''
    );
    if (validLines.length === 0) {
      notify(
        'Garments Required',
        'Please enter at least one garment item with a name.',
        'error'
      );
      return;
    }

    const activeBranch =
      selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId;
    let resolvedGuestId = selectedGuestId || undefined;

    if (customerMode === 'walkin') {
      const existingMatch = guests.find(
        (g) =>
          (customerPhone.trim() &&
            g.phone.replace(/\s+/g, '') ===
              customerPhone.trim().replace(/\s+/g, '')) ||
          g.name.toLowerCase() === customerName.trim().toLowerCase()
      );
      if (existingMatch) {
        resolvedGuestId = existingMatch.id;
      } else {
        const created = createGuest({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: '',
          address: roomOrAddress.trim() || 'Walk-in Laundry Customer',
          guestType: 'Regular',
          status: 'Active',
          notes: '',
        });
        resolvedGuestId = created.id;
      }
    }

    const resolvedPayStatus: PaymentStatus =
      paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
    const paidVal = resolvedPayStatus === 'Paid' ? formTotalAmount : 0;

    const roomVal =
      customerMode === 'existing'
        ? roomOrAddress.replace(/^Room\s+/i, '').trim() || undefined
        : undefined;

    createLaundryOrder({
      guestId: resolvedGuestId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || '+234 800 000 0000',
      customerAddress:
        roomOrAddress.trim() ||
        (roomVal ? `Room ${roomVal}` : 'Walk-in Pickup'),
      roomNumber: roomVal,
      garments: validLines,
      subtotal: formTotalAmount,
      totalAmount: formTotalAmount,
      amountPaid: paidVal,
      paymentMethod,
      paymentStatus: resolvedPayStatus,
      promisedDate,
      workflowStatus: 'Received',
      storageLocation: 'Rack A',
      branchId: activeBranch,
      notes: '',
    });

    setShowNewModal(false);
  };

  const getNextStatus = (
    current: LaundryWorkflowStatus
  ): LaundryWorkflowStatus | null => {
    const idx = WORKFLOW_SEQUENCE.indexOf(current);
    if (idx === -1 || idx >= WORKFLOW_SEQUENCE.length - 1) return null;
    return WORKFLOW_SEQUENCE[idx + 1];
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laundry Logger"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <DateRangeControl
              fromDate={dateRange.fromDate}
              toDate={dateRange.toDate}
              onChange={(fromDate, toDate) => {
                setDateRange({ fromDate, toDate });
                setPage(1);
              }}
            />
            <PrimaryButton onClick={handleOpenNewModal}>
              <Plus className="w-4 h-4" />
              Log Laundry Order
            </PrimaryButton>
          </div>
        }
      />

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Laundry Orders"
          value={totalOrdersCount}
          icon={Shirt}
          tone="blue"
        />
        <KpiCard
          label="Orders In Progress"
          value={inProgressCount}
          icon={Waves}
          tone="amber"
        />
        <KpiCard
          label="Ready for Collection"
          value={readyForPickupCount}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Laundry Revenue"
          value={formatCurrency(laundryRevenue, settings.currencySymbol)}
          icon={CreditCard}
          tone="purple"
        />
      </div>

      {/* Main Orders Table — Search + Service Type Dropdown + Progress Dropdown */}
      <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-4 border-b border-[#EFEFEA] flex flex-wrap items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search order ID, customer name, address, or phone..."
            className="w-full sm:w-72"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <Dropdown
              value={serviceFilter}
              onChange={(v) => {
                setServiceFilter(v);
                setPage(1);
              }}
              size="sm"
              className="w-48"
              options={[
                { value: 'ALL', label: 'Service Type: All' },
                ...SERVICE_TYPES.map((st) => ({ value: st, label: st })),
              ]}
            />

            <Dropdown
              value={progressFilter}
              onChange={(v) => {
                setProgressFilter(v);
                setPage(1);
              }}
              size="sm"
              className="w-48"
              options={[
                { value: 'ALL', label: 'Progress: All Stages' },
                ...WORKFLOW_SEQUENCE.map((st) => ({ value: st, label: st })),
              ]}
            />
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title="No laundry orders match your filter"
            description="Adjust your date range, service type, or progress filter, or log a new laundry order."
            action={
              <PrimaryButton onClick={handleOpenNewModal}>
                <Plus className="w-4 h-4" />
                Log Laundry Order
              </PrimaryButton>
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
                    <th className="py-3.5 px-4 whitespace-nowrap">Address</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Garment</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Service</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Pickup Date</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Amount</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Payment Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Progress</th>
                    <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                  {paginatedOrders.map((order) => {
                    const primaryService =
                      order.garments[0]?.serviceType || 'Washing & Ironing';
                    const nextStage = getNextStatus(order.workflowStatus);
                    const displayPayStatus =
                      order.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
                    const addressLabel = order.roomNumber
                      ? `Room ${order.roomNumber}`
                      : order.customerAddress || 'Walk-in';

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
                        <td className="py-3.5 px-4 text-[#4A4A46] whitespace-nowrap">
                          {addressLabel}
                        </td>
                        <td className="py-3.5 px-4 text-[#1E1E1E] whitespace-nowrap">
                          {formatConciseGarmentSummary(order.garments)}
                        </td>
                        <td className="py-3.5 px-4 text-[#4A4A46] whitespace-nowrap">
                          {primaryService}
                        </td>
                        <td className="py-3.5 px-4 text-[#3A3A36] tabular-nums whitespace-nowrap">
                          {formatDate(order.promisedDate)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                          {formatCurrency(
                            order.totalAmount,
                            settings.currencySymbol
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={displayPayStatus} />
                        </td>
                        <td
                          className="py-3.5 px-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <StatusBadge status={order.workflowStatus} />
                        </td>
                        <td
                          className="py-3.5 px-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1">
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() =>
                                  updateLaundryStatus(order.id, nextStage)
                                }
                                title={`Advance to ${nextStage}`}
                                className="px-2.5 py-1 rounded-[8px] text-[11.5px] font-medium bg-[#F1EEF8] text-[#7463A6] hover:bg-[#7463A6] hover:text-white transition-colors inline-flex items-center gap-1 cursor-pointer"
                              >
                                {nextStage === 'Ready for Collection'
                                  ? 'Mark Ready'
                                  : nextStage === 'Collected'
                                  ? 'Mark Collected'
                                  : nextStage}
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              title="View Order Details"
                              className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#EFEFEA]"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLaundryOrder(order.id)}
                              title="Delete Order"
                              className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#B93829] hover:bg-[#FCECE9]"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Log Laundry Order Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Log Laundry Order"
        size="lg"
      >
        <form onSubmit={handleCreateOrder} className="space-y-5">
          {/* Customer Selection Modes */}
          <div className="space-y-3">
            <div className="inline-flex p-1 rounded-[12px] bg-[#F3F4F6]">
              <button
                type="button"
                onClick={() => handleSwitchCustomerMode('existing')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all cursor-pointer ${
                  customerMode === 'existing'
                    ? 'bg-[#7463A6] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Existing Hotel Guest
              </button>
              <button
                type="button"
                onClick={() => handleSwitchCustomerMode('walkin')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] text-[12px] font-semibold transition-all cursor-pointer ${
                  customerMode === 'walkin'
                    ? 'bg-[#7463A6] text-white shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111111]'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Walk-in Customer
              </button>
            </div>

            {customerMode === 'existing' && (
              <div className="relative">
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                  Search Hotel Guest by Name or Room Number
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={guestSearchQuery}
                    onChange={(e) => setGuestSearchQuery(e.target.value)}
                    placeholder="Type guest name or room number (e.g. 201)..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#E2E2DC] rounded-[10px] text-[13px] text-[#1E1E1E] focus:outline-none focus:border-[#7463A6]"
                  />
                </div>
                {guestSearchQuery.trim() !== '' && (
                  <div className="mt-1.5 bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_10px_24px_rgba(0,0,0,0.08)] max-h-40 overflow-y-auto divide-y divide-[#F5F5F2]">
                    {matchingHotelGuests.length === 0 ? (
                      <div className="px-3.5 py-2.5 text-[12px] text-[#6E6E6A]">
                        No matching hotel guest found.
                      </div>
                    ) : (
                      matchingHotelGuests.map((entry) => (
                        <button
                          key={entry.guestId}
                          type="button"
                          onClick={() => handleSelectExistingGuest(entry)}
                          className="w-full flex items-center justify-between px-3.5 py-2 text-left text-[12.5px] hover:bg-[#F6F6F4] transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-[#1E1E1E] truncate">
                              {entry.fullName}
                            </p>
                            <p className="text-[11px] text-[#6E6E6A] truncate">
                              {entry.phone}
                            </p>
                          </div>
                          {entry.roomNumber && (
                            <span className="ml-2 px-2 py-0.5 rounded-md bg-[#F1EEF8] text-[11px] font-medium text-[#7463A6] shrink-0">
                              Room {entry.roomNumber}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                  Customer Name <span className="text-[#B93829]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3.5 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                  Phone Number <span className="text-[#B93829]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+234 803..."
                  className="w-full px-3.5 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={roomOrAddress}
                  onChange={(e) => setRoomOrAddress(e.target.value)}
                  placeholder={
                    customerMode === 'existing'
                      ? 'e.g. Room 204'
                      : 'Delivery address'
                  }
                  className="w-full px-3.5 py-2 border border-[#E2E2DC] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            </div>
          </div>

          {/* Garment Items — Clean Two-Row Layout per Garment Item */}
          <div className="border border-[#E2E2DC] rounded-[14px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-[#1E1E1E]">
                Garment Items ({formTotalGarments} pcs)
              </p>
              <button
                type="button"
                onClick={addEmptyGarmentLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[12px] font-medium bg-[#F1EEF8] text-[#7463A6] hover:bg-[#7463A6] hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Garment Item
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-[12px] bg-[#FAF9F6] border border-[#EFEFEA] space-y-3"
                >
                  {lines.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[#6E6E6A]">
                        Item #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-[7px] text-[11.5px] text-[#8E8E88] hover:text-[#B93829] hover:bg-[#FCECE9] transition-colors cursor-pointer"
                        title="Remove garment line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Row 1: Garment Name and Service Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11.5px] font-normal text-[#4A4A46] mb-1">
                        Garment Name
                      </label>
                      <input
                        type="text"
                        required
                        value={line.garmentType}
                        onChange={(e) =>
                          updateLine(idx, { garmentType: e.target.value })
                        }
                        placeholder="e.g. Men's Suit, Silk Dress, Shirts"
                        className="w-full px-3 py-2 bg-white border border-[#E2E2DC] rounded-[10px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                      />
                    </div>
                    <div>
                      <Dropdown
                        label="Service Type"
                        size="sm"
                        value={line.serviceType}
                        onChange={(val) =>
                          updateLine(idx, {
                            serviceType: val as LaundryServiceType,
                          })
                        }
                        options={SERVICE_TYPES.map((st) => ({
                          value: st,
                          label: st,
                        }))}
                      />
                    </div>
                  </div>

                  {/* Row 2: Quantity and Price — identical 2-column grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11.5px] font-normal text-[#4A4A46] mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(idx, {
                            quantity: Math.max(1, Number(e.target.value)),
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-[#E2E2DC] rounded-[10px] text-[13px] tabular-nums focus:outline-none focus:border-[#7463A6]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-normal text-[#4A4A46] mb-1">
                        Price ({settings.currencySymbol})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={100}
                        value={line.totalLinePrice}
                        onChange={(e) =>
                          updateLine(idx, {
                            totalLinePrice: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-3 py-2 bg-white border border-[#E2E2DC] rounded-[10px] text-[13px] tabular-nums focus:outline-none focus:border-[#7463A6]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready Date, Payment Method, Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CustomSingleDatePicker
              label="Ready Date"
              value={promisedDate}
              onChange={setPromisedDate}
            />
            <Dropdown
              label="Payment Method"
              value={paymentMethod}
              onChange={(v) => setPaymentMethod(v as PaymentMethod)}
              options={PAYMENT_METHODS.map((pm) => ({
                value: pm,
                label: pm,
              }))}
            />
            <Dropdown
              label="Payment Status"
              value={paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
              onChange={(v) => setPaymentStatus(v as PaymentStatus)}
              options={[
                { value: 'Paid', label: 'Paid' },
                { value: 'Unpaid', label: 'Unpaid' },
              ]}
            />
          </div>

          {/* Order Total & Create Order Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EFEFEA]">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-[#6E6E6A]">Order Total:</span>
              <span className="text-[18px] font-semibold text-[#1E1E1E] tabular-nums">
                {formatCurrency(formTotalAmount, settings.currencySymbol)}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 rounded-[10px] text-[13px] font-normal text-[#4A4A46] bg-[#F6F6F4] hover:bg-[#EAEAE4] cursor-pointer"
              >
                Cancel
              </button>
              <PrimaryButton type="submit">
                Create Order (
                {formatCurrency(formTotalAmount, settings.currencySymbol)})
              </PrimaryButton>
            </div>
          </div>
        </form>
      </Modal>

      {/* Laundry Order Detail Drawer */}
      <Drawer
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Order ${selectedOrder.id}` : 'Order Details'}
        subtitle={
          selectedOrder
            ? `${selectedOrder.customerName} · ${
                selectedOrder.roomNumber
                  ? `Room ${selectedOrder.roomNumber}`
                  : selectedOrder.customerAddress || 'Walk-in'
              }`
            : ''
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Progress Stepper */}
            <div className="p-4 rounded-[14px] bg-[#FAF9F6] border border-[#EFEFEA]">
              <p className="text-[12px] font-medium text-[#6E6E6A] mb-3">
                Laundry Progress Stage
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WORKFLOW_SEQUENCE.map((stage) => {
                  const active = selectedOrder.workflowStatus === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => {
                        updateLaundryStatus(selectedOrder.id, stage);
                        setSelectedOrder({
                          ...selectedOrder,
                          workflowStatus: stage,
                        });
                      }}
                      className={`px-3 py-2 rounded-[10px] text-[12px] font-medium text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-[#7463A6] text-white shadow-xs'
                          : 'bg-white border border-[#E2E2DC] text-[#374151] hover:border-[#7463A6]'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Garment Breakdown */}
            <div className="border border-[#EFEFEA] rounded-[14px] overflow-hidden">
              <div className="bg-[#FAF9F6] px-4 py-2.5 border-b border-[#EFEFEA] flex justify-between items-center">
                <span className="text-[12px] font-medium text-[#6E6E6A]">
                  Garment Breakdown
                </span>
                <span className="text-[12px] font-mono text-[#6E6E6A]">
                  {selectedOrder.garmentTag}
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
              <div className="bg-[#FAF9F6] px-4 py-3 border-t border-[#EFEFEA] flex items-center justify-between text-[13.5px]">
                <span className="font-medium text-[#1E1E1E]">Order Total</span>
                <span className="font-semibold text-[#1E1E1E] tabular-nums">
                  {formatCurrency(
                    selectedOrder.totalAmount,
                    settings.currencySymbol
                  )}
                </span>
              </div>
            </div>

            {selectedOrder.paymentStatus !== 'Paid' && (
              <button
                type="button"
                onClick={() => {
                  updateLaundryOrder(selectedOrder.id, {
                    amountPaid: selectedOrder.totalAmount,
                    paymentStatus: 'Paid',
                  });
                  setSelectedOrder({
                    ...selectedOrder,
                    amountPaid: selectedOrder.totalAmount,
                    paymentStatus: 'Paid',
                  });
                }}
                className="w-full py-2.5 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13px] font-medium cursor-pointer"
              >
                Mark Order as Paid (
                {formatCurrency(
                  selectedOrder.totalAmount,
                  settings.currencySymbol
                )}
                )
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
