const ora = require('ora');
const chalk = require('chalk');
const inquirer = require('inquirer');
const configKeys = require('./constants').configKeys;
const MotivApi = require('../lib/motiv').MotivApi;

function maybeAuthenticate(email, options, config) {
  let spinner = ora('Authenticating...');
  let authData = config.get(configKeys.auth);
  const now = new Date(Date.now());
  const authExpiry = new Date(Date.parse(authData.sessionExpiry));
  if (authData && authExpiry >= now && options.force === false) {
    spinner.succeed(chalk`{green Authenticated until {bold ${authExpiry.toLocaleString()}}}`);
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
