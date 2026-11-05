// Weekly check-in: three taps, then next week adapts.
import { useEffect, useState } from 'react';
import { getCheckIn, saveCheckIn, today } from '../db/repo';
import { adjustmentFor, checkInTarget, type AheadAnswer, type FeltAnswer, type SleepAnswer } from '../engine/checkin';
import type { WeekPlan } from '../engine/types';
import { dateShort, dayShort, minutes } from '../lib/format';
import { navigate } from '../lib/router';
import { DetailScreen } from '../ui/Layout';
import { Button, Card, cx, SectionTitle, TypeMark } from '../ui/kit';

interface Option<T> {
  value: T;
  label: string;
}

const FELT: Option<FeltAnswer>[] = [
  { value: 'too-easy', label: 'Too easy' },
  { value: 'right', label: 'About right' },
  { value: 'too-hard', label: 'Too hard' },
];
const SLEEP: Option<SleepAnswer>[] = [
  { value: 'good', label: 'Well' },
  { value: 'ok', label: 'Okay' },
  { value: 'poor', label: 'Badly' },
];
const AHEAD: Option<AheadAnswer>[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'busy', label: 'Busy' },
  { value: 'very-busy', label: 'Very busy' },
];

function Question<T extends string>({
  title,
  hint,
  options,
  value,
  onChange,
  id,
}: {
  title: string;
  hint?: string;
  options: Option<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  id: string;
}) {
  return (
    <section className="mt-7">
      <h2 className="px-1 text-[19px] font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 px-1 text-[14px] text-muted">{hint}</p>}
      <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={title}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              data-testid={`${id}-${o.value}`}
              onClick={() => onChange(o.value)}
              className={cx(
                'h-14 rounded-2xl px-2 text-[15px] font-semibold transition-colors duration-150',
                on ? 'bg-accent text-accent-ink' : 'bg-surface text-ink shadow-soft active:bg-surface-2',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function CheckIn() {
  const t = today();
  const weekStart = checkInTarget(t);
  const [felt, setFelt] = useState<FeltAnswer>();
  const [sleep, setSleep] = useState<SleepAnswer>();
  const [ahead, setAhead] = useState<AheadAnswer>();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<WeekPlan>();

  // Pre-fill if this week's check-in was already done (changing it is fine).
  useEffect(() => {
    getCheckIn(weekStart).then((c) => {
      if (!c) return;
      setFelt(c.felt);
      setSleep(c.sleep);
      setAhead(c.ahead);
    });
  }, [weekStart]);

  const complete = felt && sleep && ahead;
  const adj = complete ? adjustmentFor({ felt, sleep, ahead }) : undefined;
  const isNext = weekStart > t;

  const save = async () => {
    if (!complete) return;
    setSaving(true);
    const plan = await saveCheckIn({ weekStart, felt, sleep, ahead });
    setSaving(false);
    setResult(plan);
  };

  if (result) {
    const list = result.sessions.filter((s) => s.date >= t || isNext);
    return (
      <DetailScreen
        title="Check-in"
        onBack={() => navigate('/today')}
        footer={
          <Button block onClick={() => navigate('/today', { replace: true })} data-testid="checkin-done">
            Done
          </Button>
        }
      >
        <div className="mt-4 px-1" data-testid="checkin-result">
          <div className="text-[14px] font-medium text-muted">{isNext ? `Week of ${dateShort(weekStart)}` : 'Rest of this week'}</div>
          <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">Your week is ready</h1>
        </div>
        {adj && (
          <Card className="mt-5 space-y-2">
            {adj.notes.map((n) => (
              <p key={n} className="text-[15px] leading-snug">
                {n}
              </p>
            ))}
          </Card>
        )}
        <SectionTitle>Sessions</SectionTitle>
        <Card className="divide-y divide-line py-1">
          {list.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-3">
              <TypeMark type={s.type} size={34} done={s.status === 'done'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[16px] font-medium">{s.title}</div>
                <div className="text-[14px] text-muted">
                  {dayShort(s.date)} · {minutes(s.durationMin)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </DetailScreen>
    );
  }

  return (
    <DetailScreen
      title="Check-in"
      onBack={() => navigate('/today')}
      footer={
        <Button block disabled={!complete || saving} onClick={save} data-testid="checkin-save">
          {isNext ? 'Plan next week' : 'Update this week'}
        </Button>
      }
    >
      <div className="mt-4 px-1">
        <div className="text-[14px] font-medium text-muted">Three taps</div>
        <h1 className="mt-1 text-[28px] font-bold leading-tight tracking-[-0.02em]">How was your week?</h1>
      </div>

      <Question id="felt" title="How did training feel?" options={FELT} value={felt} onChange={setFelt} />
      <Question id="sleep" title="How did you sleep?" options={SLEEP} value={sleep} onChange={setSleep} />
      <Question
        id="ahead"
        title={isNext ? 'How does next week look?' : 'How does the rest of the week look?'}
        hint="Exams, deadlines, a tournament, travel."
        options={AHEAD}
        value={ahead}
        onChange={setAhead}
      />

      <div className="mt-8 min-h-[7rem]" aria-live="polite">
        {adj && (
          <Card className="fade-in bg-accent-soft shadow-none" data-testid="checkin-preview">
            <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-accent">What changes</div>
            <ul className="mt-2 space-y-1.5">
              {adj.notes.map((n) => (
                <li key={n} className="text-[15px] leading-snug">
                  {n}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-snug text-muted">How hard it felt and how you slept are good guides to how much to do next.</p>
          </Card>
        )}
      </div>
    </DetailScreen>
  );
}
