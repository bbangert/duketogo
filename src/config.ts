/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import dotenv from 'dotenv';
import convict from 'convict';
import fs from 'fs';
import path from 'path';

dotenv.config();

const conf = convict({
  brainFile: {
    default: 'megahal.brn',
    doc: 'Brain file to run from',
    env: 'BRAIN_FILE',
    format: 'String',
  },
  brainDatabase: {
    filename: {
      default: 'megahal.sqlite',
      doc: 'Brain sqlite file to run from',
      env: 'BRAIN_SQLITE',
      format: 'String',
    },
  },
  env: {
    default: 'production',
    doc: 'The current node.js environment',
    env: 'NODE_ENV',
    format: ['development', 'test', 'stage', 'production'],
  },
  discord: {
    token: {
      default: '',
      doc: 'Discord Bot Token',
      env: 'DISCORD_TOKEN',
      format: 'String',
    },
  },
  maxOutputTokens: {
    default: 1000,
    doc: 'Max output tokens to allow',
    env: 'MAX_OUTPUT_TOKENS',
    format: 'Number',
  },
  maxInputTokens: {
    default: 1000,
    doc: 'Max input tokens to learn from',
    env: 'MAX_INPUT_TOKENS',
    format: 'Number',
  },
  commandPrefix: {
    default: '!',
    doc: 'Command prefix to look for on channels',
    env: 'COMMAND_PREFIX',
    format: 'String',
  },
  sentryDsn: {
    default: '',
    doc: 'Sentry DSN for error and log reporting',
    env: 'SENTRY_DSN',
    format: 'String',
  },
});

// handle configuration files.  you can specify a CSV list of configuration
// files to process, which will be overlayed in order, in the CONFIG_FILES
// environment variable.

// Need to move two dirs up as we're in the compiled directory now
const configDir = path.dirname(path.dirname(__dirname));
let envConfig = path.join(configDir, 'config', `${conf.get('env')}.json`);
envConfig = `${envConfig},${process.env.CONFIG_FILES || ''}`;
const files = envConfig.split(',').filter(fs.existsSync);
conf.loadFile(files);
conf.validate({ allowed: 'strict' });

const Config = conf;

export default Config;
