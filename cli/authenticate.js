const ora = require('ora');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { configKeys } = require('./constants');
const { MotivApi } = require('../lib/motiv');

function maybeAuthenticate(email, options, config) {
  const now = new Date(Date.now());
  let spinner = ora('Authenticating...');
  let authData = config.get(configKeys.auth) || {};
  const authExpiry = new Date(Date.parse(authData.sessionExpiry));
  if (authData && authExpiry >= now && options.force === false) {
    spinner.succeed(chalk`{green.bold Authenticated until ${authExpiry.toLocaleString()}}`);
    console.log(
      chalk`{blue.bold Homebridge platform config should be:\n${JSON.stringify(
        {
          platform: 'MotivPlatform',
          name: 'MotivPlatform',
          account: authData,
        },
        undefined,
        4
      )}}`
    );
  } else {
    inquirer
      .prompt([
        {
          type: 'password',
          message: 'Enter your MyMotiv password [masked]',
          name: 'password',
          mask: '*',
        },
      ])
      .then((answers) => {
        spinner.start();
        motivApi = new MotivApi();
        motivApi
          .authenticate(email, answers.password)
          .then((authData) => {
            config.set(configKeys.auth, authData);
            spinner.succeed(
              chalk`{green Authenticated until {bold ${authExpiry.toLocaleString()}}}`
            );
            console.log(
              chalk`{blue.bold Homebridge platform config should be:\n${JSON.stringify(
                {
                  platform: 'MotivPlatform',
                  name: 'MotivPlatform',
                  account: authData,
                },
                undefined,
                4
              )}}`
            );
          })
          .catch((err) => {
            spinner.fail(chalk`{red.bold Authentication failed!}`);
            console.error(chalk`\t{red.bold ${err.code}}: {red ${err.error}}`);
          });
      });
  }
}

module.exports = {
  maybeAuthenticate,
};
