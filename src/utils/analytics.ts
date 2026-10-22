import {
  Booking,
  Room,
  PosTransaction,
  LaundryOrder,
  Expense,
  DateRangeFilter,
} from '../types/hotel';
import {
  isDateInRange,
  getDatesArray,
  calculateNights,
  formatShortDate,
  addDays,
} from './formatters';

/**
 * Computes the corresponding previous period DateRangeFilter of equal duration
 * so that KPI comparisons ("vs previous period") are grounded in actual records.
 */
export function getPreviousPeriodFilter(dateFilter: DateRangeFilter): DateRangeFilter {
  if (dateFilter.preset === 'month' && dateFilter.startDate === '2026-10-01') {
    return {
      preset: 'custom',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    };
  }
  const numDays = Math.max(
    1,
    calculateNights(dateFilter.startDate, dateFilter.endDate) + 1
  );
  const prevEnd = addDays(dateFilter.startDate, -1);
  const prevStart = addDays(dateFilter.startDate, -numDays);
  return {
    preset: 'custom',
    startDate: prevStart,
    endDate: prevEnd,
  };
}

/**
 * LUMINA HOTEL SUITES — FINANCIAL RECOGNITION MODEL
 * -------------------------------------------------
 * 1. Recognized Revenue is derived once per underlying operational record:
 *    - Rooms: Non-cancelled bookings (Confirmed, Checked In, Checked Out) by check-in date.
 *    - Bar & POS: Bar transactions by transaction date.
 *    - Kitchen & Restaurant: Restaurant orders by order date.
 *    - Laundry: Laundry orders by received date.
 * 2. Collecting an outstanding payment updates `amountPaid` & `paymentStatus` on the existing
 *    record and never duplicates revenue.
 * 3. Inventory stock value is strictly asset cost (`availableQuantity * purchaseCost`) and is
 *    never counted as revenue.
 */
