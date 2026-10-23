import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Inbox,
  X,
} from 'lucide-react';
import { DateRangeFilter, DateFilterPreset } from '../../types/hotel';
import {
  getPresetDateRange,
  formatDateReadable,
  TODAY_STR,
} from '../../utils/formatters';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 mb-4">
      <div>
        <h1 className="text-[22px] sm:text-[23px] font-medium text-[#1E1E1E] tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] font-normal text-[#6E6E6A] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function toYmd(year: number, monthZeroIndexed: number, day: number): string {
  const m = String(monthZeroIndexed + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function buildCalendarGrid(viewYear: number, viewMonth: number) {
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells: {
    ymd: string;
    day: number;
    isCurrentMonth: boolean;
  }[] = [];

  const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    cells.push({
      ymd: toYmd(prevYear, prevMonth, d),
      day: d,
      isCurrentMonth: false,
    });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      ymd: toYmd(viewYear, viewMonth, d),
      day: d,
      isCurrentMonth: true,
    });
  }

  const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({
      ymd: toYmd(nextYear, nextMonth, nextDay),
      day: nextDay,
      isCurrentMonth: false,
    });
    nextDay++;
  }

  return cells;
}

export interface CustomDateRangePickerProps {
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  onApply?: (startDate: string, endDate: string) => void;
  onChange?: (fromDate: string, toDate: string) => void;
  onClear?: () => void;
  allowClear?: boolean;
  placeholder?: string;
  align?: 'left' | 'right';
  className?: string;
  autoOpen?: boolean;
  onAutoOpenHandled?: () => void;
}

/**
 * Reusable compact custom date-range picker popup without preset shortcuts inside the popup.
 * Preserves month/year navigation, calendar grid, Start, End, Clear, Cancel, and Apply controls.
 */
