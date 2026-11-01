import { describe, it, expect } from 'vitest';
import { demoConfig } from './demoRuntime';
describe('synthetic demo isolation', () => {
  it('does not replace normal Firebase configuration', () => expect(demoConfig('production', 'gym.example')).toBeNull());
  it.each(['localhost', '127.0.0.1'])('uses a demo project on %s', hostname => {
    expect(demoConfig('demo', hostname).projectId).toBe('demo-fitness-kingdom');
  });
  it.each(['fitness-kingdom-gym.web.app', '192.168.1.2', 'localhost.example'])('rejects non-loopback host %s', hostname => {
    expect(() => demoConfig('demo', hostname)).toThrow('localhost only');
  });
});
