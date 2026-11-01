// The global plant workspace is the product entry. The five documentation routes remain available in the shared shell;
// root and legacy links redirect to /app while preserving query and fragment state. The header order is STANDARD_ROUTES: App, Introduction,
// Methodology, Implementation, Experiments, Benchmark; the landing never moves the tabs. Identity, licence and visibility come from product.json (one source,
// written by scripts/instantiate.py); the version is VERSION, injected at build.
import { lazy, Suspense } from 'react';
import { AppShell, CitationsProvider, STANDARD_ROUTES, type ShellConfig } from '@fasl-work/caos-app-shell';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import product from '../../product.json';
import { architecture } from './architecture';
import { CITATIONS } from './content/citations';

// Keep the shared shell as the small route-independent entry; the five research pages and
// the operations workbench have different dependencies and are fetched only when opened.
const Benchmark = lazy(() => import('./pages/Benchmark').then((module) => ({ default: module.Benchmark })));
const Experiments = lazy(() => import('./pages/Experiments').then((module) => ({ default: module.Experiments })));
const Implementation = lazy(() => import('./pages/Implementation').then((module) => ({ default: module.Implementation })));
const Introduction = lazy(() => import('./pages/Introduction').then((module) => ({ default: module.Introduction })));
const Methodology = lazy(() => import('./pages/Methodology').then((module) => ({ default: module.Methodology })));
const Workbench = lazy(() => import('./workbench/Workbench').then((module) => ({ default: module.Workbench })));

function RootLandingRedirect() {
  const location = useLocation();
  const pathname = location.search || location.hash ? '/app' : '/introduction';
  return <Navigate to={{ pathname, search: location.search, hash: location.hash }} replace/>;
}

function AppEntryRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: '/app', search: location.search, hash: location.hash }} replace/>;
}

const config: ShellConfig = {
  product: { name: product.name },
  routes: STANDARD_ROUTES,
  links: { github: product.repo },
  version: __APP_VERSION__,
  build: __BUILD_ID__,
  license: { en: `${product.license} licence`, es: `Licencia ${product.license}` },
  visibility: product.visibility === 'private' ? 'private' : 'public',
  contain: true,
  architecture,
};

export function App() {
  return (
    <CitationsProvider items={CITATIONS}>
      <AppShell config={config}>
        <Suspense fallback={<p className="caos-pending" data-state="loading" role="status" aria-label="Loading / Cargando">…</p>}>
          <Routes>
            <Route path="/" element={<RootLandingRedirect />} />
            <Route path="/app" element={<Workbench />} />
            <Route path="/introduction" element={<Introduction />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/implementation" element={<Implementation />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="*" element={<AppEntryRedirect />} />
          </Routes>
        </Suspense>
      </AppShell>
    </CitationsProvider>
  );
}
