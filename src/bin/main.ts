import 'source-map-support/register';

import 'reflect-metadata';

import * as Sentry from '@sentry/node';
import { Brain } from '../lib/megahal/brain';
import { Discord } from '../lib/discord';
import Config from '../config';
import { loadCommands } from '../lib/commands';
import { version } from '../lib/version';

async function run() {
  const config = Config.getProperties();
  Sentry.init({ release: version.version, dsn: config.sentryDsn });
  const brain = Brain.fromFile(config.brainFile);
  const discord = new Discord(config.discord.token, brain, loadCommands());
  return discord.start();
}

run();
