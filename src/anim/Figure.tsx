import { useEffect, useMemo, useRef } from 'react';
import { GROUND_Y, SEGMENTS, solveAnchored, timeline, type Joints } from './skeleton';
import type { Clip, Pose, Prop, Vec } from './types';
import { getClip } from './registry';

/**
 * Renders an exercise as calm line art. One stroke style everywhere:
 * 3.2 px round strokes in currentColor, far limbs at 30 % opacity, equipment in a muted tone,
 * the load (bar, dumbbell, kettlebell) in the accent colour.
 */
export function ExerciseFigure({
  animation,
  animate = true,
  size,
  className,
  title,
  frame,
}: {
  animation: string;
  animate?: boolean;
  /** Show this keyframe, not animated. */
  frame?: number;
  size?: number;
  className?: string;
  title?: string;
}) {
  const clip = getClip(animation);
  const svgRef = useRef<SVGSVGElement>(null);
  const tl = useMemo(() => (clip ? timeline(clip) : null), [clip]);

  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const still = clip ? clip.keyframes[Math.min(clip.keyframes.length - 1, frame ?? clip.still ?? clip.keyframes.length - 1)].pose : null;

  useEffect(() => {
    if (!clip || !tl || !animate || frame !== undefined || reduced || !svgRef.current) return;
    let raf = 0;
    const t0 = performance.now();
    const svg = svgRef.current;
    const tick = (now: number) => {
      draw(svg, clip, tl.at(now - t0));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip, tl, animate, reduced, frame]);

  if (!clip || !still) return <div className={className} style={size ? { width: size, height: size } : undefined} />;
  const shapes = render(clip, still);
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? 'Exercise illustration'}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" x2="94" y1={GROUND_Y + 2.4} y2={GROUND_Y + 2.4} stroke="var(--line)" strokeWidth={1.6} />
      <g data-layer="static">{shapes.staticProps}</g>
      <g data-layer="far" stroke="currentColor" strokeWidth={3.2} opacity={clip.view === 'front' ? 1 : 0.3}>
        <path data-part="legFar" d={shapes.paths.legFar} />
        <path data-part="armFar" d={shapes.paths.armFar} />
      </g>
      <g data-layer="near" stroke="currentColor" strokeWidth={3.2}>
        <path data-part="torso" d={shapes.paths.torso} />
        <path data-part="legNear" d={shapes.paths.legNear} />
        <path data-part="armNear" d={shapes.paths.armNear} />
        <circle data-part="head" cx={shapes.joints.head[0]} cy={shapes.joints.head[1]} r={SEGMENTS.headR} fill="var(--surface)" />
      </g>
      <g data-layer="props">{shapes.movingProps}</g>
    </svg>
  );
}

const f = (n: number) => n.toFixed(2);
const pl = (pts: Vec[]) => 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L');

function paths(j: Joints, clip: Clip) {
  const front = clip.view === 'front';
  const heel = (ankle: Vec, toe: Vec): Vec => [ankle[0] - (toe[0] - ankle[0]) * 0.2, ankle[1] - (toe[1] - ankle[1]) * 0.2];
  return {
    torso: front
      ? `${pl([j.hip, j.neck])} ${pl([j.shoulderFar, j.shoulderNear])} ${pl([j.hipFar, j.hipNear])}`
      : pl([j.hip, j.neck]),
    legNear: pl([j.hipNear, j.kneeNear, j.ankleNear, j.toeNear]).replace(/^M/, 'M') + ` ${pl([heel(j.ankleNear, j.toeNear), j.ankleNear])}`,
    legFar: pl([j.hipFar, j.kneeFar, j.ankleFar, j.toeFar]),
    armNear: pl([j.shoulderNear, j.elbowNear, j.wristNear]),
    armFar: pl([j.shoulderFar, j.elbowFar, j.wristFar]),
  };
}

function propAt(j: Joints, at: keyof Joints, offset?: Vec): Vec {
  const p = j[at];
  return [p[0] + (offset?.[0] ?? 0), p[1] + (offset?.[1] ?? 0)];
}

