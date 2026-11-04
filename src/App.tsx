import { useEffect, useState } from 'react';
import { Gallery } from './animations/Gallery';
import { ensureWeek, mondayOf, today } from './db/repo';
import { useProfile } from './lib/hooks';
import { useRoute } from './lib/router';
import { useTheme } from './lib/theme';
import { TabBar } from './ui/Layout';
import { ActiveWorkout } from './screens/ActiveWorkout';
import { Finish } from './screens/Finish';
import { Onboarding } from './screens/Onboarding';
import { Plan } from './screens/Plan';
import { Progress } from './screens/Progress';
import { SessionDetail } from './screens/SessionDetail';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';

export function App() {
  const route = useRoute();
  const profile = useProfile();
  const [ready, setReady] = useState(false);
  useTheme(profile?.theme);

  // Make sure this week's plan exists (rolls into a new block when one ends).
  useEffect(() => {
    if (!profile) return;
    ensureWeek(mondayOf(today())).finally(() => setReady(true));
  }, [profile]);

  const [p0, p1, p2] = route.parts;
  if (p0 === 'dev' && p1 === 'gallery') return <Gallery />;
  if (profile === undefined) return null; // loading
  if (profile === null || p0 === 'onboarding') return <Onboarding />;
  if (!ready) return null;

  if (p0 === 'session' && p1) {
    if (p2 === 'active') return <ActiveWorkout sessionId={p1} />;
    if (p2 === 'done') return <Finish sessionId={p1} />;
    return <SessionDetail sessionId={p1} />;
  }

  const tab = '/' + (p0 ?? 'today');
  return (
    <>
      {tab === '/plan' ? <Plan /> : tab === '/progress' ? <Progress /> : tab === '/settings' ? <Settings /> : <Today />}
      <TabBar current={['/plan', '/progress', '/settings'].includes(tab) ? tab : '/today'} />
    </>
  );
}
