import { chromium } from 'playwright';

const base = (process.argv[2] ?? 'http://127.0.0.1:4179').replace(/\/+$/, '');
const steps = [
  ['context', '.ob-global-flowsheet-svg'],
  ['separation', '.ob-process-schematic'],
  ['grinding', '.ob-component-drawing'],
];
const errors = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('pageerror', (error) => errors.push(`uncaught browser error: ${error.message}`));
  for (const [step, visual] of steps) {
    await page.goto(`${base}/story/${step}?case=PL-01`, { waitUntil: 'networkidle' });
    await page.locator('[data-story]').waitFor({ state: 'visible', timeout: 15000 });
    const result = await page.evaluate((selector) => {
      const stage = document.querySelector('[data-stage]');
      const boxes = [...document.querySelectorAll('[data-caos-callout]')].map((element) => element.getBoundingClientRect());
      const drawing = document.querySelector(selector)?.getBoundingClientRect();
      const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      return {
        step: document.querySelector('[data-story]')?.getAttribute('data-story-step'),
        headline: !!document.querySelector('[data-story-headline]')?.textContent?.trim(),
        panel: !!document.querySelector('[data-stage-panel]'),
        stageWidth: stage?.getBoundingClientRect().width ?? 0,
        drawing: !!drawing,
        duplicateReadingCard: !!document.querySelector('[data-story-step="grinding"] .ob-component-reading'),
        callouts: boxes.length,
        collidingCards: boxes.some((box, index) => boxes.slice(index + 1).some((other) => overlap(box, other))),
        cardsCoverDrawing: !!drawing && boxes.some((box) => overlap(box, drawing)),
        header: getComputedStyle(document.querySelector('.site-header')).display,
        footer: getComputedStyle(document.querySelector('.site-footer')).display,
        scrollWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
      };
    }, visual);
    const ok = result.step === step && result.headline && result.panel && result.stageWidth > 600 && result.drawing && result.callouts === 3 && !result.collidingCards && !result.cardsCoverDrawing && !result.duplicateReadingCard && result.header === 'none' && result.footer === 'none' && result.scrollWidth === result.viewport;
    if (!ok) errors.push(`story/${step}: ${JSON.stringify(result)}`);
    console.log(`story/${step}: ${ok ? 'distinct drawing, evidence panel and reserved non-overlapping callout band' : 'FAILED'}`);
  }

  await page.goto(`${base}/story/context?case=PL-01`, { waitUntil: 'networkidle' });
  const sceneArea = page.locator('[data-story] [data-linked-view="scene"][data-linked-id]').first();
  const linkedId = await sceneArea.getAttribute('data-linked-id');
  const panelArea = page.locator(`[data-story] [data-linked-view="panel"][data-linked-id="${linkedId}"]`).first();
  if (!linkedId || !(await panelArea.count())) errors.push(`story linked area ${linkedId ?? 'missing'} has no panel counterpart`);
  else {
    await sceneArea.click();
    if (await panelArea.getAttribute('data-linked-selected') !== 'true') errors.push(`scene selection ${linkedId} did not update its evidence panel`);
    await panelArea.click();
    if (await sceneArea.getAttribute('data-linked-selected') !== 'true') errors.push(`panel selection ${linkedId} did not update the plant map`);
  }
  const replayInput = page.getByLabel('Scrub plant replay time');
  const replayMarker = page.locator('[data-story] [data-linked-cursor-marker]');
  const markerBefore = await replayMarker.getAttribute('data-linked-cursor-position');
  await replayInput.fill('120');
  await page.waitForFunction((before) => document.querySelector('[data-story] [data-linked-cursor-marker]')?.getAttribute('data-linked-cursor-position') !== before, markerBefore);
  const markerAfter = await replayMarker.getAttribute('data-linked-cursor-position');
  if (markerAfter !== '120') errors.push(`story scrub did not move the replay marker: ${markerBefore} -> ${markerAfter}`);
  console.log(`story linked area and replay cursor: ${markerAfter === '120' && await panelArea.getAttribute('data-linked-selected') === 'true' && await sceneArea.getAttribute('data-linked-selected') === 'true' ? 'synchronized' : 'FAILED'}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/story/separation?case=PL-01`, { waitUntil: 'networkidle' });
  const phone = await page.evaluate(() => ({ story: !!document.querySelector('[data-story]'), callouts: document.querySelectorAll('[data-caos-callout]').length, scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth }));
  if (!phone.story || phone.callouts !== 3 || phone.scrollWidth !== phone.viewport) errors.push(`story phone layout: ${JSON.stringify(phone)}`);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/app?case=PL-01&asset=RAF&area=leach-sx-ew&view=trends&step=80&method=threshold`, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: /Guided walkthrough|Recorrido guiado/ }).click();
  await page.waitForURL(/\/story\/context/);
  const from = new URL(page.url()).searchParams.get('from');
  if (!from?.includes('asset=RAF') || !from.includes('area=leach-sx-ew') || !from.includes('view=trends')) errors.push(`Story launch origin was not retained: ${from}`);
  await page.locator('[data-story]').focus();
  await page.keyboard.press('End');
  await page.waitForURL(/\/story\/grinding/);
  await page.getByRole('button', { name: /Play story|Reproducir historia/ }).click();
  await page.locator('[data-stage]').click({ position: { x: 30, y: 30 } });
  const paused = await page.getByRole('button', { name: /Play story|Reproducir historia/ }).getAttribute('aria-pressed');
  if (paused !== 'false') errors.push(`reader interaction did not pause autoplay: ${paused}`);
  await page.getByRole('button', { name: /Return to exploration|Volver a explorar/ }).click();
  await page.waitForURL(/\/app\?/);
  const exit = new URL(page.url());
  if (exit.searchParams.get('asset') !== 'RAF' || exit.searchParams.get('area') !== 'leach-sx-ew' || exit.searchParams.get('view') !== 'trends' || exit.searchParams.get('step') !== '80' || exit.searchParams.get('method') !== 'threshold') errors.push(`Story exit did not restore workbench state: ${exit.href}`);
} finally {
  await browser.close();
}
if (errors.length) {
  console.error(`Failures ${errors.length}:\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else console.log('Three Story steps, desktop/phone layout, pause-on-interaction, and exact workbench return state passed.');
