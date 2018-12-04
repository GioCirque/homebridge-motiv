#!/usr/bin/env node
const program = require('commander');
const configstore = require('configstore');
const { maybeAuthenticate } = require('./authenticate');

// Set up config store
const pkg = require('../package.json');
const config = new configstore(pkg.name);

program.version(pkg.version, '-v, --version');

program
  .command('login <email>')
  .description('login to the MyMotiv service')
  .option('-F --force [force]', 'Force re-authentication', false)
  .action((email, options) => {
    maybeAuthenticate(email, options, config);
  });

program.parse(process.argv);
