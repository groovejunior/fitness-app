import { canDo, equipmentFor, getExercise } from '../../engine';
import type { EquipmentContext, Profile } from '../../engine/types';
import { ExerciseFigure } from '../../animations/Figure';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/kit';

const EQUIP_LABEL: Record<string, string> = {
  barbell: 'Barbell', dumbbell: 'Dumbbells', kettlebell: 'Kettlebell', cable: 'Cable', machine: 'Machine',
  bench: 'Bench', 'pullup-bar': 'Pull-up bar', band: 'Band', box: 'Box', none: 'Bodyweight',
};

export function ExerciseSheet({
  exerciseId,
  note,
  context,
  profile,
  canSwap,
  onClose,
  onSwap,
}: {
  exerciseId: string | null;
  note?: string;
  context: EquipmentContext;
  profile?: Profile | null;
  canSwap: boolean;
  onClose: () => void;
  onSwap: (toId: string) => void;
}) {
  const ex = exerciseId ? getExercise(exerciseId) : undefined;
  const available = equipmentFor(context, profile ?? undefined);
  const subs = ex ? ex.substitutions.map((id) => getExercise(id)).filter((e) => !!e && canDo(e, available)) : [];
  return (
    <Sheet open={!!ex} onClose={onClose} title={ex?.name}>
      {ex && (
        <div data-testid="exercise-sheet">
          <div className="mx-auto mb-4 aspect-square w-56 max-w-full overflow-hidden rounded-2xl bg-surface-2">
            <ExerciseFigure animationId={ex.animationId} playing label={ex.name} className="h-full w-full" />
          </div>
          <ul className="space-y-2">
            {ex.cues.slice(0, 3).map((c, i) => (
              <li key={i} className="flex gap-3 text-[16px] leading-snug">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-[15px] leading-snug">
            <span className="font-semibold">Watch out: </span>
            {ex.mistake}
          </div>
          {note && <p className="mt-3 px-1 text-[14px] leading-snug text-muted">{note}</p>}
          {canSwap && subs.length > 0 && (
            <div className="mt-5">
              <div className="mb-1 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Swap for</div>
              <div className="divide-y divide-line/70">
                {subs.map((s) => (
                  <button
                    key={s!.id}
                    type="button"
                    data-testid={`swap-${s!.id}`}
                    onClick={() => onSwap(s!.id)}
                    className="flex w-full items-center gap-3 py-2.5 text-left active:opacity-70"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                      <ExerciseFigure animationId={s!.animationId} playing={false} label={s!.name} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-medium">{s!.name}</div>
                      <div className="truncate text-[13px] text-muted">{s!.equipment.map((e) => EQUIP_LABEL[e] ?? e).join(', ')}</div>
                    </div>
                    <Icon name="swap" size={18} className="shrink-0 text-accent" />
                  </button>
                ))}
              </div>
            </div>
          )}
          {canSwap && subs.length === 0 && <p className="mt-5 px-1 text-[14px] text-muted">Nothing to swap this for with the equipment you have here.</p>}
        </div>
      )}
    </Sheet>
  );
}
