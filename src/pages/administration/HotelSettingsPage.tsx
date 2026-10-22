import React, { useState } from 'react';
import { Building2, DollarSign, Bell, Save, RotateCcw, PanelLeft, Check } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { HotelSettings } from '../../types/hotel';
import { Dropdown } from '../../components/ui/Dropdown';

export const HotelSettingsPage: React.FC = () => {
  const { settings, updateSettings, notify } = useHotel();
  const [form, setForm] = useState<HotelSettings>({
    ...settings,
    sidebarStyle: settings.sidebarStyle || 'standard',
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    notify('Settings Saved', 'Hotel settings saved successfully.', 'success');
  };

  const handleReset = () => {
    setForm({ ...settings });
    notify('Changes Discarded', 'Unsaved changes discarded.', 'info');
  };

  const handleSidebarStyleSelect = (style: 'standard' | 'ribcage') => {
    setForm((prev) => ({ ...prev, sidebarStyle: style }));
    updateSettings({ sidebarStyle: style });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-medium text-[#1E1E1E] tracking-tight">
            Hotel Settings
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-medium bg-white border border-[#E2E2DC] text-[#1E1E1E] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#6E6E6A]" />
            Reset
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12.5px] font-medium bg-[#7463A6] text-white hover:bg-[#635394] shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
        </div>
      </div>

      {/* Sidebar Appearance */}
      <div className="bg-[#F0F0EC] p-[3px] rounded-[16px]">
        <div className="px-4 py-2.5 flex items-center gap-2">
          <PanelLeft className="w-4 h-4 text-[#7463A6]" />
          <h2 className="text-[14px] font-medium text-[#1E1E1E]">
            Sidebar Appearance
          </h2>
        </div>

        <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Option 1: Standard Sidebar */}
            <button
              type="button"
              onClick={() => handleSidebarStyleSelect('standard')}
              className={`text-left p-4 rounded-[12px] border transition-all cursor-pointer flex items-start gap-4 ${
                (form.sidebarStyle || 'standard') === 'standard'
                  ? 'border-[#7463A6] bg-[#F1EEF8]/35 ring-1 ring-[#7463A6]/25'
                  : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
              }`}
            >
              {/* Visual Preview — Standard Sidebar */}
              <div className="w-24 h-20 rounded-[9px] bg-[#F8F8F6] border border-[#E6E6E0] p-2 flex flex-col justify-between shrink-0">
                <div className="h-1.5 w-10 rounded-full bg-[#CFCFC8]" />
                <div className="space-y-1">
                  <div className="h-3.5 w-full rounded-[5px] bg-[#7463A6] flex items-center px-1.5">
                    <div className="h-1 w-10 rounded-full bg-white" />
                  </div>
                  <div className="h-3 w-full rounded-[5px] bg-white border border-[#ECECE6] flex items-center px-1.5">
                    <div className="h-1 w-8 rounded-full bg-[#9E9E96]" />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-medium text-[#1E1E1E]">
                    Standard Sidebar
                  </span>
                  {(form.sidebarStyle || 'standard') === 'standard' && (
                    <span className="w-5 h-5 rounded-full bg-[#7463A6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6E6E6A] mt-1 leading-relaxed">
                  Clean section labels with solid muted-purple active pills.
                </p>
              </div>
            </button>

            {/* Option 2: Rib-Cage Sidebar */}
            <button
              type="button"
              onClick={() => handleSidebarStyleSelect('ribcage')}
              className={`text-left p-4 rounded-[12px] border transition-all cursor-pointer flex items-start gap-4 ${
                form.sidebarStyle === 'ribcage'
                  ? 'border-[#7463A6] bg-[#F1EEF8]/35 ring-1 ring-[#7463A6]/25'
                  : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
              }`}
            >
              {/* Visual Preview — Rib-Cage Sidebar */}
              <div className="w-24 h-20 rounded-[9px] bg-[#F8F8F6] border border-[#E6E6E0] p-2 flex flex-col justify-between shrink-0">
                <div className="h-3.5 w-full rounded-[5px] bg-white border border-[#DCDCD4] flex items-center px-1.5">
                  <div className="h-1 w-11 rounded-full bg-[#4A4A46]" />
                </div>
                <div className="pl-2.5 space-y-1 relative">
                  <div className="relative flex items-center">
                    <span className="w-2 h-2 border-l border-b border-[#CFCFC8] rounded-bl-[4px] mr-1" />
                    <div className="h-3 flex-1 rounded-[4px] bg-[#F1EEF8] flex items-center px-1">
                      <div className="h-1 w-8 rounded-full bg-[#7463A6]" />
                    </div>
                  </div>
                  <div className="relative flex items-center">
                    <span className="w-2 h-2 border-l border-b border-[#CFCFC8] rounded-bl-[4px] mr-1" />
                    <div className="h-3 flex-1 rounded-[4px] flex items-center px-1">
                      <div className="h-1 w-7 rounded-full bg-[#9E9E96]" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13.5px] font-medium text-[#1E1E1E]">
                    Rib-Cage Sidebar
                  </span>
                  {form.sidebarStyle === 'ribcage' && (
                    <span className="w-5 h-5 rounded-full bg-[#7463A6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-[#6E6E6A] mt-1 leading-relaxed">
                  Hierarchical parent cards with curved rib-like child connectors and pale-purple active states.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hotel Profile & Branding */}
        <div className="bg-[#F0F0EC] p-[3px] rounded-[16px]">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#0D9488]" />
            <h2 className="text-[14px] font-medium text-[#1E1E1E]">
              Hotel Profile & Branding
            </h2>
          </div>

          <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Hotel Name
                </label>
                <input
                  type="text"
                  value={form.hotelName}
                  onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Brand Tagline
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Reservation Email
                </label>
                <input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Front Desk Phone Number
                </label>
                <input
                  type="text"
                  value={form.contactPhone}
                  onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                Headquarters / Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
              />
            </div>
          </div>
        </div>

        {/* Currency, Tax & Date Format */}
        <div className="bg-[#F0F0EC] p-[3px] rounded-[16px]">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#285A84]" />
            <h2 className="text-[14px] font-medium text-[#1E1E1E]">
              Currency, Tax & Date Format
            </h2>
          </div>

          <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Currency
                </label>
                <Dropdown
                  value={form.currencyCode}
                  onChange={(val: string) =>
                    setForm({
                      ...form,
                      currencyCode: val,
                      currencySymbol: val === 'USD' ? '$' : val === 'GBP' ? '£' : '₦',
                    })
                  }
                  options={[
                    { label: 'Nigerian Naira (₦ - NGN)', value: 'NGN' },
                    { label: 'US Dollar ($ - USD)', value: 'USD' },
                    { label: 'British Pound (£ - GBP)', value: 'GBP' },
                  ]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Tax Percentage (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  max={50}
                  value={form.defaultTaxRatePercent}
                  onChange={(e) =>
                    setForm({ ...form, defaultTaxRatePercent: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Date Format
                </label>
                <Dropdown
                  value={form.dateFormat}
                  onChange={(val: string) =>
                    setForm({
                      ...form,
                      dateFormat: val as HotelSettings['dateFormat'],
                    })
                  }
                  options={[
                    { label: 'MMM D, YYYY (Oct 24, 2026)', value: 'MMM D, YYYY' },
                    { label: 'DD/MM/YYYY (24/10/2026)', value: 'DD/MM/YYYY' },
                    { label: 'YYYY-MM-DD (2026-10-24)', value: 'YYYY-MM-DD' },
                  ]}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
                  Time Zone
                </label>
                <Dropdown
                  value={form.timezone}
                  onChange={(val: string) => setForm({ ...form, timezone: val })}
                  options={[
                    { label: 'Africa/Lagos (WAT, UTC+1)', value: 'Africa/Lagos (WAT, UTC+1)' },
                    { label: 'Europe/London (GMT)', value: 'Europe/London (GMT)' },
                    { label: 'America/New_York (EST)', value: 'America/New_York (EST)' },
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications & Threshold Alerts */}
      <div className="bg-[#F0F0EC] p-[3px] rounded-[16px]">
        <div className="px-4 py-2.5 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#D97706]" />
          <h2 className="text-[14px] font-medium text-[#1E1E1E]">
            Notifications & Threshold Alerts
          </h2>
        </div>

        <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Low Stock Alerts */}
          <div className="p-4 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                  Low Stock
                </h3>
                <p className="text-[12px] text-[#6E6E6A] mt-0.5">
                  Flag inventory items when stock drops to or below threshold.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    lowStockNotificationEnabled: !form.lowStockNotificationEnabled,
                  })
                }
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  form.lowStockNotificationEnabled ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    form.lowStockNotificationEnabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {form.lowStockNotificationEnabled && (
              <div>
                <label className="block text-[11.5px] font-normal text-[#4A4A46] mb-1">
                  Default Reorder Threshold (Units)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.lowStockDefaultThreshold}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      lowStockDefaultThreshold: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            )}
          </div>

          {/* Outstanding or Overdue Payments */}
          <div className="p-4 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                  Outstanding or Overdue Payments
                </h3>
                <p className="text-[12px] text-[#6E6E6A] mt-0.5">
                  Highlight unpaid bookings and POS/Restaurant orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    overduePaymentAlertEnabled: !form.overduePaymentAlertEnabled,
                  })
                }
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  form.overduePaymentAlertEnabled ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    form.overduePaymentAlertEnabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {form.overduePaymentAlertEnabled && (
              <div>
                <label className="block text-[11.5px] font-normal text-[#4A4A46] mb-1">
                  Outstanding Balance Threshold (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  step={5000}
                  value={form.overduePaymentThresholdAmount}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      overduePaymentThresholdAmount: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            )}
          </div>

          {/* Laundry Ready for Collection / Uncollected Laundry */}
          <div className="p-4 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-medium text-[#1E1E1E]">
                  Laundry Ready for Collection
                </h3>
                <p className="text-[12px] text-[#6E6E6A] mt-0.5">
                  Alert staff when cleaned garments remain uncollected past threshold days.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    uncollectedLaundryAlertEnabled: !form.uncollectedLaundryAlertEnabled,
                  })
                }
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                  form.uncollectedLaundryAlertEnabled ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    form.uncollectedLaundryAlertEnabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {form.uncollectedLaundryAlertEnabled && (
              <div>
                <label className="block text-[11.5px] font-normal text-[#4A4A46] mb-1">
                  Storage Threshold (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.uncollectedLaundryThresholdDays}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      uncollectedLaundryThresholdDays: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-1.5 bg-white border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  );
};
export default HotelSettingsPage;
