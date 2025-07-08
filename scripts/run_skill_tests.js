const { execSync } = require('child_process');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

/**
 * Runs the skill tests and formats the output
 */
async function runSkillTests() {
  console.log(chalk.blue('==================================='));
  console.log(chalk.blue('     RUNNING PIRATE SKILLS TESTS   '));
  console.log(chalk.blue('==================================='));

  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }

    // Get the current timestamp for the log file name
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const logFile = path.join(logsDir, `skill-tests-${timestamp}.log`);

    // Run the PirateSkills tests
    console.log(chalk.yellow('\nRunning PirateSkills Tests...'));
    try {
      const pirateSkillsOutput = execSync('npx hardhat test test/skills/PirateSkills.test.js', { encoding: 'utf8' });
      console.log(chalk.green('PirateSkills Tests: ✓ PASSED'));
      fs.appendFileSync(logFile, '==== PirateSkills Tests ====\n\n' + pirateSkillsOutput + '\n\n');
    } catch (error) {
      console.log(chalk.red('PirateSkills Tests: ✗ FAILED'));
      console.error(error.stdout);
      fs.appendFileSync(logFile, '==== PirateSkills Tests ====\n\n' + error.stdout + '\n\n');
      throw new Error('PirateSkills tests failed');
    }

    // Run the PirateSkillsReader tests
    console.log(chalk.yellow('\nRunning PirateSkillsReader Tests...'));
    try {
      const pirateSkillsReaderOutput = execSync('npx hardhat test test/skills/PirateSkillsReader.test.js', { encoding: 'utf8' });
      console.log(chalk.green('PirateSkillsReader Tests: ✓ PASSED'));
      fs.appendFileSync(logFile, '==== PirateSkillsReader Tests ====\n\n' + pirateSkillsReaderOutput + '\n\n');
    } catch (error) {
      console.log(chalk.red('PirateSkillsReader Tests: ✗ FAILED'));
      console.error(error.stdout);
      fs.appendFileSync(logFile, '==== PirateSkillsReader Tests ====\n\n' + error.stdout + '\n\n');
      throw new Error('PirateSkillsReader tests failed');
    }

    // Run the Integration tests
    console.log(chalk.yellow('\nRunning Integration Tests...'));
    try {
      const integrationOutput = execSync('npx hardhat test test/skills/PirateSkillsIntegration.test.js', { encoding: 'utf8' });
      console.log(chalk.green('Integration Tests: ✓ PASSED'));
      fs.appendFileSync(logFile, '==== Integration Tests ====\n\n' + integrationOutput + '\n\n');
    } catch (error) {
      console.log(chalk.red('Integration Tests: ✗ FAILED'));
      console.error(error.stdout);
      fs.appendFileSync(logFile, '==== Integration Tests ====\n\n' + error.stdout + '\n\n');
      throw new Error('Integration tests failed');
    }

    // Log the results
    console.log(chalk.blue('\n==================================='));
    console.log(chalk.green('All tests passed successfully!'));
    console.log(chalk.blue('==================================='));
    console.log(chalk.gray(`\nTest logs saved to: ${logFile}`));
    
    // Also run the gas reporter if needed
    console.log(chalk.yellow('\nWould you like to run gas usage report? (y/n)'));
    // In a script we can't wait for user input, so this would be handled differently in a real implementation
    // This is just a placeholder to indicate where gas reporting could be triggered
    console.log(chalk.gray('To run gas report, set REPORT_GAS=true and run: npx hardhat test'));

    return 0;
  } catch (error) {
    console.log(chalk.red('\n==================================='));
    console.log(chalk.red('Some tests failed. Please check the logs for details.'));
    console.log(chalk.red('==================================='));
    return 1;
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runSkillTests()
    .then(exitCode => {
      process.exit(exitCode);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  runSkillTests
}; 