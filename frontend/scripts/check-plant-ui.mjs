// Product interactions, in addition to the complete shared-shell browser matrix.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile, stat } from 'node:fs/promises';
const base=process.env.OREBRIDGE_PREVIEW_URL||'http://127.0.0.1:4178';
const out=process.env.OREBRIDGE_QA_ROOT||'D:/_Temp/orebridge/browser';
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
  await tab('Engine evidence').click();assert.match(await page.locator('body').innerText(),/CAOS_OreFlow|No reference engine/);
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
  assert.match(await page.locator('.ob-route').innerText(),/0 kg\/h/);
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

