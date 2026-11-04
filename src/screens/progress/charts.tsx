import { addDays, parseISODate } from '../../engine';

const INK3 = { fill: 'var(--ink-3)' } as const;
const INK2 = { fill: 'var(--ink-2)' } as const;
const FONT = { fontSize: 10.5, fontVariantNumeric: 'tabular-nums' } as const;

function shortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/* ---------------------------------------------------------------- heatmap */

export function Heatmap({ weekStarts, done, todayIso, label }: { weekStarts: string[]; done: Record<string, number>; todayIso: string; label: string }) {
  const cell = 20;
  const gap = 4;
  const left = 30;
  const top = 14;
  const w = left + weekStarts.length * (cell + gap) - gap;
  const h = top + 7 * (cell + gap) - gap;
  const days = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];
  const months: Array<{ x: number; text: string }> = [];
  let lastMonth = -1;
  weekStarts.forEach((ws, i) => {
    const m = parseISODate(ws).getMonth();
    if (m !== lastMonth) {
      months.push({ x: left + i * (cell + gap), text: parseISODate(ws).toLocaleDateString('en-AU', { month: 'short' }) });
      lastMonth = m;
    }
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={label}>
      {months.map((m) => (
        <text key={m.x} x={m.x} y={9} style={{ ...INK3, ...FONT }}>
          {m.text}
        </text>
      ))}
      {days.map((d, i) => (
        <text key={i} x={0} y={top + i * (cell + gap) + cell / 2 + 3.5} style={{ ...INK3, ...FONT }}>
          {d}
        </text>
      ))}
      {weekStarts.map((ws, c) =>
        Array.from({ length: 7 }, (_, r) => {
          const date = addDays(ws, r);
          if (date > todayIso) return null;
          const n = done[date] ?? 0;
          const isToday = date === todayIso;
          return (
            <rect
              key={date}
              x={left + c * (cell + gap)}
              y={top + r * (cell + gap)}
              width={cell}
              height={cell}
              rx={5}
              style={{ fill: n > 0 ? 'var(--accent)' : 'var(--surface-2)' }}
              fillOpacity={n === 0 ? 1 : n === 1 ? 0.55 : 1}
              stroke={isToday ? 'var(--ink)' : 'none'}
              strokeWidth={isToday ? 1.5 : 0}
            >
              <title>{`${shortDate(date)}: ${n} ${n === 1 ? 'session' : 'sessions'}`}</title>
            </rect>
          );
        }),
      )}
    </svg>
  );
}

/* ----------------------------------------------------------- vertical bars */

export interface BarDatum {
  label: string;
  value: number;
  /** Faint bar drawn behind (e.g. planned). */
  ghost?: number;
}

