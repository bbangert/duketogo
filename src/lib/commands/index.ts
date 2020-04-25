import { Container } from 'typedi';
import * as R from 'ramda';

import { AOLSay } from './aolsay';
import { Command } from './base';

const COMMANDS = [AOLSay];

/**
 * Load all the commands we know about.
 */
export function loadCommands(): Command[] {
  return R.map((c) => Container.get(c), COMMANDS);
}
