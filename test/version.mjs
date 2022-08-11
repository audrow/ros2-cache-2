import test from 'ava';
import { version } from '../dist/main.js';
import pkg from '../package.json' assert { type: 'json' };

test('version', (t) => {
  t.is(version, pkg.version);
});