export function Bars({ data, label, format = (n) => String(n), height = 120 }: { data: BarDatum[]; label: string; format?: (n: number) => string; height?: number }) {
  const w = 320;
  const top = 16;
  const bottom = 18;
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.ghost ?? 0)));
  const slot = w / data.length;
  const bw = Math.min(26, slot - 10);
  const ph = height - top - bottom;
  const y = (v: number) => top + ph - (v / max) * ph;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label={label}>
      <line x1={0} x2={w} y1={top + ph} y2={top + ph} stroke="var(--line)" />
      {data.map((d, i) => {
        const x = i * slot + (slot - bw) / 2;
        return (
          <g key={i}>
            {d.ghost !== undefined && d.ghost > 0 && (
              <rect x={x} y={y(d.ghost)} width={bw} height={top + ph - y(d.ghost)} rx={4} style={{ fill: 'var(--accent)' }} fillOpacity={0.18} />
            )}
            {d.value > 0 && <rect x={x} y={y(d.value)} width={bw} height={Math.max(2, top + ph - y(d.value))} rx={4} style={{ fill: 'var(--accent)' }} />}
            {d.value > 0 && (
              <text x={x + bw / 2} y={y(Math.max(d.value, 0)) - 4} textAnchor="middle" style={{ ...INK2, ...FONT }}>
                {format(d.value)}
              </text>
            )}
            <text x={x + bw / 2} y={height - 4} textAnchor="middle" style={{ ...INK3, ...FONT }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------------------- line chart */

export interface LinePoint {
  date: string;
  value: number;
}

export function LineChart({ points, label, format }: { points: LinePoint[]; label: string; format: (n: number) => string }) {
  const w = 320;
  const h = 150;
  const l = 34;
  const r = 14;
  const t = 22;
  const b = 22;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.2, hi * 0.02, 0.5);
  lo -= pad;
  hi += pad;
  const t0 = parseISODate(points[0].date).getTime();
  const t1 = parseISODate(points[points.length - 1].date).getTime();
  const x = (d: string) => (t1 === t0 ? l + (w - l - r) / 2 : l + ((parseISODate(d).getTime() - t0) / (t1 - t0)) * (w - l - r));
  const y = (v: number) => t + (1 - (v - lo) / (hi - lo)) * (h - t - b);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const first = points[0];
  const last = points[points.length - 1];
  const lastX = x(last.date);
  const firstX = x(first.date);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={label}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={l} x2={w - r} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray="2 4" />
          <text x={l - 6} y={y(v) + 3.5} textAnchor="end" style={{ ...INK3, ...FONT }}>
            {format(v)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.5} style={{ fill: 'var(--accent)' }} />
      ))}
      <text x={Math.max(firstX, l)} y={y(first.value) - 9} textAnchor="start" style={{ ...INK2, ...FONT, fontWeight: 600 }}>
        {format(first.value)}
      </text>
      {points.length > 1 && (
        <text x={Math.min(lastX, w - 2)} y={y(last.value) - 9} textAnchor="end" style={{ ...INK2, ...FONT, fontWeight: 600 }}>
          {format(last.value)}
        </text>
      )}
      <text x={l} y={h - 4} textAnchor="start" style={{ ...INK3, ...FONT }}>
        {shortDate(first.date)}
      </text>
      {points.length > 1 && (
        <text x={w - r} y={h - 4} textAnchor="end" style={{ ...INK3, ...FONT }}>
          {shortDate(last.date)}
        </text>
      )}
    </svg>
  );
}

/* ----------------------------------------------------- horizontal muscle bars */

export interface MuscleDatum {
  label: string;
  value: number;
  prev: number;
}

export function MuscleBars({ data, target, label }: { data: MuscleDatum[]; target: number; label: string }) {
  const w = 320;
  const labelW = 78;
  const valW = 30;
  const rowH = 28;
  const top = 16;
  const max = Math.max(target * 1.3, ...data.map((d) => Math.max(d.value, d.prev)));
  const barW = w - labelW - valW;
  const sx = (v: number) => labelW + (v / max) * barW;
  const h = top + data.length * rowH;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={label}>
      <line x1={sx(target)} x2={sx(target)} y1={top - 4} y2={h} stroke="var(--ink-3)" strokeDasharray="3 3" />
      <text x={sx(target)} y={8} textAnchor="middle" style={{ ...INK3, ...FONT }}>
        {target}
      </text>
      {data.map((d, i) => {
        const cy = top + i * rowH + rowH / 2;
        return (
          <g key={d.label}>
            <text x={0} y={cy + 3.5} style={{ ...INK2, fontSize: 12 }}>
              {d.label}
            </text>
            <rect x={labelW} y={cy - 8} width={Math.max(0, sx(d.prev) - labelW)} height={16} rx={4} style={{ fill: 'var(--accent)' }} fillOpacity={0.18} />
            {d.value > 0 && <rect x={labelW} y={cy - 4.5} width={Math.max(3, sx(d.value) - labelW)} height={9} rx={3} style={{ fill: 'var(--accent)' }} />}
            <text x={w} y={cy + 3.5} textAnchor="end" style={{ ...INK2, ...FONT }}>
              {Number.isInteger(d.value) ? d.value : d.value.toFixed(1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

