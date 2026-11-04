import { describe, expect, it } from 'vitest';
import { EXERCISES } from './index';
import { ANIMATIONS } from '../../animations/poses';
import type { Equipment, Exercise, MovementPattern } from '../types';

const CONTEXT_EQUIPMENT: Record<string, Equipment[]> = {
  gym: ['barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bench', 'pullup-bar', 'band', 'box', 'none'],
  home: ['dumbbell', 'band', 'none'],
  bodyweight: ['none'],
};

const fits = (e: Exercise, eq: Equipment[]) => e.equipment.every((x) => eq.includes(x));

describe('exercise library', () => {
  it('has unique ids and enough exercises', () => {
    const ids = EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(EXERCISES.filter((e) => !e.roles.every((r) => r === 'warmup' || r === 'cooldown')).length).toBeGreaterThanOrEqual(35);
  });

  it('every exercise has cues, a mistake and a known animation', () => {
    for (const e of EXERCISES) {
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.cues.length, e.id).toBeLessThanOrEqual(3);
      expect(e.mistake.length, e.id).toBeGreaterThan(5);
      expect(ANIMATIONS[e.animationId], `animation ${e.animationId} for ${e.id}`).toBeDefined();
    }
  });

  it('substitutions point to real exercises with the same pattern', () => {
    const byId = new Map(EXERCISES.map((e) => [e.id, e]));
    for (const e of EXERCISES) {
      for (const s of e.substitutions) {
        const sub = byId.get(s);
        expect(sub, `${e.id} -> ${s}`).toBeDefined();
        expect(sub!.pattern, `${e.id} -> ${s}`).toBe(e.pattern);
        expect(s).not.toBe(e.id);
      }
    }
  });

  const slots: { pattern: MovementPattern; plane?: 'horizontal' | 'vertical'; role: string }[] = [
    { pattern: 'squat', role: 'main' },
    { pattern: 'hinge', role: 'main' },
    { pattern: 'lunge', role: 'accessory' },
    { pattern: 'push', plane: 'horizontal', role: 'main' },
    { pattern: 'push', plane: 'vertical', role: 'main' },
    { pattern: 'pull', plane: 'horizontal', role: 'main' },
    { pattern: 'pull', plane: 'vertical', role: 'main' },
    { pattern: 'core', role: 'core' },
    { pattern: 'plyo', role: 'power' },
    { pattern: 'mobility', role: 'warmup' },
    { pattern: 'mobility', role: 'cooldown' },
  ];

  for (const [ctx, eq] of Object.entries(CONTEXT_EQUIPMENT)) {
    for (const slot of slots) {
      it(`${ctx}: has a ${slot.pattern}${slot.plane ? ' ' + slot.plane : ''} (${slot.role})`, () => {
        const found = EXERCISES.filter(
          (e) =>
            e.pattern === slot.pattern &&
            (!slot.plane || e.plane === slot.plane) &&
            e.roles.includes(slot.role as never) &&
            fits(e, eq),
        );
        expect(found.length).toBeGreaterThan(0);
      });
    }
  }

  it('has enough warm-up and cool-down drills for variety', () => {
    expect(EXERCISES.filter((e) => e.roles.includes('warmup')).length).toBeGreaterThanOrEqual(6);
    expect(EXERCISES.filter((e) => e.roles.includes('cooldown')).length).toBeGreaterThanOrEqual(5);
    expect(EXERCISES.filter((e) => e.roles.includes('conditioning')).length).toBeGreaterThanOrEqual(4);
  });
});
