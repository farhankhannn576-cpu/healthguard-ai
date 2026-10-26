const { spawn } = require('child_process');
const path = require('path');

const AI_DIR = path.join(__dirname, '..', '..', 'ai');
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';

/**
 * Runs ai/model.py with the given health profile payload and resolves with
 * the parsed JSON prediction: { risk_level, probability, factors,
 * recommendations, model_version }.
 */
function predictRisk(healthProfile) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, ['model.py'], { cwd: AI_DIR });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    child.on('error', (err) => {
      reject(new Error(`Failed to start Python ML process: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        return reject(new Error(`ML process exited with code ${code}: ${stderr || 'unknown error'}`));
      }
      try {
        const result = JSON.parse(stdout.trim());
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch (e) {
        reject(new Error(`Could not parse ML output: ${stdout} ${stderr}`));
      }
    });

    child.stdin.write(JSON.stringify(healthProfile));
    child.stdin.end();
  });
}

module.exports = { predictRisk };
