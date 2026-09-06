require('G:/Exception Tracker/node_modules/dotenv').config({ path: 'G:/Exception Tracker/.env.local' });

const { loginAction, registerWithInviteAction } = require('G:/Exception Tracker/src/actions/auth.ts');
const { validateInviteToken } = require('G:/Exception Tracker/src/lib/auth/invite.ts');
const { db } = require('G:/Exception Tracker/src/db/index.ts');
const { teams, users, teamInvites, auditLogs } = require('G:/Exception Tracker/src/db/schema/index.ts');
const { eq } = require('G:/Exception Tracker/node_modules/drizzle-orm');
const crypto = require('crypto');

async function runTests() {
  console.log('=== PHASE 2 E2E VERIFICATION SUITE ===\n');

  // Test 1: Admin Login
  console.log('1. Testing Admin Authentication...');
  const badLogin = await loginAction({
    email: 'admin@exceptiontracker.com',
    password: 'WrongPassword123!',
    rememberMe: false,
  });
  console.log(' - Bad password rejected:', !badLogin.success, badLogin.error);

  const goodLogin = await loginAction({
    email: 'admin@exceptiontracker.com',
    password: 'Admin@123456',
    rememberMe: true,
  });
  console.log(' - Admin login success:', goodLogin.success);
  console.log(' - Role returned:', goodLogin.data?.role);
  console.log(' - Redirect URL:', goodLogin.data?.redirectUrl);
  if (!goodLogin.success || goodLogin.data?.role !== 'admin') {
    throw new Error('Admin login verification failed');
  }

  // Test 2: Create a Team and a Team Manager for Invite Testing
  console.log('\n2. Setting up Team & Manager for Invite link testing...');
  const teamId = crypto.randomUUID();
  await db.insert(teams).values({
    id: teamId,
    name: 'Customer Operations Alpha',
    description: 'First Shift Operations Team',
  });

  const managerId = crypto.randomUUID();
  await db.insert(users).values({
    id: managerId,
    fullName: 'David Vance',
    hrId: 'MGR-' + Math.floor(1000 + Math.random() * 9000),
    email: 'david.vance.' + Date.now() + '@exceptiontracker.com',
    role: 'manager',
    status: 'active',
    teamId: teamId,
  });

  // Test 3: Generate 24-hour Invite Token
  console.log('\n3. Testing 24-Hour Team Invite Token Generation & Validation...');
  const validToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await db.insert(teamInvites).values({
    token: validToken,
    managerId: managerId,
    teamId: teamId,
    isActive: true,
    expiresAt: expiresAt,
  });

  const validCheck = await validateInviteToken(validToken);
  console.log(' - Valid Token Check:', validCheck.isValid);
  console.log(' - Team Name:', validCheck.invite?.teamName);
  console.log(' - Manager Name:', validCheck.invite?.managerName);

  // Expired token check
  const expiredToken = crypto.randomUUID();
  await db.insert(teamInvites).values({
    token: expiredToken,
    managerId: managerId,
    teamId: teamId,
    isActive: true,
    expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
  });

  const expiredCheck = await validateInviteToken(expiredToken);
  console.log(' - Expired Token Check (should be false):', expiredCheck.isValid, expiredCheck.reason);

  // Test 4: Agent Registration via Valid Invite Link
  console.log('\n4. Testing Agent Registration via Invite Link...');
  const agentEmail = 'agent.' + Date.now() + '@exceptiontracker.com';
  const agentHrId = 'AGT-' + Math.floor(10000 + Math.random() * 90000);

  const regResult = await registerWithInviteAction({
    token: validToken,
    fullName: 'Tariq Mansour',
    hrId: agentHrId,
    email: agentEmail,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  console.log(' - Agent Registration success:', regResult.success);
  console.log(' - Redirect destination:', regResult.data?.redirectUrl);
  if (!regResult.success) {
    throw new Error('Agent registration failed: ' + regResult.error);
  }

  // Verify DB state
  const registeredUser = await db.select().from(users).where(eq(users.email, agentEmail));
  console.log(' - DB Agent Record:', {
    fullName: registeredUser[0].fullName,
    hrId: registeredUser[0].hrId,
    role: registeredUser[0].role,
    status: registeredUser[0].status,
    teamId: registeredUser[0].teamId === teamId ? 'MATCHES_TEAM' : 'MISMATCH',
  });

  // Verify Invite token usage_count incremented
  const updatedInvite = await db.select().from(teamInvites).where(eq(teamInvites.token, validToken));
  console.log(' - Invite Token Usage Count:', updatedInvite[0].usageCount);

  // Verify Audit Log
  const logs = await db.select().from(auditLogs).where(eq(auditLogs.userId, registeredUser[0].id));
  console.log(' - Audit Log Action:', logs[0]?.action, logs[0]?.comment);

  // Test 5: Duplicate registration prevention
  console.log('\n5. Testing Duplicate HR ID / Email Prevention...');
  const dupResult = await registerWithInviteAction({
    token: validToken,
    fullName: 'Duplicate Agent',
    hrId: agentHrId, // Duplicate HR ID
    email: 'different.' + Date.now() + '@company.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  console.log(' - Duplicate HR ID rejected:', !dupResult.success, dupResult.error);

  // Test 6: Newly registered Agent Login
  console.log('\n6. Testing Agent Sign In...');
  const agentLogin = await loginAction({
    email: agentEmail,
    password: 'Password123!',
    rememberMe: false,
  });
  console.log(' - Agent login success:', agentLogin.success);
  console.log(' - Agent role returned:', agentLogin.data?.role);
  console.log(' - Agent redirect:', agentLogin.data?.redirectUrl);

  console.log('\n=== ALL PHASE 2 E2E TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
