import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Screen } from '../ui/Layout';
import { Button, Card, Chip, Notice, SectionTitle, Segmented, Sheet, TextField } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { useProfile } from '../lib/hooks';
import { dateShort, downloadFile } from '../lib/format';
import { navigate } from '../lib/router';
import { saveProfile } from '../db/repo';
import { backupFileName, exportBackup, importBackup, parseBackup, resetAll, type Backup } from '../db/backup';
import { ALL_EQUIPMENT, CONTEXT_LABEL, STYLE_LABEL, type Equipment, type EquipmentContext, type Experience, type PrimaryGoal, type Profile, type TrainingStyle } from '../engine';

const GOALS: { value: PrimaryGoal; label: string }[] = [
  { value: 'athletic', label: 'Athletic' },
  { value: 'strength', label: 'Strength' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'health', label: 'Health' },
];
const LEVELS: { value: Experience; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Some' },
  { value: 'advanced', label: 'Advanced' },
];
const EQUIPMENT_LABEL: Record<Equipment, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbells',
  kettlebell: 'Kettlebell',
  cable: 'Cables',
  machine: 'Machines',
  bench: 'Bench',
  'pullup-bar': 'Pull-up bar',
  'dip-bars': 'Dip bars',
  band: 'Bands',
  box: 'Box',
  none: 'None',
};
const LB = 2.20462;

