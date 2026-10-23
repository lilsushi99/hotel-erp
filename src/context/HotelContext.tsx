import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Branch,
  RoomType,
  Room,
  RoomOperationalStatus,
  Guest,
  Booking,
  BeverageItem,
  FoodIngredient,
  MenuItem,
  SupplyItem,
  StockMovement,
  StockMovementType,
  PosTransaction,
  LaundryOrder,
  LaundryWorkflowStatus,
  Expense,
  ExpenseStatus,
  ExpenseCategoryConfig,
  StaffMember,
  RolePermissionConfig,
  PermissionAction,
  StaffRole,
  StaffActivityLog,
  HotelSettings,
  OptionalModule,
  DateRangeFilter,
} from '../types/hotel';
import {
  INITIAL_BRANCHES,
  INITIAL_ROOM_TYPES,
  INITIAL_ROOMS,
  INITIAL_GUESTS,
  INITIAL_BOOKINGS,
  INITIAL_BEVERAGES,
  INITIAL_FOOD_INGREDIENTS,
  INITIAL_MENU_ITEMS,
  INITIAL_SUPPLIES,
  INITIAL_STOCK_MOVEMENTS,
  INITIAL_POS_TRANSACTIONS,
  INITIAL_LAUNDRY_ORDERS,
  INITIAL_EXPENSES,
  INITIAL_STAFF,
  INITIAL_ROLE_PERMISSIONS,
  INITIAL_STAFF_ACTIVITY,
  INITIAL_SETTINGS,
  INITIAL_OPTIONAL_MODULES,
} from '../data/mockData';
import {
  TODAY_STR,
  calculateNights,
  doBookingDatesOverlap,
  getPresetDateRange,
} from '../utils/formatters';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface HotelContextValue {
  branches: Branch[];
  selectedBranchId: string; // 'ALL' or branch ID
  setSelectedBranchId: (id: string) => void;
  globalDateFilter: DateRangeFilter;
  setGlobalDateFilter: (filter: DateRangeFilter) => void;

  roomTypes: RoomType[];
  rooms: Room[];
  guests: Guest[];
  bookings: Booking[];
  beverages: BeverageItem[];
  foodIngredients: FoodIngredient[];
  menuItems: MenuItem[];
  supplies: SupplyItem[];
  stockMovements: StockMovement[];
  posTransactions: PosTransaction[];
  laundryOrders: LaundryOrder[];
  expenses: Expense[];
  staff: StaffMember[];
  currentUser: StaffMember;
  setCurrentUserId: (id: string) => void;
  rolePermissions: RolePermissionConfig[];
  staffActivity: StaffActivityLog[];
  settings: HotelSettings;
  optionalModules: OptionalModule[];

  toasts: ToastNotification[];
  notify: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;

  // Bookings
  createBooking: (
    data: Omit<Booking, 'id' | 'guestId' | 'nights' | 'createdAt'> & { guestId?: string }
  ) => { ok: boolean; error?: string; booking?: Booking };
  updateBooking: (
    id: string,
    data: Partial<Booking>
  ) => { ok: boolean; error?: string };
  deleteBooking: (id: string) => void;

  // Rooms & Room Types
  createRoomType: (data: Omit<RoomType, 'id'>) => void;
  updateRoomType: (id: string, data: Partial<RoomType>) => void;
  deleteRoomType: (id: string) => { ok: boolean; error?: string };
  createRoom: (data: Omit<Room, 'id'>) => { ok: boolean; error?: string };
  updateRoom: (id: string, data: Partial<Room>) => { ok: boolean; error?: string };
  updateRoomStatus: (id: string, status: RoomOperationalStatus) => void;
  deleteRoom: (id: string) => { ok: boolean; error?: string };

  // Guests
  createGuest: (data: Omit<Guest, 'id' | 'createdAt'>) => Guest;
  updateGuest: (id: string, data: Partial<Guest>) => void;
  deleteGuest: (id: string) => { ok: boolean; error?: string };

  // POS & Kitchen
  completeBarSale: (
    tx: Omit<PosTransaction, 'id' | 'department' | 'dateTime' | 'date'>
  ) => { ok: boolean; error?: string; transaction?: PosTransaction };
  completeRestaurantOrder: (
    tx: Omit<PosTransaction, 'id' | 'department' | 'dateTime' | 'date'>
  ) => { ok: boolean; error?: string; transaction?: PosTransaction };
  updatePosTransactionPayment: (id: string, amountPaid: number) => void;
  createMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => void;

  // Laundry
  createLaundryOrder: (
    order: Omit<LaundryOrder, 'id' | 'garmentTag' | 'receivedDate'>
  ) => LaundryOrder;
  updateLaundryOrder: (id: string, data: Partial<LaundryOrder>) => void;
  updateLaundryStatus: (id: string, status: LaundryWorkflowStatus) => void;
  deleteLaundryOrder: (id: string) => void;

  // Inventory
  createBeverage: (item: Omit<BeverageItem, 'id'>) => void;
  updateBeverage: (id: string, data: Partial<BeverageItem>) => void;
  deleteBeverage: (id: string) => void;

  createFoodIngredient: (item: Omit<FoodIngredient, 'id'>) => void;
  updateFoodIngredient: (id: string, data: Partial<FoodIngredient>) => void;
  deleteFoodIngredient: (id: string) => void;

  createSupplyItem: (item: Omit<SupplyItem, 'id'>) => void;
  updateSupplyItem: (id: string, data: Partial<SupplyItem>) => void;
  deleteSupplyItem: (id: string) => void;

  recordStockOperation: (params: {
    inventoryModule: 'Beverages' | 'Food' | 'Supplies';
    itemId: string;
    movementType: StockMovementType;
    direction: 'IN' | 'OUT';
    quantity: number;
    sourceOrDestination: string;
    notes: string;
    responsibleUser?: string;
  }) => { ok: boolean; error?: string };

  // Finance
  createExpense: (exp: Omit<Expense, 'id' | 'reference'>) => void;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  updateExpenseStatus: (id: string, status: ExpenseStatus) => void;
  deleteExpense: (id: string) => void;
  saveExpenseCategories: (
    configs: ExpenseCategoryConfig[],
    renamedMap?: Record<string, string>
  ) => void;
  saveSupplyCategories: (
    categories: string[],
    renamedMap?: Record<string, string>
  ) => void;

  // Administration
  createStaff: (member: Omit<StaffMember, 'id' | 'lastActivity'>) => void;
  updateStaff: (id: string, data: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;
  toggleRolePermission: (role: StaffRole, action: PermissionAction) => void;
  updateSettings: (newSettings: Partial<HotelSettings>) => void;
  resetSettings: () => void;
  toggleOptionalModule: (id: string) => void;
}

const HotelContext = createContext<HotelContextValue | undefined>(undefined);

const STORAGE_KEY = 'lumina_hotel_suites_state_v5';

export const HotelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed[key] !== undefined ? parsed[key] : fallback;
    } catch {
      return fallback;
    }
  };

  const [branches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [globalDateFilter, setGlobalDateFilter] = useState<DateRangeFilter>(() =>
    getPresetDateRange('month')
  );

  const [roomTypes, setRoomTypes] = useState<RoomType[]>(() => loadState('roomTypes', INITIAL_ROOM_TYPES));
  const [rooms, setRooms] = useState<Room[]>(() => loadState('rooms', INITIAL_ROOMS));
  const [guests, setGuests] = useState<Guest[]>(() => loadState('guests', INITIAL_GUESTS));
  const [bookings, setBookings] = useState<Booking[]>(() => loadState('bookings', INITIAL_BOOKINGS));
  const [beverages, setBeverages] = useState<BeverageItem[]>(() => loadState('beverages', INITIAL_BEVERAGES));
  const [foodIngredients, setFoodIngredients] = useState<FoodIngredient[]>(() =>
    loadState('foodIngredients', INITIAL_FOOD_INGREDIENTS)
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => loadState('menuItems', INITIAL_MENU_ITEMS));
  const [supplies, setSupplies] = useState<SupplyItem[]>(() => loadState('supplies', INITIAL_SUPPLIES));
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    loadState('stockMovements', INITIAL_STOCK_MOVEMENTS)
  );
  const [posTransactions, setPosTransactions] = useState<PosTransaction[]>(() =>
    loadState('posTransactions', INITIAL_POS_TRANSACTIONS)
  );
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>(() =>
    loadState('laundryOrders', INITIAL_LAUNDRY_ORDERS)
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => loadState('expenses', INITIAL_EXPENSES));
  const [staff, setStaff] = useState<StaffMember[]>(() => loadState('staff', INITIAL_STAFF));
  const [currentUserId, setCurrentUserId] = useState<string>(() => loadState('currentUserId', INITIAL_STAFF[0].id));
  const [rolePermissions, setRolePermissions] = useState<RolePermissionConfig[]>(() =>
    loadState('rolePermissions', INITIAL_ROLE_PERMISSIONS)
  );
  const [staffActivity, setStaffActivity] = useState<StaffActivityLog[]>(() =>
    loadState('staffActivity', INITIAL_STAFF_ACTIVITY)
  );
  const [settings, setSettings] = useState<HotelSettings>(() => ({
    ...INITIAL_SETTINGS,
    ...loadState('settings', INITIAL_SETTINGS),
  }));
  const [optionalModules, setOptionalModules] = useState<OptionalModule[]>(() =>
    loadState('optionalModules', INITIAL_OPTIONAL_MODULES)
  );

  const currentUser = staff.find((s) => s.id === currentUserId) || staff[0] || INITIAL_STAFF[0];

  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    try {
      const payload = {
        roomTypes,
        rooms,
        guests,
        bookings,
        beverages,
        foodIngredients,
        menuItems,
        supplies,
        stockMovements,
        posTransactions,
        laundryOrders,
        expenses,
        staff,
        currentUserId,
        rolePermissions,
        staffActivity,
        settings,
        optionalModules,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    roomTypes,
    rooms,
    guests,
    bookings,
    beverages,
    foodIngredients,
    menuItems,
    supplies,
    stockMovements,
    posTransactions,
    laundryOrders,
    expenses,
    staff,
    currentUserId,
    rolePermissions,
    staffActivity,
    settings,
    optionalModules,
  ]);

  const notify = useCallback(
    (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = `TST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, title, message, type }]);
      if (settings.soundNotificationsEnabled) {
        try {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(type === 'error' ? 440 : 660, ctx.currentTime);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.18);
          }
        } catch {
          // Ignore audio errors
        }
      }
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [settings.soundNotificationsEnabled]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const logActivity = useCallback(
    (action: string, module: string, staffName?: string, role?: StaffRole) => {
      const now = new Date();
      const timeStr = `${TODAY_STR} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      setStaffActivity((prev) => [
        {
          id: `ACT-${Date.now()}`,
          staffName: staffName || currentUser.name,
          role: role || currentUser.role,
          action,
          module,
          timestamp: timeStr,
        },
        ...prev.slice(0, 29),
      ]);
    },
    [currentUser.name, currentUser.role]
  );

  // ---------------- BOOKINGS ----------------
  const createBooking = useCallback(
    (
      data: Omit<Booking, 'id' | 'guestId' | 'nights' | 'createdAt'> & { guestId?: string }
    ): { ok: boolean; error?: string; booking?: Booking } => {
      if (!data.guestName.trim()) {
        return { ok: false, error: 'Guest full name is required.' };
      }
      if (!data.roomId) {
        return { ok: false, error: 'Please select a valid room.' };
      }
      const nights = calculateNights(data.checkInDate, data.checkOutDate);
      if (nights <= 0) {
        return { ok: false, error: 'Check-out date must be at least 1 night after check-in date.' };
      }

      // Check overlapping active bookings for the same room
      if (data.bookingStatus !== 'Cancelled') {
        const conflict = bookings.find(
          (b) =>
            b.roomId === data.roomId &&
            b.bookingStatus !== 'Cancelled' &&
            b.bookingStatus !== 'Checked Out' &&
            doBookingDatesOverlap(data.checkInDate, data.checkOutDate, b.checkInDate, b.checkOutDate)
        );
        if (conflict) {
          return {
            ok: false,
            error: `Room ${data.roomNumber} is already reserved (${conflict.id} for ${conflict.guestName}) from ${conflict.checkInDate} to ${conflict.checkOutDate}.`,
          };
        }
      }

      // Match or create guest in CRM
      const normalizedPhone = (data.guestPhone || '').replace(/\s+/g, '');
      const normalizedEmail = (data.guestEmail || '').trim().toLowerCase();
      let matchedGuest = guests.find(
        (g) =>
          (data.guestId && g.id === data.guestId) ||
          (normalizedPhone && g.phone.replace(/\s+/g, '') === normalizedPhone) ||
          (normalizedEmail && g.email.toLowerCase() === normalizedEmail)
      );

      let guestId = matchedGuest?.id || `GST-${1000 + guests.length + 1}`;
      if (!matchedGuest) {
        const newGuest: Guest = {
          id: guestId,
          name: data.guestName.trim(),
          phone: data.guestPhone.trim(),
          secondaryPhone: data.guestSecondaryPhone?.trim() || '',
          email: data.guestEmail?.trim() || '',
          address: data.guestAddress?.trim() || '',
          guestType: 'New',
          status: data.bookingStatus === 'Checked In' ? 'Checked In' : 'Active',
          notes: '',
          createdAt: TODAY_STR,
        };
        setGuests((prev) => [newGuest, ...prev]);
      } else {
        setGuests((prev) =>
          prev.map((g) =>
            g.id === guestId
              ? {
                  ...g,
                  name: data.guestName.trim() || g.name,
                  secondaryPhone: data.guestSecondaryPhone?.trim() || g.secondaryPhone,
                  email: data.guestEmail?.trim() || g.email,
                  address: data.guestAddress?.trim() || g.address,
                  status: data.bookingStatus === 'Checked In' ? 'Checked In' : g.status,
                }
              : g
          )
        );
      }

      if (data.bookingStatus === 'Checked In') {
        setRooms((prev) =>
          prev.map((r) => (r.id === data.roomId ? { ...r, status: 'Occupied' } : r))
        );
      }

      const newBooking: Booking = {
        ...data,
        id: `BKG-${2050 + bookings.length + 1}`,
        guestId,
        nights,
        createdAt: TODAY_STR,
      };

      setBookings((prev) => [newBooking, ...prev]);
      logActivity(
        `Created booking ${newBooking.id} for ${newBooking.guestName} (Room ${newBooking.roomNumber})`,
        'Bookings'
      );
      notify(
        'Booking Created',
        `Reservation ${newBooking.id} for ${newBooking.guestName} in Room ${newBooking.roomNumber} has been saved.`
      );
      return { ok: true, booking: newBooking };
    },
    [bookings, guests, logActivity, notify]
  );

  const updateBooking = useCallback(
    (id: string, data: Partial<Booking>): { ok: boolean; error?: string } => {
      const existing = bookings.find((b) => b.id === id);
      if (!existing) return { ok: false, error: 'Booking not found.' };

      const merged = { ...existing, ...data };
      const nights = calculateNights(merged.checkInDate, merged.checkOutDate);
      if (nights <= 0) {
        return { ok: false, error: 'Check-out date must be after check-in date.' };
      }
      merged.nights = nights;

      if (merged.bookingStatus !== 'Cancelled' && merged.bookingStatus !== 'Checked Out') {
        const conflict = bookings.find(
          (b) =>
            b.id !== id &&
            b.roomId === merged.roomId &&
            b.bookingStatus !== 'Cancelled' &&
            b.bookingStatus !== 'Checked Out' &&
            doBookingDatesOverlap(merged.checkInDate, merged.checkOutDate, b.checkInDate, b.checkOutDate)
        );
        if (conflict) {
          return {
            ok: false,
            error: `Overlap conflict with ${conflict.id} (${conflict.guestName}, ${conflict.checkInDate} to ${conflict.checkOutDate}).`,
          };
        }
      }

      if (existing.bookingStatus !== 'Checked In' && merged.bookingStatus === 'Checked In') {
        setRooms((prev) =>
          prev.map((r) => (r.id === merged.roomId ? { ...r, status: 'Occupied' } : r))
        );
      }

      // If checked out and auto-assign cleaning is enabled, set room to Cleaning
      if (
        existing.bookingStatus !== 'Checked Out' &&
        merged.bookingStatus === 'Checked Out' &&
        settings.autoAssignCleaningOnCheckout
      ) {
        setRooms((prev) =>
          prev.map((r) => (r.id === merged.roomId ? { ...r, status: 'Cleaning' } : r))
        );
      }

      setBookings((prev) => prev.map((b) => (b.id === id ? merged : b)));
      logActivity(`Updated booking ${id} (${merged.bookingStatus})`, 'Bookings');
      notify('Booking Updated', `Changes to reservation ${id} have been saved.`);
      return { ok: true };
    },
    [bookings, settings.autoAssignCleaningOnCheckout, logActivity, notify]
  );

  const deleteBooking = useCallback(
    (id: string) => {
      setBookings((prev) => prev.filter((b) => b.id !== id));
      logActivity(`Deleted booking record ${id}`, 'Bookings');
      notify('Booking Removed', `Reservation ${id} was deleted.`, 'info');
    },
    [logActivity, notify]
  );

  // ---------------- ROOMS & ROOM TYPES ----------------
  const createRoomType = useCallback(
    (data: Omit<RoomType, 'id'>) => {
      const newRt: RoomType = {
        ...data,
        id: `RT-${data.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`,
      };
      setRoomTypes((prev) => [...prev, newRt]);
      notify('Room Type Added', `${newRt.name} room category created.`);
    },
    [notify]
  );

  const updateRoomType = useCallback(
    (id: string, data: Partial<RoomType>) => {
      setRoomTypes((prev) => prev.map((rt) => (rt.id === id ? { ...rt, ...data } : rt)));
      notify('Room Type Updated', 'Room category configuration saved.');
    },
    [notify]
  );

  const deleteRoomType = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const inUse = rooms.some((r) => r.roomTypeId === id);
      if (inUse) {
        return { ok: false, error: 'Cannot delete a room type that has rooms assigned to it.' };
      }
      setRoomTypes((prev) => prev.filter((rt) => rt.id !== id));
      notify('Room Type Deleted', 'Room category removed.', 'info');
      return { ok: true };
    },
    [rooms, notify]
  );

  const createRoom = useCallback(
    (data: Omit<Room, 'id'>): { ok: boolean; error?: string } => {
      if (!data.roomNumber.trim()) {
        return { ok: false, error: 'Room number is required.' };
      }
      if (rooms.some((r) => r.roomNumber.toLowerCase() === data.roomNumber.trim().toLowerCase() && r.branchId === data.branchId)) {
        return { ok: false, error: `Room ${data.roomNumber} already exists in this branch.` };
      }
      const newRoom: Room = {
        ...data,
        id: `RM-${data.roomNumber.trim()}-${Date.now().toString().slice(-2)}`,
      };
      setRooms((prev) => [...prev, newRoom]);
      logActivity(`Added Room ${newRoom.roomNumber}`, 'Rooms');
      notify('Room Created', `Room ${newRoom.roomNumber} added to inventory.`);
      return { ok: true };
    },
    [rooms, logActivity, notify]
  );

  const updateRoom = useCallback(
    (id: string, data: Partial<Room>): { ok: boolean; error?: string } => {
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...data } : r)));
      if (data.roomNumber) {
        setBookings((prev) =>
          prev.map((b) => (b.roomId === id ? { ...b, roomNumber: data.roomNumber! } : b))
        );
      }
      logActivity(`Updated Room ${data.roomNumber || id}`, 'Rooms');
      notify('Room Updated', 'Room configuration saved.');
      return { ok: true };
    },
    [logActivity, notify]
  );

  const updateRoomStatus = useCallback(
    (id: string, status: RoomOperationalStatus) => {
      const rm = rooms.find((r) => r.id === id);
      setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      if (rm) {
        logActivity(`Changed Room ${rm.roomNumber} operational status to ${status}`, 'Rooms');
        notify('Room Status Updated', `Room ${rm.roomNumber} is now marked as ${status}.`);
      }
    },
    [rooms, logActivity, notify]
  );

  const deleteRoom = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const hasActiveBooking = bookings.some(
        (b) => b.roomId === id && (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Checked In')
      );
      if (hasActiveBooking) {
        return { ok: false, error: 'Cannot delete a room with active or upcoming reservations.' };
      }
      setRooms((prev) => prev.filter((r) => r.id !== id));
      notify('Room Deleted', 'Room removed from hotel inventory.', 'info');
      return { ok: true };
    },
    [bookings, notify]
  );

  // ---------------- GUESTS ----------------
  const createGuest = useCallback(
    (data: Omit<Guest, 'id' | 'createdAt'>): Guest => {
      const newGuest: Guest = {
        ...data,
        id: `GST-${1000 + guests.length + 1}`,
        createdAt: TODAY_STR,
      };
      setGuests((prev) => [newGuest, ...prev]);
      logActivity(`Registered guest profile ${newGuest.name}`, 'CRM');
      notify('Guest Profile Created', `${newGuest.name} has been added to Guest CRM.`);
      return newGuest;
    },
    [guests.length, logActivity, notify]
  );

  const updateGuest = useCallback(
    (id: string, data: Partial<Guest>) => {
      setGuests((prev) => prev.map((g) => (g.id === id ? { ...g, ...data } : g)));
      // Keep booking guest name/phone synced
      if (data.name || data.phone || data.email) {
        setBookings((prev) =>
          prev.map((b) =>
            b.guestId === id
              ? {
                  ...b,
                  guestName: data.name ?? b.guestName,
                  guestPhone: data.phone ?? b.guestPhone,
                  guestEmail: data.email ?? b.guestEmail,
                }
              : b
          )
        );
      }
      notify('Guest Updated', 'Guest CRM profile updated.');
    },
    [notify]
  );

  const deleteGuest = useCallback(
    (id: string): { ok: boolean; error?: string } => {
      const hasBookings = bookings.some((b) => b.guestId === id && b.bookingStatus !== 'Cancelled');
      if (hasBookings) {
        return { ok: false, error: 'Cannot delete a guest with active or historical booking records.' };
      }
      setGuests((prev) => prev.filter((g) => g.id !== id));
      notify('Guest Removed', 'Guest record deleted.', 'info');
      return { ok: true };
    },
    [bookings, notify]
  );

  // ---------------- BAR & POS / RESTAURANT ----------------
  const completeBarSale = useCallback(
    (
      tx: Omit<PosTransaction, 'id' | 'department' | 'dateTime' | 'date'>
    ): { ok: boolean; error?: string; transaction?: PosTransaction } => {
      if (!tx.items.length) {
        return { ok: false, error: 'Cart is empty.' };
      }
      if (tx.customerType === 'Hotel Guest' && !tx.roomId) {
        return { ok: false, error: 'Please select a valid guest room for a hotel guest transaction.' };
      }

      // Validate beverage stock
      for (const line of tx.items) {
        const bev = beverages.find((b) => b.id === line.itemId);
        if (!bev) {
          return { ok: false, error: `Beverage item ${line.name} not found.` };
        }
        if (bev.availableQuantity < line.quantity) {
          return {
            ok: false,
            error: `Insufficient stock for ${bev.name}. Available: ${bev.availableQuantity} ${bev.unit}(s).`,
          };
        }
      }

      const now = new Date();
      const timeStr = `${TODAY_STR} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const txId = `POS-${8800 + posTransactions.length + 1}`;

      const newTx: PosTransaction = {
        ...tx,
        id: txId,
        department: 'Bar & POS',
        dateTime: timeStr,
        date: TODAY_STR,
      };

      // Deduct stock once & create movements
      const newMovements: StockMovement[] = [];
      setBeverages((prev) =>
        prev.map((bev) => {
          const soldLine = tx.items.find((i) => i.itemId === bev.id);
          if (!soldLine) return bev;
          newMovements.push({
            id: `MOV-${Date.now()}-${bev.id}`,
            dateTime: timeStr,
            date: TODAY_STR,
            itemId: bev.id,
            itemName: bev.name,
            inventoryModule: 'Beverages',
            movementType: 'Bar/POS sale',
            quantity: soldLine.quantity,
            direction: 'OUT',
            unit: bev.unit,
            sourceOrDestination: `Bar Sale (${txId})`,
            relatedReferenceId: txId,
            responsibleUser: tx.responsibleStaff || 'Kemi Adebayo',
            branchId: tx.branchId,
            notes: `Sold to ${tx.guestName}`,
          });
          return {
            ...bev,
            availableQuantity: Math.max(0, bev.availableQuantity - soldLine.quantity),
          };
        })
      );

      setStockMovements((prev) => [...newMovements, ...prev]);
      setPosTransactions((prev) => [newTx, ...prev]);
      logActivity(`Completed Bar sale ${txId} (${tx.guestName})`, 'Bar & POS');
      notify('Sale Completed', `Transaction ${txId} recorded and stock deducted.`);
      return { ok: true, transaction: newTx };
    },
    [beverages, posTransactions.length, logActivity, notify]
  );

  const completeRestaurantOrder = useCallback(
    (
      tx: Omit<PosTransaction, 'id' | 'department' | 'dateTime' | 'date'>
    ): { ok: boolean; error?: string; transaction?: PosTransaction } => {
      if (!tx.items.length) {
        return { ok: false, error: 'Order cart is empty.' };
      }
      if (tx.customerType === 'Hotel Guest' && !tx.roomId) {
        return { ok: false, error: 'Please select a valid guest room for room service / guest charge.' };
      }

      // Calculate total food item requirements across cart (either direct foodIngredients or legacy menuItems)
      const requiredIngredients: Record<string, { qty: number; name: string; unit: string }> = {};
      for (const line of tx.items) {
        const directFood = foodIngredients.find((f) => f.id === line.itemId);
        if (directFood) {
          if (!requiredIngredients[directFood.id]) {
            requiredIngredients[directFood.id] = {
              qty: 0,
              name: directFood.name,
              unit: directFood.unit,
            };
          }
          requiredIngredients[directFood.id].qty = Number(
            (requiredIngredients[directFood.id].qty + line.quantity).toFixed(3)
          );
          continue;
        }
        const menu = menuItems.find((m) => m.id === line.itemId);
        if (menu) {
          for (const rec of menu.recipe) {
            const totalNeeded = Number((rec.quantity * line.quantity).toFixed(3));
            if (!requiredIngredients[rec.ingredientId]) {
              requiredIngredients[rec.ingredientId] = {
                qty: 0,
                name: rec.ingredientName,
                unit: rec.unit,
              };
            }
            requiredIngredients[rec.ingredientId].qty = Number(
              (requiredIngredients[rec.ingredientId].qty + totalNeeded).toFixed(3)
            );
          }
        }
      }

      // Validate food stock
      for (const [ingId, req] of Object.entries(requiredIngredients)) {
        const ing = foodIngredients.find((f) => f.id === ingId);
        if (ing && ing.availableQuantity < req.qty) {
          return {
            ok: false,
            error: `Insufficient stock for ${ing.name}: requires ${req.qty} ${req.unit}(s), but only ${ing.availableQuantity} available.`,
          };
        }
      }

      const now = new Date();
      const timeStr = `${TODAY_STR} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;
      const txId = `RES-${4400 + posTransactions.length + 1}`;

      const newTx: PosTransaction = {
        ...tx,
        id: txId,
        department: 'Kitchen & Restaurant',
        dateTime: timeStr,
        date: TODAY_STR,
      };

      const newMovements: StockMovement[] = [];
      setFoodIngredients((prev) =>
        prev.map((ing) => {
          const req = requiredIngredients[ing.id];
          if (!req) return ing;
          newMovements.push({
            id: `MOV-${Date.now()}-${ing.id}`,
            dateTime: timeStr,
            date: TODAY_STR,
            itemId: ing.id,
            itemName: ing.name,
            inventoryModule: 'Food',
            movementType: 'Kitchen ingredient consumption',
            quantity: req.qty,
            direction: 'OUT',
            unit: ing.unit,
            sourceOrDestination: `Kitchen Order (${txId})`,
            relatedReferenceId: txId,
            responsibleUser: tx.responsibleStaff || 'Chef Musa Ibrahim',
            branchId: tx.branchId,
            notes: `Recipe consumption for order ${txId}`,
          });
          return {
            ...ing,
            availableQuantity: Number(Math.max(0, ing.availableQuantity - req.qty).toFixed(2)),
          };
        })
      );

      setStockMovements((prev) => [...newMovements, ...prev]);
      setPosTransactions((prev) => [newTx, ...prev]);
      logActivity(`Completed Restaurant order ${txId} (${tx.guestName})`, 'Kitchen & Restaurant');
      notify('Order Completed', `Order ${txId} logged and recipe ingredients deducted.`);
      return { ok: true, transaction: newTx };
    },
    [foodIngredients, menuItems, posTransactions.length, logActivity, notify]
  );

  const updatePosTransactionPayment = useCallback(
    (id: string, amountPaid: number) => {
      setPosTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== id) return tx;
          const status =
            amountPaid >= tx.totalAmount
              ? 'Paid'
              : amountPaid > 0
              ? 'Partially Paid'
              : 'Unpaid';
          return { ...tx, amountPaid, paymentStatus: status };
        })
      );
      notify('Payment Updated', `Transaction ${id} payment status updated.`);
    },
    [notify]
  );

  const createMenuItem = useCallback(
    (item: Omit<MenuItem, 'id'>) => {
      const newItem: MenuItem = {
        ...item,
        id: `MNU-${menuItems.length + 10}`,
      };
      setMenuItems((prev) => [...prev, newItem]);
      notify('Menu Item Added', `${newItem.name} added to restaurant menu.`);
    },
    [menuItems.length, notify]
  );

  const updateMenuItem = useCallback(
    (id: string, data: Partial<MenuItem>) => {
      setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...data } : m)));
      notify('Menu Item Updated', 'Menu dish details saved.');
    },
    [notify]
  );

  // ---------------- LAUNDRY ----------------
  const createLaundryOrder = useCallback(
    (order: Omit<LaundryOrder, 'id' | 'garmentTag' | 'receivedDate'>): LaundryOrder => {
      const nextNum = 301 + laundryOrders.length;
      const newOrder: LaundryOrder = {
        ...order,
        id: `LND-${nextNum}`,
        garmentTag: `TAG-${String.fromCharCode(65 + (laundryOrders.length % 6))}${100 + laundryOrders.length * 7}`,
        receivedDate: TODAY_STR,
      };
      setLaundryOrders((prev) => [newOrder, ...prev]);
      logActivity(`Logged laundry order ${newOrder.id} for ${newOrder.customerName}`, 'Laundry');
      notify('Laundry Order Logged', `Order ${newOrder.id} (${newOrder.garmentTag}) created.`);
      return newOrder;
    },
    [laundryOrders.length, logActivity, notify]
  );

  const updateLaundryOrder = useCallback(
    (id: string, data: Partial<LaundryOrder>) => {
      setLaundryOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const updated = { ...o, ...data };
          if (data.workflowStatus === 'Ready for Collection' && !updated.readyDate) {
            updated.readyDate = TODAY_STR;
          }
          if (data.workflowStatus === 'Collected' && !updated.collectedDate) {
            updated.collectedDate = TODAY_STR;
          }
          return updated;
        })
      );
      notify('Laundry Order Updated', `Order ${id} changes saved.`);
    },
    [notify]
  );

  const updateLaundryStatus = useCallback(
    (id: string, status: LaundryWorkflowStatus) => {
      setLaundryOrders((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          return {
            ...o,
            workflowStatus: status,
            readyDate:
              status === 'Ready for Collection' || status === 'Collected'
                ? o.readyDate || TODAY_STR
                : o.readyDate,
            collectedDate: status === 'Collected' ? TODAY_STR : o.collectedDate,
          };
        })
      );
      logActivity(`Updated laundry order ${id} status to ${status}`, 'Laundry');
      notify('Workflow Updated', `Laundry order ${id} marked as ${status}.`);
    },
    [logActivity, notify]
  );

  const deleteLaundryOrder = useCallback(
    (id: string) => {
      setLaundryOrders((prev) => prev.filter((o) => o.id !== id));
      notify('Laundry Order Deleted', `Order ${id} removed.`, 'info');
    },
    [notify]
  );

  // ---------------- INVENTORY ----------------
  const createBeverage = useCallback(
    (item: Omit<BeverageItem, 'id'>) => {
      const newBev: BeverageItem = { ...item, id: `BEV-${Date.now().toString().slice(-4)}` };
      setBeverages((prev) => [newBev, ...prev]);
      notify('Beverage Added', `${newBev.name} added to beverage inventory.`);
    },
    [notify]
  );

  const updateBeverage = useCallback(
    (id: string, data: Partial<BeverageItem>) => {
      setBeverages((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
      notify('Beverage Updated', 'Beverage item details saved.');
    },
    [notify]
  );

  const deleteBeverage = useCallback(
    (id: string) => {
      setBeverages((prev) => prev.filter((b) => b.id !== id));
      notify('Beverage Removed', 'Item deleted from beverage inventory.', 'info');
    },
    [notify]
  );

  const createFoodIngredient = useCallback(
    (item: Omit<FoodIngredient, 'id'>) => {
      const newIng: FoodIngredient = { ...item, id: `FOOD-${Date.now().toString().slice(-4)}` };
      setFoodIngredients((prev) => [newIng, ...prev]);
      notify('Food Added', `${newIng.name} added to food inventory.`);
    },
    [notify]
  );

  const updateFoodIngredient = useCallback(
    (id: string, data: Partial<FoodIngredient>) => {
      setFoodIngredients((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)));
      notify('Food Updated', 'Food item details saved.');
    },
    [notify]
  );

  const deleteFoodIngredient = useCallback(
    (id: string) => {
      setFoodIngredients((prev) => prev.filter((f) => f.id !== id));
      notify('Food Removed', 'Item deleted from food inventory.', 'info');
    },
    [notify]
  );

  const createSupplyItem = useCallback(
    (item: Omit<SupplyItem, 'id'>) => {
      const newSup: SupplyItem = { ...item, id: `SUP-${Date.now().toString().slice(-4)}` };
      setSupplies((prev) => [newSup, ...prev]);
      notify('Supply Item Added', `${newSup.name} added to operating supplies.`);
    },
    [notify]
  );

  const updateSupplyItem = useCallback(
    (id: string, data: Partial<SupplyItem>) => {
      setSupplies((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      notify('Supply Item Updated', 'Supply item updated.');
    },
    [notify]
  );

  const deleteSupplyItem = useCallback(
    (id: string) => {
      setSupplies((prev) => prev.filter((s) => s.id !== id));
      notify('Supply Item Removed', 'Supply item removed.', 'info');
    },
    [notify]
  );

  const recordStockOperation = useCallback(
    (params: {
      inventoryModule: 'Beverages' | 'Food' | 'Supplies';
      itemId: string;
      movementType: StockMovementType;
      direction: 'IN' | 'OUT';
      quantity: number;
      sourceOrDestination: string;
      notes: string;
      responsibleUser?: string;
    }): { ok: boolean; error?: string } => {
      if (params.quantity <= 0) {
        return { ok: false, error: 'Quantity must be greater than zero.' };
      }

      const now = new Date();
      const timeStr = `${TODAY_STR} ${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      if (params.inventoryModule === 'Beverages') {
        const item = beverages.find((b) => b.id === params.itemId);
        if (!item) return { ok: false, error: 'Beverage item not found.' };
        if (params.direction === 'OUT' && item.availableQuantity < params.quantity) {
          return {
            ok: false,
            error: `Cannot deduct ${params.quantity} ${item.unit}. Only ${item.availableQuantity} available.`,
          };
        }
        const nextQty =
          params.direction === 'IN'
            ? item.availableQuantity + params.quantity
            : item.availableQuantity - params.quantity;
        setBeverages((prev) =>
          prev.map((b) => (b.id === item.id ? { ...b, availableQuantity: nextQty } : b))
        );
        const mov: StockMovement = {
          id: `MOV-${9000 + stockMovements.length + 1}`,
          dateTime: timeStr,
          date: TODAY_STR,
          itemId: item.id,
          itemName: item.name,
          inventoryModule: 'Beverages',
          movementType: params.movementType,
          quantity: params.quantity,
          direction: params.direction,
          unit: item.unit,
          sourceOrDestination: params.sourceOrDestination,
          responsibleUser: params.responsibleUser || 'Seyi Makinde',
          branchId: item.branchId,
          notes: params.notes,
        };
        setStockMovements((prev) => [mov, ...prev]);
        notify('Stock Updated', `${item.name}: ${params.direction === 'IN' ? '+' : '-'}${params.quantity} ${item.unit} (${params.movementType}).`);
        return { ok: true };
      }

      if (params.inventoryModule === 'Food') {
        const item = foodIngredients.find((f) => f.id === params.itemId);
        if (!item) return { ok: false, error: 'Food ingredient not found.' };
        if (params.direction === 'OUT' && item.availableQuantity < params.quantity) {
          return {
            ok: false,
            error: `Cannot deduct ${params.quantity} ${item.unit}. Only ${item.availableQuantity} available.`,
          };
        }
        const nextQty = Number(
          (params.direction === 'IN'
            ? item.availableQuantity + params.quantity
            : item.availableQuantity - params.quantity
          ).toFixed(2)
        );
        setFoodIngredients((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, availableQuantity: nextQty } : f))
        );
        const mov: StockMovement = {
          id: `MOV-${9000 + stockMovements.length + 1}`,
          dateTime: timeStr,
          date: TODAY_STR,
          itemId: item.id,
          itemName: item.name,
          inventoryModule: 'Food',
          movementType: params.movementType,
          quantity: params.quantity,
          direction: params.direction,
          unit: item.unit,
          sourceOrDestination: params.sourceOrDestination,
          responsibleUser: params.responsibleUser || 'Seyi Makinde',
          branchId: item.branchId,
          notes: params.notes,
        };
        setStockMovements((prev) => [mov, ...prev]);
        notify('Ingredient Stock Updated', `${item.name}: ${params.direction === 'IN' ? '+' : '-'}${params.quantity} ${item.unit}.`);
        return { ok: true };
      }

      const item = supplies.find((s) => s.id === params.itemId);
      if (!item) return { ok: false, error: 'Supply item not found.' };
      if (params.direction === 'OUT' && item.availableQuantity < params.quantity) {
        return {
          ok: false,
          error: `Cannot deduct ${params.quantity} ${item.unit}. Only ${item.availableQuantity} available.`,
        };
      }
      const nextQty =
        params.direction === 'IN'
          ? item.availableQuantity + params.quantity
          : item.availableQuantity - params.quantity;
      setSupplies((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, availableQuantity: nextQty } : s))
      );
      const mov: StockMovement = {
        id: `MOV-${9000 + stockMovements.length + 1}`,
        dateTime: timeStr,
        date: TODAY_STR,
        itemId: item.id,
        itemName: item.name,
        inventoryModule: 'Supplies',
        movementType: params.movementType,
        quantity: params.quantity,
        direction: params.direction,
        unit: item.unit,
        sourceOrDestination: params.sourceOrDestination,
        responsibleUser: params.responsibleUser || 'Seyi Makinde',
        branchId: item.branchId,
        notes: params.notes,
      };
      setStockMovements((prev) => [mov, ...prev]);
      notify('Supplies Stock Updated', `${item.name}: ${params.direction === 'IN' ? '+' : '-'}${params.quantity} ${item.unit}.`);
      return { ok: true };
    },
    [beverages, foodIngredients, supplies, stockMovements.length, notify]
  );

  // ---------------- EXPENSES ----------------
  const createExpense = useCallback(
    (exp: Omit<Expense, 'id' | 'reference'>) => {
      const nextNum = 81 + expenses.length;
      const newExp: Expense = {
        ...exp,
        id: `EXP-${701 + expenses.length}`,
        reference: `EXP-2026-0${nextNum}`,
      };
      setExpenses((prev) => [newExp, ...prev]);
      logActivity(`Logged expense ${newExp.reference} (${newExp.description})`, 'Expenses');
      notify('Expense Recorded', `Expense ${newExp.reference} has been created.`);
    },
    [expenses.length, logActivity, notify]
  );

  const updateExpense = useCallback(
    (id: string, data: Partial<Expense>) => {
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
      notify('Expense Updated', 'Expense record updated.');
    },
    [notify]
  );

  const updateExpenseStatus = useCallback(
    (id: string, status: ExpenseStatus) => {
      setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      logActivity(`Marked expense ${id} as ${status}`, 'Expenses');
      notify('Expense Status Changed', `Expense is now ${status}.`);
    },
    [logActivity, notify]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      notify('Expense Deleted', 'Expense entry removed.', 'info');
    },
    [notify]
  );

  const saveExpenseCategories = useCallback(
    (configs: ExpenseCategoryConfig[], renamedMap?: Record<string, string>) => {
      setSettings((prev) => ({
        ...prev,
        expenseCategoryConfigs: configs,
        expenseCategories: configs.map((c) => c.name),
      }));
      if (renamedMap && Object.keys(renamedMap).length > 0) {
        setExpenses((prev) =>
          prev.map((exp) =>
            renamedMap[exp.category] ? { ...exp, category: renamedMap[exp.category] } : exp
          )
        );
      }
      logActivity('Updated expense categories and color mappings', 'Expenses');
      notify('Categories Saved', 'Expense categories and colors have been updated.');
    },
    [logActivity, notify]
  );

  const saveSupplyCategories = useCallback(
    (categories: string[], renamedMap?: Record<string, string>) => {
      setSettings((prev) => ({
        ...prev,
        supplyCategories: categories,
      }));
      if (renamedMap && Object.keys(renamedMap).length > 0) {
        setSupplies((prev) =>
          prev.map((sup) =>
            renamedMap[sup.category] ? { ...sup, category: renamedMap[sup.category] } : sup
          )
        );
      }
      logActivity('Updated Stock Keeper categories', 'Stock Keeper');
      notify('Categories Updated', 'Stock Keeper categories saved.');
    },
    [logActivity, notify]
  );

  // ---------------- ADMINISTRATION ----------------
  const createStaff = useCallback(
    (member: Omit<StaffMember, 'id' | 'lastActivity'>) => {
      const newStaff: StaffMember = {
        ...member,
        id: `STF-0${staff.length + 1}`,
        lastActivity: `${TODAY_STR} 09:00`,
      };
      setStaff((prev) => [newStaff, ...prev]);
      logActivity(`Created staff profile for ${newStaff.name} (${newStaff.role})`, 'Staff');
      notify('Staff Member Added', `${newStaff.name} added as ${newStaff.role}.`);
    },
    [staff.length, logActivity, notify]
  );

  const updateStaff = useCallback(
    (id: string, data: Partial<StaffMember>) => {
      setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
      notify('Staff Updated', 'Staff profile updated.');
    },
    [notify]
  );

  const deleteStaff = useCallback(
    (id: string) => {
      setStaff((prev) => prev.filter((s) => s.id !== id));
      notify('Staff Removed', 'Staff member removed.', 'info');
    },
    [notify]
  );

  const toggleRolePermission = useCallback(
    (role: StaffRole, action: PermissionAction) => {
      setRolePermissions((prev) =>
        prev.map((rp) =>
          rp.role === role
            ? {
                ...rp,
                permissions: {
                  ...rp.permissions,
                  [action]: !rp.permissions[action],
                },
              }
            : rp
        )
      );
      notify('Permission Updated', `Updated ${action} permission for ${role}.`, 'info');
    },
    [notify]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<HotelSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      logActivity('Updated hotel configuration settings', 'Hotel Settings');
      notify('Settings Saved', 'Hotel configuration has been updated.');
    },
    [logActivity, notify]
  );

  const resetSettings = useCallback(() => {
    setSettings(INITIAL_SETTINGS);
    notify('Settings Reset', 'Hotel settings restored to defaults.', 'info');
  }, [notify]);

  const toggleOptionalModule = useCallback(
    (id: string) => {
      setOptionalModules((prev) =>
        prev.map((m) => {
          if (m.id !== id || !m.canToggle) return m;
          const nextStatus = m.status === 'Enabled' ? 'Disabled' : 'Enabled';
          notify('Module State Updated', `${m.name} is now ${nextStatus}.`);
          return { ...m, status: nextStatus };
        })
      );
    },
    [notify]
  );

  return (
    <HotelContext.Provider
      value={{
        branches,
        selectedBranchId,
        setSelectedBranchId,
        globalDateFilter,
        setGlobalDateFilter,
        roomTypes,
        rooms,
        guests,
        bookings,
        beverages,
        foodIngredients,
        menuItems,
        supplies,
        stockMovements,
        posTransactions,
        laundryOrders,
        expenses,
        staff,
        currentUser,
        setCurrentUserId,
        rolePermissions,
        staffActivity,
        settings,
        optionalModules,
        toasts,
        notify,
        dismissToast,
        createBooking,
        updateBooking,
        deleteBooking,
        createRoomType,
        updateRoomType,
        deleteRoomType,
        createRoom,
        updateRoom,
        updateRoomStatus,
        deleteRoom,
        createGuest,
        updateGuest,
        deleteGuest,
        completeBarSale,
        completeRestaurantOrder,
        updatePosTransactionPayment,
        createMenuItem,
        updateMenuItem,
        createLaundryOrder,
        updateLaundryOrder,
        updateLaundryStatus,
        deleteLaundryOrder,
        createBeverage,
        updateBeverage,
        deleteBeverage,
        createFoodIngredient,
        updateFoodIngredient,
        deleteFoodIngredient,
        createSupplyItem,
        updateSupplyItem,
        deleteSupplyItem,
        recordStockOperation,
        createExpense,
        updateExpense,
        updateExpenseStatus,
        deleteExpense,
        saveExpenseCategories,
        saveSupplyCategories,
        createStaff,
        updateStaff,
        deleteStaff,
        toggleRolePermission,
        updateSettings,
        resetSettings,
        toggleOptionalModule,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
};

export function useHotel() {
  const ctx = useContext(HotelContext);
  if (!ctx) throw new Error('useHotel must be used within HotelProvider');
  return ctx;
}
