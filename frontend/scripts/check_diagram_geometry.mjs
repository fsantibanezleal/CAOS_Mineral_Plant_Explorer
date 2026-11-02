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
const browser = await chromium.launch({ headless: true });
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
        const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const waterBalance = root.classList.contains('ob-water-schematic');
        const nodes = waterBalance
          ? [...root.querySelectorAll('.ob-water-area > rect')].map((el) => el.getBoundingClientRect())
          : [...root.querySelectorAll('.ob-schematic-node')].map((el) => el.getBoundingClientRect());
        const labels = waterBalance
          ? [...root.querySelectorAll('.ob-water-route > rect')].map((el) => el.getBoundingClientRect())
          : [...root.querySelectorAll('.ob-process-stream:not(.boundary) > rect')].map((el) => el.getBoundingClientRect());
        const labelNode = labels.flatMap((label, i) => nodes.flatMap((node, j) => overlap(label, node) ? [`label ${i + 1} intersects node ${j + 1}`] : []));
        const labelLabel = labels.flatMap((label, i) => labels.slice(i + 1).flatMap((other, k) => overlap(label, other) ? [`label ${i + 1} intersects label ${i + k + 2}`] : []));
        const labelTextOverflow = [...root.querySelectorAll(waterBalance ? '.ob-water-route' : '.ob-process-stream:not(.boundary)')].flatMap((group) => {
          const card = group.querySelector('rect')?.getBBox();
          if (!card) return ['a route label has no backing card'];
          return [...group.querySelectorAll('text')].flatMap((text) => {
            const box = text.getBBox();
            return box.x < card.x + 2 || box.x + box.width > card.x + card.width - 2
              || box.y < card.y + 1 || box.y + box.height > card.y + card.height - 1
              ? [`${text.classList[0] ?? 'route text'} overflows its label card`] : [];
          });
        });
        const nameOverflow = [...root.querySelectorAll('.ob-node-name')].flatMap((el) => {
          const box = el.getBBox();
          return box.width > 148 ? [`${el.closest('.ob-schematic-node')?.getAttribute('aria-label') ?? 'node'} name width ${box.width.toFixed(1)} exceeds 148`] : [];
        });
        const boundaryOverflow = [...root.querySelectorAll('.ob-boundary-port')].flatMap((group) => {
          const card = group.querySelector('rect').getBBox();
          return [...group.querySelectorAll('text')].flatMap((text) => {
            const box = text.getBBox();
            const name = text.classList[0] ?? 'boundary text';
            return box.x < card.x + 8 || box.x + box.width > card.x + card.width - 8 || box.y < card.y + 5 || box.y + box.height > card.y + card.height - 5
              ? [`${name} exceeds its boundary card`] : [];
          });
        });
        const portRects = [...root.querySelectorAll('.ob-boundary-port')].map((group) => ({
          incoming: group.classList.contains('incoming'),
          box: group.getBoundingClientRect(),
          id: group.querySelector('.ob-boundary-route')?.textContent ?? 'boundary port',
        }));
        const portOverlap = portRects.flatMap((port, i) => portRects.slice(i + 1).flatMap((other) =>
          port.incoming === other.incoming && overlap(port.box, other.box) ? [`${port.id} boundary card intersects ${other.id}`] : []));
        const viewport = root.getBoundingClientRect();
        const contentOverflow = [...root.querySelectorAll(waterBalance
          ? '.ob-water-area, .ob-water-route > rect'
          : '.ob-schematic-node, .ob-process-stream:not(.boundary) > rect, .ob-boundary-port')].flatMap((el) => {
          const box = el.getBoundingClientRect();
          return box.left < viewport.left - 1 || box.right > viewport.right + 1
            || box.top < viewport.top - 1 || box.bottom > viewport.bottom + 1
            ? [`${el.classList[0] ?? 'diagram content'} is clipped by the SVG viewBox`] : [];
        });
        return { labelCount: labels.length, nodeCount: nodes.length, issues: [...labelNode, ...labelLabel, ...labelTextOverflow, ...nameOverflow, ...boundaryOverflow, ...portOverlap, ...contentOverflow] };
      });
      const expectedNodeCount = expectedNodes[area];
      if (result.nodeCount < expectedNodeCount) errors.push(`${language}/${area}: diagram rendered ${result.nodeCount} nodes; expected at least ${expectedNodeCount}`);
      if (result.issues.length) errors.push(`${language}/${area}: ${result.issues.join('; ')}`);
      console.log(`${language}/${area}: ${result.nodeCount} ${area === 'water-balance' ? 'areas' : 'nodes'}, ${result.labelCount} ${area === 'water-balance' ? 'transfers' : 'labels'}, ${result.issues.length ? result.issues.join('; ') : 'clear'}`);
    }
  }
  for (const language of ['EN', 'ES']) {
    const selectionPage = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await selectionPage.goto(`${baseUrl}/app?view=overview`, { waitUntil: 'networkidle' });
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

    const overviewArea = selectionPage.locator('.ob-overview-map .ob-plan-area').nth(1);
    await overviewArea.hover();
    const overviewPreview = selectionPage.locator('.ob-area-preview[data-preview-area="crushing-stockpiling"]');
    await overviewPreview.waitFor({ state: 'visible', timeout: 5000 }).catch(() => errors.push(`${language}/overview-hover/crushing-stockpiling: area preview did not appear`));
    const overviewPreviewText = await overviewPreview.innerText().catch(() => '');
    if (!overviewPreviewText.includes('ROM') || !overviewPreviewText.includes(language === 'ES' ? 'REPRODUCCIÓN DE REFERENCIA' : 'REFERENCE REPLAY')) errors.push(`${language}/overview-hover/crushing-stockpiling: preview is missing circuit or evidence context`);
    console.log(`${language}/overview-hover/crushing-stockpiling: ${overviewPreviewText.includes('ROM') ? 'shows circuit and evidence context' : 'FAILED'}`);
    await overviewArea.focus();
    await selectionPage.locator('.ob-area-preview[data-preview-area="crushing-stockpiling"]').waitFor({ state: 'visible', timeout: 5000 }).catch(() => errors.push(`${language}/overview-focus/crushing-stockpiling: keyboard preview did not appear`));

    await selectionPage.goto(`${baseUrl}/app?view=overview&asset=ROM&area=crushing-stockpiling`, { waitUntil: 'networkidle' });
    await selectionPage.waitForURL(/area=crushing-stockpiling.*view=schematic|view=schematic.*area=crushing-stockpiling/);
    const deepLinkDetail = await selectionPage.getByTestId('area-schematic-crushing-stockpiling').count() > 0;
    if (!deepLinkDetail) errors.push(`${language}/deep-link/crushing-stockpiling: area overview URL did not open the detailed process page`);
    console.log(`${language}/deep-link/crushing-stockpiling: ${deepLinkDetail ? 'opens detailed process page' : 'FAILED'}`);
    await selectionPage.goto(`${baseUrl}/app?area=mine-extraction&asset=PIT`, { waitUntil: 'networkidle' });
    await selectionPage.waitForURL(/area=mine-extraction.*view=schematic|view=schematic.*area=mine-extraction/);
    const mineDeepLink = await selectionPage.getByTestId('area-schematic-mine-extraction').count() > 0;
    if (!mineDeepLink) errors.push(`${language}/deep-link/mine-extraction: asset URL did not open its area schematic`);
    const focusButton = selectionPage.getByRole('button', { name: /Open this view in focus mode|Abrir esta vista en modo enfoque/ });
    await focusButton.click();
    await selectionPage.waitForURL(/focus=1/);
    const focusLayout = await selectionPage.locator('[data-focus-shell]').evaluate((root) => {
      const stage = root.querySelector('.caos-focus-stage')?.getBoundingClientRect();
      const diagram = root.querySelector('.ob-process-schematic')?.getBoundingClientRect();
      const side = root.querySelector('.ob-explorer-side');
      return { stageWidth: stage?.width ?? 0, diagramWidth: diagram?.width ?? 0, railCount: root.querySelectorAll('.caos-focus-rail').length, sideDisplay: side ? getComputedStyle(side).display : 'absent' };
    });
    if (!(focusLayout.diagramWidth > focusLayout.stageWidth * 0.8) || focusLayout.railCount !== 0 || focusLayout.sideDisplay !== 'none' && focusLayout.sideDisplay !== 'absent') errors.push(`${language}/focus: visualization does not use the clean full-width stage (${JSON.stringify(focusLayout)})`);
    console.log(`${language}/focus: diagram fills stage and duplicate rails are absent`);
    await selectionPage.locator('[data-focus-exit]').click();
    await selectionPage.locator('[data-focus-shell]').waitFor({ state: 'detached', timeout: 5000 });

    await selectionPage.goto(`${baseUrl}/app?view=overview`, { waitUntil: 'networkidle' });
    await selectionPage.locator('button[data-tab="site-plan"]').waitFor({ state: 'visible', timeout: 15000 });

    await selectionPage.locator('.ob-plan-area').nth(1).click();
    await selectionPage.waitForURL(/area=crushing-stockpiling.*view=schematic|view=schematic.*area=crushing-stockpiling/);
    const overviewDrillDown = await selectionPage.getByTestId('area-schematic-crushing-stockpiling').count() > 0;
    if (!overviewDrillDown) errors.push(`${language}/overview/crushing-stockpiling: global area selection did not open its detailed process page`);
    console.log(`${language}/overview-selection/crushing-stockpiling: ${overviewDrillDown ? 'opens detailed process page' : 'FAILED'}`);

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
