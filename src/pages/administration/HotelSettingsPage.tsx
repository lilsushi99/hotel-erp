import React, { useState } from 'react';
import {
  Building2,
  DollarSign,
  Bell,
  Save,
  RotateCcw,
  PanelLeft,
  Check,
  Palette,
  Hash,
  Volume2,
} from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { HotelSettings } from '../../types/hotel';
import { Dropdown } from '../../components/ui/Dropdown';

const ACCENT_PRESETS: { label: string; value: string }[] = [
  { label: 'Default Muted Purple', value: '#7463A6' },
  { label: 'Ocean Blue', value: '#2563EB' },
  { label: 'Emerald Teal', value: '#0D9488' },
  { label: 'Forest Green', value: '#15803D' },
  { label: 'Royal Indigo', value: '#4F46E5' },
  { label: 'Warm Amber', value: '#B45309' },
];

export const HotelSettingsPage: React.FC = () => {
  const { settings, updateSettings, notify } = useHotel();
  const [form, setForm] = useState<HotelSettings>({
    ...settings,
    sidebarStyle: settings.sidebarStyle || 'standard',
    numberFormat: settings.numberFormat || 'compact',
    accentColor: settings.accentColor || '#7463A6',
    alertUnpaidBookings: settings.alertUnpaidBookings ?? true,
    alertUnpaidBarPos: settings.alertUnpaidBarPos ?? true,
    alertUnpaidRestaurant: settings.alertUnpaidRestaurant ?? true,
    alertUnpaidLaundry: settings.alertUnpaidLaundry ?? true,
    uncollectedLaundryAlertEnabled: settings.uncollectedLaundryAlertEnabled ?? true,
    lowStockBeveragesFoodEnabled: settings.lowStockBeveragesFoodEnabled ?? true,
    lowStockStoreKeeperEnabled: settings.lowStockStoreKeeperEnabled ?? true,
    soundNotificationsEnabled: settings.soundNotificationsEnabled ?? true,
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

  const handleNumberFormatSelect = (format: 'full' | 'compact') => {
    setForm((prev) => ({ ...prev, numberFormat: format }));
    updateSettings({ numberFormat: format });
  };

  const handleAccentColorSelect = (color: string) => {
    const clean = color.startsWith('#') ? color : `#${color}`;
    setForm((prev) => ({ ...prev, accentColor: clean }));
    if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
      updateSettings({ accentColor: clean });
    }
  };

  const handleResetAccentColor = () => {
    const def = '#7463A6';
    setForm((prev) => ({ ...prev, accentColor: def }));
    updateSettings({ accentColor: def });
    notify('Accent Color Reset', 'Restored default Muted Purple accent color.', 'info');
  };

  const toggleSetting = (key: keyof HotelSettings) => {
    const nextVal = !form[key];
    const updated: Partial<HotelSettings> = { [key]: nextVal };

    if (
      key === 'alertUnpaidBookings' ||
      key === 'alertUnpaidBarPos' ||
      key === 'alertUnpaidRestaurant' ||
      key === 'alertUnpaidLaundry'
    ) {
      const nextForm = { ...form, [key]: nextVal };
      updated.overduePaymentAlertEnabled = Boolean(
        nextForm.alertUnpaidBookings ||
          nextForm.alertUnpaidBarPos ||
          nextForm.alertUnpaidRestaurant ||
          nextForm.alertUnpaidLaundry
      );
    }

    if (key === 'lowStockBeveragesFoodEnabled' || key === 'lowStockStoreKeeperEnabled') {
      const nextForm = { ...form, [key]: nextVal };
      updated.lowStockNotificationEnabled = Boolean(
        nextForm.lowStockBeveragesFoodEnabled || nextForm.lowStockStoreKeeperEnabled
      );
    }

    setForm((prev) => ({ ...prev, ...updated }));
    updateSettings(updated);
  };

  const currentAccent = form.accentColor || '#7463A6';

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

      {/* Sidebar Appearance & Accent Color Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sidebar Appearance */}
        <div className="bg-[#F0F0EC] p-[3px] rounded-[16px] flex flex-col">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <PanelLeft className="w-4 h-4 text-[#7463A6]" />
            <h2 className="text-[14px] font-medium text-[#1E1E1E]">
              Sidebar Appearance
            </h2>
          </div>

          <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex-1 flex flex-col justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option 1: Standard Sidebar */}
              <button
                type="button"
                onClick={() => handleSidebarStyleSelect('standard')}
                className={`text-left p-3.5 rounded-[12px] border transition-all cursor-pointer flex flex-col gap-3 ${
                  (form.sidebarStyle || 'standard') === 'standard'
                    ? 'border-[#7463A6] bg-[#F1EEF8]/35 ring-1 ring-[#7463A6]/25'
                    : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#1E1E1E]">
                    Standard Sidebar
                  </span>
                  {(form.sidebarStyle || 'standard') === 'standard' && (
                    <span className="w-5 h-5 rounded-full bg-[#7463A6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Visual Preview — Standard Sidebar */}
                <div className="w-full h-16 rounded-[9px] bg-[#F8F8F6] border border-[#E6E6E0] p-2 flex flex-col justify-between">
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

                <p className="text-[11.5px] text-[#6E6E6A] leading-relaxed">
                  Clean section labels with solid accent active pills.
                </p>
              </button>

              {/* Option 2: Rib-Cage Sidebar */}
              <button
                type="button"
                onClick={() => handleSidebarStyleSelect('ribcage')}
                className={`text-left p-3.5 rounded-[12px] border transition-all cursor-pointer flex flex-col gap-3 ${
                  form.sidebarStyle === 'ribcage'
                    ? 'border-[#7463A6] bg-[#F1EEF8]/35 ring-1 ring-[#7463A6]/25'
                    : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#1E1E1E]">
                    Rib-Cage Sidebar
                  </span>
                  {form.sidebarStyle === 'ribcage' && (
                    <span className="w-5 h-5 rounded-full bg-[#7463A6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Visual Preview — Rib-Cage Sidebar */}
                <div className="w-full h-16 rounded-[9px] bg-[#F8F8F6] border border-[#E6E6E0] p-2 flex flex-col justify-between">
                  <div className="h-3.5 w-full rounded-[5px] bg-white border border-[#DCDCD4] flex items-center px-1.5">
                    <div className="h-1 w-11 rounded-full bg-[#4A4A46]" />
                  </div>
                  <div className="pl-2.5 space-y-1 relative">
                    <div className="relative flex items-center">
                      <span
                        className="w-2 h-2 border-l border-b rounded-bl-[4px] mr-1"
                        style={{ borderColor: currentAccent }}
                      />
                      <div className="h-3 flex-1 rounded-[4px] bg-[#F1EEF8] flex items-center px-1">
                        <div className="h-1 w-8 rounded-full bg-[#7463A6]" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11.5px] text-[#6E6E6A] leading-relaxed">
                  Hierarchical parent groups with curved rib-cage connectors.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Accent Color Customization */}
        <div className="bg-[#F0F0EC] p-[3px] rounded-[16px] flex flex-col">
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#7463A6]" />
              <h2 className="text-[14px] font-medium text-[#1E1E1E]">
                Accent Color Customization
              </h2>
            </div>
            <button
              type="button"
              onClick={handleResetAccentColor}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[7px] text-[11.5px] font-normal bg-white border border-[#E2E2DC] text-[#4A4A46] hover:text-[#1E1E1E] hover:bg-[#FAFAFA] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset to Default
            </button>
          </div>

          <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex-1 flex flex-col justify-between gap-4">
            <div>
              <label className="block text-[12px] font-normal text-[#4A4A46] mb-2">
                Curated Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected =
                    currentAccent.toLowerCase() === preset.value.toLowerCase();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleAccentColorSelect(preset.value)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1E1E1E] bg-[#F8F8F6]'
                          : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: preset.value }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span className="text-[12px] font-normal text-[#1E1E1E] truncate">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0F0EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="block text-[12.5px] font-medium text-[#1E1E1E]">
                  Custom Accent Color
                </span>
                <span className="block text-[11.5px] text-[#6E6E6A]">
                  Updates active navigation, primary buttons, and focus states.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative w-9 h-9 rounded-[9px] border border-[#E2E2DC] overflow-hidden cursor-pointer shrink-0 shadow-2xs">
                  <input
                    type="color"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(currentAccent)
                        ? currentAccent
                        : '#7463A6'
                    }
                    onChange={(e) => handleAccentColorSelect(e.target.value)}
                    className="sr-only"
                  />
                  <span
                    className="block w-full h-full"
                    style={{ backgroundColor: currentAccent }}
                  />
                </label>
                <input
                  type="text"
                  value={currentAccent}
                  maxLength={7}
                  onChange={(e) => handleAccentColorSelect(e.target.value)}
                  placeholder="#7463A6"
                  className="w-28 px-3 py-1.5 border border-[#E2E2DC] rounded-[9px] text-[12.5px] font-normal text-[#1E1E1E] uppercase focus:outline-none focus:border-[#7463A6]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Number Formatting & Currency/Tax/Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Number Formatting */}
        <div className="bg-[#F0F0EC] p-[3px] rounded-[16px] flex flex-col">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#7463A6]" />
            <h2 className="text-[14px] font-medium text-[#1E1E1E]">
              Number Formatting
            </h2>
          </div>

          <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex-1 flex flex-col justify-between gap-4">
            <p className="text-[12px] text-[#6E6E6A]">
              Choose how large numbers are displayed across KPI cards and summary figures.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Compact Numbers (K & M) */}
              <button
                type="button"
                onClick={() => handleNumberFormatSelect('compact')}
                className={`text-left p-4 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  (form.numberFormat || 'compact') === 'compact'
                    ? 'border-[#7463A6] bg-[#F1EEF8]/35 ring-1 ring-[#7463A6]/25'
                    : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#1E1E1E]">
                    Compact Numbers (K &amp; M)
                  </span>
                  {(form.numberFormat || 'compact') === 'compact' && (
                    <span className="w-5 h-5 rounded-full bg-[#7463A6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="px-3 py-2 rounded-[8px] bg-[#F8F8F6] border border-[#ECECE6] flex items-center justify-between text-[12px]">
                  <span className="text-[#6E6E6A]">Example:</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {form.currencySymbol}1.2M &middot; {form.currencySymbol}99K
                  </span>
                </div>

                <p className="text-[11.5px] text-[#6E6E6A] leading-relaxed">
                  1,000–999,999 uses K; 1,000,000 and above uses M.
                </p>
              </button>

              {/* Full Numbers */}
              <button
                type="button"
                onClick={() => handleNumberFormatSelect('full')}
                className={`text-left p-4 rounded-[12px] border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  form.numberFormat === 'full'
                    ? 'border-[#7463A6] bg-[#F1EEF8]/35 ring-1 ring-[#7463A6]/25'
                    : 'border-[#E6E6E0] bg-white hover:border-[#CFCFC8]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#1E1E1E]">
                    Full Numbers
                  </span>
                  {form.numberFormat === 'full' && (
                    <span className="w-5 h-5 rounded-full bg-[#7463A6] text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>

                <div className="px-3 py-2 rounded-[8px] bg-[#F8F8F6] border border-[#ECECE6] flex items-center justify-between text-[12px]">
                  <span className="text-[#6E6E6A]">Example:</span>
                  <span className="font-medium text-[#1E1E1E]">
                    {form.currencySymbol}1,200,000 &middot; {form.currencySymbol}99,000
                  </span>
                </div>

                <p className="text-[11.5px] text-[#6E6E6A] leading-relaxed">
                  Displays full comma-separated values across all KPI cards.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Currency, Tax & Date Format */}
        <div className="bg-[#F0F0EC] p-[3px] rounded-[16px] flex flex-col">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[#285A84]" />
            <h2 className="text-[14px] font-medium text-[#1E1E1E]">
              Currency, Tax &amp; Date Format
            </h2>
          </div>

          <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 flex-1 space-y-4">
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

      {/* Hotel Profile & Branding */}
      <div className="bg-[#F0F0EC] p-[3px] rounded-[16px]">
        <div className="px-4 py-2.5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0D9488]" />
          <h2 className="text-[14px] font-medium text-[#1E1E1E]">
            Hotel Profile &amp; Branding
          </h2>
        </div>

        <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Notification Settings */}
      <div className="bg-[#F0F0EC] p-[3px] rounded-[16px]">
        <div className="px-4 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#D97706]" />
            <h2 className="text-[14px] font-medium text-[#1E1E1E]">
              Notification Settings
            </h2>
          </div>

          {/* Sound Notification Toggle in header */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[12px] text-[#4A4A46]">
              <Volume2 className="w-3.5 h-3.5 text-[#7463A6]" />
              <span>Notification Sound</span>
            </div>
            <button
              type="button"
              onClick={() => toggleSetting('soundNotificationsEnabled')}
              className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                form.soundNotificationsEnabled ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                  form.soundNotificationsEnabled ? 'left-4.5' : 'left-0.75'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[13px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5 space-y-5">
          {/* Row 1: Unpaid Departmental Alerts */}
          <div>
            <h3 className="text-[12.5px] font-medium text-[#4A4A46] mb-3">
              Unpaid &amp; Outstanding Balances
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Unpaid Bookings */}
              <div className="p-3.5 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[#1E1E1E]">
                    Unpaid Bookings
                  </div>
                  <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                    Room reservations and accommodation charges with unpaid balances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('alertUnpaidBookings')}
                  className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    form.alertUnpaidBookings ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      form.alertUnpaidBookings ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Unpaid Bar & POS */}
              <div className="p-3.5 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[#1E1E1E]">
                    Unpaid Bar &amp; POS
                  </div>
                  <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                    Pending or partially paid beverage and lounge transactions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('alertUnpaidBarPos')}
                  className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    form.alertUnpaidBarPos ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      form.alertUnpaidBarPos ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Unpaid Restaurant Orders */}
              <div className="p-3.5 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[#1E1E1E]">
                    Unpaid Restaurant Orders
                  </div>
                  <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                    Kitchen and dining orders awaiting guest settlement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('alertUnpaidRestaurant')}
                  className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    form.alertUnpaidRestaurant ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      form.alertUnpaidRestaurant ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Unpaid Laundry Orders */}
              <div className="p-3.5 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex items-start justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium text-[#1E1E1E]">
                    Unpaid Laundry Orders
                  </div>
                  <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                    Guest and walk-in laundry bills with unpaid balances.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('alertUnpaidLaundry')}
                  className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    form.alertUnpaidLaundry ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                      form.alertUnpaidLaundry ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Row 2: Laundry Storage & Inventory Threshold Alerts */}
          <div className="pt-2 border-t border-[#F0F0EC]">
            <h3 className="text-[12.5px] font-medium text-[#4A4A46] mb-3">
              Inventory &amp; Laundry Collection Thresholds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Laundry Ready for Collection */}
              <div className="p-4 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex flex-col justify-between gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-medium text-[#1E1E1E]">
                      Laundry Ready for Collection
                    </h4>
                    <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                      Alert when cleaned garments remain uncollected past configured days.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSetting('uncollectedLaundryAlertEnabled')}
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
                      Collection Threshold (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.uncollectedLaundryThresholdDays}
                      onChange={(e) => {
                        const days = Math.max(1, Number(e.target.value));
                        setForm({
                          ...form,
                          uncollectedLaundryThresholdDays: days,
                        });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-[#E2E2DC] rounded-[9px] text-[13px] focus:outline-none focus:border-[#7463A6]"
                    />
                  </div>
                )}
              </div>

              {/* Low-stock Beverages & Food */}
              <div className="p-4 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex flex-col justify-between gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-medium text-[#1E1E1E]">
                      Low-Stock Beverages &amp; Food
                    </h4>
                    <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                      Flag bar beverages and kitchen food items at or below reorder level.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSetting('lowStockBeveragesFoodEnabled')}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      form.lowStockBeveragesFoodEnabled ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        form.lowStockBeveragesFoodEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {form.lowStockBeveragesFoodEnabled && (
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

              {/* Low-stock Store Keeper Items */}
              <div className="p-4 rounded-[12px] bg-[#F9F9F7] border border-[#EFEFEA] flex flex-col justify-between gap-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[13px] font-medium text-[#1E1E1E]">
                      Low-Stock Store Keeper Items
                    </h4>
                    <p className="text-[11.5px] text-[#6E6E6A] mt-0.5">
                      Alert when housekeeping, toiletries, or maintenance supplies run low.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSetting('lowStockStoreKeeperEnabled')}
                    className={`w-10 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                      form.lowStockStoreKeeperEnabled ? 'bg-[#7463A6]' : 'bg-[#D6D6D0]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                        form.lowStockStoreKeeperEnabled ? 'left-5' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="text-[11.5px] text-[#6E6E6A]">
                  Uses each Store Keeper item&apos;s configured reorder threshold.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
export default HotelSettingsPage;
