import React from 'react';
import {
  BedDouble,
  Wine,
  UtensilsCrossed,
  Shirt,
  Power,
  CheckCircle2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { PageHeader } from '../../components/ui/PageControls';
import { StatusBadge } from '../../components/ui/StatusBadge';

const MODULE_META: Record<
  string,
  {
    icon: React.FC<{ className?: string }>;
    iconColor: string;
    affectedRoutes: string[];
  }
> = {
  'MOD-HOTEL-OPS': {
    icon: BedDouble,
    iconColor: 'text-[#7463A6]',
    affectedRoutes: [
      'Sidebar: Hotel Operations (Bookings, Rooms & Pricing, Customer Management)',
    ],
  },
  'MOD-BAR-POS': {
    icon: Wine,
    iconColor: 'text-[#2563EB]',
    affectedRoutes: [
      'Sidebar: Sales & Services → Bar & POS',
      'Sidebar: Inventory → Beverages',
    ],
  },
  'MOD-KITCHEN-RES': {
    icon: UtensilsCrossed,
    iconColor: 'text-[#0D9488]',
    affectedRoutes: [
      'Sidebar: Sales & Services → Kitchen & Restaurant',
      'Sidebar: Inventory → Food Inventory',
    ],
  },
  'MOD-LAUNDRY': {
    icon: Shirt,
    iconColor: 'text-[#D97706]',
    affectedRoutes: [
      'Sidebar: Laundry → Laundry Logger',
      'Sidebar: Laundry → Storage',
    ],
  },
};

export const OptionalModulesPage: React.FC = () => {
  const { optionalModules, toggleOptionalModule } = useHotel();

  const coreOperationalModules = optionalModules.filter((m) =>
    ['MOD-HOTEL-OPS', 'MOD-BAR-POS', 'MOD-KITCHEN-RES', 'MOD-LAUNDRY'].includes(
      m.id
    )
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Operational Modules" />

      {/* 4 Core Operational Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {coreOperationalModules.map((mod) => {
          const isEnabled = mod.status === 'Enabled';
          const meta = MODULE_META[mod.id] || {
            icon: CheckCircle2,
            iconColor: 'text-[#7463A6]',
            affectedRoutes: [],
          };
          const IconComponent = meta.icon;

          return (
            <div key={mod.id} className="bg-[#F0F0F0] p-1 rounded-[20px]">
              <div className="bg-white rounded-[17px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <IconComponent
                        className={`w-5 h-5 ${meta.iconColor} shrink-0`}
                      />
                      <h3 className="text-[16px] font-bold text-[#111111]">
                        {mod.name}
                      </h3>
                    </div>
                    <StatusBadge status={mod.status} />
                  </div>

                  <p className="text-[13px] text-[#4B5563] leading-relaxed mb-4">
                    {mod.description}
                  </p>

                  {meta.affectedRoutes.length > 0 && (
                    <div className="p-3 rounded-[12px] bg-[#FAFAFA] border border-[#F3F4F6] space-y-1.5 mb-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                        Controlled Navigation & Screens
                      </p>
                      {meta.affectedRoutes.map((routeLabel, idx) => (
                        <p
                          key={idx}
                          className="text-[12px] font-medium text-[#374151]"
                        >
                          • {routeLabel}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#F3F4F6] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#6B7280]">
                    {isEnabled
                      ? 'Active in sidebar and accessible to staff'
                      : 'Hidden from sidebar (existing records preserved)'}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleOptionalModule(mod.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12px] font-semibold transition-all cursor-pointer ${
                      isEnabled
                        ? 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
                        : 'bg-[#7463A6] text-white hover:bg-[#635394]'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    {isEnabled ? 'Disable Module' : 'Enable Module'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
