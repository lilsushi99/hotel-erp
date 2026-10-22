import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import { Blocks } from 'lucide-react';
import { HotelProvider, useHotel } from './context/HotelContext';
import { AppShell } from './components/layout/AppShell';
import { PrimaryButton, SecondaryButton } from './components/ui/PageControls';

// 1. Command Center
import { OverviewPage } from './pages/overview/OverviewPage';

// 2. Hotel Operations
import { BookingsPage } from './pages/hotel-operations/BookingsPage';
import { RoomsPage } from './pages/hotel-operations/RoomsPage';
import { GuestCrmPage } from './pages/guest-management/GuestCrmPage';

// 3. Sales & Services
import { BarPosPage } from './pages/sales-services/BarPosPage';
import { KitchenRestaurantPage } from './pages/sales-services/KitchenRestaurantPage';

// 4. Laundry
import { LaundryLoggerPage } from './pages/laundry/LaundryLoggerPage';
import { LaundryStoragePage } from './pages/laundry/LaundryStoragePage';

// 5. Inventory
import { BeveragesPage } from './pages/inventory/BeveragesPage';
import { FoodInventoryPage } from './pages/inventory/FoodInventoryPage';
import { SuppliesPage } from './pages/inventory/SuppliesPage';

// 6. Finance & Intelligence
import { ExpensesPage } from './pages/finance/ExpensesPage';
import { FinancialReportsPage } from './pages/finance/FinancialReportsPage';

// 7. Administration
import { StaffPermissionsPage } from './pages/administration/StaffPermissionsPage';
import { HotelSettingsPage } from './pages/administration/HotelSettingsPage';
import { OptionalModulesPage } from './pages/administration/OptionalModulesPage';

const ModuleRouteGuard: React.FC<{
  moduleId: string;
  children: React.ReactNode;
}> = ({ moduleId, children }) => {
  const { optionalModules, toggleOptionalModule } = useHotel();
  const navigate = useNavigate();
  const mod = optionalModules.find((m) => m.id === moduleId);

  if (mod && mod.status === 'Disabled') {
    return (
      <div className="bg-[#F0F0F0] p-1 rounded-[20px] max-w-xl mx-auto mt-12">
        <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F1EEF8] text-[#7463A6] flex items-center justify-center mx-auto">
            <Blocks className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-[18px] font-bold text-[#111111]">
              {mod.name} Module is Disabled
            </h2>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              This operational module is currently turned off in Administration.
              All existing records remain safely stored and will reappear as
              soon as the module is re-enabled.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2.5 pt-2">
            <SecondaryButton onClick={() => navigate('/admin/optional-modules')}>
              Go to Operational Modules
            </SecondaryButton>
            <PrimaryButton onClick={() => toggleOptionalModule(mod.id)}>
              Enable {mod.name}
            </PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export function App() {
  return (
    <HotelProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<OverviewPage />} />

            {/* Hotel Operations */}
            <Route
              path="/bookings"
              element={
                <ModuleRouteGuard moduleId="MOD-HOTEL-OPS">
                  <BookingsPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/rooms"
              element={
                <ModuleRouteGuard moduleId="MOD-HOTEL-OPS">
                  <RoomsPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/guests"
              element={
                <ModuleRouteGuard moduleId="MOD-HOTEL-OPS">
                  <GuestCrmPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/guests/crm"
              element={
                <ModuleRouteGuard moduleId="MOD-HOTEL-OPS">
                  <GuestCrmPage />
                </ModuleRouteGuard>
              }
            />

            {/* Sales & Services */}
            <Route
              path="/sales/bar-pos"
              element={
                <ModuleRouteGuard moduleId="MOD-BAR-POS">
                  <BarPosPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/sales/kitchen-restaurant"
              element={
                <ModuleRouteGuard moduleId="MOD-KITCHEN-RES">
                  <KitchenRestaurantPage />
                </ModuleRouteGuard>
              }
            />

            {/* Laundry */}
            <Route
              path="/laundry/logger"
              element={
                <ModuleRouteGuard moduleId="MOD-LAUNDRY">
                  <LaundryLoggerPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/laundry/storage"
              element={
                <ModuleRouteGuard moduleId="MOD-LAUNDRY">
                  <LaundryStoragePage />
                </ModuleRouteGuard>
              }
            />

            {/* Inventory */}
            <Route
              path="/inventory/beverages"
              element={
                <ModuleRouteGuard moduleId="MOD-BAR-POS">
                  <BeveragesPage />
                </ModuleRouteGuard>
              }
            />
            <Route
              path="/inventory/food"
              element={
                <ModuleRouteGuard moduleId="MOD-KITCHEN-RES">
                  <FoodInventoryPage />
                </ModuleRouteGuard>
              }
            />
            <Route path="/inventory/supplies" element={<SuppliesPage />} />
            <Route
              path="/inventory/stock-movements"
              element={<SuppliesPage />}
            />

            {/* Finance & Intelligence */}
            <Route path="/finance/expenses" element={<ExpensesPage />} />
            <Route
              path="/finance/reports"
              element={<FinancialReportsPage />}
            />

            {/* Administration */}
            <Route path="/admin/staff" element={<StaffPermissionsPage />} />
            <Route path="/admin/settings" element={<HotelSettingsPage />} />
            <Route
              path="/admin/optional-modules"
              element={<OptionalModulesPage />}
            />

            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </HotelProvider>
  );
}

export default App;
