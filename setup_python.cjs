const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('Downloading get-pip.py...');
const file = fs.createWriteStream('get-pip.py');
https.get('https://bootstrap.pypa.io/get-pip.py', (response) => {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Installing pip...');
    try {
      execSync('python3 get-pip.py --user', { stdio: 'inherit' });
      console.log('Installing requirements...');
      execSync('python3 -m pip install -r requirements.txt --user', { stdio: 'inherit' });
      console.log('Setup complete!');
    } catch (err) {
      console.error('Error during setup:', err);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  fs.unlink('get-pip.py');
  console.error('Error downloading get-pip.py:', err);
  process.exit(1);
});
