import { DateRangeFilter } from '../types/hotel';

export const TODAY_STR = '2026-10-21';

export function formatCurrency(amount: number, symbol = '₦'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return amount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

export function formatCompactCurrency(amount: number, symbol = '₦'): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    const val = (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${symbol}${val}B`;
  }
  if (abs >= 1_000_000) {
    const val = (abs / 1_000_000).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    return `${sign}${symbol}${val}M`;
  }
  if (abs >= 1_000) {
    const val = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${symbol}${val}K`;
  }
  return `${sign}${symbol}${abs.toLocaleString('en-US')}`;
}

export function formatCompactNumber(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 10_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString('en-US');
}

export function formatDateReadable(dateStr: string): string {
  if (!dateStr) return '—';
  const clean = dateStr.split(' ')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const formatDate = formatDateReadable;

export function getInventoryHealthStatus(
  availableQuantity: number,
  reorderLevel: number
): 'In Stock' | 'Low Stock' | 'Out of Stock' {
  if (availableQuantity <= 0) return 'Out of Stock';
  if (availableQuantity <= reorderLevel) return 'Low Stock';
  return 'In Stock';
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const clean = dateStr.split(' ')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn + 'T00:00:00');
  const d2 = new Date(checkOut + 'T00:00:00');
  const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/**
 * Checks if two booking intervals [startA, endA) and [startB, endB) overlap.
 * A checkout date is a boundary, not an occupied night!
 * E.g., Oct 20 to Oct 23 occupies nights Oct 20, 21, 22.
 * So a booking starting Oct 23 does NOT conflict with one ending Oct 23.
 */
export function doBookingDatesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA;
}

export function isDateInRange(
  dateStr: string,
  filterOrFrom: DateRangeFilter | string,
  toDateStr?: string
): boolean {
  const clean = dateStr.split(' ')[0];
  if (typeof filterOrFrom === 'string') {
    const end = toDateStr || filterOrFrom;
    return clean >= filterOrFrom && clean <= end;
  }
  return clean >= filterOrFrom.startDate && clean <= filterOrFrom.endDate;
}

export function getPresetDateRange(
  preset: DateRangeFilter['preset'] | 'week'
): DateRangeFilter & { fromDate: string; toDate: string } {
  const today = TODAY_STR; // 2026-10-21
  if (preset === 'today') {
    return {
      preset: 'today',
      startDate: today,
      endDate: today,
      fromDate: today,
      toDate: today,
    };
  }
  if (preset === 'last7' || preset === 'week') {
    return {
      preset: 'last7',
      startDate: '2026-10-15',
      endDate: today,
      fromDate: '2026-10-15',
      toDate: today,
    };
  }
  if (preset === 'month') {
    return {
      preset: 'month',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      fromDate: '2026-10-01',
      toDate: '2026-10-31',
    };
  }
  return {
    preset: 'custom',
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    fromDate: '2026-10-01',
    toDate: '2026-10-31',
  };
}

export function addDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDatesArray(startDate: string, numDays: number): string[] {
  const arr: string[] = [];
  for (let i = 0; i < numDays; i++) {
    arr.push(addDays(startDate, i));
  }
  return arr;
}

export function exportToCsv(filename: string, rows: Record<string, string | number | undefined>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const cell = row[h] === undefined || row[h] === null ? '' : String(row[h]);
          return `"${cell.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
