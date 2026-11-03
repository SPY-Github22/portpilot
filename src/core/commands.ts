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

/**
 * Generate Docker container discovery and stop commands for a given port
 */
export function generateDockerCommands(port: number): {
  findContainer: string;
  stopContainer: string;
} {
  return {
    findContainer: `docker ps --filter "publish=${port}"`,
    stopContainer: `docker stop $(docker ps -q --filter "publish=${port}")`,
  };
}

/**
 * Generate Markdown Diagnostic Report for team sharing
 */
export function generateDiagnosticMarkdown(
  ports: { port: number; protocol: string; address: string; pid: number | null; processName: string; serviceTag?: string; isGhost?: boolean }[],
  conflicts: { port: number; reason: string }[] = []
): string {
  const lines: string[] = [];
  lines.push('### 🔌 PortPilot Diagnostic Report');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Listening Ports: ${ports.length}`);
  lines.push(`Detected Conflicts: ${conflicts.length}\n`);

  if (conflicts.length > 0) {
    lines.push('#### ⚠️ Active Conflicts');
    for (const c of conflicts) {
      lines.push(`- **Port ${c.port}**: ${c.reason}`);
    }
    lines.push('');
  }

  lines.push('| Port | Protocol | Address | PID | Process | Service | Status |');
  lines.push('| :--- | :---: | :--- | :--- | :--- | :--- | :--- |');

  for (const p of ports) {
    const status = p.isGhost ? '👻 Ghost' : '🟢 Active';
    lines.push(`| ${p.port} | ${p.protocol} | \`${p.address}\` | \`${p.pid ?? 'N/A'}\` | ${p.processName} | ${p.serviceTag || '-'} | ${status} |`);
  }

  return lines.join('\n');
}
