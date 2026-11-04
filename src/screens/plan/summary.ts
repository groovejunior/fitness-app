import type { Profile, Targets } from '../../engine';
import { getSport } from '../../content/sports';

/** "3 gym · 2 runs · 1 tennis · 1 mobility" */
export function targetsSummary(t: Targets, profile: Profile): string {
  const sportName = profile.sports.length ? profile.sports.map((id) => getSport(id).name.toLowerCase()).join(' / ') : 'sport';
  const parts: string[] = [];
  if (t.gym) parts.push(`${t.gym} gym`);
  if (t.run) parts.push(`${t.run} ${t.run === 1 ? 'run' : 'runs'}`);
  if (t.sport) parts.push(`${t.sport} ${sportName}`);
  if (t.mobility) parts.push(`${t.mobility} mobility`);
  return parts.length ? parts.join(' · ') : 'Nothing planned';
}
