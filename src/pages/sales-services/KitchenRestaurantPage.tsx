import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  Clock,
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
} from '../../utils/formatters';

const POS_PAYMENT_METHODS: PaymentMethod[] = ['Card', 'Bank Transfer', 'Cash'];
const POS_PAYMENT_STATUSES: PaymentStatus[] = ['Paid', 'Unpaid'];

function generateWalkInRestaurantId(seq: number): string {
  return `WLK-RES-${4500 + seq}`;
}

export const KitchenRestaurantPage: React.FC = () => {
  const {
    foodIngredients,
    posTransactions,
    bookings,
    selectedBranchId,
    settings,
    completeRestaurantOrder,
    updatePosTransactionPayment,
  } = useHotel();

  const sym = settings.currencySymbol;

  const [activeTab, setActiveTab] = useState<'pos' | 'ledger'>('pos');
  const [search, setSearch] = useState('');
  const [selectedQuickFoodId, setSelectedQuickFoodId] = useState<string>('ALL');

  // Cart & Order state
  const [cart, setCart] = useState<PosOrderItem[]>([]);
  const [customerType, setCustomerType] = useState<'Hotel Guest' | 'Walk-in'>('Hotel Guest');
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [guestSearchQuery, setGuestSearchQuery] = useState<string>('');
  const [guestDropdownOpen, setGuestDropdownOpen] = useState<boolean>(false);
  const [walkInSeq, setWalkInSeq] = useState<number>(() => posTransactions.length + 1);
  const [walkInReferenceId, setWalkInReferenceId] = useState<string>(() =>
    generateWalkInRestaurantId(posTransactions.length + 1)
  );

  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [orderError, setOrderError] = useState('');
  const [selectedTx, setSelectedTx] = useState<PosTransaction | null>(null);

  // Ledger search & filter state
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPaymentFilter, setLedgerPaymentFilter] = useState('ALL');
  const [ledgerDateFrom, setLedgerDateFrom] = useState('2026-10-01');
  const [ledgerDateTo, setLedgerDateTo] = useState('2026-10-31');
  const [ledgerPage, setLedgerPage] = useState(1);

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

  const branchFoodItems = useMemo(
    () =>
      selectedBranchId === 'ALL'
        ? foodIngredients
        : foodIngredients.filter((f) => f.branchId === selectedBranchId),
    [foodIngredients, selectedBranchId]
  );

  const restaurantOrders = useMemo(() => {
    const list = posTransactions.filter(
      (t) => t.department === 'Kitchen & Restaurant'
    );
    return selectedBranchId === 'ALL'
      ? list
      : list.filter((t) => t.branchId === selectedBranchId);
  }, [posTransactions, selectedBranchId]);

  // Top 4 most frequently sold food items derived from Restaurant sales
  const top4FoodItems = useMemo(() => {
    const freqMap = new Map<string, number>();
    restaurantOrders.forEach((tx) => {
      tx.items.forEach((item) => {
        freqMap.set(item.itemId, (freqMap.get(item.itemId) || 0) + item.quantity);
      });
    });

    return [...branchFoodItems]
      .sort((a, b) => {
        const countA = freqMap.get(a.id) || 0;
        const countB = freqMap.get(b.id) || 0;
        if (countB !== countA) return countB - countA;
        return (b.sellingPrice ?? b.purchaseCost * 2) - (a.sellingPrice ?? a.purchaseCost * 2);
      })
      .slice(0, 4);
  }, [branchFoodItems, restaurantOrders]);

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

  const dateFilteredRestaurantOrders = useMemo(() => {
    return restaurantOrders.filter((t) => {
      const txDate = t.date || t.dateTime.slice(0, 10);
      if (ledgerDateFrom && txDate < ledgerDateFrom) return false;
      if (ledgerDateTo && txDate > ledgerDateTo) return false;
      return true;
    });
  }, [restaurantOrders, ledgerDateFrom, ledgerDateTo]);

  // 4 KPI Cards for Kitchen Order Ledger
  const kpis = useMemo(() => {
    const revenue = dateFilteredRestaurantOrders.reduce((s, t) => s + t.totalAmount, 0);
    const totalOrders = dateFilteredRestaurantOrders.length;
    const unpaidFolio = dateFilteredRestaurantOrders
      .filter((t) => t.paymentStatus !== 'Paid')
      .reduce((s, t) => s + (t.totalAmount - t.amountPaid), 0);
    return {
      revenue,
      totalOrders,
      unpaidFolio,
      menuCount: branchFoodItems.length,
    };
  }, [dateFilteredRestaurantOrders, branchFoodItems.length]);

  const filteredFoodItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branchFoodItems.filter((f) => {
      if (selectedQuickFoodId !== 'ALL' && f.id !== selectedQuickFoodId) {
        return false;
      }
      if (q && !f.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [branchFoodItems, search, selectedQuickFoodId]);

  const addFoodToCart = (foodId: string) => {
    setOrderError('');
    const food = branchFoodItems.find((f) => f.id === foodId);
    if (!food || food.availableQuantity <= 0) return;
    const sellPrice = food.sellingPrice ?? food.purchaseCost * 2;

    setCart((prev) => {
      const existing = prev.find((i) => i.itemId === foodId);
      if (existing) {
        if (existing.quantity >= food.availableQuantity) {
          setOrderError(
            `Maximum available stock (${food.availableQuantity} ${food.unit}) reached for ${food.name}.`
          );
          return prev;
        }
        const nextQty = existing.quantity + 1;
        return prev.map((i) =>
          i.itemId === foodId
            ? { ...i, quantity: nextQty, subtotal: nextQty * i.unitPrice }
            : i
        );
      }
      return [
        ...prev,
        {
          itemId: food.id,
          name: food.name,
          quantity: 1,
          unitPrice: sellPrice,
          subtotal: sellPrice,
        },
      ];
    });
  };

  const updateCartQty = (foodId: string, delta: number) => {
    setOrderError('');
    const food = branchFoodItems.find((f) => f.id === foodId);
    if (!food) return;

    setCart((prev) =>
      prev
        .map((i) => {
          if (i.itemId !== foodId) return i;
          const nextQty = i.quantity + delta;
          if (nextQty > food.availableQuantity) {
            setOrderError(
              `Only ${food.availableQuantity} ${food.unit} available for ${food.name}.`
            );
            return i;
          }
          return { ...i, quantity: nextQty, subtotal: nextQty * i.unitPrice };
        })
        .filter((i) => i.quantity > 0)
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.subtotal, 0),
    [cart]
  );
  const netAfterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(
    netAfterDiscount * (settings.defaultTaxRatePercent / 100)
  );
  const totalAmount = netAfterDiscount + taxAmount;

  const handlePlaceOrder = () => {
    setOrderError('');
    if (!cart.length) {
      setOrderError('Add at least one food item to the order.');
      return;
    }

    let guestId: string | undefined;
    let guestName = walkInReferenceId;
    let roomId: string | undefined;
    let roomNumber: string | undefined;

    if (customerType === 'Hotel Guest') {
      const bk = checkedInBookings.find((b) => b.id === selectedBookingId);
      if (!bk) {
        setOrderError('Please select a currently Checked In guest or room.');
        return;
      }
      guestId = bk.guestId;
      guestName = bk.guestName;
      roomId = bk.roomId;
      roomNumber = bk.roomNumber;
    }

    const paidNow = paymentStatus === 'Paid' ? totalAmount : 0;

    const res = completeRestaurantOrder({
      customerType,
      guestId,
      guestName,
      roomId,
      roomNumber,
      tableOrBarArea: customerType === 'Hotel Guest' ? `Room ${roomNumber}` : walkInReferenceId,
      items: cart,
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      amountPaid: paidNow,
      paymentMethod,
      paymentStatus: paymentStatus === 'Paid' ? 'Paid' : 'Unpaid',
      orderStatus: 'Served',
      responsibleStaff: 'Chef Musa Ibrahim',
      branchId: selectedBranchId === 'ALL' ? 'BR-01' : selectedBranchId,
    });

    if (!res.ok) {
      setOrderError(res.error || 'Unable to complete kitchen order.');
      return;
    }

    setCart([]);
    setDiscountAmount(0);
    const nextSeq = walkInSeq + 1;
    setWalkInSeq(nextSeq);
    setWalkInReferenceId(generateWalkInRestaurantId(nextSeq));
  };

  const filteredLedger = useMemo(() => {
    const q = ledgerSearch.trim().toLowerCase();
    return dateFilteredRestaurantOrders.filter((t) => {
      if (
        q &&
        !t.id.toLowerCase().includes(q) &&
        !t.guestName.toLowerCase().includes(q) &&
        !(t.roomNumber && t.roomNumber.toLowerCase().includes(q)) &&
        !t.items.some((i) => i.name.toLowerCase().includes(q))
      ) {
        return false;
      }
      const normPay = t.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid';
      if (ledgerPaymentFilter !== 'ALL' && normPay !== ledgerPaymentFilter) {
        return false;
      }
      return true;
    });
  }, [dateFilteredRestaurantOrders, ledgerSearch, ledgerPaymentFilter]);

  const paginatedLedger = useMemo(() => {
    const start = (ledgerPage - 1) * 8;
    return filteredLedger.slice(start, start + 8);
  }, [filteredLedger, ledgerPage]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kitchen & Restaurant"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {activeTab === 'ledger' && (
              <DateRangeControl
                fromDate={ledgerDateFrom}
                toDate={ledgerDateTo}
                onChange={(from, to) => {
                  setLedgerDateFrom(from);
                  setLedgerDateTo(to);
                  setLedgerPage(1);
                }}
              />
            )}
            <div className="inline-flex items-center bg-[#EAEAE4] p-1 rounded-[10px]">
              <button
                type="button"
                onClick={() => setActiveTab('pos')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-[12.5px] font-medium transition-colors cursor-pointer ${
                  activeTab === 'pos'
                    ? 'bg-white text-[#1E1E1E] shadow-xs'
                    : 'text-[#6E6E6A] hover:text-[#1E1E1E]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                Restaurant Menu & POS
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
                Kitchen Order Ledger ({dateFilteredRestaurantOrders.length})
              </button>
            </div>
          </div>
        }
      />

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 cols: Food Items from Inventory Management */}
          <div className="lg:col-span-8 space-y-4">
            {/* 1 Search Input + Single Row of up to 5 Quick-Pick Controls (All Menu + Top 4 Food Items) */}
            <div className="bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search food item..."
                className="w-full sm:w-60"
              />
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setSelectedQuickFoodId('ALL')}
                  className={`px-2.5 py-1 rounded-[7px] text-[11.5px] font-normal transition-colors whitespace-nowrap cursor-pointer ${
                    selectedQuickFoodId === 'ALL'
                      ? 'bg-[#7463A6] text-white'
                      : 'bg-[#F6F6F4] text-[#6E6E6A] hover:text-[#1E1E1E]'
                  }`}
                >
                  All Menu
                </button>
                {top4FoodItems.map((food) => (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() =>
                      setSelectedQuickFoodId((prev) =>
                        prev === food.id ? 'ALL' : food.id
                      )
                    }
                    className={`px-2.5 py-1 rounded-[7px] text-[11.5px] font-normal transition-colors whitespace-nowrap cursor-pointer ${
                      selectedQuickFoodId === food.id
                        ? 'bg-[#7463A6] text-white'
                        : 'bg-[#F6F6F4] text-[#6E6E6A] hover:text-[#1E1E1E]'
                    }`}
                  >
                    {food.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Simplified Food Cards: Food Icon, Available Portions with Ash Background, Food Name, Faint Divider, Selling Price, Add Button */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFoodItems.map((food) => {
                const inCart = cart.find((c) => c.itemId === food.id);
                const outOfStock = food.availableQuantity <= 0;
                const sellPrice = food.sellingPrice ?? food.purchaseCost * 2;

                return (
                  <div
                    key={food.id}
                    className={`bg-white rounded-[14px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] border transition-all flex flex-col justify-between ${
                      inCart
                        ? 'border-[#7463A6] ring-1 ring-[#7463A6]/25'
                        : 'border-transparent hover:border-[#E2E2DC]'
                    } ${outOfStock ? 'opacity-60' : ''}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-9 h-9 rounded-[10px] bg-[#F1EEF8] flex items-center justify-center text-[#7463A6] shrink-0">
                          <UtensilsCrossed className="w-4.5 h-4.5" />
                        </div>
                        <span className="px-2.5 py-1 rounded-[8px] bg-[#F2F2EE] text-[#4A4A46] text-[11.5px] font-normal tabular-nums">
                          {outOfStock
                            ? 'Out of Stock'
                            : `${food.availableQuantity} ${food.unit}s`}
                        </span>
                      </div>

                      <h3 className="text-[14px] font-bold text-[#1E1E1E] mt-3 leading-snug">
                        {food.name}
                      </h3>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#F2F2EE] flex items-center justify-between">
                      <div className="text-[14.5px] font-normal text-[#1E1E1E] tabular-nums">
                        {formatCurrency(sellPrice, sym)}
                      </div>

                      {inCart ? (
                        <div className="inline-flex items-center gap-2 bg-[#F6F6F4] rounded-[9px] p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(food.id, -1)}
                            className="w-6.5 h-6.5 rounded-[7px] bg-white flex items-center justify-center text-[#1E1E1E] shadow-2xs cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[13px] font-medium tabular-nums px-1">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(food.id, 1)}
                            className="w-6.5 h-6.5 rounded-[7px] bg-[#7463A6] text-white flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={outOfStock}
                          onClick={() => addFoodToCart(food.id)}
                          className="px-3.5 py-1.5 rounded-[9px] bg-[#F6F6F4] hover:bg-[#7463A6] hover:text-white text-[#1E1E1E] text-[12px] font-normal transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

          {/* Right 4 cols: Current Kitchen Order */}
          <div className="lg:col-span-4 bg-white rounded-[14px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] sticky top-20 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFEFEA] pb-3">
              <h2 className="text-[15.5px] font-medium text-[#1E1E1E]">
                Current Kitchen Order
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

            {orderError && (
              <div className="p-3 rounded-[10px] bg-[#FCECE9] text-[#B93829] text-[12px] font-medium">
                {orderError}
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
                /* Single Searchable Checked-In Guest / Room Input */
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

            <div className="border-t border-b border-[#EFEFEA] py-3 max-h-56 overflow-y-auto space-y-2.5">
              {cart.length === 0 ? (
                <div className="py-7 text-center text-[12.5px] text-[#8E8E88]">
                  Select food items from the catalog to build an order.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center justify-between gap-2 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[#1E1E1E] truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-[#6E6E6A] tabular-nums">
                        {formatCurrency(item.unitPrice, sym)} × {item.quantity}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.itemId, -1)}
                        className="w-6 h-6 rounded-[7px] bg-[#F6F6F4] flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center tabular-nums font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.itemId, 1)}
                        className="w-6 h-6 rounded-[7px] bg-[#F6F6F4] flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="w-20 text-right font-medium tabular-nums">
                      {formatCurrency(item.subtotal, sym)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 text-[13px] tabular-nums">
              <div className="flex justify-between text-[#6E6E6A]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal, sym)}</span>
              </div>
              <div className="flex items-center justify-between text-[#6E6E6A]">
                <span>Discount ({sym})</span>
                <input
                  type="number"
                  min={0}
                  max={subtotal}
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
                <span>Total Order</span>
                <span>{formatCurrency(totalAmount, sym)}</span>
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
              onClick={handlePlaceOrder}
              className="w-full py-2.5 rounded-[10px] bg-[#7463A6] hover:bg-[#635394] text-white text-[13.5px] font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Order ({formatCurrency(totalAmount, sym)})
            </button>
          </div>
        </div>
      ) : (
        /* KITCHEN ORDER LEDGER */
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Restaurant Revenue"
              value={formatCompactCurrency(kpis.revenue, sym)}
              fullValueTooltip={formatCurrency(kpis.revenue, sym)}
              icon={UtensilsCrossed}
              iconTone="purple"
            />
            <KpiCard
              label="Completed Orders"
              value={kpis.totalOrders}
              icon={ChefHat}
              iconTone="teal"
            />
            <KpiCard
              label="Room-Charged Dining"
              value={formatCompactCurrency(kpis.unpaidFolio, sym)}
              fullValueTooltip={formatCurrency(kpis.unpaidFolio, sym)}
              icon={CreditCard}
              iconTone="amber"
            />
            <KpiCard
              label="Active Food Items"
              value={kpis.menuCount}
              icon={Clock}
              iconTone="blue"
            />
          </div>

          <div className="bg-white rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="p-4 border-b border-[#EFEFEA] flex flex-wrap items-center justify-between gap-3">
              <SearchInput
                value={ledgerSearch}
                onChange={(v) => {
                  setLedgerSearch(v);
                  setLedgerPage(1);
                }}
                placeholder="Search order ID, guest, room, or food item..."
                className="w-full sm:w-72"
              />
              <Dropdown
                value={ledgerPaymentFilter}
                onChange={(v) => {
                  setLedgerPaymentFilter(v);
                  setLedgerPage(1);
                }}
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
                title="No kitchen orders found"
                description="Complete an order in Restaurant Menu & POS to see records here."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EFEFEA] bg-[#FAF9F6] text-[12px] font-medium text-[#6E6E6A] whitespace-nowrap">
                        <th className="py-3.5 px-5 whitespace-nowrap">Order ID</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Customer / Room</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Dishes Prepared</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Amount</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Payment</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-5 text-right whitespace-nowrap">Details</th>
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
                            <td className="py-3.5 px-4 text-[#4A4A46] max-w-[240px] truncate whitespace-nowrap">
                              {tx.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-[#1E1E1E] tabular-nums whitespace-nowrap">
                              {formatCurrency(tx.totalAmount, sym)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={displayPay} />
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <StatusBadge status={tx.orderStatus} />
                            </td>
                            <td
                              className="py-3.5 px-5 text-right whitespace-nowrap"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTx(tx);
                              }}
                            >
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-[#6E6E6A] hover:text-[#1E1E1E]"
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

      <Drawer
        isOpen={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Kitchen Order ${selectedTx.id}` : 'Order Details'}
        subtitle={selectedTx ? `${selectedTx.dateTime} · ${selectedTx.responsibleStaff}` : ''}
      >
        {selectedTx && (
          <div className="space-y-4 text-[13px]">
            <div className="p-4 rounded-[12px] bg-[#F6F6F4] flex justify-between">
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
                <span>Total</span>
                <span>{formatCurrency(selectedTx.totalAmount, sym)}</span>
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
                Mark Balance Paid ({formatCurrency(selectedTx.totalAmount, sym)})
              </button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
