import 'reflect-metadata';

import { Brain } from '../lib/megahal/brain';
import { Discord } from '../lib/discord';
import Config from '../config';
import { loadCommands } from '../lib/commands';

async function run() {
  const config = Config.getProperties();
  const brain = Brain.fromFile(config.brainFile);
  const discord = new Discord(config.discord.token, brain, loadCommands());
  return discord.start();
}

run();
