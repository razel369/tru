#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const simulatorUdid = process.argv[2];
if (!simulatorUdid) {
  console.error('A simulator UDID is required.');
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

function waitForBoot() {
  return run(
    'xcrun',
    ['simctl', 'bootstatus', simulatorUdid, '-b'],
    { timeout: 180_000 },
  );
}

run('xcrun', ['simctl', 'boot', simulatorUdid]);
let bootResult = waitForBoot();
if (bootResult.status === 0) {
  process.exit(0);
}

console.warn('Simulator boot timed out; restarting CoreSimulator once.');
run('xcrun', ['simctl', 'shutdown', simulatorUdid]);
run('killall', ['-9', 'com.apple.CoreSimulator.CoreSimulatorService']);
await delay(3_000);

const rebootResult = run('xcrun', ['simctl', 'boot', simulatorUdid]);
if (rebootResult.status !== 0) {
  process.exit(rebootResult.status ?? 1);
}

bootResult = waitForBoot();
process.exit(bootResult.status ?? 1);
