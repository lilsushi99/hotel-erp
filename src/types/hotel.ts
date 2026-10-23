export type DateFilterPreset = 'today' | 'last7' | 'last30' | 'month' | 'custom';

export interface DateRangeFilter {
  preset: DateFilterPreset;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export type RoomOperationalStatus = 'Available' | 'Occupied' | 'Cleaning' | 'Maintenance';

export interface RoomType {
  id: string;
  name: string;
  description: string;
  defaultRate: number;
  capacity: number;
  amenities: string[];
  roomCount?: number;
}

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId: string;
  branchId: string;
  floor: string;
  status: RoomOperationalStatus;
  rate: number;
  capacity: number;
  notes: string;
}

export type BookingStatus = 'Confirmed' | 'Checked In' | 'Checked Out' | 'Pending' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
export type PaymentMethod = 'Card' | 'Bank Transfer' | 'Cash' | 'POS Terminal' | 'Room Charge';

export interface Booking {
  id: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  guestSecondaryPhone?: string;
  guestEmail?: string;
  guestAddress?: string;
  roomId: string;
  roomNumber: string;
  roomTypeId: string;
  branchId: string;
  checkInDate: string; // YYYY-MM-DD
  checkInTime: string; // HH:mm
  checkOutDate: string; // YYYY-MM-DD
  checkOutTime: string; // HH:mm
  nights: number;
  roomRate: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  notes: string;
  createdAt: string;
}

export type GuestType = 'VIP' | 'Corporate' | 'Regular' | 'New';
export type GuestStatus = 'Active' | 'Checked In' | 'Inactive';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  secondaryPhone?: string;
  email: string;
  address: string;
  guestType: GuestType;
  status: GuestStatus;
  notes: string;
  createdAt: string;
}

export interface BeverageItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: 'Bottle' | 'Can' | 'Glass' | 'Pack' | 'Crate';
  purchaseCost: number;
  sellingPrice: number;
  availableQuantity: number;
  reorderThreshold: number;
  supplier: string;
  storageLocation: string;
  branchId: string;
}

export interface FoodIngredient {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: 'Portion' | 'Plate' | 'Pack' | 'Piece' | 'Bowl' | 'kg' | 'g' | 'L' | 'mL' | 'pack' | 'pcs';
  purchaseCost: number;
  sellingPrice: number;
  availableQuantity: number;
  reorderLevel: number;
  expiryDate: string;
  supplier: string;
  storageLocation: string;
  branchId: string;
}

export interface RecipeIngredientUsage {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
}

export interface MenuItem {
  id: string;
  name: string;
  sku: string;
  category: 'Starters' | 'Main Courses' | 'Grills & Seafood' | 'Sides & Pasta' | 'Desserts';
  price: number;
  prepTimeMinutes: number;
  availableModifiers: { name: string; price: number }[];
  recipe: RecipeIngredientUsage[];
  description: string;
}

export interface SupplyItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  purchaseCost: number;
  availableQuantity: number;
  reorderLevel: number;
  supplier: string;
  storageLocation: string;
  notes?: string;
  branchId: string;
}

export type StockMovementType =
  | 'Stock received'
  | 'Bar/POS sale'
  | 'Kitchen ingredient consumption'
  | 'Housekeeping usage'
  | 'Laundry usage'
  | 'Waste'
  | 'Adjustment'
  | 'Physical Count'
  | 'Transfer between locations';

export interface StockMovement {
  id: string;
  dateTime: string; // YYYY-MM-DD HH:mm
  date: string;     // YYYY-MM-DD
  itemId: string;
  itemName: string;
  inventoryModule: 'Beverages' | 'Food' | 'Supplies';
  movementType: StockMovementType;
  quantity: number; // positive for received/addition, negative or unsigned with direction
  direction: 'IN' | 'OUT';
  unit: string;
  sourceOrDestination: string;
  relatedReferenceId?: string;
  responsibleUser: string;
  branchId: string;
  notes: string;
}

export interface PosOrderItem {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers?: string[];
  subtotal: number;
}

