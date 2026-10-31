import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Explicit project/UID arguments prevent silently targeting a default project.
const [projectId, uid, action] = process.argv.slice(2);
if (!projectId || !uid || !['grant', 'revoke'].includes(action)) {
  console.error('Usage: node scripts/owner-claim.mjs PROJECT_ID USER_UID grant|revoke');
  process.exit(1);
}
initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const user = await auth.getUser(uid);
const claims = { ...user.customClaims };
if (action === 'grant') claims.owner = true;
else delete claims.owner;
await auth.setCustomUserClaims(uid, claims);
if (action === 'revoke') await auth.revokeRefreshTokens(uid);
console.log('Owner claim updated. Sign out and sign in again to refresh access.');
