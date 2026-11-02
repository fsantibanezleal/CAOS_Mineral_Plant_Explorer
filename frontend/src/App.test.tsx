// The global plant workspace is the product entry; documentation remains reachable from the shared header.
import { APP_ROUTE, STANDARD_ROUTES } from '@fasl-work/caos-app-shell';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./App.tsx', import.meta.url), 'utf8');

describe('the mineral plant workspace entry', () => {
  it('the routes are the standard ones, with the App first at /app', () => {
    expect(APP_ROUTE).toBe('/app');
    expect(STANDARD_ROUTES.map((r) => r.path)).toEqual(['/app', '/introduction', '/methodology', '/implementation', '/experiments', '/benchmark']);
  });

  it('the example header lists the six routes in the decided order, the App leftmost', () => {
    const order = ['/app', '/introduction', '/methodology', '/implementation', '/experiments', '/benchmark'];
    expect(STANDARD_ROUTES.map((route) => route.path)).toEqual(order);
    expect(source).toContain('routes: STANDARD_ROUTES');
  });

  it('the Introduction remains available as product documentation', () => {
    expect(source).toContain("const Introduction = lazy(() => import('./pages/Introduction')");
    expect(source).toContain('<Route path="/introduction" element={<Introduction />} />');
    expect(source).toContain('<Suspense fallback=');
    const introduction = readFileSync(new URL('./pages/Introduction.tsx', import.meta.url), 'utf8');
    expect(introduction).toContain('ExecutiveView data={data}');
  });

  it('the App route renders the global plant workspace, not the legacy case workbench', () => {
    expect(source).toContain("const Workbench = lazy(() => import('./workbench/Workbench')");
    expect(source).toContain('<Route path="/app" element={<Workbench />} />');
    const workbench = readFileSync(new URL('./workbench/Workbench.tsx', import.meta.url), 'utf8');
    expect(workbench).toContain('<PlantOverviewView s={s}/>');
    expect(workbench).toContain("en: 'Global overview'");
    expect(workbench).not.toContain('<CaseWorkbench');
  });

  it('the bare root lands on the Introduction and query-bearing root links reach the App', () => {
    expect(source).toContain('function RootLandingRedirect()');
    expect(source).toContain("const pathname = location.search || location.hash ? '/app' : '/introduction'");
    expect(source).toContain('<Route path="/" element={<RootLandingRedirect />} />');
    expect(source).toContain("pathname, search: location.search, hash: location.hash");
  });

  it('unknown paths land on the App while preserving query and hash state', () => {
    expect(source).toContain('function AppEntryRedirect()');
    expect(source).toContain("pathname: '/app', search: location.search, hash: location.hash");
    expect(source).toContain('<Route path="/app" element={<Workbench />} />');
    expect(source).toContain('<Route path="*" element={<AppEntryRedirect />} />');
  });

  it('declares the global explorer as a SurfacePage with area-aware Focus views', () => {
    const product = JSON.parse(readFileSync(new URL('../../product.json', import.meta.url), 'utf8'));
    expect(product.app).toBe('surface');
    const workbench = readFileSync(new URL('./workbench/Workbench.tsx', import.meta.url), 'utf8');
    expect(workbench).toContain('tabs={tabs}');
    expect(workbench).toContain('instrument focus');
    expect(workbench).toContain('rail:focusControls');
    expect(workbench).toContain("hud:item.id==='engines'||item.id==='site-plan'?[]:focusHud");
    expect(workbench).toContain('description:focusDescription');
    expect(workbench).toContain("asScope(search.get('area'))!=='global'&&initial==='overview'?'schematic':initial");
  });

  it('the app holds direct-link state for area, view, asset and replay time', () => {
    const workbench = readFileSync(new URL('./workbench/Workbench.tsx', import.meta.url), 'utf8');
    expect(workbench).toContain("search.get('area')");
    expect(workbench).toContain("search.get('view')");
    expect(workbench).toContain("search.get('asset')");
    expect(workbench).toContain("search.get('step')");
  });

  it('adversarial: the plant workspace cannot collapse all areas into one diagram mode', () => {
    const workbench = readFileSync(new URL('./workbench/Workbench.tsx', import.meta.url), 'utf8');
    const visuals = readFileSync(new URL('./workbench/AreaVisuals.tsx', import.meta.url), 'utf8');
    expect(workbench).toContain("{ id: 'site-plan'");
    expect(workbench).toContain("{ id: 'schematic'");
    expect(workbench).toContain("{ id: '3d'");
    expect(workbench).toContain('buildAreaModel(graph.data,scope).coreAssets');
    expect(visuals).toContain('data-testid={`area-schematic-${s.scope}`}');
    expect(visuals).toContain('ob-water-schematic');
  });

  it('adversarial: opening an area preserves the selected site, schematic or 3D representation', () => {
    const workbench = readFileSync(new URL('./workbench/Workbench.tsx', import.meta.url), 'utf8');
    expect(workbench).toContain('const chooseScope=(next:PlantScope)=>');
    expect(workbench).not.toContain("if(next!=='global'&&view==='site-plan')chooseView('overview')");
    expect(workbench).toContain('const chooseView=(next:PlantView)=>');
  });

  it('adversarial: an unavailable trend leads with usable area channels and boundaries, not a repeated schematic', () => {
    const views = readFileSync(new URL('./workbench/views.tsx', import.meta.url), 'utf8');
    const fallback = views.slice(views.indexOf('function ReplayTrends'), views.indexOf('export function EvidenceView'));
    expect(fallback).toContain('Available area channels');
    expect(fallback).toContain('Process context');
    expect(fallback).toContain('areaChannels.length?');
    expect(fallback).not.toContain('<AreaSchematicDiagram s={s} model={model}/>');
  });

  it('the App remains the leftmost shell route', () => {
    expect(STANDARD_ROUTES[0].path).toBe(APP_ROUTE);
    expect(STANDARD_ROUTES.map((r) => r.path)).toEqual(['/app', '/introduction', '/methodology', '/implementation', '/experiments', '/benchmark']);
  });

});
