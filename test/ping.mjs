import test from 'ava';
import { ping } from '../dist/main.js';

test('ping', (t) => {
  t.is(ping(), 'pong');
});
