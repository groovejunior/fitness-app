import { useMemo, useState } from 'react';
import { coach, type Profile, type Targets, type WeekAvailability } from '../../engine';
import { createBlock } from '../../data/repo';
import { Button, Notice, Sheet, Stepper } from '../../ui';
import { AvailabilityEditor } from './AvailabilityEditor';
import { targetsSummary } from './summary';

export function PlannerSheet({
  title,
  profile,
  initialTargets,
  initialAvailability,
  startDate,
  onClose,
}: {
  title: string;
  profile: Profile;
  initialTargets: Targets;
  initialAvailability: WeekAvailability;
  startDate: string;
  onClose: () => void;
}) {
  const [targets, setTargets] = useState<Targets>(initialTargets);
  const [availability, setAvailability] = useState<WeekAvailability>(initialAvailability);
  const [saving, setSaving] = useState(false);
  const report = useMemo(() => coach.checkRealism(targets, availability, profile), [targets, availability, profile]);
  const differs = (['gym', 'run', 'sport', 'mobility'] as const).some((k) => report.suggestion[k] !== targets[k]);
  const hasSport = profile.sports.length > 0;

  const rows: { key: keyof Targets; label: string; max: number }[] = [
    { key: 'gym', label: 'Gym', max: 6 },
    { key: 'run', label: 'Runs', max: 6 },
    ...(hasSport ? [{ key: 'sport' as const, label: 'Sport', max: 4 }] : []),
    { key: 'mobility', label: 'Mobility', max: 5 },
  ];

  const save = async () => {
    setSaving(true);
    await createBlock(profile, targets, availability, startDate);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={title}>
      <p className="mb-2 text-caption text-ink-2">Sessions per week</p>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 py-2">
            <span className="text-body font-medium">{r.label}</span>
            <Stepper label={r.label} value={targets[r.key]} min={0} max={r.max} onChange={(v) => setTargets({ ...targets, [r.key]: v })} />
          </div>
        ))}
      </div>

      <p className="mt-6 mb-1 text-caption text-ink-2">When you can train</p>
      <AvailabilityEditor value={availability} onChange={setAvailability} />

      {report.level !== 'ok' && (
        <div className="mt-4">
          <Notice
            tone={report.level === 'over' ? 'warn' : 'info'}
            title={report.level === 'over' ? 'This is too much for your week' : 'This fits, only just'}
            action={
              differs ? (
                <Button size="sm" variant="secondary" onClick={() => setTargets(report.suggestion)}>
                  Use suggestion
                </Button>
              ) : undefined
            }
          >
            <ul className="space-y-1">
              {report.issues.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            {differs && <p className="mt-1">Suggestion: {targetsSummary(report.suggestion, profile)}.</p>}
          </Notice>
        </div>
      )}

      <Button block size="lg" className="mt-6" onClick={save} disabled={saving}>
        Save plan
      </Button>
    </Sheet>
  );
}
