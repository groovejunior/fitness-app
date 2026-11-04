import type { Load } from '../engine/types';

export interface Sport {
  id: string;
  name: string;
  load: Load;
  /** Heavy on the legs (sprinting, jumping, holding a ski stance). */
  legHeavy: boolean;
  typicalMinutes: number;
  /** Short dynamic prep before playing. */
  prep: string[];
  /** Conditioning that carries over to this sport. */
  conditioning: string[];
}

export const SPORTS: Sport[] = [
  {
    id: 'tennis', name: 'Tennis', load: 'hard', legHeavy: true, typicalMinutes: 90,
    prep: ['jumping-jack', 'leg-swing', 'worlds-greatest-stretch', 'open-book', 'skater-jump'],
    conditioning: ['skater-jump', 'pallof-press', 'face-pull', 'reverse-lunge'],
  },
  {
    id: 'waterski', name: 'Water skiing', load: 'hard', legHeavy: true, typicalMinutes: 60,
    prep: ['jumping-jack', 'cat-cow', 'worlds-greatest-stretch', 'bodyweight-squat', 'leg-swing'],
    conditioning: ['farmers-carry', 'inverted-row', 'plank', 'goblet-squat'],
  },
  {
    id: 'football', name: 'Football', load: 'hard', legHeavy: true, typicalMinutes: 90,
    prep: ['jumping-jack', 'leg-swing', 'hip-flexor-stretch', 'skater-jump'],
    conditioning: ['skater-jump', 'reverse-lunge', 'side-plank'],
  },
  {
    id: 'basketball', name: 'Basketball', load: 'hard', legHeavy: true, typicalMinutes: 75,
    prep: ['jumping-jack', 'leg-swing', 'worlds-greatest-stretch', 'jump-squat'],
    conditioning: ['jump-squat', 'skater-jump', 'calf-raise'],
  },
  {
    id: 'surfing', name: 'Surfing', load: 'moderate', legHeavy: false, typicalMinutes: 90,
    prep: ['cat-cow', 'open-book', 'worlds-greatest-stretch', 'push-up'],
    conditioning: ['push-up', 'prone-y-raise', 'bodyweight-squat', 'plank'],
  },
  {
    id: 'swimming', name: 'Swimming', load: 'moderate', legHeavy: false, typicalMinutes: 45,
    prep: ['open-book', 'cat-cow', 'face-pull'],
    conditioning: ['prone-y-raise', 'dead-bug', 'face-pull'],
  },
  {
    id: 'cycling', name: 'Cycling', load: 'moderate', legHeavy: true, typicalMinutes: 60,
    prep: ['leg-swing', 'hip-flexor-stretch'],
    conditioning: ['glute-bridge', 'side-plank', 'step-up'],
  },
  {
    id: 'climbing', name: 'Climbing', load: 'moderate', legHeavy: false, typicalMinutes: 90,
    prep: ['open-book', 'cat-cow', 'face-pull'],
    conditioning: ['push-up', 'face-pull', 'hanging-knee-raise'],
  },
];

export const SPORT_BY_ID: Record<string, Sport> = Object.fromEntries(SPORTS.map((s) => [s.id, s]));

export function getSport(id: string | undefined): Sport {
  return (id && SPORT_BY_ID[id]) || { id: id ?? 'sport', name: 'Sport', load: 'moderate', legHeavy: false, typicalMinutes: 60, prep: ['jumping-jack', 'leg-swing', 'worlds-greatest-stretch'], conditioning: [] };
}
