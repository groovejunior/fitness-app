import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

const AnimationGallery = lazy(() => import('./screens/dev/AnimationGallery'));

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/dev/animations" element={<AnimationGallery />} />
          <Route path="*" element={<div className="p-8">Fitness</div>} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
