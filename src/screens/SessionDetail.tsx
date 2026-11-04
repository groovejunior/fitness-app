import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  commitSession, committedWorkout, restoreSession, skipSession, swapExercise, uncommitSession, updateSession, workoutOptions,
} from '../db/repo';
import { sourceLine } from '../engine';
import type { StrengthItem, Workout, WorkoutOptions } from '../engine/types';
import { dayAndDate, minutes } from '../lib/format';
import { useProfile, useSession } from '../lib/hooks';
import { navigate, back } from '../lib/router';
import { DetailScreen } from '../ui/Layout';
import { Button, Card, Empty, Notice, Tag, TypeMark, cx } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { Controls } from './detail/Controls';
import { ExerciseSheet } from './detail/ExerciseSheet';
import { WorkoutView } from './detail/WorkoutView';

type Variant = 'recommended' | 'alternative';

function OptionCard({ w, label, selected, onClick }: { w: Workout; label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid={`variant-${w.variant}`}
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'flex min-w-0 flex-col rounded-card p-4 text-left shadow-soft transition-all duration-200 active:scale-[0.99]',
        selected ? 'bg-accent-soft ring-2 ring-accent' : 'bg-surface ring-2 ring-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cx('text-[12px] font-semibold uppercase tracking-[0.06em]', selected ? 'text-accent' : 'text-muted')}>{label}</span>
        {selected && <Icon name="check" size={16} className="text-accent" />}
      </div>
      <div className="mt-1.5 text-[16px] font-semibold leading-tight">{w.title}</div>
      <div className="mt-1 line-clamp-3 text-[13px] leading-snug text-muted">{w.summary}</div>
      <div className="tnum mt-auto pt-2 text-[13px] font-medium text-ink-2">{minutes(w.durationMin)}</div>
    </button>
  );
}

