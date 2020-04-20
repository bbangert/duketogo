import 'reflect-metadata';

import yargs from 'yargs';

import { Brain } from '../lib/brain';
import { Discord } from '../lib/discord';

const argv = yargs.options({
  filename: { type: 'string', demandOption: true, desc: 'Brain file to load' },
}).argv;

async function run() {
  const { filename } = argv;
  const brain = Brain.fromFile(filename);
  const discord = new Discord(brain);
  discord.start();
}

run();