/** Segmented control with a test id per option (the kit one has none). */
function TidSegmented<T extends string>({ options, value, onChange, testIds }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; testIds: Record<string, string> }) {
  return (
    <div role="tablist" className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          data-testid={testIds[o.value]}
          onClick={() => onChange(o.value)}
          className={`h-9 flex-1 rounded-[10px] text-[14px] font-medium transition-all duration-200 ${o.value === value ? 'bg-surface text-ink shadow-soft' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="py-3">
      <div className="mb-2 px-1 text-[13px] font-medium text-muted">{label}</div>
      {children}
      {hint && <div className="mt-1.5 px-1 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

export function Settings() {
  const profile = useProfile();
  const latest = useRef<Profile | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [ready, setReady] = useState(false);

  const [pending, setPending] = useState<Backup | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const units = profile?.units ?? 'metric';

  // Fill local text fields once, when the profile first loads.
  useEffect(() => {
    if (!profile || ready) return;
    latest.current = profile;
    setName(profile.name);
    setAge(profile.age ? String(profile.age) : '');
    setWeight(profile.weightKg ? String(Math.round((units === 'imperial' ? profile.weightKg * LB : profile.weightKg) * 10) / 10) : '');
    setReady(true);
  }, [profile, ready, units]);

  const flush = async () => {
    clearTimeout(timer.current);
    if (!latest.current) return;
    await saveProfile(latest.current);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  };

  // Save any pending text edit when leaving the screen.
  useEffect(
    () => () => {
      if (timer.current && latest.current) void saveProfile(latest.current);
      clearTimeout(savedTimer.current);
    },
    [],
  );

  if (!profile || !ready) return <Screen title="Settings">{null}</Screen>;

  const update = (patch: Partial<Profile>, debounce = false) => {
    latest.current = { ...(latest.current ?? profile), ...patch };
    clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => void flush(), 500);
    else void flush();
  };

  const toKg = (v: number) => (units === 'imperial' ? v / LB : v);
  const cur = latest.current ?? profile;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "That file couldn't be read.");
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const doImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending);
      location.reload();
    } catch {
      setBusy(false);
      setPending(null);
      setImportError("The backup couldn't be restored. Nothing was changed.");
    }
  };

  const doReset = async () => {
    setBusy(true);
    await resetAll();
    location.hash = '/onboarding';
    location.reload();
  };

  return (
    <Screen title="Settings" action={<span className={`mb-1 text-[13px] text-muted transition-opacity duration-300 ${saved ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">{saved ? 'Saved' : ''}</span>}>
      <SectionTitle className="mt-2">Profile</SectionTitle>
      <Card className="divide-y divide-line py-1">
        <div className="py-3">
          <TextField
            label="Name"
            value={name}
            data-testid="settings-name"
            onChange={(v) => {
              setName(v);
              update({ name: v }, true);
            }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 py-3">
          <TextField
            label="Age (optional)"
            value={age}
            inputMode="numeric"
            onChange={(v) => {
              const clean = v.replace(/\D/g, '').slice(0, 3);
              setAge(clean);
              update({ age: clean ? Number(clean) : undefined }, true);
            }}
          />
          <TextField
            label={`Weight (${units === 'imperial' ? 'lb' : 'kg'})`}
            value={weight}
            inputMode="decimal"
            onChange={(v) => {
              const clean = v.replace(',', '.').replace(/[^\d.]/g, '').slice(0, 5);
              setWeight(clean);
              const n = parseFloat(clean);
              update({ weightKg: n > 0 ? Math.round(toKg(n) * 10) / 10 : undefined }, true);
            }}
          />
        </div>
        <Field label="Main goal">
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g.value} selected={cur.goal === g.value} onClick={() => update({ goal: g.value })}>
                {g.label}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Gym experience">
          <Segmented options={LEVELS} value={cur.experience.gym} onChange={(v) => update({ experience: { ...cur.experience, gym: v } })} />
        </Field>
        <Field label="Running experience">
          <Segmented options={LEVELS} value={cur.experience.run} onChange={(v) => update({ experience: { ...cur.experience, run: v } })} />
        </Field>
        <Field label="Usual place to train">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONTEXT_LABEL) as EquipmentContext[]).map((c) => (
              <Chip key={c} selected={cur.defaultEquipment === c} onClick={() => update({ defaultEquipment: c })}>
                {CONTEXT_LABEL[c]}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Training style">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STYLE_LABEL) as TrainingStyle[]).map((st) => (
              <Chip key={st} selected={(cur.style ?? 'calisthenics') === st} onClick={() => update({ style: st })} data-testid={`style-${st}`}>
                {STYLE_LABEL[st]}
              </Chip>
            ))}
          </div>
          <p className="mt-2 px-1 text-[13px] leading-snug text-muted">
            {(cur.style ?? 'calisthenics') === 'calisthenics'
              ? 'Pull-ups, dips and push-ups first, plus a few classic barbell lifts. No machines.'
              : cur.style === 'free-weights'
                ? 'Barbells, dumbbells, kettlebells and bodyweight. No machines.'
                : 'Anything the gym has, machines and cables included.'}
          </p>
        </Field>
        <Field label="Equipment at home">
          <div className="flex flex-wrap gap-2">
            {ALL_EQUIPMENT.filter((e) => e !== 'none').map((e) => {
              const on = cur.homeEquipment.includes(e);
              return (
                <Chip
                  key={e}
                  selected={on}
                  onClick={() => update({ homeEquipment: on ? cur.homeEquipment.filter((x) => x !== e) : [...cur.homeEquipment, e] })}
                >
                  {EQUIPMENT_LABEL[e]}
                </Chip>
              );
            })}
          </div>
        </Field>
      </Card>

      <SectionTitle>Units and look</SectionTitle>
      <Card className="divide-y divide-line py-1">
        <Field label="Units">
          <TidSegmented
            testIds={{ metric: 'units-metric', imperial: 'units-imperial' }}
            options={[
              { value: 'metric', label: 'kg, km' },
              { value: 'imperial', label: 'lb, mi' },
            ]}
            value={cur.units}
            onChange={(v) => {
              // Re-express the body weight field in the new unit.
              if (cur.weightKg) setWeight(String(Math.round((v === 'imperial' ? cur.weightKg * LB : cur.weightKg) * 10) / 10));
              update({ units: v });
            }}
          />
        </Field>
        <Field label="Theme">
          <TidSegmented
            testIds={{ system: 'theme-system', light: 'theme-light', dark: 'theme-dark' }}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={cur.theme}
            onChange={(v) => update({ theme: v })}
          />
        </Field>
      </Card>

      <SectionTitle>Plan</SectionTitle>
      <Card className="py-1">
        <button type="button" data-testid="redo-setup" onClick={() => navigate('/onboarding')} className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left active:opacity-70">
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-medium">Redo setup</div>
            <div className="mt-0.5 text-[14px] text-muted">Change your days, sports and targets.</div>
          </div>
          <Icon name="chevron-right" size={18} className="shrink-0 text-muted" />
        </button>
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card className="divide-y divide-line py-1">
        <button
          type="button"
          data-testid="export-backup"
          onClick={async () => downloadFile(backupFileName(), JSON.stringify(await exportBackup(), null, 2), 'application/json')}
          className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left active:opacity-70"
        >
          <Icon name="download" size={20} className="shrink-0 text-accent" />
          <span className="flex-1 text-[16px] font-medium">Export backup</span>
        </button>
        <button
          type="button"
          data-testid="import-backup"
          onClick={() => fileRef.current?.click()}
          className="flex min-h-[56px] w-full items-center gap-3 py-3 text-left active:opacity-70"
        >
          <Icon name="upload" size={20} className="shrink-0 text-accent" />
          <span className="flex-1 text-[16px] font-medium">Import backup</span>
        </button>
      </Card>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" data-testid="import-file" onChange={(e) => void onFile(e.target.files?.[0])} />
      {importError && (
        <div className="mt-3">
          <Notice>{importError}</Notice>
        </div>
      )}
      <p className="mt-2 px-1 text-[13px] leading-snug text-muted">Everything stays on this phone. Export a backup now and then.</p>

      <SectionTitle>Reset</SectionTitle>
      <Card className="py-1">
        <button type="button" data-testid="reset-data" onClick={() => setResetOpen(true)} className="flex min-h-[52px] w-full items-center text-left text-[16px] font-medium text-warn active:opacity-70">
          Reset all data
        </button>
      </Card>

      <SectionTitle>About</SectionTitle>
      <div className="px-1">
        <div className="text-[16px] font-medium">
          Fitness <span className="tnum font-normal text-muted">v0.1</span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-muted">Plans are made on your phone by a rule-based coach. No account, no cloud.</p>
      </div>

      <Sheet open={pending !== null} onClose={() => !busy && setPending(null)} title="Import this backup?">
        <p className="mb-5 text-[15px] leading-relaxed text-ink-2">
          This replaces everything on this phone with the backup from {pending ? dateShort(pending.exportedAt.slice(0, 10)) : ''}.
        </p>
        <div className="flex flex-col gap-2">
          <Button block disabled={busy} onClick={() => void doImport()} data-testid="confirm-import">
            Replace my data
          </Button>
          <Button block variant="secondary" disabled={busy} onClick={() => setPending(null)}>
            Cancel
          </Button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => !busy && setResetOpen(false)} title="Reset all data?">
        <p className="mb-5 text-[15px] leading-relaxed text-ink-2">Your plans, logs and settings are deleted from this phone. This can't be undone, so export a backup first if you want one.</p>
        <div className="flex flex-col gap-2">
          <Button block variant="secondary" className="!text-warn" disabled={busy} onClick={() => void doReset()} data-testid="confirm-reset">
            Delete everything
          </Button>
          <Button block variant="secondary" disabled={busy} onClick={() => setResetOpen(false)}>
            Keep my data
          </Button>
        </div>
      </Sheet>
    </Screen>
  );
}
