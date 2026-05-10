/**
 * Runs the Firebase CLI from the repo root so `firebase.json` is always found,
 * even if your shell cwd is `android/`, `src/`, etc.
 *
 * Usage:
 *   npm run firebase:deploy
 *   node scripts/firebase-deploy.cjs deploy --only storage
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
process.chdir(root);

const passThrough = process.argv.slice(2);
const defaultCmd = ['deploy', '--only', 'firestore:rules,firestore:indexes,storage'];
const firebaseArgs = passThrough.length > 0 ? passThrough : defaultCmd;

const result = spawnSync('firebase', firebaseArgs, {
  stdio: 'inherit',
  shell: true,
  cwd: root,
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
