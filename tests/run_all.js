const { execSync } = require('child_process');

console.log('=====================================================');
console.log('EXCEPTION TRACKER — COMPLETE E2E TEST SUITE RUNNER');
console.log('=====================================================\n');

const testSuites = [
  { name: 'Phase 2: Authentication & Route Protection', file: 'tests/phase2.test.js' },
  { name: 'Phase 3: Core API, Atomic Balance & Row Locks', file: 'tests/phase3.test.js' },
  { name: 'Phase 4: Dashboards, Queues & Team Invites', file: 'tests/phase4.test.js' },
  { name: 'Phase 5: Reporting, ExcelJS & @react-pdf/renderer', file: 'tests/phase5.test.js' },
];

let allPassed = true;

for (const suite of testSuites) {
  console.log(`\n>>> RUNNING: ${suite.name} (${suite.file})`);
  try {
    const output = execSync(`npx tsx "${suite.file}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'inherit',
    });
    console.log(`[PASS] ${suite.name}`);
  } catch (err) {
    console.error(`[FAIL] ${suite.name}`);
    allPassed = false;
    break;
  }
}

console.log('\n=====================================================');
if (allPassed) {
  console.log('ALL PHASES (1-5) FULL E2E SUITES PASSED SUCCESSFULLY!');
  console.log('=====================================================');
  process.exit(0);
} else {
  console.error('SOME SUITES FAILED!');
  console.log('=====================================================');
  process.exit(1);
}