export function SessionDetail({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const profile = useProfile();
  const frozen = useLiveQuery(
    async () => (session && session.status !== 'planned' ? ((await committedWorkout(sessionId)) ?? null) : null),
    [sessionId, session?.status],
  );

  const [options, setOptions] = useState<WorkoutOptions | undefined>();
  const [failed, setFailed] = useState(false);
  const [swapVersion, setSwapVersion] = useState(0);
  const [picked, setPicked] = useState<Variant | undefined>();
  const [openId, setOpenId] = useState<string | null>(null);
  const reqId = useRef(0);

  const planned = session?.status === 'planned';
  const sKey = session ? `${session.equipment}|${session.durationMin}|${session.intensity}|${session.emphasis ?? ''}` : '';

  useEffect(() => {
    if (!session || !planned) return;
    const my = ++reqId.current;
    workoutOptions(session)
      .then((o) => {
        if (my !== reqId.current) return;
        setOptions(o);
        setFailed(!o);
      })
      .catch(() => my === reqId.current && setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, planned, sKey, swapVersion]);

  const variant: Variant = picked ?? session?.chosenOption ?? 'recommended';
  const selected: Workout | undefined = planned ? options?.[variant] : (frozen ?? undefined);

  const openItem = useMemo(() => {
    if (!openId || !selected) return undefined;
    return selected.blocks.flatMap((b) => b.items).find((i): i is StrengthItem => i.kind === 'strength' && i.exerciseId === openId);
  }, [openId, selected]);

  if (session === undefined || profile === undefined) return <DetailScreen><div className="h-96" /></DetailScreen>;
  if (session === null) {
    return (
      <DetailScreen>
        <Empty icon="calendar" title="Session not found" action={<Button variant="secondary" onClick={() => navigate('/today', { replace: true })}>Back to today</Button>}>
          It may have been moved when the week was replanned.
        </Empty>
      </DetailScreen>
    );
  }

  const s = session;
  const units = profile?.units ?? 'metric';

  const pickVariant = (v: Variant) => {
    setPicked(v);
    void updateSession(s.id, { chosenOption: v });
  };
  const commit = async () => {
    if (!selected) return;
    await commitSession(s.id, selected);
    navigate(`/session/${s.id}/active`);
  };
  const skip = async () => {
    await skipSession(s.id);
    back();
  };

  const header = (
    <div className="mb-5 mt-2 flex items-start gap-3 px-1">
      <TypeMark type={s.type} done={s.status === 'done'} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-medium text-muted">{dayAndDate(s.date)}</div>
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em]">{s.title}</h1>
        <div className="mt-1 flex items-center gap-x-2 text-[15px] text-muted">
          <Icon name="clock" size={15} />
          <span className="tnum">{minutes(s.durationMin)}</span>
          <span>·</span>
          <span className="capitalize">{s.intensity}</span>
        </div>
      </div>
      {s.status === 'committed' && <Tag tone="accent">Committed</Tag>}
      {s.status === 'in_progress' && <Tag tone="accent">In progress</Tag>}
    </div>
  );

  // --- Done / skipped -------------------------------------------------------
  if (s.status === 'done') {
    return (
      <DetailScreen>
        <div data-testid="session-detail">
          {header}
          <Card className="p-5">
            <div className="text-[18px] font-semibold">Done</div>
            <p className="mt-1 text-[15px] text-muted">This one is in the books.</p>
            <Button className="mt-4" variant="secondary" block onClick={() => navigate(`/session/${s.id}/done`)}>
              See summary
            </Button>
          </Card>
        </div>
      </DetailScreen>
    );
  }
  if (s.status === 'skipped') {
    return (
      <DetailScreen>
        <div data-testid="session-detail">
          {header}
          <Notice tone="info">Skipped.</Notice>
          <Button className="mt-4" variant="secondary" block data-testid="restore-session" onClick={() => void restoreSession(s.id)}>
            Put it back
          </Button>
        </div>
      </DetailScreen>
    );
  }

  // --- Planned / committed --------------------------------------------------
  const footer = planned ? (
    <div className="flex flex-col items-center gap-1">
      <Button block data-testid="commit-workout" disabled={!selected} onClick={() => void commit()}>
        Today I'm doing this
      </Button>
      <button type="button" data-testid="skip-session" onClick={() => void skip()} className="h-10 px-4 text-[14px] font-medium text-muted active:opacity-60">
        Skip this session
      </button>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-1">
      <Button block data-testid="start-workout" icon="play" onClick={() => navigate(`/session/${s.id}/active`)}>
        {s.status === 'in_progress' ? 'Continue' : 'Start workout'}
      </Button>
      {s.status === 'committed' && (
        <button type="button" data-testid="change-plan" onClick={() => void uncommitSession(s.id)} className="h-10 px-4 text-[14px] font-medium text-muted active:opacity-60">
          Change the plan
        </button>
      )}
    </div>
  );

  return (
    <DetailScreen footer={footer}>
      <div data-testid="session-detail">
        {header}
        {selected?.source && (
          <p data-testid="workout-why" className="-mt-3 mb-4 px-1 text-[14px] leading-snug text-muted">
            {sourceLine(selected.source)}
          </p>
        )}
        {planned && <Controls session={s} />}

        {planned && options && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <OptionCard w={options.recommended} label="Recommended" selected={variant === 'recommended'} onClick={() => pickVariant('recommended')} />
            <OptionCard w={options.alternative} label="Alternative" selected={variant === 'alternative'} onClick={() => pickVariant('alternative')} />
          </div>
        )}
        {planned && !options && !failed && <div className="mt-6 px-1 text-[15px] text-muted">Putting it together…</div>}
        {planned && failed && !options && (
          <div className="mt-4">
            <Notice>Could not build this workout. There may be no training block yet.</Notice>
          </div>
        )}
        {!planned && selected && <p className="mb-1 px-1 text-[15px] leading-snug text-ink-2">{selected.summary}</p>}
        {!planned && frozen === null && <Notice>The saved workout is missing. Tap "Change the plan" to build it again.</Notice>}

        {selected && (
          <div className={cx('transition-opacity duration-200')}>
            <WorkoutView workout={selected} units={units} onOpenExercise={setOpenId} />
          </div>
        )}
      </div>

      <ExerciseSheet
        exerciseId={openId}
        note={openItem?.note}
        context={s.equipment}
        profile={profile}
        canSwap={!!planned}
        onClose={() => setOpenId(null)}
        onSwap={async (toId) => {
          if (!openId) return;
          await swapExercise(s.id, openId, toId);
          setOpenId(null);
          setSwapVersion((v) => v + 1);
        }}
      />
    </DetailScreen>
  );
}