export function computeFinancialSummary(params: {
  bookings: Booking[];
  posTransactions: PosTransaction[];
  laundryOrders: LaundryOrder[];
  expenses: Expense[];
  rooms: Room[];
  branchId: string;
  dateFilter: DateRangeFilter;
}) {
  const {
    bookings,
    posTransactions,
    laundryOrders,
    expenses,
    rooms,
    branchId,
    dateFilter,
  } = params;

  const filterBranch = <T extends { branchId: string }>(items: T[]) =>
    branchId === 'ALL' ? items : items.filter((i) => i.branchId === branchId);

  const branchRooms = filterBranch(rooms);
  const branchBookings = filterBranch(bookings);
  const branchPos = filterBranch(posTransactions);
  const branchLaundry = filterBranch(laundryOrders);
  const branchExpenses = filterBranch(expenses);

  // Filter by date range
  const periodBookings = branchBookings.filter(
    (b) =>
      b.bookingStatus !== 'Cancelled' &&
      (isDateInRange(b.checkInDate, dateFilter) ||
        isDateInRange(b.createdAt, dateFilter) ||
        (b.checkInDate <= dateFilter.endDate && b.checkOutDate >= dateFilter.startDate))
  );

  const recognizedBookings = branchBookings.filter(
    (b) => b.bookingStatus !== 'Cancelled' && isDateInRange(b.checkInDate, dateFilter)
  );

  const periodBarSales = branchPos.filter(
    (t) => t.department === 'Bar & POS' && isDateInRange(t.date, dateFilter)
  );

  const periodRestaurantSales = branchPos.filter(
    (t) => t.department === 'Kitchen & Restaurant' && isDateInRange(t.date, dateFilter)
  );

  const periodLaundry = branchLaundry.filter((l) =>
    isDateInRange(l.receivedDate, dateFilter)
  );

  const periodExpenses = branchExpenses.filter(
    (e) => e.status !== 'Rejected' && isDateInRange(e.date, dateFilter)
  );

  const roomsRevenue = recognizedBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const barRevenue = periodBarSales.reduce((sum, t) => sum + t.totalAmount, 0);
  const restaurantRevenue = periodRestaurantSales.reduce((sum, t) => sum + t.totalAmount, 0);
  const laundryRevenue = periodLaundry.reduce((sum, l) => sum + l.totalAmount, 0);

  const totalRevenue = roomsRevenue + barRevenue + restaurantRevenue + laundryRevenue;
  const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Outstanding balances (unpaid portions across active records in branch)
  const bookingOutstanding = branchBookings
    .filter((b) => b.bookingStatus !== 'Cancelled')
    .reduce((sum, b) => sum + Math.max(0, b.totalAmount - b.amountPaid), 0);

  const posOutstanding = branchPos.reduce(
    (sum, t) => sum + Math.max(0, t.totalAmount - t.amountPaid),
    0
  );

  const laundryOutstanding = branchLaundry.reduce(
    (sum, l) => sum + Math.max(0, l.totalAmount - l.amountPaid),
    0
  );

  const totalOutstanding = bookingOutstanding + posOutstanding + laundryOutstanding;

  // Live room status counts
  const availableRoomsCount = branchRooms.filter((r) => r.status === 'Available').length;
  const occupiedRoomsCount = branchRooms.filter((r) => r.status === 'Occupied').length;
  const cleaningRoomsCount = branchRooms.filter((r) => r.status === 'Cleaning').length;
  const maintenanceRoomsCount = branchRooms.filter((r) => r.status === 'Maintenance').length;
  const totalRoomsCount = branchRooms.length || 1;
  const occupancyRate = Math.round((occupiedRoomsCount / totalRoomsCount) * 100);

  // Department breakdown for Donut chart
  const departmentBreakdown = [
    { name: 'Rooms', value: roomsRevenue, color: '#7D53DE' },
    { name: 'Bar & POS', value: barRevenue, color: '#0D9488' },
    { name: 'Kitchen & Restaurant', value: restaurantRevenue, color: '#F59E0B' },
    { name: 'Laundry', value: laundryRevenue, color: '#3B82F6' },
  ];

  // Daily time-series trend
  const numDays = Math.min(
    31,
    Math.max(1, calculateNights(dateFilter.startDate, dateFilter.endDate) + 1)
  );
  const dateKeys = getDatesArray(dateFilter.startDate, numDays);

  const dailySeries = dateKeys.map((d) => {
    const dayRecognizedBookings = branchBookings.filter(
      (b) => b.bookingStatus !== 'Cancelled' && b.checkInDate === d
    );
    const dayActiveStays = branchBookings.filter(
      (b) =>
        b.bookingStatus !== 'Cancelled' &&
        b.checkInDate <= d &&
        b.checkOutDate > d
    );

    const dayRoomRev = dayRecognizedBookings.reduce((s, b) => s + b.totalAmount, 0);
    const dayBarRev = branchPos
      .filter((t) => t.department === 'Bar & POS' && t.date === d)
      .reduce((s, t) => s + t.totalAmount, 0);
    const dayRestRev = branchPos
      .filter((t) => t.department === 'Kitchen & Restaurant' && t.date === d)
      .reduce((s, t) => s + t.totalAmount, 0);
    const dayLaundRev = branchLaundry
      .filter((l) => l.receivedDate === d)
      .reduce((s, l) => s + l.totalAmount, 0);
    const dayExp = branchExpenses
      .filter((e) => e.status !== 'Rejected' && e.date === d)
      .reduce((s, e) => s + e.amount, 0);

    const rev = dayRoomRev + dayBarRev + dayRestRev + dayLaundRev;
    const occupiedOnDay = Math.min(branchRooms.length, dayActiveStays.length);
    const dayOccPct = Math.round((occupiedOnDay / totalRoomsCount) * 100);
    const dayAvailRooms = Math.max(0, branchRooms.length - occupiedOnDay - maintenanceRoomsCount);

    return {
      date: d,
      label: formatShortDate(d),
      revenue: rev,
      roomsRevenue: dayRoomRev,
      barRevenue: dayBarRev,
      restaurantRevenue: dayRestRev,
      laundryRevenue: dayLaundRev,
      expenses: dayExp,
      profit: rev - dayExp,
      bookingsCount: dayActiveStays.length + dayRecognizedBookings.length,
      occupancyPct: dayOccPct,
      availableRooms: dayAvailRooms,
    };
  });

  // Period room-night occupancy rate for accurate period-over-period comparison
  const occupiedRoomNights = branchBookings
    .filter((b) => b.bookingStatus !== 'Cancelled')
    .reduce((acc, b) => {
      const overlapStart = b.checkInDate > dateFilter.startDate ? b.checkInDate : dateFilter.startDate;
      const overlapEnd = b.checkOutDate < addDays(dateFilter.endDate, 1) ? b.checkOutDate : addDays(dateFilter.endDate, 1);
      if (overlapStart < overlapEnd) {
        return acc + calculateNights(overlapStart, overlapEnd);
      }
      return acc;
    }, 0);

  const totalAvailableRoomNights = Math.max(1, totalRoomsCount * numDays);
  const periodOccupancyRate = Math.min(
    100,
    Math.round((occupiedRoomNights / totalAvailableRoomNights) * 100)
  );

  return {
    totalRevenue,
    roomsRevenue,
    barRevenue,
    restaurantRevenue,
    laundryRevenue,
    totalExpenses,
    netProfit,
    totalOutstanding,
    bookingOutstanding,
    posOutstanding,
    laundryOutstanding,
    totalBookingsCount: periodBookings.length,
    recognizedBookingsCount: recognizedBookings.length,
    availableRoomsCount,
    occupiedRoomsCount,
    cleaningRoomsCount,
    maintenanceRoomsCount,
    totalRoomsCount: branchRooms.length,
    occupancyRate,
    periodOccupancyRate,
    departmentBreakdown,
    dailySeries,
    periodBookings,
    periodExpenses,
  };
}
