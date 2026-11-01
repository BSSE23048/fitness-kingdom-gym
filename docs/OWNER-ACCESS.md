# Owner authorization setup

The portal is a single-business owner console. It is not a multi-tenant SaaS authorization model.

Firestore checks the boolean `owner` custom claim. Client profiles, email patterns, localStorage and the UI confirmation PIN do not grant database access. The frontend waits for Firebase Auth and a validated token before rendering owner content.

## Before deployment

1. Back up operational data and use a separate test project with synthetic records.
2. Use trusted Application Default Credentials outside the repository.
3. Obtain each existing owner's real Firebase Auth UID from Firebase Console. Do not infer UIDs from names or email prefixes.
4. Grant each owner access explicitly:

   `node scripts/owner-claim.mjs YOUR_PROJECT_ID OWNER_UID grant`

5. Have owners sign out/in. Run the rules tests, build, and stage the owner login/read/write/logout workflow.
6. Only then deploy the reviewed rules and frontend to the intended project.

Without a provisioned owner claim, the new rules deny all browser access. This is intentional. No claims or deployed rules were changed by the portfolio review.

To remove access, run the same command with `revoke`. Refresh tokens are revoked, but already issued ID tokens can remain usable until expiry; immediate incident response may require disabling the account and changing the rules. Do not promise instantaneous token revocation.

## Local checks

Use Node 22 and Java 21 for the current Firebase CLI:

```sh
npm ci
npm test
npm run test:rules:ci
npm run build
```

The emulator test configuration uses only localhost and the `demo-fitness-kingdom` project. Test records are synthetic.

## Remaining limits

Owner claims authorize all records in this single gym. Field validation and business invariants need further rules coverage. The fixed client-side PIN is only an accidental-action confirmation, not a security factor. Member mutations now reject persistence failures before cache changes, with unit coverage. Other service modules still require a separate correctness review.
