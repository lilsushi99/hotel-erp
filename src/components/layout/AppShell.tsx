import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  BedDouble,
  Users,
  Wine,
  UtensilsCrossed,
  Shirt,
  Archive,
  Package,
  ShoppingBasket,
  Boxes,
  Receipt,
  PieChart,
  UserCog,
  Settings,
  Blocks,
  Bell,
  Search,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  Building2,
  Folder,
  LogOut,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  BarChart3,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { formatCurrency, getInventoryHealthStatus, TODAY_STR } from '../../utils/formatters';

interface NavGroup {
  label: string;
  items: {
    label: string;
    path: string;
    icon: React.FC<{ className?: string }>;
    moduleId?: string;
  }[];
}

interface GlobalSearchResult {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  path: string;
  badge?: string;
}

const SEARCHABLE_DESTINATIONS: Array<{
  title: string;
  subtitle: string;
  path: string;
  keywords: string[];
}> = [
  {
    title: 'Overview Dashboard',
    subtitle: 'Command Center · KPIs, Revenue Trend & Operational Alerts',
    path: '/overview',
    keywords: ['overview', 'dashboard', 'home', 'command center'],
  },
  {
    title: 'Bookings & Reservations',
    subtitle: 'Hotel Operations · Bookings, Check-in & Timeline View',
    path: '/bookings',
    keywords: ['bookings', 'reservations', 'check-in', 'check-out', 'timeline'],
  },
  {
    title: 'Rooms & Pricing',
    subtitle: 'Hotel Operations · Room Inventory, Statuses & Pricing',
    path: '/rooms',
    keywords: ['rooms', 'rooms & pricing', 'pricing', 'categories', 'cleaning', 'maintenance'],
  },
  {
    title: 'Customer Management (CRM)',
    subtitle: 'Hotel Operations · Customer Profiles, Spend & Stay History',
    path: '/guests',
    keywords: ['customer management', 'customer crm', 'guests', 'crm', 'customers'],
  },
  {
    title: 'Hotel Operations Reports',
    subtitle: 'Hotel Operations · Room Type Performance & Booking Summary Report',
    path: '/hotel-operations/reports',
    keywords: ['reports', 'hotel operations reports', 'booking report', 'room type report'],
  },
  {
    title: 'Bar & POS',
    subtitle: 'Sales & Services · Beverage POS Terminal & Bar Sales Ledger',
    path: '/sales/bar-pos',
    keywords: ['bar', 'bar & pos', 'pos', 'drinks', 'bar sales ledger'],
  },
  {
    title: 'Kitchen & Restaurant',
    subtitle: 'Sales & Services · Restaurant Menu POS & Kitchen Order Ledger',
    path: '/sales/kitchen-restaurant',
    keywords: ['kitchen', 'kitchen & restaurant', 'restaurant', 'dining', 'menu'],
  },
  {
    title: 'Sales & Services Reports',
    subtitle: 'Sales & Services · Combined Bar & Restaurant Sales Summary Report',
    path: '/sales/reports',
    keywords: ['reports', 'sales reports', 'sales & services reports', 'pos report', 'restaurant report'],
  },
  {
    title: 'Laundry Logger',
    subtitle: 'Laundry · Log Garment Orders & Workflow Progress',
    path: '/laundry/logger',
    keywords: ['laundry', 'laundry logger', 'garments', 'washing', 'ironing'],
  },
  {
    title: 'Laundry Storage',
    subtitle: 'Laundry · Awaiting Collection & Collected Garments',
    path: '/laundry/storage',
    keywords: ['storage', 'laundry storage', 'awaiting collection', 'collected'],
  },
  {
    title: 'Laundry CRM',
    subtitle: 'Laundry · Laundry Customer Profiles & Order History',
    path: '/laundry/crm',
    keywords: ['laundry crm', 'laundry customers', 'crm'],
  },
  {
    title: 'Beverages',
    subtitle: 'Inventory · Beverage Stock & Pricing',
    path: '/inventory/beverages',
    keywords: ['beverages', 'beverage inventory', 'drinks', 'wine'],
  },
  {
    title: 'Food Inventory',
    subtitle: 'Inventory · Kitchen Food Stock & Portions',
    path: '/inventory/food',
    keywords: ['food inventory', 'food', 'kitchen stock', 'dishes'],
  },
  {
    title: 'Store Keeper',
    subtitle: 'Inventory · Departmental Supplies & Stock Items',
    path: '/inventory/supplies',
    keywords: ['store keeper', 'stock keeper', 'supplies', 'housekeeping', 'store'],
  },
  {
    title: 'Expenses',
    subtitle: 'Finance & Intelligence · Operational Expense Ledger & Categories',
    path: '/finance/expenses',
    keywords: ['expenses', 'expenditure', 'costs'],
  },
  {
    title: 'Financial Reports',
    subtitle: 'Finance & Intelligence · Revenue vs Expenses & Departmental P&L',
    path: '/finance/reports',
    keywords: ['financial reports', 'finance', 'accounting', 'profit'],
  },
  {
    title: 'Staff & Permissions',
    subtitle: 'Administration · Staff Directory, Roles & Access Control',
    path: '/admin/staff',
    keywords: ['staff', 'staff & permissions', 'permissions', 'roles', 'employees'],
  },
  {
    title: 'Hotel Settings',
    subtitle: 'Administration · Hotel Profile, Currency & Operational Rules',
    path: '/admin/settings',
    keywords: ['hotel settings', 'settings', 'configuration', 'preferences'],
  },
  {
    title: 'Operational Modules',
    subtitle: 'Administration · Optional System Modules & Extensions',
    path: '/admin/optional-modules',
    keywords: ['operational modules', 'modules', 'extensions'],
  },
];

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Command Center',
    items: [{ label: 'Overview', path: '/overview', icon: LayoutDashboard }],
  },
  {
    label: 'Hotel Operations',
    items: [
      {
        label: 'Bookings',
        path: '/bookings',
        icon: CalendarCheck,
        moduleId: 'MOD-HOTEL-OPS',
      },
      {
        label: 'Rooms & Pricing',
        path: '/rooms',
        icon: BedDouble,
        moduleId: 'MOD-HOTEL-OPS',
      },
      {
        label: 'Customer Management',
        path: '/guests',
        icon: Users,
        moduleId: 'MOD-HOTEL-OPS',
      },
      {
        label: 'Reports',
        path: '/hotel-operations/reports',
        icon: FileSpreadsheet,
        moduleId: 'MOD-HOTEL-OPS',
      },
    ],
  },
  {
    label: 'Sales & Services',
    items: [
      {
        label: 'Bar & POS',
        path: '/sales/bar-pos',
        icon: Wine,
        moduleId: 'MOD-BAR-POS',
      },
      {
        label: 'Kitchen & Restaurant',
        path: '/sales/kitchen-restaurant',
        icon: UtensilsCrossed,
        moduleId: 'MOD-KITCHEN-RES',
      },
      {
        label: 'Reports',
        path: '/sales/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    label: 'Laundry',
    items: [
      {
        label: 'Laundry Logger',
        path: '/laundry/logger',
        icon: Shirt,
        moduleId: 'MOD-LAUNDRY',
      },
      {
        label: 'Storage',
        path: '/laundry/storage',
        icon: Archive,
        moduleId: 'MOD-LAUNDRY',
      },
      {
        label: 'Laundry CRM',
        path: '/laundry/crm',
        icon: Users,
        moduleId: 'MOD-LAUNDRY',
      },
    ],
  },
  {
    label: 'Inventory',
    items: [
      {
        label: 'Beverages',
        path: '/inventory/beverages',
        icon: Package,
        moduleId: 'MOD-BAR-POS',
      },
      {
        label: 'Food Inventory',
        path: '/inventory/food',
        icon: ShoppingBasket,
        moduleId: 'MOD-KITCHEN-RES',
      },
      { label: 'Store Keeper', path: '/inventory/supplies', icon: Boxes },
    ],
  },
  {
    label: 'Finance & Intelligence',
    items: [
      { label: 'Expenses', path: '/finance/expenses', icon: Receipt },
      { label: 'Financial Reports', path: '/finance/reports', icon: PieChart },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Staff & Permissions', path: '/admin/staff', icon: UserCog },
      { label: 'Hotel Settings', path: '/admin/settings', icon: Settings },
      {
        label: 'Operational Modules',
        path: '/admin/optional-modules',
        icon: Blocks,
      },
    ],
  },
];

export interface OperationalAlertItem {
  id: string;
  title: string;
  detail: string;
  severity: 'High' | 'Medium' | 'Low';
  category: string;
  path: string;
}

function computeAccentPalette(rawHex?: string) {
  const clean = (rawHex || '#7463A6').trim();
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(clean);
  const hex = isValid ? clean : '#7463A6';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const hoverHex = `#${toHex(r * 0.85)}${toHex(g * 0.85)}${toHex(b * 0.85)}`;
  const softHex = `#${toHex(r * 0.1 + 255 * 0.9)}${toHex(g * 0.1 + 255 * 0.9)}${toHex(b * 0.1 + 255 * 0.9)}`;
  const borderHex = `#${toHex(r * 0.28 + 255 * 0.72)}${toHex(g * 0.28 + 255 * 0.72)}${toHex(b * 0.28 + 255 * 0.72)}`;

  return { hex, hoverHex, softHex, borderHex, rgb: `${r}, ${g}, ${b}` };
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    selectedBranchId,
    settings,
    optionalModules,
    toasts,
    dismissToast,
    notify,
    beverages,
    foodIngredients,
    supplies,
    expenses,
    bookings,
    posTransactions,
    laundryOrders,
    guests,
    rooms,
    roomTypes,
    staff,
    currentUser,
    setCurrentUserId,
    canAccessRoute,
  } = useHotel();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);
  const [showFullAlertsDrawer, setShowFullAlertsDrawer] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const accentPalette = useMemo(
    () => computeAccentPalette(settings.accentColor),
    [settings.accentColor]
  );

  useEffect(() => {
    const handleOpenAlerts = () => {
      setShowAlertsPopover(false);
      setShowFullAlertsDrawer(true);
    };
    window.addEventListener('lumina:open-alerts', handleOpenAlerts);
    return () => window.removeEventListener('lumina:open-alerts', handleOpenAlerts);
  }, []);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlertsPopover(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const isModuleEnabled = (moduleId?: string) => {
    if (!moduleId) return true;
    const mod = optionalModules.find((m) => m.id === moduleId);
    return mod ? mod.status === 'Enabled' : true;
  };

  const visibleNavGroups = useMemo(() => {
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => isModuleEnabled(item.moduleId) && canAccessRoute(item.path)
      ),
    })).filter((group) => group.items.length > 0);
  }, [optionalModules, canAccessRoute]);

  const isCollapsedNavMode = settings.sidebarNavigationMode === 'collapsed';
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      initial[g.label] = settings.sidebarNavigationMode !== 'collapsed';
    });
    return initial;
  });

  useEffect(() => {
    const next: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => {
      next[g.label] = settings.sidebarNavigationMode !== 'collapsed';
    });
    setExpandedGroups(next);
  }, [settings.sidebarNavigationMode]);

  const toggleGroupExpand = (label: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // Consolidated live operational alerts list respecting HotelSettings notification toggles
  const allAlertItems = useMemo<OperationalAlertItem[]>(() => {
    const list: OperationalAlertItem[] = [];
    const allowOverduePayments = settings.overduePaymentAlertEnabled !== false;
    const allowBookingsAlert = allowOverduePayments && settings.alertUnpaidBookings !== false;
    const allowBarPosAlert = allowOverduePayments && settings.alertUnpaidBarPos !== false;
    const allowRestaurantAlert = allowOverduePayments && settings.alertUnpaidRestaurant !== false;
    const allowLaundryUnpaidAlert = allowOverduePayments && settings.alertUnpaidLaundry !== false;
    const allowUncollectedLaundryAlert = settings.uncollectedLaundryAlertEnabled !== false;
    const uncollectedThresholdDays = settings.uncollectedLaundryThresholdDays ?? 3;
    const allowLowStock = settings.lowStockNotificationEnabled !== false;
    const allowBevFoodLowStock = allowLowStock && settings.lowStockBeveragesFoodEnabled !== false;
    const allowStoreKeeperLowStock = allowLowStock && settings.lowStockStoreKeeperEnabled !== false;

    if (isModuleEnabled('MOD-HOTEL-OPS')) {
      if (allowBookingsAlert) {
        bookings
          .filter(
            (b) =>
              (selectedBranchId === 'ALL' || b.branchId === selectedBranchId) &&
              b.bookingStatus !== 'Cancelled' &&
              b.paymentStatus !== 'Paid'
          )
          .forEach((b) => {
            const bal = Math.max(0, b.totalAmount - b.amountPaid);
            list.push({
              id: `ALT-BKG-${b.id}`,
              title: `Unpaid Booking (${b.id})`,
              detail: `${b.guestName} · Room ${b.roomNumber} · ${formatCurrency(bal > 0 ? bal : b.totalAmount, settings.currencySymbol)} unpaid`,
              severity: b.bookingStatus === 'Checked In' ? 'High' : 'Medium',
              category: 'Bookings',
              path: '/bookings',
            });
          });
      }

      rooms
        .filter(
          (r) =>
            (selectedBranchId === 'ALL' || r.branchId === selectedBranchId) &&
            (r.status === 'Maintenance' || r.status === 'Cleaning')
        )
        .forEach((r) => {
          list.push({
            id: `ALT-RM-${r.id}`,
            title: `Room ${r.roomNumber} — ${r.status}`,
            detail: `${r.floor} · Currently marked ${r.status}`,
            severity: r.status === 'Maintenance' ? 'High' : 'Low',
            category: 'Rooms',
            path: '/rooms',
          });
        });
    }

    posTransactions
      .filter(
        (tx) =>
          (selectedBranchId === 'ALL' || tx.branchId === selectedBranchId) &&
          tx.paymentStatus !== 'Paid'
      )
      .forEach((tx) => {
        if (tx.department === 'Bar & POS') {
          if (!isModuleEnabled('MOD-BAR-POS') || !allowBarPosAlert) return;
        }
        if (tx.department === 'Kitchen & Restaurant') {
          if (!isModuleEnabled('MOD-KITCHEN-RES') || !allowRestaurantAlert) return;
        }
        const unpaidAmt = Math.max(0, tx.totalAmount - tx.amountPaid);
        list.push({
          id: `ALT-POS-${tx.id}`,
          title: `Unpaid ${tx.department === 'Bar & POS' ? 'Bar Invoice' : 'Kitchen Order'} (${tx.id})`,
          detail: `${tx.guestName}${tx.roomNumber ? ` · Room ${tx.roomNumber}` : ''} · ${formatCurrency(unpaidAmt > 0 ? unpaidAmt : tx.totalAmount, settings.currencySymbol)}`,
          severity: 'High',
          category: tx.department,
          path: tx.department === 'Bar & POS' ? '/sales/bar-pos' : '/sales/kitchen-restaurant',
        });
      });

    if (isModuleEnabled('MOD-BAR-POS') && allowBevFoodLowStock) {
      beverages
        .filter(
          (b) =>
            (selectedBranchId === 'ALL' || b.branchId === selectedBranchId) &&
            getInventoryHealthStatus(b.availableQuantity, b.reorderThreshold) !== 'In Stock'
        )
        .forEach((b) => {
          list.push({
            id: `ALT-BEV-${b.id}`,
            title: `${b.availableQuantity === 0 ? 'Out of Stock' : 'Low Stock'}: ${b.name}`,
            detail: `${b.availableQuantity} ${b.unit}(s) left (min ${b.reorderThreshold})`,
            severity: b.availableQuantity === 0 ? 'High' : 'Medium',
            category: 'Beverages',
            path: '/inventory/beverages',
          });
        });
    }

    if (isModuleEnabled('MOD-KITCHEN-RES') && allowBevFoodLowStock) {
      foodIngredients
        .filter(
          (f) =>
            (selectedBranchId === 'ALL' || f.branchId === selectedBranchId) &&
            getInventoryHealthStatus(f.availableQuantity, f.reorderLevel) !== 'In Stock'
        )
        .forEach((f) => {
          list.push({
            id: `ALT-FD-${f.id}`,
            title: `${f.availableQuantity === 0 ? 'Out of Stock' : 'Low Stock'}: ${f.name}`,
            detail: `${f.availableQuantity} ${f.unit}(s) left (min ${f.reorderLevel})`,
            severity: f.availableQuantity === 0 ? 'High' : 'Medium',
            category: 'Food Inventory',
            path: '/inventory/food',
          });
        });
    }

    if (allowStoreKeeperLowStock) {
      supplies
        .filter(
          (s) =>
            (selectedBranchId === 'ALL' || s.branchId === selectedBranchId) &&
            getInventoryHealthStatus(s.availableQuantity, s.reorderLevel) !== 'In Stock'
        )
        .forEach((s) => {
          list.push({
            id: `ALT-SUP-${s.id}`,
            title: `Low Supply: ${s.name}`,
            detail: `${s.availableQuantity} ${s.unit} remaining in ${s.category}`,
            severity: 'Medium',
            category: 'Store Keeper',
            path: '/inventory/supplies',
          });
        });
    }

    if (isModuleEnabled('MOD-LAUNDRY')) {
      laundryOrders
        .filter(
          (o) =>
            (selectedBranchId === 'ALL' || o.branchId === selectedBranchId) &&
            (o.workflowStatus === 'Ready for Collection' || o.paymentStatus !== 'Paid')
        )
        .forEach((o) => {
          const refDate = o.readyDate || o.promisedDate;
          const d1 = new Date(refDate + 'T00:00:00');
          const d2 = new Date(TODAY_STR + 'T00:00:00');
          const daysWaiting = Math.round(
            (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
          );
          const isOverdueCollection =
            o.workflowStatus === 'Ready for Collection' &&
            daysWaiting >= uncollectedThresholdDays;

          if (o.workflowStatus === 'Ready for Collection' && !allowUncollectedLaundryAlert && o.paymentStatus === 'Paid') {
            return;
          }
          if (o.workflowStatus !== 'Ready for Collection' && o.paymentStatus !== 'Paid' && !allowLaundryUnpaidAlert) {
            return;
          }

          list.push({
            id: `ALT-LND-${o.id}`,
            title: isOverdueCollection
              ? `Uncollected >${uncollectedThresholdDays} Days (${o.id}) — ${daysWaiting}d in Storage`
              : o.workflowStatus === 'Ready for Collection'
              ? `Laundry Awaiting Collection (${o.id})`
              : `Unpaid Laundry Order (${o.id})`,
            detail: `${o.customerName} · ${o.customerAddress || (o.roomNumber ? `Room ${o.roomNumber}` : 'Walk-in')} · Ready since ${refDate}`,
            severity: isOverdueCollection
              ? 'High'
              : o.paymentStatus !== 'Paid'
              ? 'Medium'
              : 'Low',
            category: 'Laundry',
            path:
              o.workflowStatus === 'Ready for Collection'
                ? '/laundry/storage'
                : '/laundry/logger',
          });
        });
    }

    return list;
  }, [
    bookings,
    rooms,
    posTransactions,
    beverages,
    foodIngredients,
    supplies,
    laundryOrders,
    selectedBranchId,
    optionalModules,
    settings,
  ]);

  const totalAlerts = allAlertItems.length;

  // Cross-application Global Search results
  const searchQuery = globalSearch.trim().toLowerCase();

  const searchResults = useMemo<GlobalSearchResult[]>(() => {
    if (!searchQuery) return [];
    const results: GlobalSearchResult[] = [];

    // 1. Navigation & Module Destinations
    SEARCHABLE_DESTINATIONS.forEach((dest) => {
      if (
        dest.title.toLowerCase().includes(searchQuery) ||
        dest.subtitle.toLowerCase().includes(searchQuery) ||
        dest.keywords.some((k) => k.includes(searchQuery) || searchQuery.includes(k))
      ) {
        results.push({
          id: `nav-${dest.path}`,
          group: 'Navigation & Modules',
          title: dest.title,
          subtitle: dest.subtitle,
          path: dest.path,
          badge: 'Page',
        });
      }
    });

    // 2. Bookings
    bookings
      .filter(
        (b) =>
          b.id.toLowerCase().includes(searchQuery) ||
          b.guestName.toLowerCase().includes(searchQuery) ||
          b.roomNumber.toLowerCase().includes(searchQuery) ||
          `room ${b.roomNumber.toLowerCase()}`.includes(searchQuery)
      )
      .slice(0, 4)
      .forEach((b) => {
        results.push({
          id: `bk-${b.id}`,
          group: 'Bookings',
          title: `${b.guestName} (${b.id})`,
          subtitle: `Room ${b.roomNumber} · ${b.checkInDate} to ${b.checkOutDate}`,
          path: '/bookings',
          badge: b.bookingStatus,
        });
      });

    // 3. Customer Profiles
    guests
      .filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery) ||
          g.phone.toLowerCase().includes(searchQuery) ||
          g.email.toLowerCase().includes(searchQuery) ||
          g.id.toLowerCase().includes(searchQuery)
      )
      .slice(0, 4)
      .forEach((g) => {
        results.push({
          id: `gst-${g.id}`,
          group: 'Customer Management',
          title: g.name,
          subtitle: `${g.id} · ${g.phone}${g.email ? ` · ${g.email}` : ''}`,
          path: '/guests',
          badge: g.status,
        });
      });

    // 4. Rooms
    rooms
      .filter((r) => {
        const rt = roomTypes.find((t) => t.id === r.roomTypeId);
        return (
          r.roomNumber.toLowerCase().includes(searchQuery) ||
          `room ${r.roomNumber.toLowerCase()}`.includes(searchQuery) ||
          r.floor.toLowerCase().includes(searchQuery) ||
          (rt && rt.name.toLowerCase().includes(searchQuery))
        );
      })
      .slice(0, 4)
      .forEach((r) => {
        const rt = roomTypes.find((t) => t.id === r.roomTypeId);
        results.push({
          id: `rm-${r.id}`,
          group: 'Rooms & Pricing',
          title: `Room ${r.roomNumber} — ${rt?.name || 'Suite'}`,
          subtitle: `${r.floor} · ${formatCurrency(r.rate, settings.currencySymbol)} / night`,
          path: '/rooms',
          badge: r.status,
        });
      });

    // 5. Beverages
    beverages
      .filter(
        (b) =>
          b.name.toLowerCase().includes(searchQuery) ||
          b.sku.toLowerCase().includes(searchQuery)
      )
      .slice(0, 4)
      .forEach((b) => {
        results.push({
          id: `bev-${b.id}`,
          group: 'Beverages & Food Inventory',
          title: b.name,
          subtitle: `${b.sku} · ${b.availableQuantity} ${b.unit}s in stock`,
          path: '/inventory/beverages',
          badge: formatCurrency(b.sellingPrice, settings.currencySymbol),
        });
      });

    // 6. Food Inventory
    foodIngredients
      .filter(
        (f) =>
          f.name.toLowerCase().includes(searchQuery) ||
          f.sku.toLowerCase().includes(searchQuery)
      )
      .slice(0, 4)
      .forEach((f) => {
        results.push({
          id: `food-${f.id}`,
          group: 'Beverages & Food Inventory',
          title: f.name,
          subtitle: `${f.sku} · ${f.availableQuantity} ${f.unit}s in stock`,
          path: '/inventory/food',
          badge: formatCurrency(f.sellingPrice, settings.currencySymbol),
        });
      });

    // 7. Store Keeper Items
    supplies
      .filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery) ||
          s.sku.toLowerCase().includes(searchQuery) ||
          s.category.toLowerCase().includes(searchQuery)
      )
      .slice(0, 4)
      .forEach((s) => {
        results.push({
          id: `sup-${s.id}`,
          group: 'Store Keeper',
          title: s.name,
          subtitle: `${s.sku} · ${s.category} · ${s.availableQuantity} ${s.unit}`,
          path: '/inventory/supplies',
          badge: s.category,
        });
      });

    // 8. Laundry Orders & Garments
    laundryOrders
      .filter(
        (o) =>
          o.id.toLowerCase().includes(searchQuery) ||
          o.customerName.toLowerCase().includes(searchQuery) ||
          o.garments.some((g) => g.garmentType.toLowerCase().includes(searchQuery))
      )
      .slice(0, 4)
      .forEach((o) => {
        results.push({
          id: `lnd-${o.id}`,
          group: 'Laundry & POS Records',
          title: `${o.id} — ${o.customerName}`,
          subtitle: o.garments.map((g) => `${g.quantity}x ${g.garmentType}`).join(', '),
          path:
            o.workflowStatus === 'Ready for Collection' ||
            o.workflowStatus === 'Collected'
              ? '/laundry/storage'
              : '/laundry/logger',
          badge: o.workflowStatus,
        });
      });

    // 9. POS & Kitchen Transactions
    posTransactions
      .filter(
        (tx) =>
          tx.id.toLowerCase().includes(searchQuery) ||
          tx.guestName.toLowerCase().includes(searchQuery) ||
          tx.items.some((i) => i.name.toLowerCase().includes(searchQuery))
      )
      .slice(0, 4)
      .forEach((tx) => {
        results.push({
          id: `tx-${tx.id}`,
          group: 'Laundry & POS Records',
          title: `${tx.id} — ${tx.guestName}`,
          subtitle: `${tx.department} · ${tx.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}`,
          path:
            tx.department === 'Bar & POS'
              ? '/sales/bar-pos'
              : '/sales/kitchen-restaurant',
          badge: formatCurrency(tx.totalAmount, settings.currencySymbol),
        });
      });

    return results.filter((r) => canAccessRoute(r.path));
  }, [
    searchQuery,
    bookings,
    guests,
    rooms,
    roomTypes,
    beverages,
    foodIngredients,
    supplies,
    laundryOrders,
    posTransactions,
    settings.currencySymbol,
    canAccessRoute,
  ]);

  const groupedSearchResults = useMemo(() => {
    const map = new Map<string, GlobalSearchResult[]>();
    searchResults.forEach((item) => {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    });
    return Array.from(map.entries());
  }, [searchResults]);

  useEffect(() => {
    setActiveSearchIndex(0);
  }, [searchQuery]);

  const handleSelectSearchItem = (item: GlobalSearchResult) => {
    navigate(item.path);
    setGlobalSearch('');
    setShowSearchDropdown(false);
  };

  const isRibCage = settings.sidebarStyle === 'ribcage';
  const userInitials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-[#F7F7F7] text-[#111111]">
      {/* Dynamic Accent Color Token Override */}
      <style>{`
        :root {
          --accent-color: ${accentPalette.hex};
          --accent-hover: ${accentPalette.hoverHex};
          --accent-soft: ${accentPalette.softHex};
          --accent-border: ${accentPalette.borderHex};
        }
        .bg-\\[\\#7463A6\\], .bg-\\[\\#7D53DE\\] {
          background-color: var(--accent-color) !important;
        }
        .hover\\:bg-\\[\\#635394\\]:hover, .hover\\:bg-\\[\\#6942C6\\]:hover, .hover\\:bg-\\[\\#6B43C8\\]:hover {
          background-color: var(--accent-hover) !important;
        }
        .hover\\:bg-\\[\\#7463A6\\]:hover {
          background-color: var(--accent-color) !important;
          color: #ffffff !important;
        }
        .text-\\[\\#7463A6\\], .text-\\[\\#7D53DE\\] {
          color: var(--accent-color) !important;
        }
        .border-\\[\\#7463A6\\], .border-\\[\\#7D53DE\\] {
          border-color: var(--accent-color) !important;
        }
        .focus\\:border-\\[\\#7463A6\\]:focus, .focus\\:border-\\[\\#7D53DE\\]:focus {
          border-color: var(--accent-color) !important;
        }
        .ring-\\[\\#7463A6\\]\\/25, .ring-\\[\\#7463A6\\]\\/12 {
          --tw-ring-color: var(--accent-border) !important;
        }
        .bg-\\[\\#F1EEF8\\], .bg-\\[\\#F3EEFF\\] {
          background-color: var(--accent-soft) !important;
        }
        .hover\\:bg-\\[\\#F1EEF8\\]:hover {
          background-color: var(--accent-soft) !important;
        }
        .border-\\[\\#D5CDEC\\] {
          border-color: var(--accent-border) !important;
        }
      `}</style>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[264px] shrink-0 bg-white border-r border-[#EBEBEB] flex flex-col transition-transform duration-200 ${
          mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header — height h-[68px] aligned with top header bottom border */}
        <div className="h-[68px] px-5 flex items-center justify-between border-b border-[#EBEBEB] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7463A6] flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[14px] font-bold tracking-tight text-[#111111] leading-none">
                {settings.hotelName}
              </span>
              <span className="block text-[11px] font-medium text-[#6B7280] mt-1">
                Executive Suite OS
              </span>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#6B7280] hover:text-[#111111]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Groups */}
        {isRibCage ? (
          <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3">
            {visibleNavGroups.map((group) => {
              const activeChildIndex = group.items.findIndex(
                (item) =>
                  location.pathname === item.path ||
                  (item.path === '/overview' && location.pathname === '/')
              );
              const hasActiveChild = activeChildIndex !== -1;
              const isGroupExpanded = expandedGroups[group.label] ?? !isCollapsedNavMode;

              if (group.label === 'Command Center' && group.items.length === 1) {
                const item = group.items[0];
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path || location.pathname === '/';
                return (
                  <div key={group.label}>
                    <NavLink
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-[11px] text-[13px] transition-all ${
                        isActive
                          ? 'bg-[#F1EEF8] text-[#7463A6] font-medium'
                          : 'text-[#4B5563] hover:bg-[#F5F5F3] hover:text-[#111111]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#7463A6]' : 'text-[#6B7280]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </div>
                );
              }

              return (
                <div key={group.label} className="space-y-1">
                  {/* Parent Header — Clickable category header to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand(group.label)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-[11px] text-[12.5px] transition-all select-none cursor-pointer ${
                      hasActiveChild
                        ? 'bg-white border-[1.5px] border-[#E2E2DC] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] text-[#1E1E1E] font-medium'
                        : 'text-[#6E6E6A] font-normal hover:bg-[#F5F5F3] hover:text-[#1E1E1E]'
                    }`}
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#9E9E96] transition-transform duration-150 ${
                        isGroupExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {/* Child Items with Rib-Cage Connectors */}
                  {isGroupExpanded && (
                    <div className="relative pl-5 space-y-0.5">
                      {group.items.map((item, idx) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isLast = idx === group.items.length - 1;
                        const isBeforeActive =
                          hasActiveChild && idx < activeChildIndex;

                        return (
                          <div key={item.path} className="relative flex items-center">
                            {/* Vertical spine segment — accent-colored along path leading to active child */}
                            {isActive ? (
                              <>
                                <span
                                  className="pointer-events-none absolute -left-2.5 top-0 w-[1.5px] bg-[#7463A6] z-10"
                                  style={{ height: '50%' }}
                                />
                                {!isLast && (
                                  <span
                                    className="pointer-events-none absolute -left-2.5 top-1/2 w-[1.5px] bg-[#DCDCD4]"
                                    style={{ height: '50%' }}
                                  />
                                )}
                              </>
                            ) : (
                              <span
                                className={`pointer-events-none absolute -left-2.5 top-0 w-[1.5px] ${
                                  isBeforeActive ? 'bg-[#7463A6] z-10' : 'bg-[#DCDCD4]'
                                }`}
                                style={{ height: isLast ? '50%' : '100%' }}
                              />
                            )}

                            {/* Curved rib connector */}
                            <span
                              className={`pointer-events-none absolute -left-2.5 top-0 w-2.5 h-1/2 border-l-[1.5px] border-b-[1.5px] rounded-bl-[7px] ${
                                isActive
                                  ? 'border-[#7463A6] z-10'
                                  : 'border-[#DCDCD4]'
                              }`}
                            />

                            <NavLink
                              to={item.path}
                              onClick={() => setMobileSidebarOpen(false)}
                              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[10px] text-[12.5px] transition-all ${
                                isActive
                                  ? 'bg-[#F1EEF8] text-[#7463A6] font-medium'
                                  : 'text-[#5A5A55] font-normal hover:bg-[#F5F5F3] hover:text-[#1E1E1E]'
                              }`}
                            >
                              <Icon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive ? 'text-[#7463A6]' : 'text-[#7E7E78]'
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </NavLink>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        ) : (
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {visibleNavGroups.map((group) => {
              const hasActiveChild = group.items.some(
                (item) =>
                  location.pathname === item.path ||
                  (item.path === '/overview' && location.pathname === '/')
              );
              const isGroupExpanded = expandedGroups[group.label] ?? !isCollapsedNavMode;

              if (group.label === 'Command Center' && group.items.length === 1) {
                const item = group.items[0];
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path || location.pathname === '/';
                return (
                  <div key={group.label}>
                    <NavLink
                      to={item.path}
                      onClick={() => setMobileSidebarOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'bg-[#7463A6] text-white font-semibold shadow-[0_2px_8px_rgba(116,99,166,0.22)]'
                          : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-[#6B7280] group-hover:text-[#111111]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  </div>
                );
              }

              return (
                <div key={group.label}>
                  {isCollapsedNavMode ? (
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.label)}
                      className={`w-full flex items-center justify-between px-3 py-2 mb-1 rounded-xl text-[12.5px] font-semibold transition-all cursor-pointer ${
                        hasActiveChild
                          ? 'bg-[#F1EEF8] text-[#7463A6]'
                          : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]'
                      }`}
                    >
                      <span className="truncate">{group.label}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          isGroupExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.label)}
                      className="w-full flex items-center justify-between px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] hover:text-[#4B5563] cursor-pointer"
                    >
                      <span>{group.label}</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-150 ${
                          isGroupExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                  )}
                  {isGroupExpanded && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                          location.pathname === item.path ||
                          (item.path === '/overview' && location.pathname === '/');
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileSidebarOpen(false)}
                            className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                              isActive
                                ? 'bg-[#7463A6] text-white font-semibold shadow-[0_2px_8px_rgba(116,99,166,0.22)]'
                                : 'text-[#4B5563] hover:bg-[#F3F4F6] hover:text-[#111111]'
                            }`}
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                isActive
                                  ? 'text-white'
                                  : 'text-[#6B7280] group-hover:text-[#111111]'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Active Staff / Property Footer */}
        <div className="p-3.5 border-t border-[#F2F2F2] bg-[#FAFAFA]">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-[#7463A6] text-white flex items-center justify-center text-[12px] font-semibold shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-[#111111] truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">
                {currentUser.jobTitle || currentUser.role} · {currentUser.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Utility Header — h-[68px] aligned cleanly with sidebar logo header */}
        <header className="sticky top-0 z-30 h-[68px] bg-white/95 backdrop-blur-xs border-b border-[#EBEBEB] px-4 lg:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#4B5563] hover:bg-[#F3F4F6]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search */}
            <div ref={searchRef} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (!showSearchDropdown || searchResults.length === 0) {
                    if (e.key === 'Escape') setShowSearchDropdown(false);
                    return;
                  }
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSearchIndex((prev) =>
                      prev + 1 >= searchResults.length ? 0 : prev + 1
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSearchIndex((prev) =>
                      prev - 1 < 0 ? searchResults.length - 1 : prev - 1
                    );
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    const chosen = searchResults[activeSearchIndex];
                    if (chosen) handleSelectSearchItem(chosen);
                  } else if (e.key === 'Escape') {
                    setShowSearchDropdown(false);
                  }
                }}
                placeholder="Search pages, bookings, guests, rooms, inventory..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#F5F5F5] border border-transparent focus:bg-white focus:border-[#7463A6] rounded-xl text-[13px] text-[#111111] placeholder-[#9CA3AF] focus:outline-none transition-all"
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-[#8E8E88] hover:text-[#1E1E1E] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {showSearchDropdown && searchQuery.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-[14px] shadow-[0_14px_36px_rgba(0,0,0,0.12)] border border-[#E6E6E0] p-2.5 z-50 max-h-[420px] overflow-y-auto space-y-3">
                  {groupedSearchResults.length === 0 ? (
                    <div className="py-6 px-3 text-center">
                      <p className="text-[13px] font-medium text-[#1E1E1E]">
                        No matching pages or records found
                      </p>
                      <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                        Try searching by module name, guest name, room number, SKU, or ID.
                      </p>
                    </div>
                  ) : (
                    groupedSearchResults.map(([groupName, groupItems]) => (
                      <div key={groupName}>
                        <p className="text-[10.5px] font-medium uppercase tracking-wider text-[#8E8E88] px-2.5 mb-1">
                          {groupName}
                        </p>
                        <div className="space-y-0.5">
                          {groupItems.map((item) => {
                            const flatIdx = searchResults.findIndex(
                              (r) => r.id === item.id
                            );
                            const isHighlighted = flatIdx === activeSearchIndex;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onMouseEnter={() => setActiveSearchIndex(flatIdx)}
                                onClick={() => handleSelectSearchItem(item)}
                                className={`w-full text-left px-2.5 py-2 rounded-[9px] flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                                  isHighlighted
                                    ? 'bg-[#F1EEF8] text-[#7463A6]'
                                    : 'hover:bg-[#F6F6F4] text-[#1E1E1E]'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12.5px] font-medium truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-[11px] text-[#6E6E6A] truncate">
                                    {item.subtitle}
                                  </p>
                                </div>
                                {item.badge && (
                                  <span className="text-[10.5px] font-medium px-2 py-0.5 rounded-[6px] bg-[#F4F4F0] text-[#4A4A46] shrink-0 tabular-nums">
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Utility Controls */}
          <div className="flex items-center gap-3">
            {/* Operational Alerts Bell */}
            <div ref={alertsRef} className="relative">
              <button
                type="button"
                onClick={() => setShowAlertsPopover((p) => !p)}
                className="relative p-2 rounded-xl bg-[#F5F5F5] hover:bg-[#EBEBEB] text-[#111111] transition-colors cursor-pointer"
                aria-label="Operational notifications"
              >
                <Bell className="w-4 h-4" />
                {totalAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {totalAlerts}
                  </span>
                )}
              </button>

              {showAlertsPopover && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[13px] font-medium text-[#111111]">
                      Notifications & Alerts ({totalAlerts})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAlertsPopover(false)}
                      className="text-[11px] text-[#6B7280] hover:text-[#111111] cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {allAlertItems.slice(0, 6).map((alt) => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => {
                          navigate(alt.path);
                          setShowAlertsPopover(false);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-[#F9F9F7] hover:bg-[#F1EEF8]/70 border border-[#EFEFEA] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-medium text-[#1E1E1E] truncate">
                            {alt.title}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-[5px] shrink-0 ${
                              alt.severity === 'High'
                                ? 'bg-[#FCECE9] text-[#DC2626]'
                                : alt.severity === 'Medium'
                                ? 'bg-[#FEF4E6] text-[#D97706]'
                                : 'bg-[#F1EEF8] text-[#7463A6]'
                            }`}
                          >
                            {alt.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6E6E6A] truncate mt-0.5">
                          {alt.detail}
                        </p>
                      </button>
                    ))}
                    {totalAlerts === 0 && (
                      <p className="text-[#6B7280] py-3 text-center text-[12px]">
                        All operational thresholds are healthy.
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-[#EFEFEA]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAlertsPopover(false);
                        setShowFullAlertsDrawer(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[9px] text-[12px] font-medium text-[#7463A6] hover:bg-[#F1EEF8] transition-colors cursor-pointer"
                    >
                      <span>View All Notifications ({totalAlerts})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Circular Profile Avatar Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu((o) => !o)}
                className="w-9 h-9 rounded-full overflow-hidden border border-[#E2E2DC] hover:border-[#7463A6] focus:outline-none focus:ring-2 focus:ring-[#7463A6]/20 transition-all cursor-pointer bg-[#F1EEF8] flex items-center justify-center"
                title="Account & Profile"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80"
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.11)] border border-[#E6E6E0] p-2 z-50 select-none">
                  <div className="px-3 py-2.5 border-b border-[#F0F0EC]">
                    <p className="text-[13px] font-medium text-[#1E1E1E] truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11.5px] text-[#6E6E6A] truncate">
                      {currentUser.jobTitle || currentUser.role} · {currentUser.role}
                    </p>
                  </div>

                  {/* Active Staff Account Switcher */}
                  <div className="py-1.5 px-2 border-b border-[#F0F0EC]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[#8E8E88] px-1 mb-1">
                      Active Account
                    </p>
                    <div className="space-y-0.5 max-h-36 overflow-y-auto">
                      {staff.map((member) => {
                        const isSelected = member.id === currentUser.id;
                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setCurrentUserId(member.id);
                              setShowProfileMenu(false);
                              notify(
                                'Account Switched',
                                `Logged in as ${member.name} (${member.jobTitle || member.role}).`,
                                'info'
                              );
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-[8px] flex items-center justify-between gap-2 text-[12px] transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#F1EEF8] text-[#7463A6] font-medium'
                                : 'text-[#4A4A46] hover:bg-[#F5F5F2]'
                            }`}
                          >
                            <span className="truncate">{member.name}</span>
                            <span className="text-[10.5px] text-[#8E8E88] shrink-0">
                              {member.jobTitle || member.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/admin/staff');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[12.5px] text-[#1E1E1E] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-[#6E6E6A]" />
                      <span>Staff Profile & Access</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/admin/settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[12.5px] text-[#1E1E1E] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#6E6E6A]" />
                      <span>Hotel Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/admin/optional-modules');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[12.5px] text-[#1E1E1E] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#6E6E6A]" />
                      <span>Operational Modules</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#F0F0EC]">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        notify(
                          'Authentication Notice',
                          'External session sign-out is not active in local standalone mode.',
                          'info'
                        );
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-[12.5px] text-[#DC2626] hover:bg-[#FCECE9]/60 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-7 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Full Notifications & Operational Alerts Drawer */}
      {showFullAlertsDrawer && (
        <div className="fixed inset-0 z-50 bg-black/35 flex justify-end">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-[#E6E6E0] flex flex-col">
            <div className="px-5 py-4 border-b border-[#EFEFEA] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Bell className="w-4 h-4 text-[#7463A6]" />
                <h3 className="text-[15px] font-medium text-[#1E1E1E]">
                  Notifications & Operational Alerts ({totalAlerts})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFullAlertsDrawer(false)}
                className="p-1.5 rounded-lg text-[#6E6E6A] hover:bg-[#F4F4F0] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {allAlertItems.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-[#6E6E6A]">
                  No active operational alerts or unpaid invoices.
                </div>
              ) : (
                allAlertItems.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => {
                      setShowFullAlertsDrawer(false);
                      navigate(alt.path);
                    }}
                    className="w-full text-left p-3.5 rounded-[12px] bg-[#F9F9F7] hover:bg-[#F1EEF8]/60 border border-[#EFEFEA] transition-colors flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-[#7463A6]">
                          {alt.category}
                        </span>
                      </div>
                      <p className="text-[13px] font-medium text-[#1E1E1E] mt-0.5">
                        {alt.title}
                      </p>
                      <p className="text-[12px] text-[#6E6E6A] mt-0.5">
                        {alt.detail}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-[6px] shrink-0 ${
                        alt.severity === 'High'
                          ? 'bg-[#FCECE9] text-[#DC2626]'
                          : alt.severity === 'Medium'
                          ? 'bg-[#FEF4E6] text-[#D97706]'
                          : 'bg-[#F1EEF8] text-[#7463A6]'
                      }`}
                    >
                      {alt.severity}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto bg-[#111111] text-white p-3.5 rounded-2xl shadow-lg flex items-start gap-3 border border-white/10 animate-in fade-in slide-in-from-bottom-2"
          >
            {t.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
            )}
            {t.type === 'error' && (
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
            )}
            {t.type === 'info' && (
              <Info className="w-4 h-4 text-[#7463A6] shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white">{t.title}</p>
              <p className="text-[11px] text-[#D1D5DB] mt-0.5">{t.message}</p>
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-[#9CA3AF] hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
