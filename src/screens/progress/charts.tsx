// Small hand-drawn SVG charts. Colours come from CSS variables so both themes work.
import { dateShort } from '../../lib/format';

const ACCENT = 'var(--accent)';
const MUTED = 'var(--muted)';
const LINE = 'var(--line)';

export function Sparkline({ values, width = 64, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={ACCENT} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={ACCENT} />
    </svg>
  );
}

export interface Point {
  date: string;
  value: number;
}

/** Line chart with dates on x. Y axis shows min and max only. */
export function LineChart({
  points,
  format,
  label,
  testId,
  height = 150,
}: {
  points: Point[];
  format: (v: number) => string;
  label: string;
  testId?: string;
  height?: number;
}) {
  const W = 320;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 24;
  if (points.length === 0) return null;
  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) {
    min -= 1;
    max += 1;
  }
  const room = (max - min) * 0.12;
  min -= room;
  max += room;
  const t = points.map((p) => new Date(p.date + 'T00:00:00').getTime());
  const t0 = t[0];
  const tSpan = t[t.length - 1] - t0 || 1;
  const x = (i: number) => (points.length === 1 ? W / 2 : padL + ((t[i] - t0) / tSpan) * (W - padL - padR));
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (height - padT - padB);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const hiIdx = vals.indexOf(Math.max(...vals));
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={label} data-testid={testId} className="tnum block overflow-visible">
      {[0, 1, 2].map((i) => {
        const yy = padT + (i / 2) * (height - padT - padB);
        return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke={LINE} strokeWidth={1} strokeDasharray={i === 2 ? undefined : '2 4'} />;
      })}
      {points.length > 1 && <path d={path} fill="none" stroke={ACCENT} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.5} fill={ACCENT} />
      ))}
      <text x={Math.min(Math.max(x(hiIdx), 28), W - 28)} y={y(vals[hiIdx]) - 8} textAnchor="middle" fontSize={11} fill={MUTED}>
        {format(vals[hiIdx])}
      </text>
      {hiIdx !== points.length - 1 && (
        <text x={Math.min(x(points.length - 1), W - 28)} y={y(last.value) - 8} textAnchor="middle" fontSize={11} fill={MUTED}>
          {format(last.value)}
        </text>
      )}
      <text x={padL} y={height - 6} fontSize={11} fill={MUTED} textAnchor="start">
        {dateShort(points[0].date)}
      </text>
      {points.length > 1 && (
        <text x={W - padR} y={height - 6} fontSize={11} fill={MUTED} textAnchor="end">
          {dateShort(last.date)}
        </text>
      )}
    </svg>
  );
}

export interface Bar {
  label: string;
  value: number;
  /** Highlight (current week). */
  strong?: boolean;
}

/** Vertical bars with a value label above each non-empty bar. */
export function BarChart({ bars, format, label, testId, height = 130 }: { bars: Bar[]; format: (v: number) => string; label: string; testId?: string; height?: number }) {
  const W = 320;
  const padT = 18;
  const padB = 22;
  const max = Math.max(...bars.map((b) => b.value), 1);
  const slot = W / bars.length;
  const bw = Math.min(26, slot * 0.6);
  const plotH = height - padT - padB;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={label} data-testid={testId} className="tnum block">
      <line x1={0} x2={W} y1={height - padB} y2={height - padB} stroke={LINE} strokeWidth={1} />
      {bars.map((b, i) => {
        const h = b.value > 0 ? Math.max(3, (b.value / max) * plotH) : 0;
        const cx = slot * i + slot / 2;
        return (
          <g key={i}>
            {b.value > 0 && <rect x={cx - bw / 2} y={height - padB - h} width={bw} height={h} rx={5} fill={ACCENT} opacity={b.strong ? 1 : 0.55} />}
            {b.value > 0 && (
              <text x={cx} y={height - padB - h - 5} textAnchor="middle" fontSize={11} fill={MUTED}>
                {format(b.value)}
              </text>
            )}
            <text x={cx} y={height - 6} textAnchor="middle" fontSize={11} fill={MUTED}>
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
