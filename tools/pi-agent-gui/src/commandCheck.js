const { spawn } = require('child_process');

function checkCommand(command, args = ['--version']) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: process.platform === 'win32',
      stdio: ['ignore', 'ignore', 'ignore']
    });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

module.exports = { checkCommand };
