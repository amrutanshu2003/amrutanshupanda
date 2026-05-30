const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MERN Server and Client concurrently...');

// 1. Start Express Backend API Server
const server = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  shell: true,
  stdio: 'inherit'
});

// 2. Start Vite Frontend Client Server
const client = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'client'),
  shell: true,
  stdio: 'inherit'
});

// Clean up processes on exit
const cleanup = () => {
  console.log('\n🛑 Stopping MERN servers...');
  
  if (process.platform === 'win32') {
    // Windows taskkill to ensure child tree processes are shut down completely
    spawn('taskkill', ['/pid', server.pid, '/f', '/t'], { shell: true });
    spawn('taskkill', ['/pid', client.pid, '/f', '/t'], { shell: true });
  } else {
    server.kill('SIGINT');
    client.kill('SIGINT');
  }
  
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
