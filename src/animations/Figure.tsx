import { useEffect, useRef, useState } from 'react';
import { GROUND, SEG, groundSkeleton, poseAt, solve, type AnimationDef, type Prop, type Skeleton, type Vec } from './rig';
import { ANIMATIONS } from './poses';

const STROKE = 2.6;

function anchorPoint(s: Skeleton, a: Prop['anchor']): Vec[] {
  switch (a) {
    case 'handN':
      return [s.handN];
    case 'handF':
      return [s.handF];
    case 'hands':
      return [s.handN, s.handF];
    case 'shoulder':
      return [s.shoulder];
    case 'hip':
      return [s.hip];
    case 'footN':
      return [s.footN];
    case 'footF':
      return [s.footF];
    default:
      return [];
  }
}

function PropShape({ prop, s }: { prop: Prop; s: Skeleton }) {
  const pts = anchorPoint(s, prop.anchor);
  switch (prop.kind) {
    case 'barbell': {
      const p = pts[0] ?? prop.at ?? [50, 50];
      return (
        <g>
          <circle cx={p[0]} cy={p[1]} r={7} className="fig-prop" />
          <circle cx={p[0]} cy={p[1]} r={1.4} className="fig-prop-fill" />
        </g>
      );
    }
    case 'plate': {
      const p = pts[0] ?? prop.at ?? [50, 50];
      return <circle cx={p[0]} cy={p[1]} r={4.5} className="fig-prop" />;
    }
    case 'dumbbell':
      return (
        <g>
          {pts.map((p, i) => (
            <g key={i} opacity={i === 1 ? 0.45 : 1}>
              <line x1={p[0] - 3.2} y1={p[1]} x2={p[0] + 3.2} y2={p[1]} className="fig-prop" />
              <line x1={p[0] - 3.2} y1={p[1] - 2.4} x2={p[0] - 3.2} y2={p[1] + 2.4} className="fig-prop" />
              <line x1={p[0] + 3.2} y1={p[1] - 2.4} x2={p[0] + 3.2} y2={p[1] + 2.4} className="fig-prop" />
            </g>
          ))}
        </g>
      );
    case 'kettlebell':
      return (
        <g>
          {pts.map((p, i) => (
            <g key={i} opacity={i === 1 ? 0.45 : 1}>
              <path d={`M ${p[0] - 1.8} ${p[1] + 1.5} Q ${p[0]} ${p[1] - 2} ${p[0] + 1.8} ${p[1] + 1.5}`} className="fig-prop" />
              <circle cx={p[0]} cy={p[1] + 4.6} r={3.4} className="fig-prop" />
            </g>
          ))}
        </g>
      );
    case 'bench': {
      const [x, y] = prop.at ?? [30, 70];
      const w = prop.w ?? 34;
      return (
        <g className="fig-static">
          <line x1={x} y1={y} x2={x + w} y2={y} />
          <line x1={x + 4} y1={y} x2={x + 4} y2={GROUND} />
          <line x1={x + w - 4} y1={y} x2={x + w - 4} y2={GROUND} />
        </g>
      );
    }
    case 'box': {
      const [x, y] = prop.at ?? [60, 76];
      const w = prop.w ?? 16;
      return <rect x={x} y={y} width={w} height={prop.h ?? GROUND - y} rx={1.2} className="fig-static" />;
    }
    case 'bar': {
      const [x, y] = prop.at ?? [50, 12];
      return (
        <g className="fig-static">
          <line x1={x - 22} y1={y} x2={x + 22} y2={y} />
        </g>
      );
    }
    case 'cable': {
      const from = prop.at ?? [90, 40];
      return (
        <g>
          <circle cx={from[0]} cy={from[1]} r={1.6} className="fig-prop-fill" />
          {pts.map((p, i) => (
            <line key={i} x1={from[0]} y1={from[1]} x2={p[0]} y2={p[1]} className="fig-cable" opacity={i === 1 ? 0.45 : 1} />
          ))}
        </g>
      );
    }
    case 'band': {
      const from = prop.at ?? [90, 40];
      return (
        <g>
          {pts.map((p, i) => (
            <line key={i} x1={from[0]} y1={from[1]} x2={p[0]} y2={p[1]} className="fig-band" opacity={i === 1 ? 0.45 : 1} />
          ))}
        </g>
      );
    }
    case 'mat': {
      const [x] = prop.at ?? [15, GROUND];
      const w = prop.w ?? 70;
      return <line x1={x} y1={GROUND - 0.2} x2={x + w} y2={GROUND - 0.2} className="fig-mat" />;
    }
  }
}

function Body({ s }: { s: Skeleton }) {
  const L = (a: Vec, b: Vec, k?: string) => <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
  return (
    <>
      <g className="fig-far">
        {L(s.shoulder, s.elbowF)}
        {L(s.elbowF, s.handF)}
        {L(s.hip, s.kneeF)}
        {L(s.kneeF, s.footF)}
      </g>
      <g className="fig-near">
        {L(s.hip, s.shoulder)}
        {L(s.shoulder, s.neck)}
        <circle cx={s.headC[0]} cy={s.headC[1]} r={SEG.head} />
        {L(s.hip, s.kneeN)}
        {L(s.kneeN, s.footN)}
        {L(s.shoulder, s.elbowN)}
        {L(s.elbowN, s.handN)}
      </g>
    </>
  );
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function FigureFrame({ def, phase, className }: { def: AnimationDef; phase: number; className?: string }) {
  const raw = solve(poseAt(def, phase));
  const s = def.grounded === false ? raw : groundSkeleton(raw);
  const props = def.props ?? [];
  const isStatic = (p: Prop) => p.kind === 'bench' || p.kind === 'box' || p.kind === 'bar' || p.kind === 'mat';
  return (
    <svg viewBox="0 0 100 100" className={`figure ${className ?? ''}`} aria-hidden="true">
      <line x1={6} y1={GROUND} x2={94} y2={GROUND} className="fig-ground" />
      {props.filter(isStatic).map((p, i) => (
        <PropShape key={`s${i}`} prop={p} s={s} />
      ))}
      <g strokeWidth={STROKE}>
        <Body s={s} />
      </g>
      {props
        .filter((p) => !isStatic(p))
        .map((p, i) => (
          <PropShape key={`m${i}`} prop={p} s={s} />
        ))}
    </svg>
  );
}

/** Animated line-art figure for an exercise. Falls back to a still pose for reduced motion. */
export function ExerciseFigure({
  animationId,
  playing = true,
  className,
  label,
}: {
  animationId: string;
  playing?: boolean;
  className?: string;
  label?: string;
}) {
  const def = ANIMATIONS[animationId] ?? ANIMATIONS['fallback'];
  const [phase, setPhase] = useState(0.5);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing || prefersReducedMotion() || def.keyframes.length < 2) {
      setPhase(def.keyframes.length < 2 ? 0 : 0.5);
      return;
    }
    const duration = def.durationMs ?? 2400;
    const start = performance.now();
    const tick = (now: number) => {
      setPhase(((now - start) / duration) % 1);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [def, playing]);

  return (
    <div role="img" aria-label={label ?? 'Exercise illustration'} className={className}>
      <FigureFrame def={def} phase={phase} />
    </div>
  );
}
