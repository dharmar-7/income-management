#!/usr/bin/env node
// Sets EXPO_ROUTER_APP_ROOT as an absolute path before spawning Expo.
// This must be absolute — Metro workers can't resolve a relative path.
const { spawnSync } = require('child_process');
const path = require('path');

process.env.EXPO_ROUTER_APP_ROOT = path.resolve(__dirname, 'app');

const args = ['expo', 'start', ...process.argv.slice(2)];
spawnSync('npx', args, { stdio: 'inherit', env: process.env, shell: true });
