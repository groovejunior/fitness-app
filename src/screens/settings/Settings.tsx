import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GOAL_LABEL } from '../../engine/constants';
import type { EquipmentContext, Experience, Goal, Profile } from '../../engine/types';
import { SPORTS } from '../../content/sports';
import { CONTEXT_LABEL } from '../../content/exercises';
import { useProfile, useSettings } from '../../data/hooks';
import { exportBackup, importBackup, parseBackup, resetAll, saveProfile, saveSettings, type Backup } from '../../data/repo';
import { applyTheme, type ThemePref } from '../../lib/theme';
import { formatDate, fromDisplayWeight, toDisplayWeight, weightLabel, type Units } from '../../lib/format';
import { today } from '../../lib/today';
import { Button, Chip, List, ListRow, Notice, Page, ScreenHeader, SectionLabel, Segmented, Sheet, TextField, Toggle } from '../../ui';

const LEVELS: { value: Experience; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export default function Settings() {
  const navigate = useNavigate();
  const profile = useProfile();
  const settings = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [ageText, setAgeText] = useState('');
  const [weightText, setWeightText] = useState('');

  const [pending, setPending] = useState<Backup | null>(null);
  const [importError, setImportError] = useState('');
  const [note, setNote] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const units: Units = settings.units;

  const openEdit = () => {
    if (!profile) return;
    setDraft(profile);
    setAgeText(profile.age ? String(profile.age) : '');
    setWeightText(profile.bodyWeightKg ? String(toDisplayWeight(profile.bodyWeightKg, units)) : '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!draft) return;
    const age = parseInt(ageText, 10);
    const w = parseFloat(weightText.replace(',', '.'));
    const next: Profile = {
      ...draft,
      name: draft.name.trim() || profile?.name || '',
      age: Number.isFinite(age) && age > 0 ? age : undefined,
      bodyWeightKg: Number.isFinite(w) && w > 0 ? fromDisplayWeight(w, units) : undefined,
    };
    if (!next.gymAccess && next.defaultEquipment === 'gym') next.defaultEquipment = 'home';
    await saveProfile(next);
    setEditing(false);
    setNote('Saved. This applies to plans you build from now on.');
  };

  const patch = (p: Partial<Profile>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const download = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitness-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNote('Backup saved to your downloads.');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError('');
    setNote('');
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "That file couldn't be read.");
    }
  };

  const confirmImport = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await importBackup(pending);
      setPending(null);
      setNote('Backup restored.');
    } catch (err) {
      setPending(null);
      setImportError(err instanceof Error ? err.message : "The backup couldn't be restored.");
    }
    setBusy(false);
  };

  const confirmReset = async () => {
    setBusy(true);
    await resetAll();
    navigate('/onboarding', { replace: true });
  };

  const setTheme = (theme: ThemePref) => {
    applyTheme(theme);
    void saveSettings({ theme });
  };

  const equipmentOptions = (['gym', 'home', 'bodyweight', 'outdoors'] as EquipmentContext[])
    .filter((c) => c !== 'gym' || draft?.gymAccess)
    .map((c) => ({ value: c, label: CONTEXT_LABEL[c] }));

  const sportNames = profile?.sports.map((id) => SPORTS.find((s) => s.id === id)?.name ?? id).join(', ');
  const backupDate = pending ? formatDate(pending.exportedAt.slice(0, 10), { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  return (
    <>
      <ScreenHeader title="Settings" />
      <Page className="space-y-6 px-5">
        {note && <Notice tone="info">{note}</Notice>}
        {importError && <Notice title="Couldn't import">{importError}</Notice>}

        <section>
          <SectionLabel>Profile</SectionLabel>
          {profile ? (
            <List>
              <ListRow title={profile.name || 'Your name'} detail={[profile.age ? `${profile.age} years` : '', profile.bodyWeightKg ? `${toDisplayWeight(profile.bodyWeightKg, units)} ${weightLabel(units)}` : ''].filter(Boolean).join(' · ') || 'Age and weight not set'} onClick={openEdit} />
              <ListRow title="Goal" detail={GOAL_LABEL[profile.goal]} onClick={openEdit} />
              <ListRow title="Experience" detail={`Gym ${profile.experience.gym}, running ${profile.experience.run}`} onClick={openEdit} />
              <ListRow title="Sports" detail={sportNames || 'None'} onClick={openEdit} />
              <ListRow title="Training place" detail={`${CONTEXT_LABEL[profile.defaultEquipment]}${profile.gymAccess ? ', gym nearby' : ', no gym nearby'}`} onClick={openEdit} />
            </List>
          ) : (
            <p className="px-1 text-caption text-ink-3">Loading…</p>
          )}
          <p className="mt-2 px-1 text-caption text-ink-3">Changes apply to plans you build from now on.</p>
        </section>

        <section>
          <SectionLabel>Units</SectionLabel>
          <Segmented
            ariaLabel="Units"
            options={[
              { value: 'metric', label: 'Metric (kg, km)' },
              { value: 'imperial', label: 'Imperial (lb, mi)' },
            ]}
            value={units}
            onChange={(v) => void saveSettings({ units: v })}
          />
        </section>

        <section>
          <SectionLabel>Appearance</SectionLabel>
          <Segmented
            ariaLabel="Appearance"
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.theme}
            onChange={setTheme}
          />
        </section>

        <section>
          <SectionLabel>Backup</SectionLabel>
          <List>
            <ListRow title="Export backup" detail="Save everything as a file" onClick={download} />
            <ListRow title="Import backup" detail="Restore from a file" onClick={() => fileRef.current?.click()} />
          </List>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} aria-label="Backup file" />
        </section>

        <section>
          <SectionLabel>Reset</SectionLabel>
          <Button variant="danger" block onClick={() => setResetOpen(true)} className="bg-surface shadow-soft">
            Reset all data
          </Button>
        </section>

        <footer className="pt-2 pb-4 text-center text-caption text-ink-3">
          <p>Everything stays on this phone. Nothing is uploaded.</p>
          <p className="mt-1">Version 0.1.0</p>
        </footer>
      </Page>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit profile">
        {draft && (
          <div className="space-y-5">
            <TextField label="Your name" value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Age (optional)" inputMode="numeric" value={ageText} onChange={(e) => setAgeText(e.target.value)} />
              <TextField label={`Body weight, ${weightLabel(units)} (optional)`} inputMode="decimal" value={weightText} onChange={(e) => setWeightText(e.target.value)} />
            </div>
            <div>
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Goal</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GOAL_LABEL) as Goal[]).map((g) => (
                  <Chip key={g} selected={draft.goal === g} onClick={() => patch({ goal: g })}>
                    {GOAL_LABEL[g]}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Gym experience</p>
              <Segmented ariaLabel="Gym experience" options={LEVELS} value={draft.experience.gym} onChange={(v) => patch({ experience: { ...draft.experience, gym: v } })} />
            </div>
            <div>
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Running experience</p>
              <Segmented ariaLabel="Running experience" options={LEVELS} value={draft.experience.run} onChange={(v) => patch({ experience: { ...draft.experience, run: v } })} />
            </div>
            <div>
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Sports</p>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => (
                  <Chip
                    key={s.id}
                    selected={draft.sports.includes(s.id)}
                    onClick={() => patch({ sports: draft.sports.includes(s.id) ? draft.sports.filter((x) => x !== s.id) : [...draft.sports, s.id] })}
                  >
                    {s.name}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-body font-medium">Gym nearby</span>
              <Toggle
                checked={draft.gymAccess}
                label="Gym nearby"
                onChange={(v) => patch({ gymAccess: v, defaultEquipment: !v && draft.defaultEquipment === 'gym' ? 'home' : draft.defaultEquipment })}
              />
            </div>
            <div>
              <p className="mb-2 px-1 text-caption font-medium text-ink-2">Default equipment</p>
              <Segmented ariaLabel="Default equipment" options={equipmentOptions} value={draft.defaultEquipment} onChange={(v) => patch({ defaultEquipment: v })} />
            </div>
            <Button block size="lg" onClick={saveEdit}>
              Save
            </Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Import backup">
        <p className="text-body text-ink-2">This replaces everything on this phone with the backup from {backupDate}.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" size="lg" onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button size="lg" block onClick={confirmImport} disabled={busy}>
            Replace everything
          </Button>
        </div>
      </Sheet>

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all data">
        <p className="text-body text-ink-2">This deletes your profile, plans and training history from this phone. It can't be undone. Export a backup first if you want to keep it.</p>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" size="lg" onClick={() => setResetOpen(false)}>
            Cancel
          </Button>
          <Button size="lg" block className="!bg-danger !text-white" onClick={confirmReset} disabled={busy}>
            Delete everything
          </Button>
        </div>
      </Sheet>
    </>
  );
}
