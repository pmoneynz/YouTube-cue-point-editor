#!/usr/bin/env node

const { spawn } = require('child_process');

/**
 * Tests if a command is available in the system PATH
 * @param {string} command - Command to test
 * @param {string} versionFlag - Version flag to use (default: --version)
 * @returns {Promise<boolean>} - True if command is available
 */
function testCommand(command, versionFlag = '--version') {
  return new Promise((resolve) => {
    const process = spawn(command, [versionFlag], { stdio: 'pipe' });
    
    process.on('close', (code) => {
      resolve(code === 0);
    });
    
    process.on('error', () => {
      resolve(false);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      process.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Main test function
 */
async function main() {
  console.log('🔍 Testing YouTube Cue Point Editor Backend Dependencies\n');
  
  const tests = [
    { name: 'Node.js', command: 'node', versionFlag: '--version' },
    { name: 'npm', command: 'npm', versionFlag: '--version' },
    { name: 'yt-dlp', command: 'yt-dlp', versionFlag: '--version' },
    { name: 'ffmpeg', command: 'ffmpeg', versionFlag: '-version' },
    { name: 'ffprobe', command: 'ffprobe', versionFlag: '-version' }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    const available = await testCommand(test.command, test.versionFlag);
    
    if (available) {
      console.log('✅ Available');
    } else {
      console.log('❌ Not found');
      allPassed = false;
    }
  }
  
  console.log('\n📋 Installation Instructions for Missing Dependencies:');
  console.log('');
  
  if (!await testCommand('yt-dlp')) {
    console.log('📥 Install yt-dlp:');
    console.log('   pip install yt-dlp');
    console.log('   # or: pip3 install yt-dlp');
    console.log('');
  }
  
  if (!await testCommand('ffmpeg', '-version')) {
    console.log('🎬 Install ffmpeg:');
    console.log('   macOS:   brew install ffmpeg');
    console.log('   Ubuntu:  sudo apt install ffmpeg');
    console.log('   Windows: Download from https://ffmpeg.org/download.html');
    console.log('');
  }
  
  if (allPassed) {
    console.log('🎉 All dependencies are available! You can now run:');
    console.log('   npm install');
    console.log('   npm start');
  } else {
    console.log('⚠️  Please install missing dependencies before running the server.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run the tests
main().catch(console.error); 