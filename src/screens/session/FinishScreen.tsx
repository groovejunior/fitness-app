import { useState } from 'react';
import { Button, Card, SectionLabel, Stepper, TextField, cx } from '../../ui';
import { formatClock, weightLabel, distanceLabel, fromDisplayDistance, type Units } from '../../lib/format';

const EFFORT_LABEL: Record<number, string> = {
  1: '1 – very easy',
  2: '2 – easy',
  3: '3 – light',
  4: '4 – comfortable',
  5: '5 – moderate',
  6: '6 – a bit hard',
  7: '7 – hard',
  8: '8 – very hard',
  9: '9 – nearly all out',
  10: '10 – all out',
};

export interface FinishData {
  effort?: number;
  notes?: string;
  durationMin: number;
  distanceKm?: number;
}

export function FinishScreen({
  units,
  defaultMinutes,
  setsDone,
  setsTotal,
  volumeDisplay,
  run,
  onSave,
  onBack,
}: {
  units: Units;
  defaultMinutes: number;
  setsDone?: number;
  setsTotal?: number;
  volumeDisplay?: number;
  run?: { durationSec: number; stepsDone: number; stepsTotal: number };
  onSave: (d: FinishData) => void;
  onBack: () => void;
}) {
  const [minutes, setMinutes] = useState(Math.max(1, defaultMinutes));
  const [effort, setEffort] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [dist, setDist] = useState('');
  const [saving, setSaving] = useState(false);

  const save = () => {
    if (saving) return;
    setSaving(true);
    const d = parseFloat(dist.replace(',', '.'));
    onSave({
      effort,
      notes: notes.trim() || undefined,
      durationMin: minutes,
      distanceKm: run && Number.isFinite(d) && d > 0 ? Math.round(fromDisplayDistance(d, units) * 100) / 100 : undefined,
    });
  };

  return (
    <div className="mx-auto w-full max-w-lg px-5 pt-safe pb-40">
      <div className="pt-8 pb-5">
        <h1 className="font-display text-display font-bold">Nice work</h1>
        <p className="mt-1 text-body text-ink-2">A few details and it goes into your history.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {run ? (
          <>
            <Card className="p-4">
              <p className="text-micro font-semibold uppercase text-ink-3">Time</p>
              <p className="text-title font-semibold tabular">{formatClock(run.durationSec)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-micro font-semibold uppercase text-ink-3">Steps</p>
              <p className="text-title font-semibold tabular">
                {run.stepsDone} of {run.stepsTotal}
              </p>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-4">
              <p className="text-micro font-semibold uppercase text-ink-3">Sets done</p>
              <p className="text-title font-semibold tabular">
                {setsDone} of {setsTotal}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-micro font-semibold uppercase text-ink-3">Volume</p>
              <p className="text-title font-semibold tabular">
                {Math.round(volumeDisplay ?? 0).toLocaleString('en-AU')} {weightLabel(units)}
              </p>
            </Card>
          </>
        )}
      </div>

      {run && (
        <div className="mt-5">
          <TextField
            label={`Distance (${distanceLabel(units)})`}
            inputMode="decimal"
            placeholder="Optional"
            value={dist}
            onChange={(e) => setDist(e.target.value)}
          />
        </div>
      )}

      <SectionLabel className="mt-6">Duration</SectionLabel>
      <Card className="p-3">
        <Stepper value={minutes} onChange={setMinutes} min={1} max={400} step={1} label="minutes" format={(v) => `${v} min`} />
      </Card>

      <SectionLabel className="mt-6">How hard was it</SectionLabel>
      <div className="flex gap-1" role="group" aria-label="Perceived effort">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={effort === n}
            aria-label={`Effort ${n}`}
            onClick={() => setEffort(n)}
            className={cx(
              'h-11 min-w-0 flex-1 rounded-sm text-body font-semibold tabular transition-colors',
              effort === n ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-ink-2',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-2 h-5 px-1 text-caption text-ink-2">{effort ? EFFORT_LABEL[effort] : '1 easy … 10 all out'}</p>

      <div className="mt-5">
        <TextField label="Notes" placeholder="Optional" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg flex-col gap-1 px-5 pt-3 pb-safe">
          <Button size="lg" block onClick={save} disabled={saving}>
            Save workout
          </Button>
          <Button variant="ghost" block onClick={onBack}>
            Back to workout
          </Button>
        </div>
      </div>
    </div>
  );
}

