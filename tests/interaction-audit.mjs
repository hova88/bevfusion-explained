import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.argv[2]||'playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for(const width of [390,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3000/',{waitUntil:'networkidle'});
  const stage=async i=>{await page.locator('.stage-nav button').nth(i).click();};
  const text=selector=>page.locator(selector).innerText();
  await page.getByLabel('Real LiDAR cloud.',{exact:false}).press('ArrowRight');
  assert.match(await text('.sensor-record summary'),/#8565/);
  await page.getByLabel('Real LiDAR cloud.',{exact:false}).press('ArrowLeft');
  for(let i=0;i<6;i++)await page.locator('.camera-selector button').nth(i).click();
  await page.locator('.camera-selector button').filter({hasText:/^F$/}).click();
  await stage(1);
  const before=await text('.image-branch h4');
  await page.getByLabel('Feature sampling plane.',{exact:false}).press('ArrowRight');
  assert.notEqual(await text('.image-branch h4'),before);
  await page.getByRole('button',{name:'Correct: undo crop before K⁻¹'}).click();
  assert.match(await text('.projection-error'),/displaces this ray/);
  await stage(2);
  await page.getByRole('button',{name:'Select nearest measured-depth bin'}).click();
  assert.match(await text('.ray-inspector dl'),/0.031 m/);
  await page.getByLabel('Calibrated depth hypothesis',{exact:true}).press('End');
  assert.match(await text('.ray-inspector label'),/59.5 m/);
  await stage(3);
  const rankButtons=page.locator('.rank-buttons button');
  for(let i=0;i<await rankButtons.count();i++){
   await rankButtons.nth(i).click();
   const rank=await rankButtons.nth(i).innerText();
   assert.equal(await page.locator('.pool-grid button[aria-pressed="true"] small').innerText(),rank);
  }
  await stage(4);
  await page.locator('.voxel-size select').selectOption('0.6');
  assert.match(await text('.sensor-record dl'),/4,740/);
  await stage(5);
  await page.getByLabel('Calibrated yaw error',{exact:true}).press('ArrowRight');
  assert.match(await text('.ray-inspector label'),/0.5°/);
  await page.getByRole('button',{name:'Restore calibration'}).click();
  assert.match(await text('.ray-inspector dl'),/0.000 m/);
  await stage(6);
  for(const [mode,zeroChannel,value] of [['camera',1,'0.300'],['lidar',0,'0.548'],['both',-1,'0.948']]) {
   await page.locator('.modality-switch button').filter({hasText:new RegExp('^'+mode+'$')}).click();
   assert.match(await text('.fusion-stage .operator-panel dl'),new RegExp(value));
   if(zeroChannel>=0)assert.ok((await page.locator('.mini-field').nth(zeroChannel).locator('span').allInnerTexts()).every(v=>v==='0.00'));
  }
  await page.getByLabel('Inspect output row 0, column 0:',{exact:false}).click();
  assert.match(await text('.fusion-stage .operator-panel dl'),/\[0, 0\]/);
  await stage(7);
  assert.match(await text('.query-result'),/#40/);
  await page.getByRole('button',{name:'3 × 3 peak suppression ON'}).click();
  assert.match(await text('.query-result'),/#24/);
  await page.getByLabel('Query cell 24,',{exact:false}).click();
  const boxBefore=await text('.detection-lab .operator-panel dl');
  await page.getByLabel('Box center X offset',{exact:true}).press('ArrowRight');
  assert.notEqual(await text('.detection-lab .operator-panel dl'),boxBefore);
  await page.getByLabel('Decoded box yaw',{exact:true}).press('End');
  assert.match(await text('.decode-control:nth-of-type(2)'),/180°/);
  for(const i of [0,7,0,7,1,4,2,5])await stage(i);
  assert.deepEqual(errors,[]);
  console.log(`${width}px: sensor, camera, crop, lift, pool, voxel, alignment, fusion, head, keyboard and remount checks passed`);
  await page.close();
 }
} finally {await browser.close();}
