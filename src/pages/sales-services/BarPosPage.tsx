import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wine,
  ShoppingCart,
  Receipt,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  Eye,
  CreditCard,
  Search,
  Hash,
  X,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import {
  PaymentMethod,
  PaymentStatus,
  PosOrderItem,
  PosTransaction,
} from '../../types/hotel';
import { KpiCard } from '../../components/ui/KpiCard';
import { Dropdown } from '../../components/ui/Dropdown';
import { Modal, Drawer } from '../../components/ui/Overlay';
import {
  PageHeader,
  SearchInput,
  StatusBadge,
  Pagination,
  EmptyState,
} from '../../components/ui/PageControls';
import {
  formatCompactCurrency,
  formatCurrency,
} from '../../utils/formatters';

const POS_PAYMENT_METHODS: PaymentMethod[] = ['Card', 'Bank Transfer', 'Cash'];
const POS_PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Unpaid'];

function generateWalkInBarId(seq: number): string {
  return `WLK-BAR-${8900 + seq}`;
}

export const BarPosPage: React.FC = () => {
  const {
    beverages,
    posTransactions,
    bookings,
    selectedBranchId,
    settings,
    completeBarSale,
    updatePosTransactionPayment,
  } = useHotel();

  const sym = settings.currencySymbol;

  const [activeTab, setActiveTab] = useState<'terminal' | 'ledger'>('terminal');
  const [search, setSearch] = useState('');
  const [selectedQuickBeverageId, setSelectedQuickBeverageId] = useState<string>('ALL');

  // Cart & Order state
  const [cart, setCart] = useState<PosOrderItem[]>([]);
  const [customerType, setCustomerType] = useState<'Hotel Guest' | 'Walk-in'>('Hotel Guest');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [guestSearchQuery, setGuestSearchQuery] = useState<string>('');
  const [guestDropdownOpen, setGuestDropdownOpen] = useState<boolean>(false);
  const [walkInSeq, setWalkInSeq] = useState<number>(() => posTransactions.length + 1);
  const [walkInReferenceId, setWalkInReferenceId] = useState<string>(() =>
    generateWalkInBarId(posTransactions.length + 1)
  );

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [lastReceipt, setLastReceipt] = useState<PosTransaction | null>(null);

  // Ledger state
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState('ALL');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<PosTransaction | null>(null);

  const guestSelectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        guestSelectorRef.current &&
        !guestSelectorRef.current.contains(e.target as Node)
      ) {
        setGuestDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const branchBeverages = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? beverages
        : beverages.filter((b) => b.branchId === selectedBranchId),
    [beverages, selectedBranchId]
  );

  const barTransactions = useMemo(() => {
    const list = posTransactions.filter((t) => t.department === 'Bar & POS');
    return selectedBranchId === 'ALL'
      ? list
      : list.filter((t) => t.branchId === selectedBranchId);
  }, [posTransactions, selectedBranchId]);

  // Top 3 most frequently sold beverages derived from Bar & POS sales
  const top3Beverages = useMemo(() => {
    const freqMap = new Map<string, number>();
    barTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        freqMap.set(item.itemId, (freqMap.get(item.itemId) || 0) + item.quantity);
      });
    });

    return [...branchBeverages]
      .sort((a, b) => {
        const countA = freqMap.get(a.id) || 0;
        const countB = freqMap.get(b.id) || 0;
        if (countB !== countA) return countB - countA;
        return b.sellingPrice - a.sellingPrice;
      })
      .slice(0, 3);
  }, [branchBeverages, barTransactions]);

  // Strictly Checked In hotel guests only
  const checkedInBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.bookingStatus === 'Checked In' &&
          (selectedBranchId === 'ALL' || b.branchId === selectedBranchId)
      ),
    [bookings, selectedBranchId]
  );

  const matchingCheckedInBookings = useMemo(() => {
    const raw = guestSearchQuery.trim().toLowerCase();
    if (!raw) return checkedInBookings;
    const normalizedRoomQuery = raw.replace(/^room\s+/i, '').trim();
    return checkedInBookings.filter(
      (b) =>
        b.guestName.toLowerCase().includes(raw) ||
        b.roomNumber.toLowerCase().includes(raw) ||
        (normalizedRoomQuery && b.roomNumber.toLowerCase().includes(normalizedRoomQuery)) ||
        `room ${b.roomNumber.toLowerCase()}`.includes(raw) ||
        b.id.toLowerCase().includes(raw)
    );
  }, [checkedInBookings, guestSearchQuery]);

  // 4 KPI Cards for Bar Sales Ledger — Only Title, Icon, and Figure
  const kpis = useMemo(() => {
    const totalSales = barTransactions.reduce((s, t) => s + t.totalAmount, 0);
    const txCount = barTransactions.length;
    const unpaidRoomCharges = barTransactions
      .filter((t) => t.paymentStatus !== 'Paid')
      .reduce((s, t) => s + (t.totalAmount - t.amountPaid), 0);
    const lowStockBevs = branchBeverages.filter(
      (b) => b.availableQuantity <= b.reorderThreshold
    ).length;
    return { totalSales, txCount, unpaidRoomCharges, lowStockBevs };
  }, [barTransactions, branchBeverages]);

  const filteredBeverages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchBeverages.filter((b) => {
      if (selectedQuickBeverageId !== 'ALL' && b.id !== selectedQuickBeverageId) {
        return false;
      }
      if (q && !b.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [branchBeverages, search, selectedQuickBeverageId]);

  const addToCart = (itemId: string) => {
    setCheckoutError('');
    const bev = branchBeverages.find((b) => b.id === itemId);
    if (!bev || bev.availableQuantity <= 0) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === itemId);
      if (existing) {
        if (existing.quantity >= bev.availableQuantity) {
          setCheckoutError(
            `Maximum available stock (${bev.availableQuantity} ${bev.unit}) reached for ${bev.name}.`
          );
          return prev;
        }
        const nextQty = existing.quantity + 1;
        return prev.map((i) =>
          i.itemId === itemId
            ? { ...i, quantity: nextQty, subtotal: nextQty * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          itemId: bev.id,
          name: bev.name,
          quantity: 1,
          unitPrice: bev.sellingPrice,
          subtotal: bev.sellingPrice,
        },
      ];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCheckoutError('');
    const bev = branchBeverages.find((b) => b.id === itemId);
    if (!bev) return;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.itemId !== itemId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty > bev.availableQuantity) {
            setCheckoutError(
              `Only ${bev.availableQuantity} ${bev.unit} available for ${bev.name}.`
            );
            return item;
          }
          return {
            ...item,
            quantity: nextQty,
            subtotal: nextQty * item.unitPrice,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const cartSubtotal = useMemo(
    () => cart.reduce((s, i) => s + i.subtotal, 0),
    [cart]
  );
  const netAfterDiscount = Math.max(0, cartSubtotal - discountAmount);
  const taxAmount = Math.round(
    netAfterDiscount * (settings.defaultTaxRatePercent / 100)
  );
  const cartTotal = netAfterDiscount + taxAmount;

  const handleCompleteSale = () => {
    setCheckoutError('');
    if (!cart.length) {
      setCheckoutError('Please add at least one beverage item to the cart.');
      return;
    }

    let guestId: string | undefined;
    let guestName = walkInReferenceId;
    let roomId: string | undefined;
    let roomNumber: string | undefined;

    if (customerType === 'Hotel Guest') {
      const bk = checkedInBookings.find((b) => b.id === selectedBookingId);
      if (!bk) {
        setCheckoutError('Please select a currently Checked In guest or room.');
        return;
      }
      guestId = bk.guestId;
      guestName = bk.guestName;
      roomId = bk.roomId;
      roomNumber = bk.roomNumber;
    }

    const paidNow = paymentStatus === 'Paid' ? cartTotal : 0;

    const res = completeBarSale({
      customerType,
      guestId,
      guestName,
      roomId,
      roomNumber,
      tableOrBarArea: customerType === 'Hotel Guest' ? `Room ${roomNumber}` : walkInReferenceId,
      items: cart,
      subtotal: cartSubtotal,
      discountAmount,
      taxAmount,
      totalAmount: cartTotal,
      amountPaid: paidNow,
      paymentMethod,
      paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
      orderStatus: 'Completed',
      responsibleStaff: 'Kemi Adebayo',
      branchId: selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId,
    });

    if (!res.ok) {
      setCheckoutError(res.error || 'Could not complete sale.');
      return;
    }

    setCart([]);
    setDiscountAmount(0);
    const nextSeq = walkInSeq + 1;
    setWalkInSeq(nextSeq);
    setWalkInReferenceId(generateWalkInBarId(nextSeq));
    if (res.transaction) {
      setLastReceipt(res.transaction);
    }
  };

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return barTransactions.filter((t) => {
      if (
        q &&
        !t.id.toLowerCase().includes(q) &&
        !t.guestName.toLowerCase().includes(q) &&
        !(t.roomNumber && t.roomNumber.toLowerCase().includes(q))
      ) {
        return false;
      }
      const normStatus = t.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
      if (ledgerPaymentFilter !== 'ALL' && normStatus !== ledgerPaymentFilter)
        return false;
      return true;
    });
  }, [barTransactions, ledgerSearch, ledgerPaymentFilter]);

  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * 8;
    return filteredLedger.slice(start, start + 8);
  }, [filteredLedger, ledgerPage]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bar & POS"
        actions={
          <div className="inline-flex items-center bg-[#EAEAE4] p-1 rounded-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer ${
                activeTab === 'terminal'
                  ? 'bg-white text-[#1E1E1E] shadow-xs'
                  : 'text-[#6E6E6A] hover:text-[#1E1E1E]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              POS Terminal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-white text-[#1E1E1E] shadow-xs'
                  : 'text-[#6E6E6A] hover:text-[#1E1E1E]'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Bar Sales Ledger ({barTransactions.length})
            </button>
          </div>
        }
      />

      {activeTab === 'terminal' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 cols: Beverage Catalog */}
          <div className="lg:col-span-8 space-y-4">
            {/* 1 Search Input + Single Row of up to 4 Quick-Pick Controls (All Beverages + Top 3 Beverages) */}
            <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search beverage name..."
                className="w-full sm:w-64"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedQuickBeverageId('ALL')}
                  className={`px-3 py-1.5 rounded-[9px] text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    selectedQuickBeverageId === 'ALL'
                      ? 'bg-[#7463A6] text-white'
                      : 'bg-[#F6F6F4] text-[#6E6E6A] hover:text-[#1E1E1E]'
                  }`}
                >
                  All Beverages
                </button>
                {top3Beverages.map((bev) => (
                  <button
                    key={bev.id}
                    type="button"
                    onClick={() =>
                      setSelectedQuickBeverageId((prev) =>
                        prev === bev.id ? 'ALL' : bev.id
                      )
                    }
                    className={`px-3 py-1.5 rounded-[9px] text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      selectedQuickBeverageId === bev.id
                        ? 'bg-[#7463A6] text-white'
                        : 'bg-[#F6F6F4] text-[#6E6E6A] hover:text-[#1E1E1E]'
                    }`}
                  >
                    {bev.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Simplified Beverage Cards: Icon, Available Qty with Ash Background, Name, Divider, Price, Add Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBeverages.map((bev) => {
                const inCart = cart.find((c) => c.itemId === bev.id);
                const outOfStock = bev.availableQuantity <= 0;

                return (
                  <div
                    key={bev.id}
                    className={`bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border transition-all flex flex-col justify-between ${
                      inCart
                        ? 'border-[#7463A6] ring-1 ring-[#7463A6]/25'
                        : 'border-transparent hover:border-[#E2E2DC]'
                    } ${outOfStock ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-9 h-9 rounded-[10px] bg-[#F1EEF8] flex items-center justify-center text-[#7463A6] shrink-0">
                          <Wine className="w-4.5 h-4.5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-[8px] bg-[#F2F2EE] text-[#4A4A46] text-[11.5px] font-medium tabular-nums">
                          {outOfStock
                            ? 'Out of Stock'
                            : `${bev.availableQuantity} ${bev.unit}s`}
                        </span>
                      </div>

                      <h3 className="text-[14px] font-medium text-[#1E1E1E] mt-3 leading-snug">
                        {bev.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F2F2EE] flex items-center justify-between">
                      <div className="text-[14.5px] font-medium text-[#1E1E1E] tabular-nums">
                        {formatCurrency(bev.sellingPrice, sym)}
                      </div>

                      {inCart ? (
                        <div className="inline-flex items-center gap-2 bg-[#F6F6F4] rounded-[9px] p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(bev.id, -1)}
                            className="w-6.5 h-6.5 rounded-[7px] bg-white flex items-center justify-center text-[#1E1E1E] shadow-2xs cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[13px] font-medium tabular-nums px-1">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(bev.id, 1)}
                            className="w-6.5 h-6.5 rounded-[7px] bg-[#7463A6] flex items-center justify-center text-white cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => addToCart(bev.id)}
                          className="px-3.5 py-1.5 rounded-[9px] bg-[#F6F6F4] hover:bg-[#7463A6] hover:text-white text-[#1E1E1E] text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 4 cols: Current Bar Order */}
          <div className="lg:col-span-4 bg-white rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sticky top-20 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEFEA] pb-3">
              <h2 className="text-[15.5px] font-medium text-[#1E1E1E]">
                Current Bar Order
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-[12px] text-[#B93829] hover:underline cursor-pointer"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {checkoutError && (
              <div className="p-3 rounded-[10px] bg-[#FCECE9] text-[#B93829] text-[12px] font-medium">
                {checkoutError}
              </div>
            )}

            {/* Customer Type Toggle: Hotel Guest vs Walk-in Customer */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1 bg-[#F6F6F4] p-1 rounded-[10px]">
                <button
                  type="button"
                  onClick={() => setCustomerType('Hotel Guest')}
                  className={`py-1.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer ${
                    customerType === 'Hotel Guest'
                      ? 'bg-white text-[#1E1E1E] shadow-2xs'
                      : 'text-[#6E6E6A] hover:text-[#1E1E1E]'
                  }`}
                >
                  Hotel Guest
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('Walk-in')}
                  className={`py-1.5 rounded-[8px] text-[12px] font-medium transition-colors cursor-pointer ${
                    customerType === 'Walk-in'
                      ? 'bg-white text-[#1E1E1E] shadow-2xs'
                      : 'text-[#6E6E6A] hover:text-[#1E1E1E]'
                  }`}
                >
                  Walk-in Customer
                </button>
              </div>

              {customerType === 'Hotel Guest' ? (
                /* Single Searchable Checked-In Guest / Room Input (No second redundant search box) */
                <div ref={guestSelectorRef} className="relative">
                  <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
                    Checked-In Guest / Room <span className="text-[#B93829]">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#8E8E88] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={guestSearchQuery}
                      onFocus={() => setGuestDropdownOpen(true)}
                      onChange={(e) => {
                        setGuestSearchQuery(e.target.value);
                        setGuestDropdownOpen(true);
                        if (!e.target.value.trim()) {
                          setSelectedBookingId('');
                        }
                      }}
                      placeholder="Search guest name or room (e.g. 301)..."
                      className="w-full pl-8 pr-8 py-2 rounded-[10px] bg-white border border-[#E2E2DC] text-[13px] text-[#1E1E1E] placeholder:text-[#8E8E88] focus:outline-none focus:border-[#7463A6]"
                    />
                    {(guestSearchQuery || selectedBookingId) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingId('');
                          setGuestSearchQuery('');
                          setGuestDropdownOpen(false);
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-[6px] text-[#8E8E88] hover:text-[#1E1E1E] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {guestDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_12px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden max-h-48 overflow-y-auto divide-y divide-[#F5F5F2]">
                      {matchingCheckedInBookings.length === 0 ? (
                        <div className="px-3 py-2.5 text-[12px] text-[#6E6E6A]">
                          No matching Checked In guests found.
                        </div>
                      ) : (
                        matchingCheckedInBookings.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBookingId(b.id);
                              setGuestSearchQuery(`Room ${b.roomNumber} — ${b.guestName}`);
                              setGuestDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              selectedBookingId === b.id
                                ? 'bg-[#F1EEF8] text-[#7463A6]'
                                : 'hover:bg-[#F6F6F4] text-[#1E1E1E]'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium truncate">
                                Room {b.roomNumber} — {b.guestName}
                              </div>
                              <div className="text-[11px] text-[#6E6E6A] tabular-nums">
                                {b.id} · Checked In
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Walk-in Customer — Stable Auto-generated Reference ID */
                <div className="flex items-center justify-between px-3.5 py-2.5 rounded-[10px] bg-[#FAF9F6] border border-[#EFEFEA]">
                  <div className="flex items-center gap-2 text-[12px] text-[#6E6E6A]">
                    <Hash className="w-3.5 h-3.5 text-[#7463A6]" />
                    <span>Walk-in Reference</span>
                  </div>
                  <span className="text-[13px] font-medium text-[#1E1E1E] tabular-nums">
                    {walkInReferenceId}
                  </span>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="border-t border-b border-[#EFEFEA] py-3 max-h-56 overflow-y-auto space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-7 text-center text-[12.5px] text-[#8E8E88]">
                  Select beverages from the catalog to build an order.
                </div>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.itemId}
                    className="flex items-center justify-between gap-2 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[#1E1E1E] truncate">
                        {line.name}
                      </div>
                      <div className="text-[11px] text-[#6E6E6A] tabular-nums">
                        {formatCurrency(line.unitPrice, sym)} × {line.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(line.itemId, -1)}
                        className="w-6 h-6 rounded-[7px] bg-[#F6F6F4] flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center tabular-nums font-medium">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(line.itemId, 1)}
                        className="w-6 h-6 rounded-[7px] bg-[#F6F6F4] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-20 text-right font-medium tabular-nums">
                      {formatCurrency(line.subtotal, sym)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals & Payment */}
            <div className="space-y-2 text-[13px] tabular-nums">
              <div className="flex justify-between text-[#6E6E6A]">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotal, sym)}</span>
              </div>
              <div className="flex items-center justify-between text-[#6E6E6A]">
                <span>Discount ({sym})</span>
                <input
                  type="number"
                  min={0}
                  max={cartSubtotal}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-24 px-2 py-1 text-right rounded-[8px] border border-[#E2E2DC] text-[#1E1E1E] text-[12px]"
                />
              </div>
              <div className="flex justify-between text-[#6E6E6A]">
                <span>VAT ({settings.defaultTaxRatePercent}%)</span>
                <span>{formatCurrency(taxAmount, sym)}</span>
              </div>
              <div className="flex justify-between text-[15.5px] font-medium text-[#1E1E1E] pt-2 border-t border-[#EFEFEA]">
                <span>Total Payable</span>
                <span>{formatCurrency(cartTotal, sym)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Dropdown
                label="Payment Method"
                size="sm"
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v as PaymentMethod)}
                options={POS_PAYMENT_METHODS.map((pm) => ({
                  value: pm,
                  label: pm,
                }))}
              />
              <Dropdown
                label="Payment Status"
                size="sm"
                value={paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                onChange={(v) => setPaymentStatus(v as PaymentStatus)}
                options={POS_PAYMENT_STATUSES.map((ps) => ({
                  value: ps,
                  label: ps,
                }))}
              />
            </div>

            <button
              type="button"
              onClick={handleCompleteSale}
              className="w-full py-2.5 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13.5px] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Sale ({formatCurrency(cartTotal, sym)})
            </button>
          </div>
        </div>
      ) : (
        /* BAR SALES LEDGER */
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Bar & POS Revenue"
              value={formatCompactCurrency(kpis.totalSales, sym)}
              fullValueTooltip={formatCurrency(kpis.totalSales, sym)}
              icon={Wine}
              iconTone="purple"
            />
            <KpiCard
              label="Completed Transactions"
              value={kpis.txCount}
              icon={Receipt}
              iconTone="teal"
            />
            <KpiCard
              label="Pending Room Charges"
              value={formatCompactCurrency(kpis.unpaidRoomCharges, sym)}
              fullValueTooltip={formatCurrency(kpis.unpaidRoomCharges, sym)}
              icon={CreditCard}
              iconTone="amber"
            />
            <KpiCard
              label="Low-Stock Beverages"
              value={kpis.lowStockBevs}
              icon={AlertTriangle}
              iconTone="rose"
            />
          </div>

          <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="p-4 border-b border-[#EFEFEA] flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={ledgerSearch}
                onChange={setLedgerSearch}
                placeholder="Search transaction ID, guest, or room..."
                className="w-full sm:w-72"
              />
              <Dropdown
                value={ledgerPaymentFilter}
                onChange={setLedgerPaymentFilter}
                size="sm"
                className="w-44"
                options={[
                  { value: 'ALL', label: 'All Payments' },
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Unpaid', label: 'Unpaid' },
                ]}
              />
            </div>

            {filteredLedger.length === 0 ? (
              <EmptyState
                title="No bar transactions found"
                description="Complete a sale in the POS terminal to see records here."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A] whitespace-nowrap">
                        <th className="py-3.5 px-5 whitespace-nowrap">Transaction ID</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Customer/Room</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Item Summary</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Amount</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Payment Method</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Payment Status</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Staff</th>
                        <th className="py-3.5 px-5 text-right whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F2F2EE] text-[13.5px]">
                      {paginatedLedger.map((tx) => {
                        const displayPay = tx.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
                        return (
                          <tr
                            key={tx.id}
                            onClick={() => setSelectedTx(tx)}
                            className="hover:bg-[#F8F8F5] cursor-pointer"
                          >
                            <td className="py-3.5 px-5 font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                              {tx.id}
                            </td>
                            <td className="py-3.5 px-4 text-[#6E6E6A] tabular-nums whitespace-nowrap">
                              {tx.dateTime}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-medium text-[#1E1E1E]">
                                {tx.guestName}
                              </div>
                              <div className="text-[11px] text-[#6E6E6A]">
                                {tx.roomNumber ? `Room ${tx.roomNumber}` : 'Walk-in Customer'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[#4A4A46] max-w-[220px] truncate whitespace-nowrap">
                              {tx.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                              {formatCurrency(tx.totalAmount, sym)}
                            </td>
                            <td className="py-3.5 px-4 text-[#4A4A46] whitespace-nowrap">
                              {tx.paymentMethod}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={displayPay} />
                            </td>
                            <td className="py-3.5 px-4 text-[#6E6E6A] whitespace-nowrap">
                              {tx.responsibleStaff}
                            </td>
                            <td
                              className="py-3.5 px-5 text-right whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedTx(tx)}
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
                  currentPage={ledgerPage}
                  totalItems={filteredLedger.length}
                  pageSize={8}
                  onPageChange={setLedgerPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT MODAL / TRANSACTION DRAWER */}
      <Modal
        isOpen={!!lastReceipt}
        onClose={() => setLastReceipt(null)}
        title="Sale Receipt & Summary"
        maxWidth="max-w-md"
      >
        {lastReceipt && (
          <div className="space-y-4 text-[13px]">
            <div className="p-4 rounded-[12px] bg-[#F6F6F4] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6E6E6A]">Customer</span>
                <span className="font-medium text-[#1E1E1E]">
                  {lastReceipt.guestName}
                </span>
              </div>
              {lastReceipt.roomNumber && (
                <div className="flex justify-between">
                  <span className="text-[#6E6E6A]">Room</span>
                  <span className="font-medium text-[#1E1E1E]">
                    Room {lastReceipt.roomNumber}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#6E6E6A]">Payment</span>
                <StatusBadge
                  status={lastReceipt.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                />
              </div>
            </div>

            <div className="divide-y divide-[#EFEFEA] tabular-nums">
              {lastReceipt.items.map((item, i) => (
                <div key={i} className="py-2 flex justify-between">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.subtotal, sym)}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#EFEFEA] space-y-1 tabular-nums">
              <div className="flex justify-between text-[#6E6E6A]">
                <span>Subtotal</span>
                <span>{formatCurrency(lastReceipt.subtotal, sym)}</span>
              </div>
              {lastReceipt.discountAmount > 0 && (
                <div className="flex justify-between text-[#1F7A4C]">
                  <span>Discount</span>
                  <span>-{formatCurrency(lastReceipt.discountAmount, sym)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6E6E6A]">
                <span>Tax</span>
                <span>{formatCurrency(lastReceipt.taxAmount, sym)}</span>
              </div>
              <div className="flex justify-between text-[15.5px] font-medium text-[#1E1E1E] pt-1">
                <span>Total</span>
                <span>{formatCurrency(lastReceipt.totalAmount, sym)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLastReceipt(null)}
              className="w-full py-2.5 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white font-medium text-[13px] cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      <Drawer
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Transaction ${selectedTx.id}` : 'Transaction'}
        subtitle={selectedTx ? `${selectedTx.dateTime}` : ''}
      >
        {selectedTx && (
          <div className="space-y-5 text-[13px]">
            <div className="p-4 rounded-[12px] bg-[#F6F6F4] flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#6E6E6A]">Customer</div>
                <div className="text-[15px] font-medium text-[#1E1E1E]">
                  {selectedTx.guestName}
                </div>
              </div>
              <StatusBadge
                status={selectedTx.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
              />
            </div>

            <div className="space-y-2">
              <h3 className="font-medium text-[#1E1E1E]">Ordered Items</h3>
              <div className="p-4 rounded-[12px] border border-[#EFEFEA] space-y-2 tabular-nums">
                {selectedTx.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {it.quantity} × {it.name}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(it.subtotal, sym)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-[#EFEFEA] flex justify-between font-medium text-[15px]">
                  <span>Total Amount</span>
                  <span>{formatCurrency(selectedTx.totalAmount, sym)}</span>
                </div>
              </div>
            </div>

            {selectedTx.paymentStatus !== 'Paid' && (
              <button
                type="button"
                onClick={() => {
                  updatePosTransactionPayment(selectedTx.id, selectedTx.totalAmount);
                  setSelectedTx({
                    ...selectedTx,
                    amountPaid: selectedTx.totalAmount,
                    paymentStatus: 'Paid',
                  });
                }}
                className="w-full py-2.5 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white font-medium cursor-pointer"
              >
                Settle Unpaid Balance ({formatCurrency(selectedTx.totalAmount, sym)})
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
