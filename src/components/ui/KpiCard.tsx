import React, { useId } from 'react';
import { LucideIcon } from 'lucide-react';
import { useHotel } from '../../context/HotelContext';
import { formatCompactCurrency, formatCompactNumber } from '../../utils/formatters';

export type KpiIconTone =
  | 'purple'
  | 'teal'
  | 'blue'
  | 'amber'
  | 'green'
  | 'rose'
  | 'neutral';

export interface KpiCardProps {
  /** Primary metric label (supports both `label` and `title` for cross-module compatibility) */
  label?: string;
  title?: string;
  value: string | number;
  fullValueTooltip?: string;
  icon: LucideIcon;
  iconTone?: KpiIconTone;
  tone?: KpiIconTone | 'emerald' | 'red';
  /** Plain-text percentage or performance change e.g. "+14.2%" */
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  /**
   * Whether the trend is financially/operationally favourable.
   * E.g. An increase in revenue is favourable (green), while an increase in expenses is unfavourable (red).
   */
  isTrendFavourable?: boolean;
  /** Comparison label e.g. "vs previous period" (supports `supportingText` or `subtitle`) */
  supportingText?: string;
  subtitle?: string;
  /** Optional legacy trend object for secondary modules */
  trend?: { value: string; positive: boolean };
  accentIcon?: boolean;
  highlight?: boolean;
  /** Numerical time-series data for the right-side sparkline area chart */
  sparklineData?: number[];
}

/**
 * Icon colours without any surrounding background container (per Section 1.4).
 */
const ICON_COLOR_CLASSES: Record<KpiIconTone, string> = {
  purple: 'text-[#7463A6]',
  teal: 'text-[#0D9488]',
  blue: 'text-[#2563EB]',
  amber: 'text-[#D97706]',
  green: 'text-[#16A34A]',
  rose: 'text-[#E11D48]',
  neutral: 'text-[#6E6E6A]',
};

