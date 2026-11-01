import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4199';
const areas = [
  'mine-extraction', 'crushing-stockpiling', 'grinding', 'flotation',
  'leach-sx-ew', 'thickening-filtration', 'water-balance', 'tailings', 'utilities',
];
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
      const result = await svg.evaluate((root) => {
        const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
        const waterBalance = root.classList.contains('ob-water-schematic');
        const nodes = waterBalance
          ? [...root.querySelectorAll('.ob-water-area > rect')].map((el) => el.getBoundingClientRect())
          : [...root.querySelectorAll('.ob-node-body')].map((el) => el.getBoundingClientRect());
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
        return { labelCount: labels.length, nodeCount: nodes.length, issues: [...labelNode, ...labelLabel, ...labelTextOverflow, ...nameOverflow, ...boundaryOverflow] };
      });
      if (result.issues.length) errors.push(`${language}/${area}: ${result.issues.join('; ')}`);
      console.log(`${language}/${area}: ${result.nodeCount} ${area === 'water-balance' ? 'areas' : 'nodes'}, ${result.labelCount} ${area === 'water-balance' ? 'transfers' : 'labels'}, ${result.issues.length ? result.issues.join('; ') : 'clear'}`);
    }
  }
  for (const language of ['EN', 'ES']) {
    const selectionPage = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await selectionPage.goto(`${baseUrl}/app?view=diagram`, { waitUntil: 'networkidle' });
    const languageButton = selectionPage.locator('button[aria-label="Switch language"]');
    await languageButton.waitFor({ state: 'visible', timeout: 15000 });
    if ((await languageButton.innerText()).trim().toUpperCase() !== language) await languageButton.click();
    await selectionPage.locator('button[data-tab="site-plan"]').waitFor({ state: 'visible', timeout: 15000 });
    await selectionPage.locator('button[data-tab="site-plan"]').click();
    for (const area of areas) {
      await selectionPage.locator('.ob-plan-area').nth(areas.indexOf(area)).click();
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
} finally {
  await browser.close();
}
if (errors.length) {
  console.error(`\nDiagram geometry failures (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('\nAll 18 English/Spanish area diagrams passed label and node geometry checks.');
}
