import { useMemo, useState } from 'react';
import { addDays, chooseBlockOption, mondayOf, proposeBlock, saveProfile, startBlock, today } from '../../db/repo';
import { daysBetween } from '../../engine/dates';
import type { Block, BlockOption, BlockProposal, Profile, Targets } from '../../engine/types';
import { dateShort } from '../../lib/format';
import { useBlocks, useProfile } from '../../lib/hooks';
import { Icon } from '../../ui/Icon';
import { Button, Card, cx, Empty, Notice, SectionTitle, Sheet, Stepper, Tag } from '../../ui/kit';
import { PHASE_LINE, PHASE_NAME, Stat, targetsText } from './shared';

function OptionCard({
  option,
  chosen,
  onPick,
  testId,
  recommended,
}: {
  option: BlockOption;
  chosen: boolean;
  onPick: () => void;
  testId?: string;
  recommended: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={chosen}
      onClick={chosen ? undefined : onPick}
      className={cx(
        'block w-full rounded-card bg-surface p-4 text-left shadow-soft transition-[box-shadow,transform] active:scale-[0.99]',
        chosen ? 'ring-2 ring-accent' : 'ring-1 ring-transparent',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{recommended ? 'Recommended' : 'Alternative'}</div>
        {chosen ? (
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
            <Icon name="check" size={16} /> In use
          </span>
        ) : (
          <span className="text-[13px] font-medium text-accent">Switch to this</span>
        )}
      </div>
      <div className="mt-1.5 text-[17px] font-semibold tracking-tight">{targetsText(option.targets)}</div>
      <div className="mt-1 text-[14px] leading-snug text-muted">{option.description}</div>
    </button>
  );
}

function Timeline({ block, weekIdx }: { block: Block; weekIdx: number }) {
  return (
    <Card className="p-2">
      {block.phases.map((ph, i) => {
        const now = i === weekIdx;
        const past = i < weekIdx;
        const start = addDays(block.startDate, i * 7);
        return (
          <div key={i} className={cx('flex items-center gap-3 rounded-xl px-3 py-3', now && 'bg-accent-soft')} aria-current={now ? 'step' : undefined}>
            <div
              className={cx(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold tnum',
                now ? 'bg-accent text-accent-ink' : past ? 'bg-surface-2 text-muted' : 'border border-line text-ink-2',
              )}
            >
              {past ? <Icon name="check" size={16} /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className={cx('text-[16px] font-medium', past && 'text-muted')}>{PHASE_LINE[ph]}</div>
              <div className="text-[13px] text-muted">
                Week {i + 1} · from {dateShort(start)}
              </div>
            </div>
            {now && <Tag tone="accent">Now</Tag>}
          </div>
        );
      })}
    </Card>
  );
}

function NewMonthSheet({ open, onClose, profile }: { open: boolean; onClose: () => void; profile: Profile }) {
  const [wanted, setWanted] = useState<Targets>(profile.wanted);
  const [choice, setChoice] = useState<'recommended' | 'alternative'>('recommended');
  const [busy, setBusy] = useState(false);
  const proposal: BlockProposal = useMemo(() => proposeBlock(profile, wanted), [profile, wanted]);
  const set = (k: keyof Targets) => (v: number) => setWanted((w) => ({ ...w, [k]: v }));

  const confirm = async () => {
    setBusy(true);
    try {
      const next = { ...profile, wanted };
      await saveProfile(next);
      await startBlock(next, proposeBlock(next, wanted), choice);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const rows: { k: keyof Targets; label: string; max: number }[] = [
    { k: 'gym', label: 'Gym sessions', max: 6 },
    { k: 'run', label: 'Runs', max: 6 },
    { k: 'mobility', label: 'Mobility', max: 7 },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Plan a new month">
      <p className="mb-3 text-[15px] text-muted">What would you like each week? I'll check it fits your time.</p>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between py-2.5">
            <span className="text-[16px] font-medium">{r.label}</span>
            <Stepper value={wanted[r.k]} onChange={set(r.k)} min={0} max={r.max} label={r.label.toLowerCase()} />
          </div>
        ))}
      </div>
      {wanted.sport > 0 && <div className="mt-2 px-1 text-[13px] text-muted">Sport stays at {wanted.sport} a week, from your settings.</div>}

      <div className="mt-4 space-y-3" data-testid="month-preview">
        {proposal.realism.issues.length > 0 && (
          <Notice>
            <ul className="space-y-1">
              {proposal.realism.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </Notice>
        )}
        <OptionCard option={proposal.recommended} chosen={choice === 'recommended'} onPick={() => setChoice('recommended')} recommended />
        <OptionCard option={proposal.alternative} chosen={choice === 'alternative'} onPick={() => setChoice('alternative')} recommended={false} />
      </div>
      <Button block className="mt-5" onClick={confirm} disabled={busy} data-testid="month-confirm">
        Start this month
      </Button>
      <p className="mt-2 text-center text-[13px] text-muted">This replaces the plan from this week on.</p>
    </Sheet>
  );
}

export function Month() {
  const blocks = useBlocks();
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const t = today();
  if (!blocks || profile === undefined) return null;
  const block = [...blocks].reverse().find((b) => b.startDate <= t);

  if (!block) {
    return <Empty icon="calendar" title="No month planned yet">Finish setting up and your first month shows here.</Empty>;
  }

  const weekIdx = Math.floor(daysBetween(block.startDate, mondayOf(t)) / 7);
  const chosen = block.options.find((o) => o.key === block.chosen)!;
  const end = addDays(block.startDate, 27);
  const [rec, alt] = [block.options.find((o) => o.key === 'recommended')!, block.options.find((o) => o.key === 'alternative')!];

  const tiles: [number, string][] = [
    [chosen.targets.gym, 'Gym'],
    [chosen.targets.run, chosen.targets.run === 1 ? 'Run' : 'Runs'],
  ];
  if (chosen.targets.sport) tiles.push([chosen.targets.sport, 'Sport']);
  if (chosen.targets.mobility) tiles.push([chosen.targets.mobility, 'Mobility']);

  return (
    <div>
      <div className="px-1">
        <div className="text-[14px] font-medium text-muted">
          {dateShort(block.startDate)} – {dateShort(end)}
        </div>
        <h2 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight" data-testid="month-focus">
          {block.focus}
        </h2>
        {weekIdx >= 4 && <p className="mt-1 text-[14px] text-muted">This month is finished. A new one starts with next week.</p>}
      </div>

      {block.realism.issues.length > 0 && (
        <div className="mt-4" data-testid="month-realism">
          <Notice>
            <ul className="space-y-1">
              {block.realism.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            {block.realism.suggested && <div className="mt-1.5 font-medium">A realistic version: {targetsText(block.realism.suggested)}</div>}
          </Notice>
        </div>
      )}

      <SectionTitle>Each week</SectionTitle>
      <div className={cx('grid gap-2', tiles.length === 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
        {tiles.map(([n, l]) => (
          <Stat key={l} value={n} label={l} />
        ))}
      </div>

      <SectionTitle>The four weeks</SectionTitle>
      <Timeline block={block} weekIdx={weekIdx} />
      <div className="mt-2 px-1 text-[13px] text-muted">
        {block.phases.map((p) => PHASE_NAME[p]).join(' · ')}
      </div>

      <SectionTitle>Your options</SectionTitle>
      <div className="space-y-3">
        <OptionCard option={rec} recommended chosen={block.chosen === 'recommended'} onPick={() => chooseBlockOption(block.id, 'recommended')} testId="month-option-recommended" />
        <OptionCard option={alt} recommended={false} chosen={block.chosen === 'alternative'} onPick={() => chooseBlockOption(block.id, 'alternative')} testId="month-option-alternative" />
      </div>

      <Button variant="secondary" block className="mt-6" onClick={() => setOpen(true)} data-testid="month-new" icon="plus">
        Plan a new month
      </Button>
      {profile && open && <NewMonthSheet open={open} onClose={() => setOpen(false)} profile={profile} />}
    </div>
  );
}
