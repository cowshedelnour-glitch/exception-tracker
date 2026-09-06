require('G:/Exception Tracker/node_modules/dotenv').config({ path: 'G:/Exception Tracker/.env.local' });

const { getAgentDashboardDataAction, getManagerDashboardDataAction, generateTeamInviteAction, revokeTeamInviteAction } = require('G:/Exception Tracker/src/actions/dashboard.ts');
const { loginAction } = require('G:/Exception Tracker/src/actions/auth.ts');
const { submitIncidentAction } = require('G:/Exception Tracker/src/actions/incidents.ts');
const { submitCompensationAction, reviewCompensationAction } = require('G:/Exception Tracker/src/actions/compensations.ts');
const { db } = require('G:/Exception Tracker/src/db/index.ts');
const { users, teams, incidents, compensationRecords, teamInvites, incidentCategories } = require('G:/Exception Tracker/src/db/schema/index.ts');
const { eq } = require('G:/Exception Tracker/node_modules/drizzle-orm');
const { createClient } = require('G:/Exception Tracker/node_modules/@supabase/supabase-js');
const crypto = require('crypto');

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runPhase4Tests() {
  console.log('=== PHASE 4 DASHBOARDS & REALTIME UI E2E SUITE ===\n');

  // 1. Setup Team, Manager, and Agent
  console.log('1. Setting up Test Team, Manager, and Agent...');
  const teamId = crypto.randomUUID();
  await db.insert(teams).values({
    id: teamId,
    name: 'Dashboard Analytics Ops Team',
  });

  const uniqueSuffix = Date.now().toString().slice(-6);
  const managerHrId = 'MGR-' + uniqueSuffix;
  const managerEmail = 'manager.dash.' + Date.now() + '@exceptiontracker.com';
  const managerPassword = 'Password123!';
  const { data: mgrAuth } = await supabaseAdmin.auth.admin.createUser({
    email: managerEmail,
    password: managerPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Manager Rebecca', hr_id: managerHrId, role: 'manager' },
  });
  const managerId = mgrAuth.user.id;

  await db
    .insert(users)
    .values({
      id: managerId,
      fullName: 'Manager Rebecca',
      hrId: managerHrId,
      email: managerEmail,
      role: 'manager',
      status: 'active',
      teamId,
    })
    .onConflictDoUpdate({ target: users.id, set: { role: 'manager', status: 'active', teamId } });

  const agentHrId = 'AGT-' + uniqueSuffix;
  const agentEmail = 'agent.dash.' + Date.now() + '@exceptiontracker.com';
  const agentPassword = 'Password123!';
  const { data: agtAuth } = await supabaseAdmin.auth.admin.createUser({
    email: agentEmail,
    password: agentPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Agent Faris', hr_id: agentHrId, role: 'agent' },
  });
  const agentId = agtAuth.user.id;

  await db
    .insert(users)
    .values({
      id: agentId,
      fullName: 'Agent Faris',
      hrId: agentHrId,
      email: agentEmail,
      role: 'agent',
      status: 'active',
      teamId,
    })
    .onConflictDoUpdate({ target: users.id, set: { role: 'agent', status: 'active', teamId } });

  // 2. Test Team Invite Link Generation by Manager
  console.log('\n2. Testing Team Invite Link Generation by Manager...');
  await loginAction({ email: managerEmail, password: managerPassword, rememberMe: true });
  const inviteRes = await generateTeamInviteAction();
  console.log(' - Generate invite link success:', inviteRes.success);
  console.log(' - Invite URL:', inviteRes.data?.inviteUrl);
  if (!inviteRes.success || !inviteRes.data?.token) {
    throw new Error('Failed to generate invite link');
  }

  // 3. Test Agent Dashboard Data with New Incident
  console.log('\n3. Testing Agent Dashboard Data Retrieval...');
  await loginAction({ email: agentEmail, password: agentPassword, rememberMe: true });

  const catList = await db.select().from(incidentCategories).limit(1);
  const categoryId = catList[0].id;

  // Submit incident
  const incRes = await submitIncidentAction({
    categoryId,
    incidentDate: '2026-09-06',
    lostMinutes: 90,
    notes: 'System crash during dispatch',
  });
  console.log(' - Agent incident submitted:', incRes.success, incRes.data?.referenceNumber);

  // Retrieve Agent Dashboard Data
  const agentDash = await getAgentDashboardDataAction();
  console.log(' - Agent Dashboard Success:', agentDash.success);
  console.log(' - Stats Pending Count:', agentDash.data?.stats.pendingCount);
  console.log(' - Incidents Count:', agentDash.data?.incidents.length);
  if (!agentDash.success || agentDash.data?.incidents.length === 0) {
    throw new Error('Agent dashboard failed to return incidents');
  }

  // 4. Test Manager Dashboard Data Retrieval (Queues & Analytics)
  console.log('\n4. Testing Manager Dashboard Data Retrieval...');
  await loginAction({ email: managerEmail, password: managerPassword, rememberMe: true });

  const mgrDash = await getManagerDashboardDataAction();
  console.log(' - Manager Dashboard Success:', mgrDash.success);
  console.log(' - Supervised Agents Count:', mgrDash.data?.stats.teamAgentsCount);
  console.log(' - Pending Incidents Queue Count:', mgrDash.data?.pendingIncidents.length);
  console.log(' - Pending Incident Item:', mgrDash.data?.pendingIncidents[0]?.referenceNumber, 'from', mgrDash.data?.pendingIncidents[0]?.agentName);
  console.log(' - Invites Count in Manager Dashboard:', mgrDash.data?.invites.length);
  console.log(' - Analytics By Category Count:', mgrDash.data?.analytics.byCategory.length);
  console.log(' - Analytics By Agent Count:', mgrDash.data?.analytics.byAgent.length);

  if (!mgrDash.success || mgrDash.data?.pendingIncidents.length === 0) {
    throw new Error('Manager dashboard failed to return pending queue');
  }

  // 5. Test Revoke Invite Link
  console.log('\n5. Testing Revoking Team Invite Link...');
  const inviteToRevoke = mgrDash.data?.invites[0];
  if (inviteToRevoke) {
    const revokeRes = await revokeTeamInviteAction(inviteToRevoke.id);
    console.log(' - Revoke invite success:', revokeRes.success);
    const checked = await db.select().from(teamInvites).where(eq(teamInvites.id, inviteToRevoke.id));
    console.log(' - Invite active state now:', checked[0].isActive);
    if (checked[0].isActive !== false) {
      throw new Error('Invite link was not revoked');
    }
  }

  console.log('\n=== ALL PHASE 4 E2E TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runPhase4Tests().catch((err) => {
  console.error('Phase 4 test failed:', err);
  process.exit(1);
});
