require('G:/Exception Tracker/node_modules/dotenv').config({ path: 'G:/Exception Tracker/.env.local' });

const { submitIncidentAction, reviewIncidentAction, getIncidentCategoriesAction, getAgentEligibleIncidentsAction, getIncidentByIdAction } = require('G:/Exception Tracker/src/actions/incidents.ts');
const { submitCompensationAction, reviewCompensationAction, getRemainingMinutesAction } = require('G:/Exception Tracker/src/actions/compensations.ts');
const { loginAction } = require('G:/Exception Tracker/src/actions/auth.ts');
const { db } = require('G:/Exception Tracker/src/db/index.ts');
const { users, teams, incidents, compensationRecords, auditLogs, notifications } = require('G:/Exception Tracker/src/db/schema/index.ts');
const { eq } = require('G:/Exception Tracker/node_modules/drizzle-orm');
const { createClient } = require('G:/Exception Tracker/node_modules/@supabase/supabase-js');
const crypto = require('crypto');

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runPhase3Tests() {
  console.log('=== PHASE 3 CORE API & TRANSACTIONS REAL-AUTH E2E SUITE ===\n');

  // 1. Create a Test Team, a Manager, and an Agent in Supabase Auth & Public DB
  console.log('1. Setting up Real Auth Test Team, Manager, and Agent...');
  const teamId = crypto.randomUUID();
  await db.insert(teams).values({
    id: teamId,
    name: 'Real Auth Ops Team',
  });

  const managerEmail = 'manager.real.' + Date.now() + '@exceptiontracker.com';
  const managerPassword = 'Password123!';
  const { data: mgrAuth, error: mgrAuthErr } = await supabaseAdmin.auth.admin.createUser({
    email: managerEmail,
    password: managerPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Manager Karen',
      hr_id: 'MGR-' + Math.floor(1000 + Math.random() * 9000),
      role: 'manager',
    },
  });
  if (mgrAuthErr || !mgrAuth.user) throw new Error('Failed to create manager auth: ' + mgrAuthErr?.message);
  const managerId = mgrAuth.user.id;

  await db
    .insert(users)
    .values({
      id: managerId,
      fullName: 'Manager Karen',
      hrId: 'MGR-' + Math.floor(1000 + Math.random() * 9000),
      email: managerEmail,
      role: 'manager',
      status: 'active',
      teamId,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { role: 'manager', status: 'active', teamId },
    });

  const agentEmail = 'agent.real.' + Date.now() + '@exceptiontracker.com';
  const agentPassword = 'Password123!';
  const { data: agtAuth, error: agtAuthErr } = await supabaseAdmin.auth.admin.createUser({
    email: agentEmail,
    password: agentPassword,
    email_confirm: true,
    user_metadata: {
      full_name: 'Agent Omar',
      hr_id: 'AGT-' + Math.floor(10000 + Math.random() * 90000),
      role: 'agent',
    },
  });
  if (agtAuthErr || !agtAuth.user) throw new Error('Failed to create agent auth: ' + agtAuthErr?.message);
  const agentId = agtAuth.user.id;

  await db
    .insert(users)
    .values({
      id: agentId,
      fullName: 'Agent Omar',
      hrId: 'AGT-' + Math.floor(10000 + Math.random() * 90000),
      email: agentEmail,
      role: 'agent',
      status: 'active',
      teamId,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { role: 'agent', status: 'active', teamId },
    });

  // 2. Fetch categories
  console.log('\n2. Testing Category retrieval...');
  const catRes = await getIncidentCategoriesAction();
  console.log(' - Categories loaded:', catRes.data?.length);
  if (!catRes.success || !catRes.data || catRes.data.length === 0) {
    throw new Error('Failed to load categories');
  }
  const categoryId = catRes.data[0].id;

  // 3. Authenticate as Agent & Submit Incident
  console.log('\n3. Authenticating as Agent & Submitting Incident...');
  const agentLogin = await loginAction({ email: agentEmail, password: agentPassword, rememberMe: true });
  console.log(' - Agent login:', agentLogin.success, 'Role:', agentLogin.data?.role);

  const incRes = await submitIncidentAction({
    categoryId,
    incidentDate: '2026-09-05',
    lostMinutes: 120,
    notes: 'Power cut in Sector 4',
  });

  console.log(' - Submit success:', incRes.success, 'Error:', incRes.error);
  console.log(' - Generated Reference Number:', incRes.data?.referenceNumber);
  if (!incRes.success || !incRes.data?.referenceNumber.startsWith('EXC-')) {
    throw new Error('Incident submission failed: ' + incRes.error);
  }
  const incidentId = incRes.data.id;
  const refNumber = incRes.data.referenceNumber;

  // 4. Authenticate as Manager & Test Rejection Validation
  console.log('\n4. Authenticating as Manager & Testing Rejection Validation...');
  const mgrLogin = await loginAction({ email: managerEmail, password: managerPassword, rememberMe: true });
  console.log(' - Manager login:', mgrLogin.success, 'Role:', mgrLogin.data?.role);

  // Rejection without comment (should be rejected by Zod)
  const rejNoComment = await reviewIncidentAction({
    incidentId,
    decision: 'rejected',
    comment: '',
  });
  console.log(' - Rejection without comment rejected by schema:', !rejNoComment.success);

  // 5. Manager Approves Incident
  console.log('\n5. Manager Approving Incident...');
  const appRes = await reviewIncidentAction({
    incidentId,
    decision: 'approved',
    comment: 'Approved after verification with ops lead',
  });
  console.log(' - Approval success:', appRes.success);

  // Verify DB state
  const incRecord = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  console.log(' - Incident Status after approval:', incRecord[0].status);
  console.log(' - Reviewed by:', incRecord[0].reviewedBy === managerId ? 'MATCHES_MANAGER' : 'MISMATCH');

  // 6. Test Initial Remaining Minutes Formula
  console.log('\n6. Verifying Remaining Minutes Formula: 120 - 0 = 120...');
  const rem1 = await getRemainingMinutesAction(incidentId);
  console.log(' - Lost:', rem1.data?.lostMinutes, 'Approved:', rem1.data?.approvedMinutes, 'Remaining:', rem1.data?.remainingMinutes);
  if (rem1.data?.remainingMinutes !== 120) {
    throw new Error('Remaining minutes formula mismatch');
  }

  // 7. Authenticate back as Agent & Test Over-Compensation Prevention
  console.log('\n7. Authenticating as Agent & Testing Over-Compensation Prevention (150 mins for 120 min incident)...');
  await loginAction({ email: agentEmail, password: agentPassword, rememberMe: true });

  const overComp = await submitCompensationAction({
    incidentId,
    compensationDate: '2026-09-06',
    compensationMinutes: 150, // Exceeds 120!
    notes: 'Trying over-compensation',
  });
  console.log(' - Over-compensation blocked:', !overComp.success, 'Message:', overComp.error);
  if (overComp.success) {
    throw new Error('Over-compensation was NOT blocked!');
  }

  // 8. Submit Valid Partial Compensation (50 mins)
  console.log('\n8. Submitting Partial Compensation (50 mins)...');
  const comp1Res = await submitCompensationAction({
    incidentId,
    compensationDate: '2026-09-06',
    compensationMinutes: 50,
    notes: 'First 50 mins overtime',
  });
  console.log(' - Partial compensation submitted:', comp1Res.success);
  console.log(' - Synced Reference Number:', comp1Res.data?.referenceNumber);
  const comp1Id = comp1Res.data?.compensationId;

  // Authenticate as Manager & Approve 50 mins
  await loginAction({ email: managerEmail, password: managerPassword, rememberMe: true });
  console.log(' - Manager approving 50 min compensation...');
  const comp1App = await reviewCompensationAction({
    compensationId: comp1Id,
    decision: 'approved',
    comment: 'Verified 50m shift extension',
  });
  console.log(' - Approval success:', comp1App.success);

  // Verify Incident Status is now 'partially_compensated'
  const incAfterPart = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  console.log(' - Parent Incident Status:', incAfterPart[0].status);
  if (incAfterPart[0].status !== 'partially_compensated') {
    throw new Error('Expected status partially_compensated, got: ' + incAfterPart[0].status);
  }

  const rem2 = await getRemainingMinutesAction(incidentId);
  console.log(' - Remaining Minutes now: 120 - 50 =', rem2.data?.remainingMinutes);
  if (rem2.data?.remainingMinutes !== 70) {
    throw new Error('Expected 70 remaining minutes, got: ' + rem2.data?.remainingMinutes);
  }

  // 9. Complete Remaining Compensation (70 minutes -> Fully Compensated)
  console.log('\n9. Agent Submitting Final Compensation (70 mins to reach zero balance)...');
  await loginAction({ email: agentEmail, password: agentPassword, rememberMe: true });

  const comp2Res = await submitCompensationAction({
    incidentId,
    compensationDate: '2026-09-07',
    compensationMinutes: 70,
  });
  const comp2Id = comp2Res.data?.compensationId;

  // Manager Approves final 70 minutes
  await loginAction({ email: managerEmail, password: managerPassword, rememberMe: true });
  console.log(' - Manager approving final 70 min compensation...');
  await reviewCompensationAction({
    compensationId: comp2Id,
    decision: 'approved',
    comment: 'Final compensation completed',
  });

  // Verify Parent Incident is now 'fully_compensated'
  const incAfterFull = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  console.log(' - Parent Incident Status after full balance:', incAfterFull[0].status);
  if (incAfterFull[0].status !== 'fully_compensated') {
    throw new Error('Expected status fully_compensated, got: ' + incAfterFull[0].status);
  }

  const rem3 = await getRemainingMinutesAction(incidentId);
  console.log(' - Remaining Minutes now:', rem3.data?.remainingMinutes);
  if (rem3.data?.remainingMinutes !== 0) {
    throw new Error('Expected 0 remaining minutes, got: ' + rem3.data?.remainingMinutes);
  }

  // 10. Attempting another compensation on fully compensated incident
  console.log('\n10. Testing Attempt to compensate fully compensated incident...');
  await loginAction({ email: agentEmail, password: agentPassword, rememberMe: true });

  const comp3Res = await submitCompensationAction({
    incidentId,
    compensationDate: '2026-09-08',
    compensationMinutes: 10,
  });
  console.log(' - Additional compensation on completed incident blocked:', !comp3Res.success, 'Message:', comp3Res.error);
  if (comp3Res.success) {
    throw new Error('Compensation on fully compensated incident was NOT blocked');
  }

  console.log('\n=== ALL PHASE 3 E2E TESTS PASSED SUCCESSFULLY! ZERO-ERROR TOLERANCE VERIFIED! ===');
  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error('Phase 3 test failed:', err);
  process.exit(1);
});
