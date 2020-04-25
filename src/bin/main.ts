import { Brain } from '../lib/brain';
import { Discord } from '../lib/discord';
import Config from '../config';

async function run() {
  const config = Config.getProperties();
  const brain = Brain.fromFile(config.brainFile);
  const discord = new Discord(config.discord.token, brain);
  discord.start();
}

run();
