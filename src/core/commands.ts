/**
 * Command Generation and PID Validation for PortPilot
 * (Safe for both Browser and Node.js runtimes)
 */

export class SecurityGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityGuardError';
  }
}

/**
 * Validates that a PID is acceptable for user termination
 */
export function validatePid(pid: unknown): number {
  if (typeof pid !== 'number' || !Number.isInteger(pid)) {
    throw new SecurityGuardError(`Invalid PID format: expected positive integer, got ${String(pid)}`);
  }

  if (pid <= 1) {
    throw new SecurityGuardError(`Forbidden PID ${pid}: Killing system init/kernel process is prohibited.`);
  }

  if (pid > 4194304) {
    throw new SecurityGuardError(`PID ${pid} exceeds maximum operating system process limit.`);
  }

  return pid;
}

/**
 * Generate platform-specific shell kill commands for copy-pasting
 */
export function generateKillCommands(pid: number, port?: number): {
  linux: string;
  macos: string;
  windows: string;
} {
  const validPid = validatePid(pid);

  return {
    linux: port ? `fuser -k ${port}/tcp # or: kill -9 ${validPid}` : `kill -9 ${validPid}`,
    macos: port ? `kill -9 $(lsof -t -i:${port}) # or: kill -9 ${validPid}` : `kill -9 ${validPid}`,
    windows: `taskkill /PID ${validPid} /F`,
  };
}
