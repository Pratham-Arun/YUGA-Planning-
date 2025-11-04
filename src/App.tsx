import React from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import ParticleSystemDemo from './components/ParticleSystem/ParticleSystemDemo';
import { AppLayout } from './components/layout/AppLayout';
import { Suspense, lazy } from 'react';

// Lazy load components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CodeEditor = lazy(() => import('./pages/CodeEditor'));
const Assets = lazy(() => import('./pages/Assets'));
const SceneEditor = lazy(() => import('./pages/SceneEditor'));
const Team = lazy(() => import('./pages/Team'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const ParticlesPage = lazy(() => import('./pages/ParticlesPage'));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-900">
    <div className="text-xl text-white">Loading...</div>
  </div>
);

export default function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <AppLayout>
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="code/*" element={<CodeEditor />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="scene" element={<SceneEditor />} />
                  <Route path="team" element={<Team />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="particles" element={<ParticlesPage />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </Suspense>
    </Router>
  );
}