export const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  startDate,
  endDate,
  fromDate,
  toDate,
  onApply,
  onChange,
  onClear,
  allowClear = false,
  placeholder = 'Select date range',
  align = 'right',
  className = '',
  autoOpen = false,
  onAutoOpenHandled,
}) => {
  const resolvedStart = startDate ?? fromDate ?? TODAY_STR;
  const resolvedEnd = endDate ?? toDate ?? TODAY_STR;

  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string>(resolvedStart);
  const [draftEnd, setDraftEnd] = useState<string>(resolvedEnd);
  const [selectingStep, setSelectingStep] = useState<'start' | 'end'>('start');

  const initialMonthDate = useMemo(() => {
    const base = resolvedStart || TODAY_STR;
    const [y, m] = base.split('-').map(Number);
    return {
      year: y || 2026,
      month: (m || 10) - 1,
    };
  }, [resolvedStart]);

  const [viewYear, setViewYear] = useState(initialMonthDate.year);
  const [viewMonth, setViewMonth] = useState(initialMonthDate.month);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftStart(resolvedStart);
    setDraftEnd(resolvedEnd);
  }, [resolvedStart, resolvedEnd]);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      onAutoOpenHandled?.();
    }
  }, [autoOpen, onAutoOpenHandled]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const calendarCells = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDayClick = (ymd: string) => {
    if (!draftStart || (draftStart && draftEnd && selectingStep === 'start')) {
      setDraftStart(ymd);
      setDraftEnd(ymd);
      setSelectingStep('end');
    } else {
      if (ymd < draftStart) {
        setDraftEnd(draftStart);
        setDraftStart(ymd);
      } else {
        setDraftEnd(ymd);
      }
      setSelectingStep('start');
    }
  };

  const handleApply = () => {
    const finalStart = draftStart || TODAY_STR;
    const finalEnd = draftEnd || finalStart;
    const s = finalStart <= finalEnd ? finalStart : finalEnd;
    const e = finalStart <= finalEnd ? finalEnd : finalStart;
    onApply?.(s, e);
    onChange?.(s, e);
    setOpen(false);
  };

  const handleClear = () => {
    if (onClear) {
      setDraftStart('');
      setDraftEnd('');
      onClear();
    } else {
      setDraftStart(TODAY_STR);
      setDraftEnd(TODAY_STR);
      onApply?.(TODAY_STR, TODAY_STR);
      onChange?.(TODAY_STR, TODAY_STR);
    }
    setOpen(false);
  };

  const hasValue = Boolean(resolvedStart && resolvedEnd);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => {
          setDraftStart(resolvedStart || TODAY_STR);
          setDraftEnd(resolvedEnd || TODAY_STR);
          setSelectingStep('start');
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-2 bg-white border rounded-[9px] px-3 py-1.5 text-[12.5px] font-normal text-[#1E1E1E] transition-colors cursor-pointer ${
          open
            ? 'border-[#7463A6] ring-2 ring-[#7463A6]/15'
            : 'border-[#E2E2DC] hover:border-[#CFCFC8]'
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />
        {hasValue ? (
          <span className="tabular-nums text-[#1E1E1E]">
            {formatDateReadable(resolvedStart)}{' '}
            <span className="text-[#8E8E88] mx-0.5">–</span>{' '}
            {formatDateReadable(resolvedEnd)}
          </span>
        ) : (
          <span className="text-[#7E7E78]">{placeholder}</span>
        )}
        {allowClear && hasValue && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onClear?.();
              }
            }}
            className="ml-0.5 p-0.5 rounded-[5px] hover:bg-[#F1EEF8] text-[#8E8E88] hover:text-[#7463A6]"
            title="Clear date filter"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute mt-1.5 z-50 w-[276px] bg-white border border-[#E6E6E0] rounded-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.11)] p-3 select-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Month & Year Navigation Header */}
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-6.5 h-6.5 rounded-[7px] flex items-center justify-center text-[#5A5A55] hover:bg-[#F4F4F0] hover:text-[#1E1E1E] transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="text-[13px] font-medium text-[#1E1E1E]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="w-6.5 h-6.5 rounded-[7px] flex items-center justify-center text-[#5A5A55] hover:bg-[#F4F4F0] hover:text-[#1E1E1E] transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[10.5px] font-normal text-[#8E8E88] py-0.5"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Compact Day Grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarCells.map((cell) => {
              const isStart = Boolean(draftStart && cell.ymd === draftStart);
              const isEnd = Boolean(draftEnd && cell.ymd === draftEnd);
              const isSelected = isStart || isEnd;
              const isInRange = Boolean(
                draftStart &&
                  draftEnd &&
                  cell.ymd > draftStart &&
                  cell.ymd < draftEnd
              );
              const isToday = cell.ymd === TODAY_STR;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => handleDayClick(cell.ymd)}
                  className={`h-7 text-[11.5px] tabular-nums flex items-center justify-center transition-colors cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#7463A6] text-white font-medium rounded-[7px]'
                      : isInRange
                      ? 'bg-[#F1EEF8] text-[#7463A6] font-normal rounded-[4px]'
                      : cell.isCurrentMonth
                      ? 'text-[#1E1E1E] font-normal hover:bg-[#F4F4F0] rounded-[7px]'
                      : 'text-[#BDBDB5] font-normal hover:bg-[#F4F4F0] rounded-[7px]'
                  } ${
                    isToday && !isSelected
                      ? 'ring-1 ring-[#7463A6]/45 font-medium'
                      : ''
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Start & End Readout */}
          <div className="mt-2 pt-2 border-t border-[#F0F0EC] flex items-center justify-between text-[11px] text-[#6E6E6A] tabular-nums">
            <div>
              <span className="text-[#8E8E88]">Start:</span>{' '}
              <span className="text-[#1E1E1E] font-medium">
                {draftStart ? formatDateReadable(draftStart) : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#8E8E88]">End:</span>{' '}
              <span className="text-[#1E1E1E] font-medium">
                {draftEnd ? formatDateReadable(draftEnd) : '—'}
              </span>
            </div>
          </div>

          {/* Actions: Clear, Cancel, Apply */}
          <div className="mt-2 pt-2 border-t border-[#F0F0EC] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-2 py-1 rounded-[7px] text-[11.5px] font-normal text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
            >
              Clear
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2.5 py-1 rounded-[7px] text-[11.5px] font-normal text-[#5A5A55] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-3 py-1 rounded-[7px] text-[11.5px] font-medium bg-[#7463A6] hover:bg-[#635394] text-white transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export interface CustomSingleDatePickerProps {
  value: string;
  onChange: (ymd: string) => void;
  minDate?: string;
  label?: string;
  required?: boolean;
  className?: string;
  align?: 'left' | 'right';
}

/**
 * Reusable compact single-date calendar picker using the exact same Lumina calendar design.
 */
export const CustomSingleDatePicker: React.FC<CustomSingleDatePickerProps> = ({
  value,
  onChange,
  minDate,
  label,
  required,
  className = '',
  align = 'left',
}) => {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(value || TODAY_STR);

  const initialMonth = useMemo(() => {
    const base = value || TODAY_STR;
    const [y, m] = base.split('-').map(Number);
    return { year: y || 2026, month: (m || 10) - 1 };
  }, [value]);

  const [viewYear, setViewYear] = useState(initialMonth.year);
  const [viewMonth, setViewMonth] = useState(initialMonth.month);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setDraftDate(value);
      const [y, m] = value.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [value]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const calendarCells = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[12px] font-normal text-[#4A4A46] mb-1">
          {label} {required && <span className="text-[#DC2626]">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          setDraftDate(value || TODAY_STR);
          setOpen((o) => !o);
        }}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-[9px] px-3 py-2 text-[13px] font-normal text-[#1E1E1E] transition-colors cursor-pointer ${
          open
            ? 'border-[#7463A6] ring-2 ring-[#7463A6]/15'
            : 'border-[#E2E2DC] hover:border-[#CFCFC8]'
        }`}
      >
        <span className="tabular-nums truncate">
          {value ? formatDateReadable(value) : 'Select date'}
        </span>
        <Calendar className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute mt-1.5 z-50 w-[268px] bg-white border border-[#E6E6E0] rounded-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.11)] p-3 select-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
              className="w-6.5 h-6.5 rounded-[7px] flex items-center justify-center text-[#5A5A55] hover:bg-[#F4F4F0]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="text-[13px] font-medium text-[#1E1E1E]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
              className="w-6.5 h-6.5 rounded-[7px] flex items-center justify-center text-[#5A5A55] hover:bg-[#F4F4F0]"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[10.5px] font-normal text-[#8E8E88] py-0.5"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarCells.map((cell) => {
              const disabled = Boolean(minDate && cell.ymd < minDate);
              const isSelected = cell.ymd === draftDate;
              const isToday = cell.ymd === TODAY_STR;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  disabled={disabled}
                  onClick={() => setDraftDate(cell.ymd)}
                  className={`h-7 text-[11.5px] tabular-nums flex items-center justify-center transition-colors rounded-[7px] ${
                    disabled
                      ? 'text-[#D6D6D0] cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#7463A6] text-white font-medium cursor-pointer'
                      : cell.isCurrentMonth
                      ? 'text-[#1E1E1E] font-normal hover:bg-[#F4F4F0] cursor-pointer'
                      : 'text-[#BDBDB5] font-normal hover:bg-[#F4F4F0] cursor-pointer'
                  } ${
                    isToday && !isSelected
                      ? 'ring-1 ring-[#7463A6]/45 font-medium'
                      : ''
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-[#F0F0EC] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDraftDate(TODAY_STR)}
              className="px-2 py-1 rounded-[7px] text-[11.5px] font-normal text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#F4F4F0] cursor-pointer"
            >
              Clear
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-2.5 py-1 rounded-[7px] text-[11.5px] font-normal text-[#5A5A55] hover:bg-[#F4F4F0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(draftDate);
                  setOpen(false);
                }}
                className="px-3 py-1 rounded-[7px] text-[11.5px] font-medium bg-[#7463A6] hover:bg-[#635394] text-white cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export interface CustomTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  optional?: boolean;
  placeholder?: string;
  align?: 'left' | 'right';
  className?: string;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const ITEM_HEIGHT = 32;

/**
 * Minimal iPhone-style vertical scrolling 24-hour time picker with Hours (00-23) and Minutes (00-59) columns.
 */
export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  label,
  optional = false,
  placeholder = 'Select time',
  align = 'left',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const parsedHour =
    value && value.includes(':') ? value.split(':')[0].padStart(2, '0') : '14';
  const parsedMinute =
    value && value.includes(':') ? value.split(':')[1].padStart(2, '0') : '00';
  const [selectedHour, setSelectedHour] = useState(parsedHour);
  const [selectedMinute, setSelectedMinute] = useState(parsedMinute);

  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const hourScrollTimeout = useRef<number | null>(null);
  const minuteScrollTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (value && value.includes(':')) {
      const [h, m] = value.split(':');
      setSelectedHour((h || '14').padStart(2, '0'));
      setSelectedMinute((m || '00').padStart(2, '0'));
    }
  }, [value]);

  useEffect(() => {
    if (open) {
      const hIdx = Math.max(0, HOURS_24.indexOf(selectedHour));
      const mIdx = Math.max(0, MINUTES_60.indexOf(selectedMinute));
      requestAnimationFrame(() => {
        if (hourListRef.current) {
          hourListRef.current.scrollTop = hIdx * ITEM_HEIGHT;
        }
        if (minuteListRef.current) {
          minuteListRef.current.scrollTop = mIdx * ITEM_HEIGHT;
        }
      });
    }
  }, [open]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const commitTime = (hr: string, mn: string) => {
    setSelectedHour(hr);
    setSelectedMinute(mn);
    onChange(`${hr}:${mn}`);
  };

  const handleHourScroll = () => {
    if (!hourListRef.current) return;
    if (hourScrollTimeout.current) {
      window.clearTimeout(hourScrollTimeout.current);
    }
    hourScrollTimeout.current = window.setTimeout(() => {
      if (!hourListRef.current) return;
      const idx = Math.min(
        23,
        Math.max(0, Math.round(hourListRef.current.scrollTop / ITEM_HEIGHT))
      );
      const hr = HOURS_24[idx];
      if (hr && hr !== selectedHour) {
        commitTime(hr, selectedMinute);
      }
    }, 80);
  };

  const handleMinuteScroll = () => {
    if (!minuteListRef.current) return;
    if (minuteScrollTimeout.current) {
      window.clearTimeout(minuteScrollTimeout.current);
    }
    minuteScrollTimeout.current = window.setTimeout(() => {
      if (!minuteListRef.current) return;
      const idx = Math.min(
        59,
        Math.max(0, Math.round(minuteListRef.current.scrollTop / ITEM_HEIGHT))
      );
      const mn = MINUTES_60[idx];
      if (mn && mn !== selectedMinute) {
        commitTime(selectedHour, mn);
      }
    }, 80);
  };

  const selectHourAndScroll = (hr: string, idx: number) => {
    commitTime(hr, selectedMinute);
    if (hourListRef.current) {
      hourListRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }
  };

  const selectMinuteAndScroll = (mn: string, idx: number) => {
    commitTime(selectedHour, mn);
    if (minuteListRef.current) {
      minuteListRef.current.scrollTo({
        top: idx * ITEM_HEIGHT,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-[12px] font-normal text-[#4A4A46] mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => {
          if (!value) {
            commitTime(selectedHour, selectedMinute);
          }
          setOpen((o) => !o);
        }}
        className={`w-full flex items-center justify-between gap-2 bg-white border rounded-[10px] px-3 py-2 text-[13px] font-normal transition-colors cursor-pointer ${
          open
            ? 'border-[#7463A6] ring-2 ring-[#7463A6]/15'
            : 'border-[#E2E2DC] hover:border-[#CFCFC8]'
        } ${value ? 'text-[#1E1E1E]' : 'text-[#8E8E88]'}`}
      >
        <span className="tabular-nums truncate">{value || placeholder}</span>
        <Clock className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute mt-1.5 z-50 w-[188px] bg-white border border-[#E6E6E0] rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.11)] p-2.5 select-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Minimal Column Headers */}
          <div className="grid grid-cols-2 gap-1 pb-1.5 mb-1 border-b border-[#F2F2EE] text-[11px] font-normal text-[#8E8E88] text-center">
            <span>Hours</span>
            <span>Minutes</span>
          </div>

          {/* iPhone-style Wheel Container */}
          <div className="relative h-[160px] overflow-hidden">
            {/* Subtle Center Selection Highlight Bar */}
            <div className="pointer-events-none absolute inset-x-1 top-[64px] h-[32px] rounded-[8px] bg-[#F1EEF8]/90 border border-[#7463A6]/20 z-0" />

            <div className="relative z-10 grid grid-cols-2 gap-1 h-full">
              {/* Hours Wheel (00 - 23) */}
              <div
                ref={hourListRef}
                onScroll={handleHourScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingTop: `${ITEM_HEIGHT * 2}px`,
                  paddingBottom: `${ITEM_HEIGHT * 2}px`,
                }}
              >
                {HOURS_24.map((hr, idx) => {
                  const active = selectedHour === hr;
                  return (
                    <button
                      key={hr}
                      type="button"
                      onClick={() => selectHourAndScroll(hr, idx)}
                      style={{ height: `${ITEM_HEIGHT}px` }}
                      className={`w-full snap-center flex items-center justify-center text-[13.5px] tabular-nums transition-colors cursor-pointer ${
                        active
                          ? 'text-[#7463A6] font-medium'
                          : 'text-[#8E8E88] font-normal hover:text-[#1E1E1E]'
                      }`}
                    >
                      {hr}
                    </button>
                  );
                })}
              </div>

              {/* Minutes Wheel (00 - 59) */}
              <div
                ref={minuteListRef}
                onScroll={handleMinuteScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingTop: `${ITEM_HEIGHT * 2}px`,
                  paddingBottom: `${ITEM_HEIGHT * 2}px`,
                }}
              >
                {MINUTES_60.map((mn, idx) => {
                  const active = selectedMinute === mn;
                  return (
                    <button
                      key={mn}
                      type="button"
                      onClick={() => selectMinuteAndScroll(mn, idx)}
                      style={{ height: `${ITEM_HEIGHT}px` }}
                      className={`w-full snap-center flex items-center justify-center text-[13.5px] tabular-nums transition-colors cursor-pointer ${
                        active
                          ? 'text-[#7463A6] font-medium'
                          : 'text-[#8E8E88] font-normal hover:text-[#1E1E1E]'
                      }`}
                    >
                      {mn}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {optional && value && (
            <div className="mt-1.5 pt-1.5 border-t border-[#F2F2EE] flex justify-center">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
                className="text-[11px] font-normal text-[#8E8E88] hover:text-[#1E1E1E] cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export type DateRangeControlProps =
  | {
      value: DateRangeFilter;
      onChange: (filter: DateRangeFilter) => void;
      fromDate?: undefined;
      toDate?: undefined;
      label?: string;
      align?: 'left' | 'right';
    }
  | {
      value?: undefined;
      fromDate: string;
      toDate: string;
      onChange: (from: string, to: string) => void;
      label?: string;
      align?: 'left' | 'right';
    };

export const DateRangeControl: React.FC<DateRangeControlProps> = ({
  value,
  fromDate,
  toDate,
  onChange,
  label,
  align = 'right',
}) => {
  const resolvedValue: DateRangeFilter = useMemo(() => {
    if (value) return value;
    const s = fromDate || '2026-10-01';
    const e = toDate || '2026-10-31';
    const todayPreset = getPresetDateRange('today');
    const last7Preset = getPresetDateRange('last7');
    const last30Preset = getPresetDateRange('last30');
    const monthPreset = getPresetDateRange('month');
    if (s === todayPreset.startDate && e === todayPreset.endDate) {
      return { preset: 'today', startDate: s, endDate: e };
    }
    if (s === last7Preset.startDate && e === last7Preset.endDate) {
      return { preset: 'last7', startDate: s, endDate: e };
    }
    if (s === last30Preset.startDate && e === last30Preset.endDate) {
      return { preset: 'last30', startDate: s, endDate: e };
    }
    if (s === '2026-10-01' && (e === '2026-10-31' || e === monthPreset.endDate)) {
      return { preset: 'month', startDate: s, endDate: e };
    }
    return { preset: 'custom', startDate: s, endDate: e };
  }, [value, fromDate, toDate]);

  const emitChange = (nextFilter: DateRangeFilter) => {
    if (value !== undefined) {
      (onChange as (f: DateRangeFilter) => void)(nextFilter);
    } else {
      const endVal =
        nextFilter.preset === 'month' && nextFilter.startDate === '2026-10-01'
          ? '2026-10-31'
          : nextFilter.endDate;
      (onChange as (from: string, to: string) => void)(nextFilter.startDate, endVal);
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string>(resolvedValue.startDate || TODAY_STR);
  const [draftEnd, setDraftEnd] = useState<string>(resolvedValue.endDate || TODAY_STR);
  const [selectingStep, setSelectingStep] = useState<'start' | 'end'>('start');
  const containerRef = useRef<HTMLDivElement>(null);

  const initialMonthDate = useMemo(() => {
    const base = resolvedValue.startDate || TODAY_STR;
    const [y, m] = base.split('-').map(Number);
    return {
      year: y || 2026,
      month: (m || 10) - 1,
    };
  }, [resolvedValue.startDate]);

  const [viewYear, setViewYear] = useState(initialMonthDate.year);
  const [viewMonth, setViewMonth] = useState(initialMonthDate.month);

  useEffect(() => {
    setDraftStart(resolvedValue.startDate || TODAY_STR);
    setDraftEnd(resolvedValue.endDate || TODAY_STR);
  }, [resolvedValue.startDate, resolvedValue.endDate]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const presets: { key: DateFilterPreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'last30', label: 'Last 30 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const activeLabel = useMemo(() => {
    if (resolvedValue.preset === 'custom' && resolvedValue.startDate && resolvedValue.endDate) {
      return `${formatDateReadable(resolvedValue.startDate)} – ${formatDateReadable(resolvedValue.endDate)}`;
    }
    return presets.find((p) => p.key === resolvedValue.preset)?.label || 'This Month';
  }, [resolvedValue]);

  const calendarCells = useMemo(
    () => buildCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const handleDayClick = (ymd: string) => {
    if (!draftStart || (draftStart && draftEnd && selectingStep === 'start')) {
      setDraftStart(ymd);
      setDraftEnd(ymd);
      setSelectingStep('end');
    } else {
      if (ymd < draftStart) {
        setDraftEnd(draftStart);
        setDraftStart(ymd);
      } else {
        setDraftEnd(ymd);
      }
      setSelectingStep('start');
    }
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5">
      {label && (
        <span className="text-[11.5px] font-medium text-[#6E6E6A] whitespace-nowrap">
          {label}:
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          setCalendarOpen(false);
          setMenuOpen((o) => !o);
        }}
        className={`inline-flex items-center justify-between gap-2 bg-white border rounded-[9px] px-3 py-1.5 text-[12.5px] font-normal text-[#1E1E1E] transition-colors cursor-pointer whitespace-nowrap ${
          menuOpen || calendarOpen
            ? 'border-[#7463A6] ring-2 ring-[#7463A6]/15'
            : 'border-[#E2E2DC] hover:border-[#CFCFC8]'
        }`}
      >
        <Calendar className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />
        <span className="tabular-nums">{activeLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#6E6E6A] shrink-0" />
      </button>

      {menuOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 min-w-[168px] bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_10px_28px_rgba(0,0,0,0.1)] p-1 select-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {presets.map((p) => {
            const active = resolvedValue.preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  if (p.key === 'custom') {
                    setDraftStart(resolvedValue.startDate || TODAY_STR);
                    setDraftEnd(resolvedValue.endDate || TODAY_STR);
                    setSelectingStep('start');
                    setMenuOpen(false);
                    setCalendarOpen(true);
                  } else {
                    emitChange(getPresetDateRange(p.key));
                    setMenuOpen(false);
                    setCalendarOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-[8px] text-[12.5px] text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#F1EEF8] text-[#7463A6] font-medium'
                    : 'text-[#1E1E1E] font-normal hover:bg-[#F4F4F0]'
                }`}
              >
                <span>{p.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-[#7463A6]" />}
              </button>
            );
          })}
        </div>
      )}

      {calendarOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 w-[276px] bg-white border border-[#E6E6E0] rounded-[12px] shadow-[0_12px_32px_rgba(0,0,0,0.11)] p-3 select-none ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
              className="w-6.5 h-6.5 rounded-[7px] flex items-center justify-center text-[#5A5A55] hover:bg-[#F4F4F0] hover:text-[#1E1E1E] transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <div className="text-[13px] font-medium text-[#1E1E1E]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => {
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
              className="w-6.5 h-6.5 rounded-[7px] flex items-center justify-center text-[#5A5A55] hover:bg-[#F4F4F0] hover:text-[#1E1E1E] transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-0.5">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[10.5px] font-normal text-[#8E8E88] py-0.5"
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {calendarCells.map((cell) => {
              const isStart = Boolean(draftStart && cell.ymd === draftStart);
              const isEnd = Boolean(draftEnd && cell.ymd === draftEnd);
              const isSelected = isStart || isEnd;
              const isInRange = Boolean(
                draftStart &&
                  draftEnd &&
                  cell.ymd > draftStart &&
                  cell.ymd < draftEnd
              );
              const isToday = cell.ymd === TODAY_STR;

              return (
                <button
                  key={cell.ymd}
                  type="button"
                  onClick={() => handleDayClick(cell.ymd)}
                  className={`h-7 text-[11.5px] tabular-nums flex items-center justify-center transition-colors cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#7463A6] text-white font-medium rounded-[7px]'
                      : isInRange
                      ? 'bg-[#F1EEF8] text-[#7463A6] font-normal rounded-[4px]'
                      : cell.isCurrentMonth
                      ? 'text-[#1E1E1E] font-normal hover:bg-[#F4F4F0] rounded-[7px]'
                      : 'text-[#BDBDB5] font-normal hover:bg-[#F4F4F0] rounded-[7px]'
                  } ${
                    isToday && !isSelected
                      ? 'ring-1 ring-[#7463A6]/45 font-medium'
                      : ''
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-[#F0F0EC] flex items-center justify-between text-[11px] text-[#6E6E6A] tabular-nums">
            <div>
              <span className="text-[#8E8E88]">Start:</span>{' '}
              <span className="text-[#1E1E1E] font-medium">
                {draftStart ? formatDateReadable(draftStart) : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#8E8E88]">End:</span>{' '}
              <span className="text-[#1E1E1E] font-medium">
                {draftEnd ? formatDateReadable(draftEnd) : '—'}
              </span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-[#F0F0EC] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                emitChange(getPresetDateRange('month'));
                setCalendarOpen(false);
              }}
              className="px-2 py-1 rounded-[7px] text-[11.5px] font-normal text-[#6E6E6A] hover:text-[#1E1E1E] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
            >
              Clear
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                className="px-2.5 py-1 rounded-[7px] text-[11.5px] font-normal text-[#5A5A55] hover:bg-[#F4F4F0] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalStart = draftStart || TODAY_STR;
                  const finalEnd = draftEnd || finalStart;
                  const s = finalStart <= finalEnd ? finalStart : finalEnd;
                  const e = finalStart <= finalEnd ? finalEnd : finalStart;
                  emitChange({
                    preset: 'custom',
                    startDate: s,
                    endDate: e,
                  });
                  setCalendarOpen(false);
                }}
                className="px-3 py-1 rounded-[7px] text-[11.5px] font-medium bg-[#7463A6] hover:bg-[#635394] text-white transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search...', className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-4 h-4 text-[#8E8E88] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#E2E2DC] rounded-[9px] text-[13px] font-normal text-[#1E1E1E] placeholder:text-[#8E8E88] focus:outline-none focus:border-[#7463A6] transition-colors"
      />
    </div>
  );
};

export type BadgeTone =
  | 'green'
  | 'red'
  | 'amber'
  | 'purple'
  | 'peach'
  | 'grey'
  | 'blue';

export const StatusBadge: React.FC<{
  status: string;
  tone?: BadgeTone;
}> = ({ status, tone }) => {
  const resolvedTone: BadgeTone =
    tone ||
    (() => {
      const s = status.toLowerCase();
      if (
        s.includes('paid') &&
        !s.includes('unpaid') &&
        !s.includes('partially')
      )
        return 'green';
      if (
        s === 'available' ||
        s === 'confirmed' ||
        s === 'active' ||
        s === 'on shift' ||
        s === 'approved' ||
        s === 'completed' ||
        s === 'served' ||
        s === 'in stock' ||
        s === 'enabled' ||
        s === 'collected' ||
        s === 'ready' ||
        s === 'ready for collection'
      )
        return 'green';
      if (s === 'checked in' || s === 'occupied' || s === 'vip')
        return 'purple';
      if (
        s === 'partially paid' ||
        s === 'pending' ||
        s === 'cleaning' ||
        s === 'low stock' ||
        s === 'washing' ||
        s === 'drying' ||
        s === 'ironing' ||
        s === 'in kitchen'
      )
        return 'amber';
      if (
        s === 'unpaid' ||
        s === 'cancelled' ||
        s === 'maintenance' ||
        s === 'out of stock' ||
        s === 'rejected' ||
        s === 'overdue'
      )
        return 'red';
      return 'grey';
    })();

  const styles: Record<BadgeTone, string> = {
    green: 'bg-[#E9F5EE] text-[#16A34A]',
    red: 'bg-[#FCECE9] text-[#DC2626]',
    amber: 'bg-[#FEF4E6] text-[#D97706]',
    purple: 'bg-[#F1EEF8] text-[#7463A6]',
    peach: 'bg-[#F1EEF8] text-[#7463A6]',
    grey: 'bg-[#F0F0EC] text-[#6E6E6A]',
    blue: 'bg-[#EBF3FA] text-[#285A84]',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-[7px] text-[11.5px] font-normal whitespace-nowrap ${styles[resolvedTone]}`}
    >
      {status}
    </span>
  );
};

export const Pagination: React.FC<{
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-[#EFEFEA] text-[13px] font-normal text-[#6E6E6A]">
      <div className="tabular-nums">
        Showing <span className="font-medium text-[#1E1E1E]">{startIdx}</span>{' '}
        to <span className="font-medium text-[#1E1E1E]">{endIdx}</span> of{' '}
        <span className="font-medium text-[#1E1E1E]">{totalItems}</span> entries
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="p-1.5 rounded-[8px] border border-[#E2E2DC] bg-white text-[#4A4A46] hover:bg-[#F6F6F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-[8px] text-[13px] font-normal tabular-nums transition-colors ${
              p === currentPage
                ? 'bg-[#7463A6] text-white font-medium'
                : 'bg-white border border-[#E2E2DC] text-[#4A4A46] hover:bg-[#F6F6F4]'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="p-1.5 rounded-[8px] border border-[#E2E2DC] bg-white text-[#4A4A46] hover:bg-[#F6F6F4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon?: React.FC<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
}> = ({
  icon: CustomIcon,
  title,
  description,
  actionLabel,
  onAction,
  action,
}) => {
  const IconComp = CustomIcon || Inbox;
  return (
    <div className="py-12 px-6 text-center flex flex-col items-center justify-center">
      <div className="w-11 h-11 rounded-[11px] bg-[#F6F6F4] flex items-center justify-center text-[#8E8E88] mb-3">
        <IconComp className="w-5.5 h-5.5 stroke-[1.6]" />
      </div>
      <h3 className="text-[15px] font-medium text-[#1E1E1E]">{title}</h3>
      <p className="text-[13px] font-normal text-[#6E6E6A] max-w-sm mt-1">
        {description}
      </p>
      {action ? (
        <div className="mt-4">{action}</div>
      ) : (
        actionLabel &&
        onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-4 px-4 py-2 rounded-[9px] text-[13px] font-medium bg-[#7463A6] text-white hover:bg-[#635394] transition-colors cursor-pointer"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
};

export const TableToolbar: React.FC<{
  left?: React.ReactNode;
  right?: React.ReactNode;
}> = ({ left, right }) => {
  return (
    <div className="p-4 border-b border-[#EFEFEF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
      <div className="flex items-center gap-2.5 flex-1 max-w-md">{left}</div>
      {right && (
        <div className="flex flex-wrap items-center gap-2">{right}</div>
      )}
    </div>
  );
};

export const SelectFilter: React.FC<{
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}> = ({ label, value, onChange, options, className = '' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const selectedLabel =
    options.find((opt) => opt.value === value)?.label || options[0]?.label || value;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1.5 ${className}`}>
      {label && (
        <span className="text-[11.5px] font-medium text-[#6E6E6A] hidden xl:inline whitespace-nowrap">
          {label}:
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 bg-white border rounded-[9px] text-[12.5px] font-normal text-[#1E1E1E] transition-colors cursor-pointer whitespace-nowrap max-w-[190px] ${
          open
            ? 'border-[#7463A6] ring-2 ring-[#7463A6]/15'
            : 'border-[#E2E2DC] hover:border-[#CFCFC8]'
        }`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#6E6E6A] shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[168px] max-w-[230px] max-h-60 overflow-y-auto bg-white border border-[#E6E6E0] rounded-[11px] shadow-[0_10px_28px_rgba(0,0,0,0.1)] p-1 select-none">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[8px] text-[12px] text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#F1EEF8] text-[#7463A6] font-medium'
                    : 'text-[#1E1E1E] font-normal hover:bg-[#F4F4F0]'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-[#7463A6] shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StatusTabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (id: string) => void;
}> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#EFEFEF]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
              isActive
                ? 'bg-[#7463A6] text-white'
                : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111111]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10.5px] tabular-nums ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export const PrimaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className = '', type = 'button', ...props }) => {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-semibold bg-[#7463A6] hover:bg-[#635394] text-white shadow-[0_1px_2px_rgba(116,99,166,0.2)] transition-colors cursor-pointer disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ children, className = '', type = 'button', ...props }) => {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12.5px] font-semibold bg-white hover:bg-[#FAFAFA] text-[#1E1E1E] border border-[#E2E2DC] transition-colors cursor-pointer disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
