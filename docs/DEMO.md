# Synthetic local demo

This demo uses local Firebase Auth and Firestore emulators with the fixed project ID `demo-fitness-kingdom`. It does not provision or write to the live gym project. No service-account key or real customer records are needed.

## Run

Prerequisites: Node 22.12+ and Java 21+, with this branch checked out.

```powershell
npm ci
npm run demo
```

Open the loopback URL printed by Vite. Sign in with **owner@gym.test / DemoGym123!**. The **viewer@gym.test** account has the same password but no owner permission; its sign-in should be rejected.

The seed creates three fictional members, one membership plan and settings. Payments and attendance start empty: demonstrate those workflows with synthetic entries. Emulator data is disposable and resets after stopping the command. Use Ctrl+C to stop.

Demo mode refuses non-loopback browser hosts, ignores production Firebase environment configuration, and uses a memory-only Firestore cache. The seed refuses to start unless both emulator hosts match the local ports. Never deploy this mode to Hosting. Normal `npm run build` remains the production build.

## Walkthrough to validate

1. Sign in as the synthetic owner and inspect the three members.
2. Add a fictional member, refresh, and confirm it remains during the emulator session.
3. Exercise attendance and fee collection using fictional data.
4. Sign out and verify the viewer account is denied.
5. Capture screenshots only from this local demo, clearly labelled synthetic.

Unit coverage checks project selection and rejection of non-loopback hosts. Full browser walkthrough and screenshot capture are separate validation steps; do not treat a successful build as proof of those workflows.
