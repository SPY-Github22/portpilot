/**
 * Security & Process Protection Guard for PortPilot
 * 
 * Enforces strict safety boundaries:
 * - Prohibits killing system PID 1, PID 0, or kernel threads
 * - Enforces CSRF session token verification for localhost APIs
 * - Generates cross-platform fallback shell commands
 */

export { validatePid, generateKillCommands, SecurityGuardError } from '../src/core/commands';

// Critical system processes that must NEVER be terminated by PortPilot
const PROTECTED_PROCESS_NAMES = new Set([
  'systemd',
  'init',
  'kthreadd',
  'kworker',
  'systemd-journald',
  'systemd-udevd',
  'dbus-daemon',
  'sshd',
  'polkitd',
  'cron',
  'crond',
  'NetworkManager',
  'rsyslogd',
]);

/**
 * Checks if a process name belongs to a protected core OS daemon
 */
export function isProtectedProcess(name: string): boolean {
  if (!name) return false;
  const clean = name.trim().toLowerCase();
  return PROTECTED_PROCESS_NAMES.has(clean);
}

/**
 * Session Token Guard to protect localhost HTTP endpoints from Cross-Site Request Forgery
 */
export class SessionTokenGuard {
  private token: string;

  constructor() {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    this.token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public getToken(): string {
    return this.token;
  }

  public verify(providedToken?: string | null): boolean {
    if (!providedToken) return false;
    return providedToken === this.token;
  }
}
