import { useEffect, useRef, useState } from 'react';
import { commitSession, committedWorkout, startSession, workoutOptions } from '../db/repo';
import type { Workout } from '../engine/types';
import { useHistory, useSession, useSessionSets } from '../lib/hooks';
import { navigate } from '../lib/router';
import { RunMode } from './active/RunMode';
import { StrengthMode } from './active/StrengthMode';
import { ssGet, ssSet, startKey, useWakeLock } from './active/device';

export function ActiveWorkout({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId);
  const sets = useSessionSets(sessionId);
  const history = useHistory();
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);
  const started = useRef(false);
  useWakeLock();

  // Load the frozen workout; if there is none, commit the recommended one so the screen always works.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      let w = await committedWorkout(sessionId);
      if (!w) {
        const opts = await workoutOptions(session);
        w = opts?.recommended;
        if (w) await commitSession(sessionId, w);
      }
      if (!cancelled) setWorkout(w ?? null);
    })();
    return () => {
      cancelled = true;
    };
    // Only when the session first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    if (!session || started.current) return;
    if (session.status === 'done') {
      navigate(`/session/${sessionId}/done`, { replace: true });
      return;
    }
    if (session.status === 'committed' && workout) {
      started.current = true;
      void startSession(sessionId);
    }
  }, [session, workout, sessionId]);

  useEffect(() => {
    if (!ssGet<number>(startKey(sessionId))) ssSet(startKey(sessionId), Date.now());
  }, [sessionId]);

  if (session === null || workout === null) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-[17px] font-semibold">Can't open this workout.</p>
        <button type="button" className="mt-4 text-accent" onClick={() => navigate('/today', { replace: true })}>
          Back to today
        </button>
      </div>
    );
  }
  if (!session || !workout || !sets || !history) return null;

  if (workout.type === 'run') return <RunMode sessionId={sessionId} workout={workout} />;
  return <StrengthMode session={session} workout={workout} sets={sets} history={history} />;
}
