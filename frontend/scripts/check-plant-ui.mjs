// Product interactions, in addition to the complete shared-shell browser matrix.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, stat, readFile } from 'node:fs/promises';
const base=process.env.OREBRIDGE_PREVIEW_URL||'http://127.0.0.1:4178';
const out=process.env.OREBRIDGE_QA_ROOT;
const graph=JSON.parse(await readFile(new URL('../../data/derived/plant.json',import.meta.url),'utf8'));
if(!out)throw Error('Set OREBRIDGE_QA_ROOT to an external temporary directory');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];const checks=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const tab=name=>page.getByRole('tab',{name,exact:true});
async function sliderTo(locator,target){
 const current=Number(await locator.inputValue()),step=Number(await locator.getAttribute('step')||1);
 await locator.focus();const minimum=Number(await locator.getAttribute('min')||0);
 if(target===minimum){await locator.press('Home');return;}
 for(let i=0;i<Math.round(Math.abs(target-current)/step);i++)await locator.press(target>current?'ArrowRight':'ArrowLeft');
}
async function checked(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
 await page.goto(base+'/app');await page.getByTestId('plant-scene').waitFor();
 await checked('shared identity and keyboard process selection',async()=>{
  await page.getByLabel('Equipment',{exact:true}).selectOption('FL1');
  await tab('Process diagram').click();
  const cyclone=page.getByRole('button',{name:'CY1 Cyclone cluster',exact:true});await cyclone.focus();await cyclone.press('Enter');
  assert.equal(await page.getByLabel('Equipment',{exact:true}).inputValue(),'CY1');
  assert.equal(await cyclone.getAttribute('aria-pressed'),'true');
  await tab('Engine evidence').click();await page.getByRole('button',{name:'CAOS_OreFlow → FL1',exact:true}).click();assert.equal(await page.getByLabel('Equipment',{exact:true}).inputValue(),'FL1');
 });
 await checked('timeline, case quality and method state',async()=>{
  await tab('Inspect').click();await page.getByLabel('Equipment',{exact:true}).selectOption('SAG');
  await tab('Replay').click();await sliderTo(page.getByLabel('Replay time',{exact:true}),90);
  assert.equal(await page.getByLabel('Replay time',{exact:true}).inputValue(),'90');
  await page.getByRole('combobox',{name:'Case selector',exact:true}).selectOption('PL-04');
  await tab('Inspect').click();await tab('3D plant').click();await page.getByTestId('plant-scene').waitFor();
  await page.waitForFunction(()=>document.body.textContent.includes('Unavailable / unscorable'));
  const values=page.locator('.ob-values');assert.match(await values.innerText(),/Unavailable/);assert.match(await values.innerText(),/no data/);
  await page.getByRole('combobox',{name:'Case selector',exact:true}).selectOption('PL-01');
 });
 await checked('connected downstream controls propagate to cathode output',async()=>{
  await tab('Inspect').click();await page.getByLabel('Equipment',{exact:true}).selectOption('EW1');await tab('Engine evidence').click();
  await tab('Process').click();
  const current=page.getByRole('slider',{name:/Electrowinning current/});await sliderTo(current,0);
  await page.waitForFunction(()=>document.querySelector('.ob-route')?.textContent?.includes('0 kg/h'));
  assert.match(await page.locator('.ob-route').textContent(),/0 kg\/h/);
  await sliderTo(current,400);
 });
 await checked('GLB export round trip and hostile external resource refusal',async()=>{
  await tab('3D plant').click();await tab('Inspect').click();await page.getByLabel('Equipment',{exact:true}).selectOption('SAG');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export GLB',exact:true}).click();
  const file=out+'/reference.glb';await (await download).saveAs(file);assert.ok((await stat(file)).size>1000);
  await page.locator('input[type=file]').setInputFiles(file);await page.getByText('Imported geometry',{exact:false}).waitFor();
  const bad=out+'/external.gltf';await writeFile(bad,JSON.stringify({asset:{version:'2.0'},buffers:[{uri:'https://untrusted.invalid/geometry.bin'}],nodes:[{extras:{assetId:'SAG'}}]}));
  await page.locator('input[type=file]').setInputFiles(bad);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/External resources/);
 });
 await page.reload();await page.getByTestId('plant-scene').waitFor();
 await checked('engine overlay preserves external case provenance',async()=>{
  await page.getByLabel('Information layer',{exact:true}).selectOption('engines');
  await page.getByText('Upstream reference cases; these are not plant measurements.',{exact:false}).waitFor();
  await page.getByLabel('Information layer',{exact:true}).selectOption('observations');
 });
 await checked('3D rendering stops at rest and resumes only for explicit replay',async()=>{
  const count=()=>page.getByTestId('plant-scene').getAttribute('data-render-count').then(Number);
  await page.waitForTimeout(400);const resting=await count();assert.ok(resting>0);await page.waitForTimeout(350);assert.equal(await count(),resting);
  await tab('Replay').click();await page.getByRole('button',{name:'Play replay',exact:true}).click();const before=await count();
  await page.waitForFunction(n=>Number(document.querySelector('[data-testid="plant-scene"]')?.getAttribute('data-render-count'))>n+4,before);
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.waitForTimeout(200);const paused=await count();await page.waitForTimeout(350);assert.equal(await count(),paused);
 });
 await checked('gateway accepts fresh confirmation and refuses ordering, identity, units and stale values',async()=>{
  // The HTTP boundary is controlled here; real asyncua server/client transport is tested in Python.
  const endpoint=base+'/qa-gateway';let mode='good',sequence=100,requests=0;
  const source=new Date(Date.now()-180000).toISOString();
  await page.route('**/qa-gateway/api/observations',async route=>{
   assert.equal(route.request().headers().authorization,'Bearer browser-test-token-123456789');
   const now=Date.now();const row={tag_id:'ROM.feed',asset_id:'ROM',unit:'t/h',value:720,quality:'good',sequence:mode==='older'?sequence-1:++sequence,source_time:source,server_time:new Date(now-(mode==='stale'?20000:0)).toISOString(),receipt_time:new Date(now).toISOString(),freshness_basis:'server'};
   if(mode==='unit')row.unit='MW';if(mode==='asset')row.asset_id='SAG';
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({schema:'orebridge.observations/v1',graph_revision:graph.revision,records:[row]})});requests++;
  });
  await tab('Inspect').click();await page.getByLabel('Equipment',{exact:true}).selectOption('ROM');
  await tab('Source').click();await page.getByText('Connect plant source',{exact:true}).click();
  await page.getByLabel('Gateway URL',{exact:true}).fill(endpoint);await page.getByLabel('Access token',{exact:true}).fill('browser-test-token-123456789');
  await page.getByRole('button',{name:'Connect read-only',exact:true}).click();
  await tab('Inspect').click();await page.waitForFunction(()=>document.querySelector('.ob-values')?.textContent.includes('Fresh accepted observation'));
  assert.match(await page.locator('.ob-values').textContent(),/720/);
  for(const next of ['older','unit','asset','stale']){
   mode=next;const before=requests;await page.waitForFunction(()=>document.querySelector('.ob-values')?.textContent.includes('Unavailable / unscorable'));
   while(requests<=before)await page.waitForTimeout(100);
   assert.doesNotMatch(await page.locator('.ob-values').textContent(),/720/);
   mode='good';await page.waitForFunction(()=>document.querySelector('.ob-values')?.textContent.includes('Fresh accepted observation'));
  }
  await tab('Trends').click();await page.getByText('History from this connection; missing or invalid source values leave gaps.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage]).includes('browser-test-token')),false);
  await tab('Source').click();await page.getByText('Connect plant source',{exact:true}).click();await page.getByRole('button',{name:'Disconnect',exact:true}).click();assert.equal(await page.getByLabel('Access token',{exact:true}).inputValue(),'');
  await tab('Replay').click();assert.equal(await page.getByLabel('Replay time',{exact:true}).isEnabled(),true);
  await tab('Inspect').click();await tab('3D plant').click();await page.getByTestId('plant-scene').waitFor();
  await page.unroute('**/qa-gateway/api/observations');
 });
 await checked('phone Focus returns to the same equipment and language',async()=>{
  await page.setViewportSize({width:390,height:844});await page.getByLabel('Equipment',{exact:true}).selectOption('TTH');
  await page.getByRole('button',{name:'Open this case in focus mode',exact:true}).click();
  await page.waitForURL(/focus=1/);await page.keyboard.press('Escape');
  assert.equal(await page.getByLabel('Equipment',{exact:true}).inputValue(),'TTH');
  await page.getByRole('button',{name:'Switch language',exact:true}).click();
  await page.getByLabel('Equipo',{exact:true}).waitFor();assert.equal(await page.getByLabel('Equipo',{exact:true}).inputValue(),'TTH');
  await page.getByRole('button',{name:/claro.*oscuro|light.*dark/i}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:out+'/plant-phone-es.png',fullPage:true});
 });
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:/Switch language|Cambiar idioma/}).click();
 await tab('Inspect').click();await page.getByLabel('Equipment',{exact:true}).selectOption('FL1');await tab('3D plant').click();
 await page.waitForTimeout(800);await page.screenshot({path:out+'/plant-desktop.png',fullPage:true});
 assert.deepEqual(errors,[],'browser exceptions or console errors');
 await writeFile(out+'/plant-ui-report.json',JSON.stringify({ok:true,checks,errors,renderer:'Chromium with software WebGL; emulated phone viewport'},null,2));
 console.log(`plant-ui: ${checks.length} interaction checks passed`);
}catch(e){await page.screenshot({path:out+'/failure.png',fullPage:true});await writeFile(out+'/plant-ui-report.json',JSON.stringify({ok:false,checks,errors,failure:String(e)},null,2));throw e;}finally{await browser.close();}

