import { describe, it, expect } from 'vitest';
import { validatePid, isProtectedProcess, generateKillCommands, SessionTokenGuard, SecurityGuardError } from '../server/security';
import { generateDockerCommands, generateDiagnosticMarkdown } from '../src/core/commands';

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

  it('should generate Docker commands for port mapping', () => {
    const cmds = generateDockerCommands(5432);
    expect(cmds.findContainer).toBe('docker ps --filter "publish=5432"');
    expect(cmds.stopContainer).toContain('docker stop');
    expect(cmds.stopContainer).toContain('5432');
  });

  it('should generate Markdown diagnostic reports', () => {
    const report = generateDiagnosticMarkdown(
      [
        {
          port: 3000,
          protocol: 'TCP',
          address: '127.0.0.1',
          pid: 8844,
          processName: 'node',
          serviceTag: 'Next.js',
          isGhost: false,
        },
      ],
      [{ port: 3000, reason: 'Duplicate workers' }]
    );

    expect(report).toContain('### 🔌 PortPilot Diagnostic Report');
    expect(report).toContain('⚠️ Active Conflicts');
    expect(report).toContain('Port 3000');
    expect(report).toContain('| 3000 | TCP | `127.0.0.1` | `8844` | node | Next.js | 🟢 Active |');
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
