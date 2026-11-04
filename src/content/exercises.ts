import type { Equipment, EquipmentContext, Exercise } from '../engine/types';

/**
 * Exercise library. Each exercise has 2–3 short cues, one common mistake,
 * and substitutions in the same slot. `animation` points at a pose set in src/anim/poses.
 */
const E = (e: Omit<Exercise, 'animation' | 'primary'> & { animation?: string; primary?: number }): Exercise => ({
  primary: 1,
  animation: e.id,
  ...e,
});

export const EXERCISES: Exercise[] = [
  // ---- Squat ----
  E({
    id: 'back-squat', name: 'Back squat', pattern: 'squat', slot: 'squat',
    muscles: ['quads', 'glutes', 'hamstrings', 'core'], primary: 2,
    equipment: ['barbell', 'rack'], difficulty: 3, unit: 'reps', loaded: true, increment: 5, compound: true,
    cues: ['Bar on your upper back, brace hard', 'Sit down between your heels', 'Drive up, chest and hips together'],
    mistake: 'Knees caving in on the way up. Push them out over your toes.',
    substitutions: ['goblet-squat', 'bulgarian-split-squat', 'bodyweight-squat'],
  }),
  E({
    id: 'goblet-squat', name: 'Goblet squat', pattern: 'squat', slot: 'squat',
    muscles: ['quads', 'glutes', 'core'], primary: 2,
    equipment: ['dumbbell'], difficulty: 1, unit: 'reps', loaded: true, increment: 2, compound: true,
    cues: ['Hold the weight at your chest', 'Elbows inside the knees at the bottom', 'Stand tall, squeeze your glutes'],
    mistake: 'Heels lifting. Keep your whole foot on the floor.',
    substitutions: ['back-squat', 'bodyweight-squat', 'bulgarian-split-squat'],
  }),
  E({
    id: 'bodyweight-squat', name: 'Bodyweight squat', pattern: 'squat', slot: 'squat',
    muscles: ['quads', 'glutes'], primary: 2,
    equipment: [], difficulty: 1, unit: 'reps', loaded: false, compound: true,
    cues: ['Arms forward for balance', 'Hips back and down', 'Slow down, quick up'],
    mistake: 'Cutting depth short. Aim for thighs parallel to the floor.',
    substitutions: ['goblet-squat', 'reverse-lunge', 'jump-squat'],
  }),
  // ---- Hinge ----
  E({
    id: 'deadlift', name: 'Deadlift', pattern: 'hinge', slot: 'hinge',
    muscles: ['hamstrings', 'glutes', 'back', 'core'], primary: 2,
    equipment: ['barbell'], difficulty: 3, unit: 'reps', loaded: true, increment: 5, compound: true,
    cues: ['Bar over mid-foot, shins close', 'Flat back, pull the slack out', 'Push the floor away, hips through'],
    mistake: 'Rounding the lower back. Lower the weight until you can stay flat.',
    substitutions: ['romanian-deadlift', 'db-romanian-deadlift', 'kettlebell-swing'],
  }),
  E({
    id: 'romanian-deadlift', name: 'Romanian deadlift', pattern: 'hinge', slot: 'hinge',
    muscles: ['hamstrings', 'glutes', 'back'], primary: 2,
    equipment: ['barbell'], difficulty: 2, unit: 'reps', loaded: true, increment: 5, compound: true,
    cues: ['Soft knees, push your hips back', 'Bar slides down your thighs', 'Stop when your hamstrings are tight'],
    mistake: 'Turning it into a squat. Knees stay almost still.',
    substitutions: ['db-romanian-deadlift', 'deadlift', 'glute-bridge'],
  }),
  E({
    id: 'db-romanian-deadlift', name: 'Dumbbell Romanian deadlift', pattern: 'hinge', slot: 'hinge',
    muscles: ['hamstrings', 'glutes', 'back'], primary: 2,
    equipment: ['dumbbell'], difficulty: 1, unit: 'reps', loaded: true, increment: 2, compound: true,
    cues: ['Dumbbells close to your legs', 'Hips back, flat back', 'Squeeze glutes to stand'],
    mistake: 'Looking up and arching the neck. Keep your gaze down and ahead.',
    substitutions: ['romanian-deadlift', 'kettlebell-swing', 'glute-bridge'],
  }),
  E({
    id: 'kettlebell-swing', name: 'Kettlebell swing', pattern: 'hinge', slot: 'hinge',
    muscles: ['glutes', 'hamstrings', 'core', 'back'], primary: 2,
    equipment: ['kettlebell'], difficulty: 2, unit: 'reps', loaded: true, increment: 4, compound: true,
    cues: ['Hike the bell back between your legs', 'Snap your hips forward', 'Arms just guide the bell'],
    mistake: 'Lifting with the arms. The hips do the work.',
    substitutions: ['db-romanian-deadlift', 'glute-bridge', 'romanian-deadlift'],
  }),
  E({
    id: 'glute-bridge', name: 'Glute bridge', pattern: 'hinge', slot: 'hinge',
    muscles: ['glutes', 'hamstrings'], primary: 1,
    equipment: [], difficulty: 1, unit: 'reps', loaded: false, compound: false,
    cues: ['Feet flat, close to your hips', 'Drive through your heels', 'Pause at the top, ribs down'],
    mistake: 'Arching the lower back at the top. Stop when hips and knees line up.',
    substitutions: ['db-romanian-deadlift', 'kettlebell-swing'],
  }),
  // ---- Lunge ----
  E({
    id: 'bulgarian-split-squat', name: 'Bulgarian split squat', pattern: 'lunge', slot: 'lunge',
    muscles: ['quads', 'glutes', 'hamstrings'], primary: 2,
    equipment: ['bench', 'dumbbell'], difficulty: 2, unit: 'repsPerSide', loaded: true, increment: 2, compound: true,
    cues: ['Back foot on the bench, laces down', 'Drop straight down', 'Front heel stays planted'],
    mistake: 'Front foot too close to the bench. Step out far enough to sink.',
    substitutions: ['reverse-lunge', 'step-up', 'goblet-squat'],
  }),
  E({
    id: 'reverse-lunge', name: 'Reverse lunge', pattern: 'lunge', slot: 'lunge',
    muscles: ['quads', 'glutes'], primary: 2,
    equipment: [], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: true,
    cues: ['Step back long', 'Back knee hovers above the floor', 'Push through the front foot'],
    mistake: 'Leaning forward. Keep your chest tall.',
    substitutions: ['bulgarian-split-squat', 'step-up', 'bodyweight-squat'],
  }),
  E({
    id: 'step-up', name: 'Step-up', pattern: 'lunge', slot: 'lunge',
    muscles: ['quads', 'glutes'], primary: 2,
    equipment: ['box'], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: true,
    cues: ['Whole foot on the box', 'Drive through the top leg', 'Lower slowly'],
    mistake: 'Pushing off the bottom foot. Let the top leg do it.',
    substitutions: ['reverse-lunge', 'bulgarian-split-squat'],
  }),
  // ---- Horizontal push ----
  E({
    id: 'bench-press', name: 'Bench press', pattern: 'push', slot: 'pushH',
    muscles: ['chest', 'shoulders', 'arms'], primary: 1,
    equipment: ['barbell', 'bench', 'rack'], difficulty: 2, unit: 'reps', loaded: true, increment: 2.5, compound: true,
    cues: ['Shoulder blades back and down', 'Bar to lower chest', 'Press up and slightly back'],
    mistake: 'Elbows flared to 90°. Tuck them to about 45°.',
    substitutions: ['db-bench-press', 'push-up', 'dip'],
  }),
  E({
    id: 'db-bench-press', name: 'Dumbbell bench press', pattern: 'push', slot: 'pushH',
    muscles: ['chest', 'shoulders', 'arms'], primary: 1,
    equipment: ['dumbbell', 'bench'], difficulty: 1, unit: 'reps', loaded: true, increment: 2, compound: true,
    cues: ['Feet planted, slight arch', 'Lower to chest level', 'Press up, dumbbells close at the top'],
    mistake: 'Bouncing at the bottom. Control the lowering.',
    substitutions: ['bench-press', 'push-up', 'dip'],
  }),
  E({
    id: 'push-up', name: 'Push-up', pattern: 'push', slot: 'pushH',
    muscles: ['chest', 'shoulders', 'arms', 'core'], primary: 1,
    equipment: [], difficulty: 1, unit: 'reps', loaded: false, compound: true,
    cues: ['Hands under shoulders', 'Body in one straight line', 'Chest to a fist from the floor'],
    mistake: 'Hips sagging. Squeeze glutes and brace.',
    substitutions: ['db-bench-press', 'dip', 'pike-push-up'],
  }),
  E({
    id: 'dip', name: 'Dip', pattern: 'push', slot: 'pushH',
    muscles: ['chest', 'arms', 'shoulders'], primary: 2,
    equipment: ['dipBars'], difficulty: 2, unit: 'reps', loaded: false, compound: true,
    cues: ['Lock out tall to start', 'Lean slightly forward', 'Lower until elbows reach 90°'],
    mistake: 'Shrugging shoulders to the ears. Keep them down.',
    substitutions: ['push-up', 'db-bench-press'],
  }),
  // ---- Vertical push ----
  E({
    id: 'overhead-press', name: 'Overhead press', pattern: 'push', slot: 'pushV',
    muscles: ['shoulders', 'arms', 'core'], primary: 1,
    equipment: ['barbell', 'rack'], difficulty: 2, unit: 'reps', loaded: true, increment: 2.5, compound: true,
    cues: ['Squeeze glutes, ribs down', 'Press straight up past your face', 'Head through at the top'],
    mistake: 'Leaning back. Brace so the press comes from your shoulders.',
    substitutions: ['db-shoulder-press', 'pike-push-up'],
  }),
  E({
    id: 'db-shoulder-press', name: 'Dumbbell shoulder press', pattern: 'push', slot: 'pushV',
    muscles: ['shoulders', 'arms'], primary: 1,
    equipment: ['dumbbell'], difficulty: 1, unit: 'reps', loaded: true, increment: 2, compound: true,
    cues: ['Dumbbells at ear height', 'Press up and slightly in', 'Lower with control'],
    mistake: 'Arching the lower back. Brace or sit down.',
    substitutions: ['overhead-press', 'pike-push-up'],
  }),
  E({
    id: 'pike-push-up', name: 'Pike push-up', pattern: 'push', slot: 'pushV',
    muscles: ['shoulders', 'arms'], primary: 1,
    equipment: [], difficulty: 2, unit: 'reps', loaded: false, compound: true,
    cues: ['Hips high, upside-down V', 'Head moves toward the floor ahead of your hands', 'Push back up'],
    mistake: 'Bending like a normal push-up. Keep the hips high.',
    substitutions: ['db-shoulder-press', 'push-up'],
  }),
  // ---- Vertical pull ----
  E({
    id: 'pull-up', name: 'Pull-up', pattern: 'pull', slot: 'pullV',
    muscles: ['back', 'arms'], primary: 1,
    equipment: ['pullupBar'], difficulty: 3, unit: 'reps', loaded: false, compound: true,
    cues: ['Full hang, shoulders engaged', 'Pull elbows down to your ribs', 'Chin over the bar'],
    mistake: 'Kicking and swinging. Slow down, use a band if needed.',
    substitutions: ['lat-pulldown', 'inverted-row'],
  }),
  E({
    id: 'lat-pulldown', name: 'Lat pulldown', pattern: 'pull', slot: 'pullV',
    muscles: ['back', 'arms'], primary: 1,
    equipment: ['cable'], difficulty: 1, unit: 'reps', loaded: true, increment: 5, compound: true,
    cues: ['Grip just wider than shoulders', 'Pull the bar to your upper chest', 'Control it back up'],
    mistake: 'Leaning way back. Stay nearly upright.',
    substitutions: ['pull-up', 'seated-cable-row'],
  }),
  // ---- Horizontal pull ----
  E({
    id: 'seated-cable-row', name: 'Seated cable row', pattern: 'pull', slot: 'pullH',
    muscles: ['back', 'arms'], primary: 1,
    equipment: ['cable'], difficulty: 1, unit: 'reps', loaded: true, increment: 5, compound: true,
    cues: ['Sit tall, slight knee bend', 'Pull the handle to your stomach', 'Squeeze shoulder blades'],
    mistake: 'Rocking the torso. Keep it still and let the back work.',
    substitutions: ['db-row', 'inverted-row'],
  }),
  E({
    id: 'db-row', name: 'One-arm dumbbell row', pattern: 'pull', slot: 'pullH',
    muscles: ['back', 'arms'], primary: 1,
    equipment: ['dumbbell', 'bench'], difficulty: 1, unit: 'repsPerSide', loaded: true, increment: 2, compound: true,
    cues: ['Hand and knee on the bench', 'Pull the dumbbell to your hip', 'Lower all the way'],
    mistake: 'Twisting open. Keep shoulders square to the floor.',
    substitutions: ['seated-cable-row', 'inverted-row'],
  }),
  E({
    id: 'inverted-row', name: 'Inverted row', pattern: 'pull', slot: 'pullH',
    muscles: ['back', 'arms', 'core'], primary: 1,
    equipment: ['pullupBar'], difficulty: 2, unit: 'reps', loaded: false, compound: true,
    cues: ['Low bar, body straight like a plank', 'Pull your chest to the bar', 'Lower slowly'],
    mistake: 'Hips dropping. Squeeze glutes the whole time.',
    substitutions: ['db-row', 'seated-cable-row', 'prone-y-raise'],
  }),
  E({
    id: 'prone-y-raise', name: 'Prone Y raise', pattern: 'pull', slot: 'pullH',
    muscles: ['back', 'shoulders'], primary: 1,
    equipment: [], difficulty: 1, unit: 'reps', loaded: false, compound: false,
    cues: ['Lie face down, arms in a Y', 'Thumbs up, lift arms off the floor', 'Hold two seconds'],
    mistake: 'Lifting with the lower back. Only the arms and chest rise a little.',
    substitutions: ['inverted-row', 'face-pull'],
  }),
  E({
    id: 'face-pull', name: 'Band face pull', pattern: 'pull', slot: 'shoulderHealth',
    muscles: ['shoulders', 'back'], primary: 1,
    equipment: ['band'], difficulty: 1, unit: 'reps', loaded: false, compound: false,
    cues: ['Band at face height', 'Pull toward your forehead, elbows high', 'Finish with thumbs pointing back'],
    mistake: 'Shrugging. Keep your neck long.',
    substitutions: ['prone-y-raise'],
  }),
  // ---- Core ----
  E({
    id: 'plank', name: 'Plank', pattern: 'core', slot: 'core',
    muscles: ['core'], primary: 1,
    equipment: [], difficulty: 1, unit: 'sec', loaded: false, compound: false,
    cues: ['Elbows under shoulders', 'Squeeze glutes, tuck ribs', 'Breathe slowly'],
    mistake: 'Hips piking up. Make one straight line.',
    substitutions: ['dead-bug', 'side-plank'],
  }),
  E({
    id: 'side-plank', name: 'Side plank', pattern: 'core', slot: 'core',
    muscles: ['core'], primary: 1,
    equipment: [], difficulty: 1, unit: 'secPerSide', loaded: false, compound: false,
    cues: ['Elbow under shoulder', 'Hips high, body straight', 'Stack your feet or stagger them'],
    mistake: 'Hips sinking toward the floor. Push them up.',
    substitutions: ['plank', 'pallof-press'],
  }),
  E({
    id: 'dead-bug', name: 'Dead bug', pattern: 'core', slot: 'core',
    muscles: ['core'], primary: 1,
    equipment: [], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: false,
    cues: ['Lower back pressed into the floor', 'Reach opposite arm and leg away', 'Exhale as you reach'],
    mistake: 'Back lifting off the floor. Shorten the reach.',
    substitutions: ['plank', 'hanging-knee-raise'],
  }),
  E({
    id: 'hanging-knee-raise', name: 'Hanging knee raise', pattern: 'core', slot: 'core',
    muscles: ['core'], primary: 1,
    equipment: ['pullupBar'], difficulty: 2, unit: 'reps', loaded: false, compound: false,
    cues: ['Hang still, shoulders engaged', 'Curl knees up toward your chest', 'Lower without swinging'],
    mistake: 'Swinging for momentum. Pause at the bottom.',
    substitutions: ['dead-bug', 'plank'],
  }),
  E({
    id: 'pallof-press', name: 'Pallof press', pattern: 'core', slot: 'antiRotation',
    muscles: ['core'], primary: 1,
    equipment: ['band'], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: false,
    cues: ['Stand side-on to the anchor', 'Press the band straight out', 'Do not let it turn you'],
    mistake: 'Rotating toward the band. Brace and stay square.',
    substitutions: ['side-plank', 'dead-bug'],
  }),
  // ---- Carry ----
  E({
    id: 'farmers-carry', name: "Farmer's carry", pattern: 'carry', slot: 'carry',
    muscles: ['core', 'arms', 'back'], primary: 2,
    equipment: ['dumbbell'], difficulty: 1, unit: 'sec', loaded: true, increment: 2, compound: true,
    cues: ['Heavy weights at your sides', 'Walk tall, short steps', 'Shoulders down, grip hard'],
    mistake: 'Leaning to one side. Stay upright.',
    substitutions: ['plank', 'side-plank'],
  }),
  // ---- Plyo ----
  E({
    id: 'jump-squat', name: 'Jump squat', pattern: 'plyo', slot: 'plyo',
    muscles: ['quads', 'glutes', 'calves'], primary: 2,
    equipment: [], difficulty: 2, unit: 'reps', loaded: false, compound: true,
    cues: ['Quarter squat, arms back', 'Jump up fast', 'Land soft and quiet'],
    mistake: 'Landing stiff-legged. Bend knees to absorb.',
    substitutions: ['skater-jump', 'bodyweight-squat'],
  }),
  E({
    id: 'skater-jump', name: 'Skater jump', pattern: 'plyo', slot: 'plyo',
    muscles: ['glutes', 'quads', 'calves'], primary: 2,
    equipment: [], difficulty: 2, unit: 'repsPerSide', loaded: false, compound: true,
    cues: ['Bound sideways from one leg to the other', 'Land softly, hold for a beat', 'Swing arms across'],
    mistake: 'Knee caving on landing. Keep it over your toes.',
    substitutions: ['jump-squat', 'reverse-lunge'],
  }),
  // ---- Conditioning ----
  E({
    id: 'burpee', name: 'Burpee', pattern: 'cardio', slot: 'conditioning',
    muscles: ['quads', 'chest', 'core'], primary: 1,
    equipment: [], difficulty: 2, unit: 'reps', loaded: false, compound: true,
    cues: ['Hands down, jump feet back', 'Chest to floor, then up', 'Jump with a clap overhead'],
    mistake: 'Sagging hips in the plank. Keep it tight.',
    substitutions: ['mountain-climber', 'jump-squat'],
  }),
  E({
    id: 'mountain-climber', name: 'Mountain climber', pattern: 'cardio', slot: 'conditioning',
    muscles: ['core', 'shoulders'], primary: 1,
    equipment: [], difficulty: 1, unit: 'sec', loaded: false, compound: false,
    cues: ['High plank, hands under shoulders', 'Drive knees to chest fast', 'Hips stay level'],
    mistake: 'Bouncing the hips up. Keep a flat back.',
    substitutions: ['burpee', 'plank'],
  }),
  // ---- Calves ----
  E({
    id: 'calf-raise', name: 'Calf raise', pattern: 'squat', slot: 'calves',
    muscles: ['calves'], primary: 1,
    equipment: [], difficulty: 1, unit: 'reps', loaded: false, compound: false,
    cues: ['Balls of feet on a step', 'Rise as high as you can', 'Lower slowly below the step'],
    mistake: 'Bouncing. Pause at the top and bottom.',
    substitutions: ['jump-squat'],
  }),
  // ---- Warm-up ----
  E({
    id: 'jumping-jack', name: 'Jumping jack', pattern: 'cardio', slot: 'warmup',
    muscles: ['calves', 'shoulders'], primary: 1,
    equipment: [], difficulty: 1, unit: 'sec', loaded: false, compound: false,
    cues: ['Light on your toes', 'Arms all the way up', 'Steady rhythm'],
    mistake: 'Landing flat-footed. Stay springy.',
    substitutions: ['leg-swing'],
  }),
  E({
    id: 'leg-swing', name: 'Leg swing', pattern: 'mobility', slot: 'warmup',
    muscles: ['hamstrings', 'glutes'], primary: 1,
    equipment: [], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: false,
    cues: ['Hold something for balance', 'Swing forward and back, relaxed', 'Grow the range each swing'],
    mistake: 'Rounding the back to swing higher. Stay tall.',
    substitutions: ['jumping-jack', 'worlds-greatest-stretch'],
  }),
  // ---- Mobility ----
  E({
    id: 'worlds-greatest-stretch', name: "World's greatest stretch", pattern: 'mobility', slot: 'mobility',
    muscles: ['hamstrings', 'glutes', 'back'], primary: 2,
    equipment: [], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: false,
    cues: ['Long lunge, hands inside the front foot', 'Rotate and reach to the sky', 'Breathe out into it'],
    mistake: 'Rushing. Take a slow breath in each position.',
    substitutions: ['hip-flexor-stretch', 'open-book'],
  }),
  E({
    id: 'hip-flexor-stretch', name: 'Hip flexor stretch', pattern: 'mobility', slot: 'mobility',
    muscles: ['quads', 'glutes'], primary: 1,
    equipment: [], difficulty: 1, unit: 'secPerSide', loaded: false, compound: false,
    cues: ['Half kneel, back knee on a soft surface', 'Tuck your pelvis, squeeze the back glute', 'Shift forward gently'],
    mistake: 'Arching the lower back. Tuck first, then shift.',
    substitutions: ['worlds-greatest-stretch'],
  }),
  E({
    id: 'cat-cow', name: 'Cat–cow', pattern: 'mobility', slot: 'mobility',
    muscles: ['back', 'core'], primary: 1,
    equipment: [], difficulty: 1, unit: 'reps', loaded: false, compound: false,
    cues: ['Hands under shoulders, knees under hips', 'Round up, then let the belly drop', 'Move with your breath'],
    mistake: 'Moving only the neck. Let the whole spine move.',
    substitutions: ['open-book'],
  }),
  E({
    id: 'open-book', name: 'Open book', pattern: 'mobility', slot: 'mobility',
    muscles: ['back', 'chest'], primary: 1,
    equipment: [], difficulty: 1, unit: 'repsPerSide', loaded: false, compound: false,
    cues: ['Lie on your side, knees bent', 'Open the top arm across to the other side', 'Follow your hand with your eyes'],
    mistake: 'Knees lifting apart. Keep them stacked.',
    substitutions: ['cat-cow', 'worlds-greatest-stretch'],
  }),
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = EXERCISE_BY_ID[id];
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
}

/** What equipment each context gives you. "box" means a step, bench or sturdy chair. */
export const CONTEXT_EQUIPMENT: Record<EquipmentContext, Equipment[]> = {
  gym: ['barbell', 'rack', 'bench', 'dumbbell', 'kettlebell', 'cable', 'pullupBar', 'dipBars', 'band', 'box', 'treadmill'],
  home: ['dumbbell', 'kettlebell', 'band', 'pullupBar', 'bench', 'box'],
  bodyweight: ['box'],
  outdoors: ['pullupBar', 'dipBars', 'box'],
};

export const CONTEXT_LABEL: Record<EquipmentContext, string> = {
  gym: 'Gym',
  home: 'Home kit',
  bodyweight: 'Bodyweight',
  outdoors: 'Outdoors',
};

export function isAvailable(ex: Exercise, ctx: EquipmentContext): boolean {
  const have = CONTEXT_EQUIPMENT[ctx];
  return ex.equipment.every((q) => have.includes(q));
}
