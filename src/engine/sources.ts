// One published source per workout. The screen shows a single sentence.
// The papers themselves stay as links in Settings, not as text in the app.

export type SourceId =
  | 'aus-movement'
  | 'currier-2023'
  | 'acsm-2009'
  | 'seiler-2009'
  | 'ioc-2016'
  | 'kotarsky-2018';

const LINE: Record<SourceId, string> = {
  'currier-2023': 'Several sets, big lifts first. A muscle comes around about twice a week.',
  'acsm-2009': 'Add a little weight when you beat the rep target. Stop with a couple of reps still in you.',
  'seiler-2009': 'Most running stays easy enough to talk. Hard work is the smaller part.',
  'ioc-2016': 'This week is lighter so the load does not jump.',
  'kotarsky-2018': 'The move got easy, so this is a harder version.',
  'aus-movement': 'Enough weekly work to cover the health minimum, with room to build on it.',
};

export function sourceLine(id: SourceId): string {
  return LINE[id];
}
