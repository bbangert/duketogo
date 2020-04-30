import * as R from 'ramda';

import { AOLSay } from './aolsay';
import { Stocks } from './stocks';
import { Command } from './base';

const COMMANDS = [AOLSay, Stocks];

/**
 * Load all the commands we know about.
 */
export function loadCommands(): Command[] {
  return R.map((c) => new c(), COMMANDS);
}
