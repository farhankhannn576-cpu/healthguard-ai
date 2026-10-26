
const { spawn } = require('child_process');
const path = require('path');

const AI_DIR = path.join(__dirname, '..', '..', 'ai');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

async function predictRisk(healthProfile) {
  // Run Python directly during local development.
  if (!process.env.VERCEL) {
    return new Promise((resolve, reject) => {
      const child = spawn(PYTHON_BIN, ['model.py'], {
        cwd: AI_DIR
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', chunk => {
        stderr += chunk.toString();
      });

      child.on('error', reject);

      child.on('close', code => {
        if (code !== 0) {
          return reject(new Error(stderr || stdout));
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (err) {
          reject(err);
        }
      });

      child.stdin.write(JSON.stringify(healthProfile));
      child.stdin.end();
    });
  }

  // On Vercel, call the Python API.
  const apiUrl = process.env.ML_API_URL;
  const apiKey = process.env.ML_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error('ML_API_URL or ML_API_KEY is missing');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(healthProfile),
    signal: AbortSignal.timeout(25000)
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(result.error || 'ML prediction failed');
  }

  return result;
}

module.exports = { predictRisk };
