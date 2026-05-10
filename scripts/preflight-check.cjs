'use strict';

/**
 * Preflight sanity checks for demo/release readiness.
 *
 * Usage:
 *   npm run preflight
 *
 * Non-zero exit when critical checks fail.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function readUtf8Safe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function check(name, condition, failures) {
  if (condition) {
    console.log(`✔ ${name}`);
  } else {
    console.error(`✖ ${name}`);
    failures.push(name);
  }
}

function parseEnvValue(raw, key) {
  const re = new RegExp(`^${key}=(.*)$`, 'm');
  const m = raw.match(re);
  return m ? m[1].trim() : '';
}

function main() {
  const failures = [];

  check('.env.example exists', exists('.env.example'), failures);
  check('firestore.rules exists', exists('firestore.rules'), failures);
  check('storage.rules exists', exists('storage.rules'), failures);
  check('firestore.indexes.json exists', exists('firestore.indexes.json'), failures);
  check('android google-services.json exists', exists('android/app/google-services.json'), failures);

  const envExample = readUtf8Safe(path.join(root, '.env.example'));
  if (envExample != null) {
    const apiExample = parseEnvValue(envExample, 'ROBOFLOW_API_KEY');
    check('.env.example leaves ROBOFLOW_API_KEY empty', apiExample === '', failures);
  } else {
    check('.env.example readable', false, failures);
  }

  const env = readUtf8Safe(path.join(root, '.env'));
  if (env != null) {
    const api = parseEnvValue(env, 'ROBOFLOW_API_KEY');
    check('.env has ROBOFLOW_API_KEY configured', api.length > 0, failures);
  } else {
    check('.env exists for local run', false, failures);
  }

  const setupDoc = readUtf8Safe(path.join(root, 'docs/SECURITY_AUDIT_CHECKLIST.md'));
  check('security checklist document exists', setupDoc != null, failures);
  check('acceptance matrix document exists', exists('docs/ACCEPTANCE_MATRIX.md'), failures);
  check('demo fallback runbook exists', exists('docs/DEMO_SCRIPT_AND_OFFLINE_FALLBACK.md'), failures);
  check('release go/no-go checklist exists', exists('docs/RELEASE_GO_NO_GO.md'), failures);
  check('state management doc exists', exists('docs/STATE_MANAGEMENT.md'), failures);

  if (failures.length > 0) {
    console.error('\nPreflight failed. Resolve items above before demo/release.');
    process.exit(1);
  }
  console.log('\nPreflight checks passed.');
}

main();
