require('G:/Exception Tracker/node_modules/dotenv').config({ path: 'G:/Exception Tracker/.env.local' });

const { getExportDataset } = require('G:/Exception Tracker/src/lib/export/data.ts');
const { generateExcelWorkbook } = require('G:/Exception Tracker/src/lib/export/excel.ts');
const { generatePdfDocument } = require('G:/Exception Tracker/src/lib/export/pdf.tsx');
const { db } = require('G:/Exception Tracker/src/db/index.ts');
const { users, teams, incidents, compensationRecords, incidentCategories } = require('G:/Exception Tracker/src/db/schema/index.ts');
const { eq } = require('G:/Exception Tracker/node_modules/drizzle-orm');
const { createClient } = require('G:/Exception Tracker/node_modules/@supabase/supabase-js');
const ExcelJS = require('G:/Exception Tracker/node_modules/exceljs');
const crypto = require('crypto');

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runPhase5Tests() {
  console.log('=== PHASE 5 REPORTING & EXPORTS E2E SUITE ===\n');

  // 1. Setup Test Team, Manager, Team Agent A, and Foreign Agent B
  console.log('1. Setting up Team, Manager, and Agents...');
  const teamId = crypto.randomUUID();
  await db.insert(teams).values({
    id: teamId,
    name: 'Export Operations Unit',
  });

  const uniqueSuffix = Date.now().toString().slice(-6);

  // Manager
  const managerHrId = 'MGR-' + uniqueSuffix;
  const managerEmail = 'manager.export.' + Date.now() + '@exceptiontracker.com';
  const { data: mgrAuth } = await supabaseAdmin.auth.admin.createUser({
    email: managerEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Manager Nadia', hr_id: managerHrId, role: 'manager' },
  });
  const managerUser = {
    id: mgrAuth.user.id,
    fullName: 'Manager Nadia',
    hrId: managerHrId,
    email: managerEmail,
    role: 'manager',
    status: 'active',
    teamId,
  };
  await db.insert(users).values(managerUser).onConflictDoUpdate({ target: users.id, set: { role: 'manager', teamId } });

  // Agent A (in Manager's team)
  const agentAHrId = 'AGT-A-' + uniqueSuffix;
  const agentAEmail = 'agentA.export.' + Date.now() + '@exceptiontracker.com';
  const { data: agtAAuth } = await supabaseAdmin.auth.admin.createUser({
    email: agentAEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Agent Arthur', hr_id: agentAHrId, role: 'agent' },
  });
  const agentAUser = {
    id: agtAAuth.user.id,
    fullName: 'Agent Arthur',
    hrId: agentAHrId,
    email: agentAEmail,
    role: 'agent',
    status: 'active',
    teamId,
  };
  await db.insert(users).values(agentAUser).onConflictDoUpdate({ target: users.id, set: { role: 'agent', teamId } });

  // Agent B (in different team / unassigned)
  const agentBHrId = 'AGT-B-' + uniqueSuffix;
  const agentBEmail = 'agentB.export.' + Date.now() + '@exceptiontracker.com';
  const { data: agtBAuth } = await supabaseAdmin.auth.admin.createUser({
    email: agentBEmail,
    password: 'Password123!',
    email_confirm: true,
    user_metadata: { full_name: 'Agent Beatrice', hr_id: agentBHrId, role: 'agent' },
  });
  const agentBUser = {
    id: agtBAuth.user.id,
    fullName: 'Agent Beatrice',
    hrId: agentBHrId,
    email: agentBEmail,
    role: 'agent',
    status: 'active',
    teamId: null,
  };
  await db.insert(users).values(agentBUser).onConflictDoUpdate({ target: users.id, set: { role: 'agent' } });

  const catList = await db.select().from(incidentCategories).limit(1);
  const categoryId = catList[0].id;

  // 2. Create Incidents & Compensations
  console.log('\n2. Creating Test Incidents and Compensations...');
  // Incident 1 for Agent A: 120 mins lost
  const inc1Id = crypto.randomUUID();
  const inc1Ref = `EXC-20260906-${Math.floor(1000 + Math.random() * 9000)}`;
  await db.insert(incidents).values({
    id: inc1Id,
    referenceNumber: inc1Ref,
    agentId: agentAUser.id,
    categoryId,
    incidentDate: '2026-09-01',
    lostMinutes: 120,
    status: 'partially_compensated',
  });

  // Comp 1: 60 mins approved
  await db.insert(compensationRecords).values({
    id: crypto.randomUUID(),
    incidentId: inc1Id,
    referenceNumber: inc1Ref,
    agentId: agentAUser.id,
    compensationDate: '2026-09-02',
    compensationMinutes: 60,
    status: 'approved',
  });

  // Comp 2: 30 mins approved
  await db.insert(compensationRecords).values({
    id: crypto.randomUUID(),
    incidentId: inc1Id,
    referenceNumber: inc1Ref,
    agentId: agentAUser.id,
    compensationDate: '2026-09-03',
    compensationMinutes: 30,
    status: 'approved',
  });

  // Incident 2 for Agent A: 45 mins lost, 0 compensations
  const inc2Id = crypto.randomUUID();
  const inc2Ref = `EXC-20260906-${Math.floor(1000 + Math.random() * 9000)}`;
  await db.insert(incidents).values({
    id: inc2Id,
    referenceNumber: inc2Ref,
    agentId: agentAUser.id,
    categoryId,
    incidentDate: '2026-09-04',
    lostMinutes: 45,
    status: 'approved',
  });

  // Incident 3 for Agent B: 60 mins lost
  const inc3Id = crypto.randomUUID();
  const inc3Ref = `EXC-20260906-${Math.floor(1000 + Math.random() * 9000)}`;
  await db.insert(incidents).values({
    id: inc3Id,
    referenceNumber: inc3Ref,
    agentId: agentBUser.id,
    categoryId,
    incidentDate: '2026-09-05',
    lostMinutes: 60,
    status: 'approved',
  });

  console.log(' - Seeded Incidents:', inc1Ref, inc2Ref, inc3Ref);

  // 3. Test Export Dataset for Agent A (Scoped Security)
  console.log('\n3. Testing Export Dataset for Agent A (Scoping & Flattening)...');
  const agentDataset = await getExportDataset({}, agentAUser);
  console.log(' - Agent Unique Incidents:', agentDataset.metadata.totalIncidents);
  console.log(' - Agent Flattened Rows:', agentDataset.metadata.totalRows);
  console.log(' - Total Lost Mins:', agentDataset.metadata.totalLostMinutes);
  console.log(' - Total Compensated Mins:', agentDataset.metadata.totalCompensatedMinutes);
  console.log(' - Total Remaining Mins:', agentDataset.metadata.totalRemainingMinutes);

  // Asserts for Agent A
  if (agentDataset.metadata.totalIncidents !== 2) {
    throw new Error(`Expected 2 incidents for Agent A, got ${agentDataset.metadata.totalIncidents}`);
  }
  if (agentDataset.metadata.totalRows !== 3) {
    throw new Error(`Expected 3 flattened rows (2 for inc1 + 1 for inc2), got ${agentDataset.metadata.totalRows}`);
  }
  if (agentDataset.metadata.totalLostMinutes !== 165) {
    throw new Error(`Expected 165 total lost mins (120+45), got ${agentDataset.metadata.totalLostMinutes}`);
  }
  if (agentDataset.metadata.totalCompensatedMinutes !== 90) {
    throw new Error(`Expected 90 compensated mins (60+30), got ${agentDataset.metadata.totalCompensatedMinutes}`);
  }
  if (agentDataset.metadata.totalRemainingMinutes !== 75) {
    throw new Error(`Expected 75 remaining mins (30+45), got ${agentDataset.metadata.totalRemainingMinutes}`);
  }

  // Verify flattened row with 0 compensations has blank date and 0 mins
  const uncompRow = agentDataset.rows.find((r) => r.referenceNumber === inc2Ref);
  if (!uncompRow || uncompRow.compensatedMinutes !== 0 || uncompRow.compensationDate !== '') {
    throw new Error(`Uncompensated incident row is invalid: ${JSON.stringify(uncompRow)}`);
  }
  console.log(' - Verified uncompensated incident row: 0 mins, blank comp date');

  // 4. Test Export Dataset for Manager (Team Scoping & Foreign Agent Block)
  console.log('\n4. Testing Export Dataset for Manager (Team Boundary Enforcement)...');
  const managerDataset = await getExportDataset({}, managerUser);
  console.log(' - Manager Incidents Count:', managerDataset.metadata.totalIncidents);
  // Manager should see Agent A (their team), but NOT Agent B
  const hasAgentB = managerDataset.rows.some((r) => r.agentHrId === agentBHrId);
  if (hasAgentB) {
    throw new Error('Manager export contains data for Agent B who is not on their team!');
  }
  console.log(' - Verified foreign Agent B is excluded from Manager export');

  // Verify Manager specifying foreign agentId throws
  let foreignCaught = false;
  try {
    await getExportDataset({ agentId: agentBUser.id }, managerUser);
  } catch (err) {
    foreignCaught = true;
    console.log(' - Caught expected foreign agent filter rejection:', err.message);
  }
  if (!foreignCaught) {
    throw new Error('Manager was able to request export for foreign agentId without error!');
  }

  // 5. Test Excel Generation & Validate 10 Fixed Columns (BRD §33)
  console.log('\n5. Testing Excel Generation with ExcelJS (10 Fixed Columns)...');
  const excelBuffer = await generateExcelWorkbook(agentDataset);
  console.log(' - Excel buffer length:', excelBuffer.length, 'bytes');

  // Load buffer back into ExcelJS to inspect columns
  const loadedWb = new ExcelJS.Workbook();
  await loadedWb.xlsx.load(excelBuffer);
  const sheet = loadedWb.getWorksheet('Operational Exceptions');
  if (!sheet) throw new Error('Worksheet "Operational Exceptions" not found in generated workbook');

  const headerRow = sheet.getRow(7);
  const actualHeaders = [];
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    actualHeaders.push(cell.value);
  });

  const expectedHeaders = [
    'Reference Number',
    'Agent',
    'HR ID',
    'Incident Date',
    'Category',
    'Lost Minutes',
    'Compensated Minutes',
    'Remaining Minutes',
    'Compensation Date',
    'Status',
  ];

  console.log(' - Actual Headers:', actualHeaders);
  if (JSON.stringify(actualHeaders) !== JSON.stringify(expectedHeaders)) {
    throw new Error(`Header mismatch! Expected: ${expectedHeaders}, Got: ${actualHeaders}`);
  }
  console.log(' - Verified exact 10 fixed columns in Row 7 (BRD §33)');

  // 6. Test PDF Generation with @react-pdf/renderer (BRD §34)
  console.log('\n6. Testing PDF Generation with @react-pdf/renderer...');
  const pdfBuffer = await generatePdfDocument(agentDataset);
  console.log(' - PDF buffer length:', pdfBuffer.length, 'bytes');
  const pdfHeader = pdfBuffer.toString('utf8', 0, 5);
  console.log(' - PDF header signature:', pdfHeader);

  if (pdfHeader !== '%PDF-') {
    throw new Error(`Invalid PDF header signature: ${pdfHeader}`);
  }
  if (pdfBuffer.length < 1000) {
    throw new Error(`PDF buffer too small: ${pdfBuffer.length} bytes`);
  }
  console.log(' - Verified valid printable PDF document generated successfully');

  console.log('\n=== ALL PHASE 5 E2E TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runPhase5Tests().catch((err) => {
  console.error('Phase 5 test failed:', err);
  process.exit(1);
});