export interface PosTransaction {
  id: string;
  department: 'Bar & POS' | 'Kitchen & Restaurant';
  dateTime: string;
  date: string;
  customerType: 'Hotel Guest' | 'Walk-in';
  guestId?: string;
  guestName: string;
  roomId?: string;
  roomNumber?: string;
  tableOrBarArea?: string;
  items: PosOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: 'Completed' | 'In Kitchen' | 'Ready' | 'Served';
  responsibleStaff: string;
  branchId: string;
  notes?: string;
}

export type LaundryWorkflowStatus =
  | 'Received'
  | 'Washing'
  | 'Drying'
  | 'Ironing'
  | 'Ready for Collection'
  | 'Collected';

export type LaundryServiceType =
  | 'Washing'
  | 'Ironing'
  | 'Washing & Ironing'
  | 'Dry Cleaning'
  | 'Starching'
  | 'Wash & Iron'
  | 'Dry Clean'
  | 'Express Press'
  | 'Stain Treatment'
  | 'Wash Only'
  | 'Iron Only';

export interface LaundryGarmentItem {
  id: string;
  garmentType: string;
  serviceType: LaundryServiceType;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface LaundryOrder {
  id: string;
  garmentTag: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  guestId?: string;
  roomNumber?: string;
  garments: LaundryGarmentItem[];
  subtotal: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  receivedDate: string;
  promisedDate: string;
  readyDate?: string;
  collectedDate?: string;
  workflowStatus: LaundryWorkflowStatus;
  storageLocation: string;
  branchId: string;
  notes: string;
}

export type ExpenseStatus = 'Approved' | 'Pending' | 'Rejected';

export interface ExpenseCategoryConfig {
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  reference: string;
  description: string;
  category: string;
  department?: string;
  branchId: string;
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  responsibleStaff: string;
  notes: string;
}

export type StaffRole =
  | 'Administrator'
  | 'Manager'
  | 'Supervisor'
  | 'Front Desk'
  | 'Accountant'
  | 'Inventory Officer'
  | 'Housekeeping'
  | 'Bar Staff'
  | 'Restaurant Staff'
  | 'Laundry Staff';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  jobTitle?: string;
  department: string;
  branchId: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive' | 'On Shift';
  lastActivity: string;
}

export type PermissionAction = 'View' | 'Create' | 'Edit' | 'Delete' | 'Approve' | 'Manage Settings';

export interface RolePermissionConfig {
  role: StaffRole;
  description: string;
  permissions: Record<PermissionAction, boolean>;
  modulesAccess: string[];
}

export interface StaffActivityLog {
  id: string;
  staffName: string;
  role: StaffRole;
  action: string;
  module: string;
  timestamp: string;
}

export interface HotelSettings {
  hotelName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  currencySymbol: string;
  currencyCode: string;
  timezone: string;
  dateFormat: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MMM D, YYYY';
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  allowUnpaidReservations: boolean;
  autoAssignCleaningOnCheckout: boolean;
  defaultTaxRatePercent: number;
  lowStockNotificationEnabled: boolean;
  lowStockDefaultThreshold?: number;
  lowStockBeveragesFoodEnabled?: boolean;
  lowStockStoreKeeperEnabled?: boolean;
  overduePaymentAlertEnabled?: boolean;
  overduePaymentThresholdAmount?: number;
  alertUnpaidBookings?: boolean;
  alertUnpaidBarPos?: boolean;
  alertUnpaidRestaurant?: boolean;
  alertUnpaidLaundry?: boolean;
  uncollectedLaundryAlertEnabled?: boolean;
  uncollectedLaundryThresholdDays?: number;
  overdueCheckoutAlertMinutes: number;
  soundNotificationsEnabled?: boolean;
  numberFormat?: 'full' | 'compact';
  accentColor?: string;
  paymentMethods: PaymentMethod[];
  expenseCategories: string[];
  expenseCategoryConfigs?: ExpenseCategoryConfig[];
  supplyCategories?: string[];
  sidebarStyle?: 'standard' | 'ribcage';
  sidebarNavigationMode?: 'full' | 'collapsed';
}

export interface OptionalModule {
  id: string;
  name: string;
  category: 'Operations' | 'Guest Experience' | 'Hardware & IoT' | 'External Integrations';
  description: string;
  status: 'Enabled' | 'Disabled' | 'Future Integration';
  version: string;
  canToggle: boolean;
}

export interface Branch {
  id: string;
  name: string;
  city: string;
}
