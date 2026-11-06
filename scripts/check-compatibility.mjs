import assert from 'node:assert/strict';
import browserslist from 'browserslist';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const targets = browserslist(undefined, { path: root });
const minimums = { chrome: 119, edge: 119, firefox: 128, safari: 17, ios_saf: 17 };
for (const [family, minimum] of Object.entries(minimums)) {
  const versions = targets.filter((target) => target.startsWith(family + ' ')).map((target) => Number.parseFloat(target.split(' ')[1]));
  assert.ok(versions.length, `Missing browser family: ${family}`);
  assert.equal(Math.min(...versions), minimum, `Review compatibility before changing the ${family} minimum`);
}
console.log('Build targets verified: Chrome/Edge 119+, Firefox 128+, Safari/iOS 17+. Android browsers use their underlying engine.');
