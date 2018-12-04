var builder = require('jest-trx-results-processor');

var processor = builder({
  outputFile: '.testing/testResults.trx',
});

module.exports = processor;
