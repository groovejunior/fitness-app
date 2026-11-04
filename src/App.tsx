import { lazy, Suspense, type ReactNode } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Loading } from './components/Empty';
import { useProfile } from './data/hooks';
import { TabBar } from './ui';

const Onboarding = lazy(() => import('./screens/onboarding/Onboarding'));
const Today = lazy(() => import('./screens/today/Today'));
const MonthView = lazy(() => import('./screens/plan/MonthView'));
const WeekView = lazy(() => import('./screens/plan/WeekView'));
const WorkoutDetail = lazy(() => import('./screens/workout/WorkoutDetail'));
const ActiveSession = lazy(() => import('./screens/session/ActiveSession'));
const Progress = lazy(() => import('./screens/progress/Progress'));
const Settings = lazy(() => import('./screens/settings/Settings'));
const AnimationGallery = lazy(() => import('./screens/dev/AnimationGallery'));
const Seed = lazy(() => import('./screens/dev/Seed'));

/** Sends first-time users to onboarding. */
function RequireProfile({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const loc = useLocation();
  if (profile === undefined) return <Loading />;
  if (profile === null) return <Navigate to="/onboarding" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}

/** Main tabs: content plus the bottom tab bar. */
function TabsLayout() {
  return (
    <RequireProfile>
      <Outlet />
      <TabBar />
    </RequireProfile>
  );
}

function Pushed() {
  return (
    <RequireProfile>
      <Outlet />
    </RequireProfile>
  );
}

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<TabsLayout />}>
            <Route path="/" element={<Today />} />
            <Route path="/plan" element={<Navigate to="/plan/week" replace />} />
            <Route path="/plan/month" element={<MonthView />} />
            <Route path="/plan/week" element={<WeekView />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route element={<Pushed />}>
            <Route path="/workout/:weekStart/:slotId" element={<WorkoutDetail />} />
            <Route path="/session/:id" element={<ActiveSession />} />
          </Route>
          <Route path="/dev/animations" element={<AnimationGallery />} />
          <Route path="/dev/seed" element={<Seed />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