function movingProp(p: Prop, j: Joints, i: number) {
  switch (p.kind) {
    case 'barbell': {
      const [x, y] = propAt(j, p.at, p.offset);
      return (
        <g key={i} data-prop={i} transform={`translate(${f(x)} ${f(y)})`} stroke="var(--accent)" strokeWidth={2.6}>
          <circle r={6.5} />
          <circle r={1.6} fill="var(--accent)" stroke="none" />
        </g>
      );
    }
    case 'dumbbell': {
      const [x, y] = propAt(j, p.at, p.offset);
      return (
        <g key={i} data-prop={i} transform={`translate(${f(x)} ${f(y)})`} stroke="var(--accent)" strokeWidth={2.4}>
          <circle r={3.6} />
        </g>
      );
    }
    case 'kettlebell': {
      const [x, y] = propAt(j, p.at, p.offset);
      return (
        <g key={i} data-prop={i} transform={`translate(${f(x)} ${f(y)})`} stroke="var(--accent)" strokeWidth={2.4}>
          <path d="M-2.4 1.2 A2.6 2.6 0 0 1 2.4 1.2" />
          <circle cy={5.6} r={4.4} />
        </g>
      );
    }
    case 'band':
    case 'cable': {
      const [x, y] = propAt(j, p.to);
      return (
        <line
          key={i}
          data-prop={i}
          x1={p.from[0]}
          y1={p.from[1]}
          x2={f(x)}
          y2={f(y)}
          stroke={p.kind === 'band' ? 'var(--accent)' : 'var(--ink-3)'}
          strokeWidth={p.kind === 'band' ? 1.8 : 1.4}
          strokeDasharray={p.kind === 'band' ? '0' : '0'}
        />
      );
    }
    default:
      return null;
  }
}

function staticProp(p: Prop, i: number) {
  const s = { stroke: 'var(--ink-3)', strokeWidth: 2.4 } as const;
  switch (p.kind) {
    case 'bench':
      return (
        <g key={i} {...s}>
          <line x1={p.x1} x2={p.x2} y1={p.y} y2={p.y} strokeWidth={3} />
          <line x1={p.x1 + 4} x2={p.x1 + 4} y1={p.y} y2={GROUND_Y + 2.4} />
          <line x1={p.x2 - 4} x2={p.x2 - 4} y1={p.y} y2={GROUND_Y + 2.4} />
        </g>
      );
    case 'box':
      return <rect key={i} x={p.x} y={p.y} width={p.w} height={GROUND_Y + 2.4 - p.y} rx={1.5} {...s} />;
    case 'bar':
      return <circle key={i} cx={p.at[0]} cy={p.at[1]} r={1.9} fill="var(--ink-3)" stroke="none" />;
    case 'cable':
      return <circle key={i} cx={p.from[0]} cy={p.from[1]} r={2.4} {...s} strokeWidth={1.6} />;
    case 'band':
      return <circle key={i} cx={p.from[0]} cy={p.from[1]} r={1.4} fill="var(--ink-3)" stroke="none" />;
    default:
      return null;
  }
}

function render(clip: Clip, pose: Pose) {
  const joints = solveAnchored(clip, pose);
  const props = clip.props ?? [];
  return {
    joints,
    paths: paths(joints, clip),
    staticProps: props.map(staticProp),
    movingProps: props.map((p, i) => movingProp(p, joints, i)),
  };
}

/** Update an already-rendered SVG in place (no React re-render per frame). */
function draw(svg: SVGSVGElement, clip: Clip, pose: Pose) {
  const j = solveAnchored(clip, pose);
  const p = paths(j, clip);
  for (const key of ['torso', 'legNear', 'legFar', 'armNear', 'armFar'] as const) svg.querySelector(`[data-part="${key}"]`)?.setAttribute('d', p[key]);
  const head = svg.querySelector('[data-part="head"]');
  head?.setAttribute('cx', f(j.head[0]));
  head?.setAttribute('cy', f(j.head[1]));
  (clip.props ?? []).forEach((prop, i) => {
    const el = svg.querySelector(`[data-prop="${i}"]`);
    if (!el) return;
    if (prop.kind === 'barbell' || prop.kind === 'dumbbell' || prop.kind === 'kettlebell') {
      const [x, y] = propAt(j, prop.at, prop.offset);
      el.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
    } else if (prop.kind === 'band' || prop.kind === 'cable') {
      const [x, y] = propAt(j, prop.to);
      el.setAttribute('x2', f(x));
      el.setAttribute('y2', f(y));
    }
  });
}
