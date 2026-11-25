'use client';

import { useMemo, useState } from 'react';
import { money } from '@/lib/money';

interface Day { day: string; orders: number; sales_pesewas: number }

const W = 720;
const H = 240;
const PAD = { top: 16, right: 12, bottom: 28, left: 12 };

/** Interactive sales / orders chart (data comes from the orders database). */
export function SalesChart({ daily }: { daily: Day[] }) {
  const [metric, setMetric] = useState<'sales' | 'orders'>('sales');
  const [range, setRange] = useState<7 | 14 | 30>(30);
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => daily.slice(-range), [daily, range]);
  const values = data.map((d) => (metric === 'sales' ? d.sales_pesewas : d.orders));
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);

  // previous period of the same length, for the trend badge
  const prev = daily.slice(-range * 2, -range).map((d) => (metric === 'sales' ? d.sales_pesewas : d.orders));
  const prevTotal = prev.reduce((a, b) => a + b, 0);
  const trend = prev.length === range && prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`;
  const fmt = (v: number) => (metric === 'sales' ? money(v) : `${v} order${v === 1 ? '' : 's'}`);
  const dayLabel = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[.66rem] uppercase tracking-[.22em] text-muted">{metric === 'sales' ? 'Order value' : 'Orders'} · last {range} days</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-serif text-[clamp(1.9rem,6vw,2.25rem)] text-ink">
            {fmt(total)}
            {trend !== null && (
              <span className={`font-sans text-xs ${trend >= 0 ? 'text-whatsapp' : 'text-danger'}`}>
                {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(0)}% vs previous {range} days
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Seg options={[['sales', 'Sales'], ['orders', 'Orders']]} value={metric} onChange={(v) => setMetric(v as 'sales' | 'orders')} />
          <Seg options={[['7', '7d'], ['14', '14d'], ['30', '30d']]} value={String(range)} onChange={(v) => setRange(Number(v) as 7 | 14 | 30)} />
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label={`${metric === 'sales' ? 'Order value' : 'Orders'} per day for the last ${range} days`} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9A96E" stopOpacity=".35" />
              <stop offset="100%" stopColor="#C9A96E" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH * (1 - t)} y2={PAD.top + innerH * (1 - t)} stroke="rgba(15,13,11,.06)" />
          ))}
          <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="rgba(15,13,11,.15)" />
          <path d={area} fill="url(#salesFill)" />
          <path d={line} fill="none" stroke="#9C7C40" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, i) => (
            <g key={d.day}>
              {/* invisible hover column */}
              <rect x={x(i) - innerW / data.length / 2} y={PAD.top} width={innerW / data.length} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} />
              {(i === 0 || i === data.length - 1 || (range <= 14 ? i % 2 === 0 : i % 5 === 0)) && (
                <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#A99F92">{dayLabel(d.day)}</text>
              )}
            </g>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#0F0D0B" strokeDasharray="3 3" strokeOpacity=".3" />
              <circle cx={x(hover)} cy={y(values[hover])} r="5" fill="#0F0D0B" stroke="#E2CB9C" strokeWidth="2" />
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-3 py-2 text-xs text-ivory shadow-lg"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <span className="block text-ivory/60">{dayLabel(data[hover].day)}</span>
            <span className="font-medium text-gold-light">{money(data[hover].sales_pesewas)}</span> · {data[hover].orders} order{data[hover].orders === 1 ? '' : 's'}
          </div>
        )}
      </div>
      {total === 0 && <p className="mt-3 text-center text-sm text-muted">No orders in this period yet — the chart fills in as orders come in.</p>}
    </div>
  );
}

function Seg({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-ivory p-0.5" role="group">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3.5 py-1.5 text-xs transition-colors ${value === v ? 'bg-ink text-ivory' : 'text-muted hover:text-ink'}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