function buildSmoothSparklinePaths(
  data: number[],
  width = 88,
  height = 38
): { linePath: string; areaPath: string } {
  const clean = data.length >= 2 ? data : [0, 0];
  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const range = max - min;

  const padX = 2;
  const topY = 5;
  const bottomY = height - 5;
  const usableW = width - padX * 2;
  const usableH = bottomY - topY;

  const points = clean.map((val, idx) => {
    const x = padX + (idx / (clean.length - 1)) * usableW;
    const y =
      range === 0
        ? topY + usableH / 2
        : bottomY - ((val - min) / range) * usableH;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const midX = Number(((p0.x + p1.x) / 2).toFixed(2));
    linePath += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaPath = `${linePath} L ${lastPt.x} ${height - 2} L ${firstPt.x} ${height - 2} Z`;

  return { linePath, areaPath };
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  title,
  value,
  fullValueTooltip,
  icon: Icon,
  iconTone,
  tone,
  trendText,
  trendDirection = 'neutral',
  isTrendFavourable = true,
  supportingText,
  subtitle,
  trend,
  accentIcon = false,
  highlight = false,
  sparklineData,
}) => {
  const { settings } = useHotel();
  const numberFormat = settings.numberFormat || 'compact';
  const currencySymbol = settings.currencySymbol || '₦';

  const uid = useId().replace(/:/g, '');
  const resolvedLabel = label || title || '';
  const resolvedSupporting = supportingText || subtitle || '';
  const resolvedTrendText = trendText ?? trend?.value;
  const resolvedDirection =
    trendDirection !== 'neutral'
      ? trendDirection
      : trend
      ? trend.positive
        ? 'up'
        : 'down'
      : 'neutral';
  const resolvedFavourable =
    trend !== undefined ? trend.positive : isTrendFavourable;

  const normalizedTone: KpiIconTone | undefined =
    tone === 'emerald'
      ? 'green'
      : tone === 'red'
      ? 'rose'
      : tone;

  const resolvedIconTone: KpiIconTone =
    iconTone || normalizedTone || (accentIcon || highlight ? 'purple' : 'teal');

  const getTrendTextColor = () => {
    if (resolvedDirection === 'neutral') {
      return 'text-[#6E6E6A]';
    }
    return resolvedFavourable ? 'text-[#16A34A]' : 'text-[#DC2626]';
  };

  const getSparklineColor = () => {
    if (resolvedDirection === 'neutral') {
      return settings.accentColor || '#7463A6';
    }
    return resolvedFavourable ? '#16A34A' : '#DC2626';
  };

  const strokeColor = getSparklineColor();
  const sparkPaths =
    sparklineData && sparklineData.length >= 2
      ? buildSmoothSparklinePaths(sparklineData, 88, 38)
      : null;

  const formattedDisplayValue = React.useMemo(() => {
    if (typeof value === 'number') {
      return numberFormat === 'compact'
        ? formatCompactNumber(value)
        : value.toLocaleString('en-US');
    }
    const strVal = String(value).trim();
    if (numberFormat === 'full') {
      if (fullValueTooltip && fullValueTooltip.trim()) {
        return fullValueTooltip;
      }
      // Expand compact strings like "₦1.25M" or "99K" if no tooltip was passed
      const compactMatch = strVal.match(/^(-?[^\d\s.-]*)([\d,.]+)([KMB])$/i);
      if (compactMatch) {
        const prefix = compactMatch[1] || '';
        const numPart = parseFloat(compactMatch[2].replace(/,/g, ''));
        const suffix = compactMatch[3].toUpperCase();
        const mult = suffix === 'B' ? 1_000_000_000 : suffix === 'M' ? 1_000_000 : 1_000;
        if (!isNaN(numPart)) {
          return `${prefix}${Math.round(numPart * mult).toLocaleString('en-US')}`;
        }
      }
      return strVal;
    } else {
      // Compact mode: if full currency or plain number string >= 1,000 is passed, compact it
      const fullNumMatch = strVal.match(/^(-?[^\d\s.%/-]*)([\d,]+(?:\.\d+)?)$/);
      if (fullNumMatch) {
        const prefix = fullNumMatch[1] || '';
        const rawNum = parseFloat(fullNumMatch[2].replace(/,/g, ''));
        if (!isNaN(rawNum) && Math.abs(rawNum) >= 1000) {
          if (prefix) {
            return formatCompactCurrency(rawNum, prefix);
          }
          return formatCompactNumber(rawNum);
        }
      }
      return strVal;
    }
  }, [value, fullValueTooltip, numberFormat, currencySymbol]);

  return (
    <div
      className="bg-[#EFEFED] p-[2.5px] rounded-[14px] flex flex-col justify-between"
      title={fullValueTooltip || String(value)}
    >
      {/* Outer Shell Header: Label on left, bare coloured Icon on right (no square background) */}
      <div className="flex items-center justify-between gap-2 px-3 pt-1.5 pb-1.5">
        <span className="text-[12.5px] font-normal text-[#4A4A46] truncate">
          {resolvedLabel}
        </span>
        <Icon
          className={`w-4 h-4 shrink-0 stroke-[1.9] ${ICON_COLOR_CLASSES[resolvedIconTone]}`}
        />
      </div>

      {/* Inner White Surface shifted upwards — constant Overview reference height */}
      <div className="bg-white rounded-[11.5px] px-3.5 py-3 min-h-[76px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 flex-1">
        <div className="min-w-0 flex-1">
          <div className="text-[23px] sm:text-[25px] leading-tight font-medium text-[#1E1E1E] tabular-nums tracking-tight truncate">
            {formattedDisplayValue}
          </div>

          {(resolvedTrendText || resolvedSupporting) && (
            <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
              {resolvedTrendText && (
                <span
                  className={`text-[12px] font-medium tabular-nums ${getTrendTextColor()}`}
                >
                  {resolvedTrendText}
                </span>
              )}
              {resolvedSupporting && (
                <span className="text-[11.5px] font-normal text-[#7A7A74] truncate">
                  {resolvedSupporting}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right-side Lightweight Sparkline Area Chart */}
        {sparkPaths && (
          <div className="w-[88px] h-[38px] shrink-0 flex items-center justify-end">
            <svg
              width="88"
              height="38"
              viewBox="0 0 88 38"
              fill="none"
              className="overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <filter
                  id={`spark-blur-${uid}`}
                  x="-10%"
                  y="-10%"
                  width="120%"
                  height="120%"
                >
                  <feGaussianBlur in="SourceGraphic" stdDeviation="1.3" />
                </filter>
              </defs>
              <path
                d={sparkPaths.areaPath}
                fill={strokeColor}
                fillOpacity="0.12"
                filter={`url(#spark-blur-${uid})`}
              />
              <path
                d={sparkPaths.linePath}
                stroke={strokeColor}
                strokeWidth="1.65"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
