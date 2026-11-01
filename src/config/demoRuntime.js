export const DEMO_PROJECT_ID = 'demo-fitness-kingdom';
export function demoConfig(mode, hostname) {
  if (mode !== 'demo') return null;
  if (!['localhost', '127.0.0.1'].includes(hostname)) {
    throw new Error('The synthetic demo runs on localhost only.');
  }
  return { apiKey: 'demo-only-key', authDomain: 'localhost', projectId: DEMO_PROJECT_ID, appId: 'demo-gym-app' };
}
