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
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { formatCurrency, getInventoryHealthStatus } from '../../utils/formatters';

interface NavGroup {
  label: string;
  items: {
    label: string;
    path: string;
    icon: React.FC<{ className?: string }>;
    moduleId?: string;
  }[];
}

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
      { label: 'Stock Keeper', path: '/inventory/supplies', icon: Boxes },
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
  } = useHotel();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);
  const [showFullAlertsDrawer, setShowFullAlertsDrawer] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

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
      items: group.items.filter((item) => isModuleEnabled(item.moduleId)),
    })).filter((group) => group.items.length > 0);
  }, [optionalModules]);

  // Consolidated live operational alerts list (including unpaid bookings, unpaid POS, unpaid Restaurant, low stock, laundry, expenses)
  const allAlertItems = useMemo<OperationalAlertItem[]>(() => {
    const list: OperationalAlertItem[] = [];

    if (isModuleEnabled('MOD-HOTEL-OPS')) {
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
        if (tx.department === 'Bar & POS' && !isModuleEnabled('MOD-BAR-POS')) return;
        if (tx.department === 'Kitchen & Restaurant' && !isModuleEnabled('MOD-KITCHEN-RES')) return;
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

    if (isModuleEnabled('MOD-BAR-POS')) {
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

    if (isModuleEnabled('MOD-KITCHEN-RES')) {
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
          category: 'Stock Keeper',
          path: '/inventory/supplies',
        });
      });

    if (isModuleEnabled('MOD-LAUNDRY')) {
      laundryOrders
        .filter(
          (o) =>
            (selectedBranchId === 'ALL' || o.branchId === selectedBranchId) &&
            (o.workflowStatus === 'Ready for Collection' || o.paymentStatus !== 'Paid')
        )
        .forEach((o) => {
          list.push({
            id: `ALT-LND-${o.id}`,
            title:
              o.workflowStatus === 'Ready for Collection'
                ? `Laundry Awaiting Collection (${o.id})`
                : `Unpaid Laundry Order (${o.id})`,
            detail: `${o.customerName} · ${o.customerAddress || (o.roomNumber ? `Room ${o.roomNumber}` : 'Walk-in')}`,
            severity: o.paymentStatus !== 'Paid' ? 'Medium' : 'Low',
            category: 'Laundry',
            path: o.workflowStatus === 'Ready for Collection' ? '/laundry/storage' : '/laundry/logger',
          });
        });
    }

    expenses
      .filter(
        (e) =>
          (selectedBranchId === 'ALL' || e.branchId === selectedBranchId) &&
          e.status === 'Pending'
      )
      .forEach((e) => {
        list.push({
          id: `ALT-EXP-${e.id}`,
          title: `Expense Pending Approval (${e.reference})`,
          detail: `${e.description} · ${formatCurrency(e.amount, settings.currencySymbol)}`,
          severity: 'Low',
          category: 'Expenses',
          path: '/finance/expenses',
        });
      });

    return list;
  }, [
    bookings,
    rooms,
    posTransactions,
    beverages,
    foodIngredients,
    supplies,
    laundryOrders,
    expenses,
    selectedBranchId,
    optionalModules,
    settings.currencySymbol,
  ]);

  const totalAlerts = allAlertItems.length;

  // Quick search results
  const searchQuery = globalSearch.trim().toLowerCase();
  const matchedBookings = searchQuery
    ? bookings
        .filter(
          (b) =>
            b.id.toLowerCase().includes(searchQuery) ||
            b.guestName.toLowerCase().includes(searchQuery)
        )
        .slice(0, 3)
    : [];
  const matchedGuests = searchQuery
    ? guests
        .filter(
          (g) =>
            g.name.toLowerCase().includes(searchQuery) ||
            g.phone.toLowerCase().includes(searchQuery)
        )
        .slice(0, 3)
    : [];
  const matchedRooms = searchQuery
    ? rooms
        .filter((r) => r.roomNumber.toLowerCase().includes(searchQuery))
        .slice(0, 3)
    : [];

  const isRibCage = settings.sidebarStyle === 'ribcage';

  return (
    <div className="min-h-screen flex bg-[#F7F7F7] text-[#111111]">
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
              const hasActiveChild = group.items.some(
                (item) =>
                  location.pathname === item.path ||
                  (item.path === '/overview' && location.pathname === '/')
              );

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
                  {/* Parent Header */}
                  <div
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-[11px] text-[12.5px] transition-all select-none ${
                      hasActiveChild
                        ? 'bg-white border-[1.5px] border-[#E2E2DC] shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] text-[#1E1E1E] font-medium'
                        : 'text-[#6E6E6A] font-normal'
                    }`}
                  >
                    <Folder
                      className={`w-3.5 h-3.5 shrink-0 ${
                        hasActiveChild ? 'text-[#4A4A46]' : 'text-[#8E8E88]'
                      }`}
                    />
                    <span className="truncate">{group.label}</span>
                  </div>

                  {/* Child Items with Rib-Cage Connectors */}
                  <div className="relative pl-5 space-y-0.5">
                    {group.items.map((item, idx) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      const isLast = idx === group.items.length - 1;

                      return (
                        <div key={item.path} className="relative flex items-center">
                          {/* Vertical spine segment */}
                          <span
                            className="pointer-events-none absolute -left-2.5 top-0 w-[1.5px] bg-[#DCDCD4]"
                            style={{ height: isLast ? '50%' : '100%' }}
                          />
                          {/* Curved rib connector */}
                          <span className="pointer-events-none absolute -left-2.5 top-0 w-2.5 h-1/2 border-l-[1.5px] border-b-[1.5px] border-[#DCDCD4] rounded-bl-[7px]" />

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
                </div>
              );
            })}
          </nav>
        ) : (
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {visibleNavGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF]">
                  {group.label}
                </div>
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
              </div>
            ))}
          </nav>
        )}

        {/* Active Staff / Property Footer */}
        <div className="p-3.5 border-t border-[#F2F2F2] bg-[#FAFAFA]">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-[#7463A6] text-white flex items-center justify-center text-[12px] font-semibold">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-[#111111] truncate">
                Adebayo Dosunmu
              </p>
              <p className="text-[11px] text-[#6B7280] truncate">
                General Manager · Super Admin
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
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() =>
                  setTimeout(() => setShowSearchDropdown(false), 180)
                }
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Quick search bookings, guests, rooms (e.g. BKG-2041, 301)..."
                className="w-full pl-9 pr-4 py-1.5 bg-[#F5F5F5] border border-transparent focus:bg-white focus:border-[#D1D5DB] rounded-xl text-[13px] text-[#111111] placeholder-[#9CA3AF] focus:outline-none transition-all"
              />

              {showSearchDropdown && searchQuery.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-lg border border-[#E5E7EB] p-3 z-50 space-y-3">
                  {matchedBookings.length === 0 &&
                  matchedGuests.length === 0 &&
                  matchedRooms.length === 0 ? (
                    <p className="text-[12px] text-[#6B7280] py-2 text-center">
                      No matching bookings, guests, or rooms found.
                    </p>
                  ) : (
                    <>
                      {matchedBookings.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-2 mb-1">
                            Bookings
                          </p>
                          {matchedBookings.map((b) => (
                            <button
                              key={b.id}
                              onMouseDown={() => {
                                navigate('/bookings');
                                setGlobalSearch('');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-between text-[12px]"
                            >
                              <span className="font-medium text-[#111111]">
                                {b.guestName} ({b.id})
                              </span>
                              <span className="text-[11px] text-[#6B7280]">
                                {b.bookingStatus}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {matchedGuests.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-2 mb-1">
                            Guests
                          </p>
                          {matchedGuests.map((g) => (
                            <button
                              key={g.id}
                              onMouseDown={() => {
                                navigate('/guests');
                                setGlobalSearch('');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-between text-[12px]"
                            >
                              <span className="font-medium text-[#111111]">
                                {g.name}
                              </span>
                              <span className="text-[11px] text-[#6B7280]">
                                {g.phone}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {matchedRooms.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF] px-2 mb-1">
                            Rooms
                          </p>
                          {matchedRooms.map((r) => (
                            <button
                              key={r.id}
                              onMouseDown={() => {
                                navigate('/rooms');
                                setGlobalSearch('');
                              }}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-between text-[12px]"
                            >
                              <span className="font-medium text-[#111111]">
                                Room {r.roomNumber} · {r.floor}
                              </span>
                              <span className="text-[11px] text-[#6B7280]">
                                {r.status}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
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
                  alt="Adaeze Okafor-Vance"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.11)] border border-[#E6E6E0] p-2 z-50 select-none">
                  <div className="px-3 py-2.5 border-b border-[#F0F0EC]">
                    <p className="text-[13px] font-medium text-[#1E1E1E] truncate">
                      Adaeze Okafor-Vance
                    </p>
                    <p className="text-[11.5px] text-[#6E6E6A] truncate">
                      Executive Director · Administrator
                    </p>
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
