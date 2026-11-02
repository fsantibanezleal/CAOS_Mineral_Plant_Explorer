import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4199';
const areas = [
  'mine-extraction', 'crushing-stockpiling', 'grinding', 'flotation',
  'leach-sx-ew', 'thickening-filtration', 'water-balance', 'tailings', 'utilities',
];
const expectedNodes = {
  'mine-extraction': 3,
  'crushing-stockpiling': 5,
  grinding: 6,
  flotation: 3,
  'leach-sx-ew': 8,
  'thickening-filtration': 3,
  'water-balance': 6,
  tailings: 3,
  utilities: 5,
};
const expectedPlanAssets = { ...expectedNodes, 'water-balance': 22 };
let browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
const errors = [];
try {
  for (const language of ['EN', 'ES']) {
    await page.goto(`${baseUrl}/app?view=diagram`, { waitUntil: 'networkidle' });
    const languageButton = page.getByRole('button', { name: 'Switch language' });
    if ((await languageButton.innerText()).trim().toUpperCase() !== language) await languageButton.click();
    for (const area of areas) {
      await page.goto(`${baseUrl}/app?area=${area}&view=schematic`, { waitUntil: 'networkidle' });
      const svg = area === 'water-balance'
        ? page.locator('.ob-water-schematic')
        : page.getByTestId(`area-schematic-${area}`);
      if (!(await svg.count())) {
        errors.push(`${language}/${area}: detailed area schematic did not render`);
        continue;
      }
      const scroll = await svg.evaluate((root) => ({
        clientWidth: root.parentElement?.clientWidth ?? 0,
        scrollWidth: root.parentElement?.scrollWidth ?? 0,
        hint: root.parentElement?.previousElementSibling ? getComputedStyle(root.parentElement.previousElementSibling).display : 'missing',
      }));
      if (scroll.scrollWidth > scroll.clientWidth + 1 && scroll.hint === 'none') errors.push(`${language}/${area}: clipped schematic has no visible horizontal-scroll hint`);
      const result = await svg.evaluate((root) => {
        const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
        const water=root.classList.contains('ob-water-schematic');
        const nodes=water?[...root.querySelectorAll('.ob-water-area')].map(e=>e.getBoundingClientRect()):[...root.querySelectorAll('.ob-schematic-node')].map(e=>e.getBoundingClientRect());
        const routeGroups=[...root.querySelectorAll(water?'.ob-water-route':'.ob-process-stream:not(.boundary)')];
        const labelGroups=routeGroups.map(g=>{const r=[...g.querySelectorAll('text')].map(e=>e.getBoundingClientRect()).filter(b=>b.width>0&&b.height>0);return r.length?{left:Math.min(...r.map(b=>b.left)),right:Math.max(...r.map(b=>b.right)),top:Math.min(...r.map(b=>b.top)),bottom:Math.max(...r.map(b=>b.bottom))}:null}).filter(Boolean);
        const labels=labelGroups;
        const nodeLabels=labels.flatMap((label,i)=>nodes.flatMap((node,j)=>overlap(label,node)?['route label '+(i+1)+' intersects equipment/area '+(j+1)]:[]));
        const labelOverlap=labels.flatMap((label,i)=>labels.slice(i+1).flatMap((other,j)=>overlap(label,other)?['route label '+(i+1)+' intersects label '+(i+j+2)]:[]));
        const routeCrossings=water?(()=>{const paths=routeGroups.map(g=>g.querySelector('path')).filter(Boolean),points=paths.map(p=>Array.from({length:81},(_,i)=>p.getPointAtLength(p.getTotalLength()*i/80)));const hits=[];for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){let closest=Infinity;for(let a=4;a<77;a++)for(let b=4;b<77;b++)closest=Math.min(closest,Math.hypot(points[i][a].x-points[j][b].x,points[i][a].y-points[j][b].y));if(closest<5)hits.push(`water transfer ${i+1} crosses transfer ${j+1}`)}return hits})():[];
        const viewport=root.getBoundingClientRect();
        const boundaryGroups=[...root.querySelectorAll('.ob-boundary-port')].map(g=>({side:g.classList.contains('incoming')?'in':'out',box:g.getBoundingClientRect(),id:g.querySelector('.ob-boundary-route')?.textContent??'terminal'}));
        const boundaryOverlap=boundaryGroups.flatMap((a,i)=>boundaryGroups.slice(i+1).flatMap(b=>a.side===b.side&&overlap(a.box,b.box)?[a.id+' boundary label overlaps '+b.id]:[]));
        const clipped=[...root.querySelectorAll(water?'.ob-water-area,.ob-water-route text':'.ob-schematic-node,.ob-process-stream text,.ob-boundary-port')].flatMap(e=>{const b=e.getBoundingClientRect();return b.width&&b.height&&(b.left<viewport.left-1||b.right>viewport.right+1||b.top<viewport.top-1||b.bottom>viewport.bottom+1)?[(e.classList[0]??'content')+' is clipped by the SVG viewport']:[]});
        const names=[...root.querySelectorAll('.ob-node-name')].flatMap(e=>e.getBBox().width>148?[(e.closest('.ob-schematic-node')?.getAttribute('aria-label')??'equipment')+' name exceeds 148 SVG units']:[]);
        return{labelCount:routeGroups.length,nodeCount:nodes.length,issues:[...nodeLabels,...labelOverlap,...routeCrossings,...boundaryOverlap,...clipped,...names]};
      });
      const expectedNodeCount = expectedNodes[area];
      if (result.nodeCount < expectedNodeCount) errors.push(`${language}/${area}: diagram rendered ${result.nodeCount} nodes; expected at least ${expectedNodeCount}`);
      if (result.issues.length) errors.push(`${language}/${area}: ${result.issues.join('; ')}`);
      console.log(`${language}/${area}: ${result.nodeCount} ${area === 'water-balance' ? 'areas' : 'nodes'}, ${result.labelCount} ${area === 'water-balance' ? 'transfers' : 'labels'}, ${result.issues.length ? result.issues.join('; ') : 'clear'}`);
    }
  }
  await page.close();
  await browser.close();
  browser = await chromium.launch({ headless: true });
  for (const language of ['EN', 'ES']) {
    const selectionPage = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await selectionPage.goto(`${baseUrl}/app?view=overview`, { waitUntil: 'domcontentloaded' });
    const languageButton = selectionPage.locator('button[aria-label="Switch language"]');
    await languageButton.waitFor({ state: 'visible', timeout: 15000 });
    if ((await languageButton.innerText()).trim().toUpperCase() !== language) await languageButton.click();
    await selectionPage.locator('button[data-tab="site-plan"]').waitFor({ state: 'visible', timeout: 15000 });

    await selectionPage.locator('button[data-tab="site-plan"]').click();
    const waterPlanArea = selectionPage.locator('.ob-site-plan .ob-plan-area[data-area-id="water-balance"]');
    const waterPlanSummary = await waterPlanArea.textContent() ?? '';
    const hasWaterAssets = language === 'ES' ? /22\s+equipos/.test(waterPlanSummary) : /22\s+assets/.test(waterPlanSummary);
    if (!hasWaterAssets) errors.push(`${language}/global-site-plan/water-balance: water-linked asset count is missing or zero`);
    console.log(`${language}/global-site-plan/water-balance: ${hasWaterAssets ? 'water-linked assets are represented' : 'FAILED'}`);
    await selectionPage.locator('button[data-tab="overview"]').click();

    const overviewArea = selectionPage.locator('.ob-global-process-area[data-area-id="crushing-stockpiling"]');
    await overviewArea.hover();
    const overviewPreview = selectionPage.locator('.ob-area-preview[data-preview-area="crushing-stockpiling"]');
    await overviewPreview.waitFor({ state: 'visible', timeout: 5000 }).catch(() => errors.push(`${language}/overview-hover/crushing-stockpiling: area preview did not appear`));
    const overviewPreviewText = await overviewPreview.innerText().catch(() => '');
    if (!overviewPreviewText.includes('ROM') || !overviewPreviewText.includes(language === 'ES' ? 'REPRODUCCIÓN DE REFERENCIA' : 'REFERENCE REPLAY')) errors.push(`${language}/overview-hover/crushing-stockpiling: preview is missing circuit or evidence context`);
    console.log(`${language}/overview-hover/crushing-stockpiling: ${overviewPreviewText.includes('ROM') ? 'shows circuit and evidence context' : 'FAILED'}`);
    await overviewArea.focus();
    await selectionPage.locator('.ob-area-preview[data-preview-area="crushing-stockpiling"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => errors.push(`${language}/overview-focus/crushing-stockpiling: keyboard preview did not appear`));

    await selectionPage.goto(`${baseUrl}/app?view=overview&asset=ROM&area=crushing-stockpiling`, { waitUntil: 'domcontentloaded' });
    await selectionPage.locator('.ob-atlas-view[data-scope="crushing-stockpiling"] .ob-area-overview-grid').waitFor({ state: 'visible', timeout: 15000 });
    const deepLinkDetail = await selectionPage.locator('.ob-atlas-view[data-scope="crushing-stockpiling"] .ob-area-asset-grid button').count() === 5;
    if (!deepLinkDetail) errors.push(`${language}/deep-link/crushing-stockpiling: area overview did not render its own assets and boundaries`);
    console.log(`${language}/deep-link/crushing-stockpiling: ${deepLinkDetail ? 'renders its own area overview' : 'FAILED'}`);
    const assetCard = selectionPage.locator('.ob-area-asset-grid button').first();
    const hoveredAssetId = (await assetCard.innerText()).match(/[A-Z0-9]+/)?.[0];
    await assetCard.hover();
    const hoverInspector = selectionPage.locator('.ob-explorer-side .ob-asset-inspector');
    await hoverInspector.waitFor({ state: 'visible', timeout: 5000 });
    const hoverAssetMatches = await hoverInspector.getAttribute('data-asset-inspector') === hoveredAssetId;
    const inspectorHasEvidence = await hoverInspector.getByText(/Process connections|Conexiones de proceso/).count() > 0
      && await hoverInspector.getByText(/Bound variables|Variables vinculadas/).count() > 0;
    if (!hoverAssetMatches || !inspectorHasEvidence) errors.push(`${language}/asset-hover: inspector did not follow the hovered equipment or show its evidence sections`);
    console.log(`${language}/asset-hover: ${hoverAssetMatches && inspectorHasEvidence ? 'shows equipment-specific inspector' : 'FAILED'}`);
    await selectionPage.goto(`${baseUrl}/app?area=mine-extraction&asset=PIT`, { waitUntil: 'domcontentloaded' });
    await selectionPage.locator('.ob-atlas-view[data-scope="mine-extraction"] .ob-area-overview-grid').waitFor({ state: 'visible', timeout: 15000 });
    const mineDeepLink = await selectionPage.locator('.ob-atlas-view[data-scope="mine-extraction"] .ob-area-asset-grid button').count() === 3;
    if (!mineDeepLink) errors.push(`${language}/deep-link/mine-extraction: asset URL did not open its own area overview`);
    await selectionPage.locator('button[data-tab="schematic"]').click();
    await selectionPage.getByTestId('area-schematic-mine-extraction').waitFor({ state: 'visible', timeout: 15000 });
    const focusButton = selectionPage.getByRole('button', { name: /Open this view in focus mode|Abrir esta vista en modo enfoque/ });
    await focusButton.click();
    await selectionPage.waitForURL(/focus=1/);
    const focusLayout = await selectionPage.locator('[data-focus-shell]').evaluate((root) => {
      const stage = root.querySelector('.caos-focus-stage')?.getBoundingClientRect();
      const diagram = root.querySelector('.ob-process-schematic')?.getBoundingClientRect();
      const side = root.querySelector('.caos-focus-rail');
      return { stageWidth: stage?.width ?? 0, diagramWidth: diagram?.width ?? 0, railCount: root.querySelectorAll('.caos-focus-rail').length, railControls: !!side?.querySelector('select[aria-label="Replay case"], select[aria-label="Caso de reproducción"]') };
    });
    if (!(focusLayout.diagramWidth > focusLayout.stageWidth * 0.8) || focusLayout.railCount !== 1 || !focusLayout.railControls) errors.push(`${language}/focus: visualization does not use the clean full-width stage (${JSON.stringify(focusLayout)})`);
    console.log(`${language}/focus: diagram fills stage and duplicate rails are absent`);
    await selectionPage.locator('[data-focus-exit]').click();
    await selectionPage.locator('[data-focus-shell]').waitFor({ state: 'detached', timeout: 5000 });

    await selectionPage.goto(`${baseUrl}/app?view=overview`, { waitUntil: 'domcontentloaded' });
    await selectionPage.locator('button[data-tab="site-plan"]').waitFor({ state: 'visible', timeout: 15000 });

    await selectionPage.locator('.ob-global-process-area[data-area-id="crushing-stockpiling"]').click();
    await selectionPage.waitForURL(/area=crushing-stockpiling.*view=schematic|view=schematic.*area=crushing-stockpiling/);
    const overviewDrillDown = await selectionPage.getByTestId('area-schematic-crushing-stockpiling').count() > 0;
    if (!overviewDrillDown) errors.push(`${language}/overview/crushing-stockpiling: global area selection did not open its detailed process diagram`);
    console.log(`${language}/overview-selection/crushing-stockpiling: ${overviewDrillDown ? 'opens its own area diagram' : 'FAILED'}`);

    await selectionPage.locator('select').first().selectOption('global');
    await selectionPage.locator('button[data-tab="site-plan"]').click();
    const planArea = selectionPage.locator('.ob-site-plan .ob-plan-area').nth(1);
    await planArea.hover();
    const planPreview = selectionPage.locator('.ob-area-preview[data-preview-area="crushing-stockpiling"]');
    await planPreview.waitFor({ state: 'visible', timeout: 5000 }).catch(() => errors.push(`${language}/site-plan-hover/crushing-stockpiling: area preview did not appear`));
    for (const area of areas) {
      await selectionPage.locator('.ob-site-plan .ob-plan-area').nth(areas.indexOf(area)).click();
      await selectionPage.waitForURL(new RegExp(`area=${area}.*view=site-plan|view=site-plan.*area=${area}`));
      const scopedPlanCount = await selectionPage.locator('.ob-plan-asset-dot.core').count();
      const expectedPlanCount = expectedPlanAssets[area];
      if (scopedPlanCount !== expectedPlanCount) errors.push(`${language}/${area}: detailed site plan contains ${scopedPlanCount} core assets; expected ${expectedPlanCount}`);
      await selectionPage.locator('button[data-tab="schematic"]').click();
      const detailExists = area === 'water-balance'
        ? await selectionPage.locator('.ob-water-schematic').count() > 0
        : await selectionPage.getByTestId(`area-schematic-${area}`).count() > 0;
      if (!detailExists) errors.push(`${language}/${area}: selecting the 2D area did not open its detailed schematic`);
      console.log(`${language}/selection/${area}: ${detailExists ? 'opens its own detailed view' : 'FAILED'}`);
      await selectionPage.locator('select').first().selectOption('global');
      await selectionPage.locator('button[data-tab="site-plan"]').click();
    }
    await selectionPage.close();
    await browser.close();
    browser = await chromium.launch({ headless: true });
  }
  for (const language of ['EN', 'ES']) {
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await mobile.goto(`${baseUrl}/app?view=diagram`, { waitUntil: 'networkidle' });
    const languageButton = mobile.locator('button[aria-label="Switch language"]');
    if ((await languageButton.innerText()).trim().toUpperCase() !== language) await languageButton.click();
    for (const area of areas) {
      await mobile.goto(`${baseUrl}/app?area=${area}&view=schematic`, { waitUntil: 'networkidle' });
      const result = await mobile.evaluate(() => {
        const svg = document.querySelector('.ob-process-schematic, .ob-water-schematic');
        const region = svg?.closest('.ob-diagram-scroll');
        const hint = region?.previousElementSibling;
        return {
          viewport: innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          svgWidth: svg ? svg.getBoundingClientRect().width : 0,
          regionWidth: region?.clientWidth ?? 0,
          regionScrollWidth: region?.scrollWidth ?? 0,
          regionHeight: region?.clientHeight ?? 0,
          regionScrollHeight: region?.scrollHeight ?? 0,
          overflowX: region ? getComputedStyle(region).overflowX : 'missing',
          hintVisible: !!hint && getComputedStyle(hint).display !== 'none',
        };
      });
      const valid = result.viewport === result.pageWidth && result.svgWidth >= 1000
        && result.regionWidth <= 390 && result.regionScrollWidth > result.regionWidth
        && result.regionScrollHeight <= result.regionHeight + 1 && result.overflowX === 'auto' && result.hintVisible;
      if (!valid) errors.push(`${language}/${area}/phone: diagram canvas is clipped, unreadable, or overflows the page (${JSON.stringify(result)})`);
      console.log(`${language}/phone/${area}: ${valid ? 'readable scroll region, no page overflow' : 'FAILED'}`);
    }
    await mobile.close();
    await browser.close();
    browser = await chromium.launch({ headless: true });
  }
  const spatial = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  for (const area of areas) {
    await spatial.goto(`${baseUrl}/app?view=3d&area=${area}`, { waitUntil: 'domcontentloaded' });
    const scene = spatial.locator('.ob-scene-wrap');
    await scene.waitFor({ state: 'visible', timeout: 20000 });
    const result = {
      scope: await scene.getAttribute('data-scope'),
      assets: Number(await scene.getAttribute('data-visible-assets')),
      expected: expectedPlanAssets[area],
      canvas: await spatial.locator('.ob-scene canvas').count(),
    };
    if (result.scope !== area || result.assets !== result.expected || !result.canvas) {
      errors.push(`${area}/3D: scene scope or visible asset set is wrong (${JSON.stringify(result)})`);
    }
    console.log(`EN/3D/${area}: ${result.scope === area && result.assets === result.expected && result.canvas ? `${result.assets} scoped assets` : 'FAILED'}`);
  }
  await spatial.goto(`${baseUrl}/app?view=3d&area=crushing-stockpiling&asset=ROM`, { waitUntil: 'domcontentloaded' });
  const crushScene = spatial.locator('.ob-scene-wrap');
  await crushScene.waitFor({ state: 'visible', timeout: 20000 });
  const canvas = spatial.locator('.ob-scene canvas');
  const canvasBounds = await canvas.boundingBox();
  if (canvasBounds) await spatial.mouse.move(canvasBounds.x + canvasBounds.width * .42, canvasBounds.y + canvasBounds.height * .42);
  const hoverCard = spatial.locator('.ob-scene-hovercard');
  await hoverCard.waitFor({ state: 'visible', timeout: 5000 }).catch(() => errors.push('crushing-stockpiling/3D: hovering a rendered asset does not show its data card'));
  if (await hoverCard.count() && !(await hoverCard.innerText()).includes('Run-of-mine stockpile')) errors.push('crushing-stockpiling/3D: hover card does not identify the hovered asset');
  await spatial.close();
} finally {
  await browser.close();
}
if (errors.length) {
  console.error(`\nDiagram geometry failures (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('\nAll area diagrams passed geometry, bilingual navigation, mobile layout and 3D scope/hover checks.');
}
