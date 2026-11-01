import {writeFile, stat, mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const visual = resolve(directory, '../../.agent/visual');

export async function testCharacter(task) {
  const page = task.page('p1');
  await page.goto('http://127.0.0.1:8765/assets/clawd/');
  const result = await page.evaluate(async () => {
    const {runCharacterTests} = await import('./character.test.js');
    return runCharacterTests();
  });
  assert.equal(result.status, 'passed');
  console.log(JSON.stringify(result));
  return result;
}

export async function renderCharacterSheet(task) {
  const tests = await testCharacter(task);
  const page = task.page('p1');
  await page.cdp('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1440, deviceScaleFactor: 1, mobile: false});
  await page.goto('http://127.0.0.1:8765/assets/clawd/character-sheet.html');
  await page.waitForFunction(() => window.artReady || window.renderErrors.length);
  const result = await page.evaluate(() => ({
    ready: !!window.artReady, errors: window.renderErrors,
    width: document.querySelector('canvas').width, height: document.querySelector('canvas').height,
    data: document.querySelector('canvas').toDataURL('image/png').split(',')[1],
  }));
  assert.equal(result.ready, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.width, 1920);
  assert.equal(result.height, 1440);
  await writeFile(resolve(directory, '角色設定圖.png'), Buffer.from(result.data, 'base64'));
  assert.ok((await stat(resolve(directory, '角色設定圖.png'))).size > 10000);
  await mkdir(visual, {recursive: true});
  await page.screenshot({path: resolve(visual, 'clawd-character-browser.png')});
  const report = {...tests, sheet: {width: result.width, height: result.height, errors: result.errors}};
  await writeFile(resolve(directory, 'character-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
