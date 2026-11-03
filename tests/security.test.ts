import { describe, it, expect } from 'vitest';
import { validatePid, isProtectedProcess, generateKillCommands, SessionTokenGuard, SecurityGuardError } from '../server/security';

describe('Process Security Guard', () => {
  it('should validate valid user-space PIDs', () => {
    expect(validatePid(3000)).toBe(3000);
    expect(validatePid(42109)).toBe(42109);
  });

  it('should reject PID 0, PID 1, and negative numbers', () => {
    expect(() => validatePid(0)).toThrow(SecurityGuardError);
    expect(() => validatePid(1)).toThrow(SecurityGuardError);
    expect(() => validatePid(-50)).toThrow(SecurityGuardError);
    expect(() => validatePid('3000' as unknown)).toThrow(SecurityGuardError);
  });

  it('should detect protected system daemon names', () => {
    expect(isProtectedProcess('systemd')).toBe(true);
    expect(isProtectedProcess('dbus-daemon')).toBe(true);
    expect(isProtectedProcess('sshd')).toBe(true);
    expect(isProtectedProcess('node')).toBe(false);
    expect(isProtectedProcess('python')).toBe(false);
  });

  it('should generate cross-platform kill commands', () => {
    const cmds = generateKillCommands(12345, 3000);
    expect(cmds.linux).toContain('kill -9 12345');
    expect(cmds.macos).toContain('12345');
    expect(cmds.windows).toContain('taskkill /PID 12345 /F');
  });

  it('should generate and verify random CSRF session tokens', () => {
    const guard = new SessionTokenGuard();
    const token = guard.getToken();
    expect(token).toHaveLength(48);
    expect(guard.verify(token)).toBe(true);
    expect(guard.verify('invalid-token')).toBe(false);
    expect(guard.verify(null)).toBe(false);
  });
});
