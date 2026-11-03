#!/usr/bin/env node

/**
 * PortPilot CLI
 * 
 * Usage:
 *   npx portpilot             # Start UI dashboard on http://127.0.0.1:4999
 *   npx portpilot --port 3000 # Inspect specific port
 *   npx portpilot --kill 3000 # Kill process on port 3000
 *   npx portpilot --json      # Output listening ports as JSON
 */

import { scanSystemPorts, terminateProcess } from '../server/scanner.js';
import { startServer } from '../server/api.js';

const args = process.argv.slice(2);

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PortPilot - Local Port & Ghost Process Exorcist

Usage:
  portpilot                Start local dashboard at http://127.0.0.1:4999
  portpilot --kill <port>  Immediately kill process listening on specified port
  portpilot --port <port>  Inspect process listening on specified port
  portpilot --json         Output all listening ports in JSON format
  portpilot --help         Show this help message
`);
    process.exit(0);
  }

  // Handle --kill <port>
  const killIdx = args.indexOf('--kill');
  if (killIdx !== -1 && args[killIdx + 1]) {
    const targetPort = parseInt(args[killIdx + 1], 10);
    if (isNaN(targetPort) || targetPort <= 0) {
      console.error(`Invalid port: ${args[killIdx + 1]}`);
      process.exit(1);
    }

    console.log(`Scanning for process on port :${targetPort}...`);
    const ports = await scanSystemPorts();
    const match = ports.find(p => p.port === targetPort);

    if (!match || !match.pid) {
      console.log(`No active process found listening on port :${targetPort}.`);
      process.exit(0);
    }

    console.log(`Found process "${match.processName}" (PID ${match.pid}) on :${targetPort}. Terminating...`);
    const res = await terminateProcess(match.pid, 'SIGKILL', targetPort);
    if (res.success) {
      console.log(`✓ Port :${targetPort} freed successfully.`);
    } else {
      console.error(`Failed to terminate PID ${match.pid}: ${res.message}`);
      console.log(`Try manual command: ${res.fallbackCommand.linux}`);
    }
    process.exit(res.success ? 0 : 1);
  }

  // Handle --port <port>
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    const targetPort = parseInt(args[portIdx + 1], 10);
    const ports = await scanSystemPorts();
    const match = ports.find(p => p.port === targetPort);

    if (match) {
      console.log(`Port :${match.port} is LISTEN by PID ${match.pid} (${match.processName}) on ${match.address}`);
      if (match.commandLine) console.log(`Command: ${match.commandLine}`);
    } else {
      console.log(`Port :${targetPort} is FREE.`);
    }
    process.exit(0);
  }

  // Handle --json
  if (args.includes('--json')) {
    const ports = await scanSystemPorts();
    console.log(JSON.stringify(ports, null, 2));
    process.exit(0);
  }

  // Default: start HTTP server
  const defaultPort = 4999;
  const server = await startServer(defaultPort);
  console.log(`
🚀 PortPilot Dashboard running at: http://127.0.0.1:${defaultPort}
   Press Ctrl+C to stop.
`);
}

main().catch(err => {
  console.error('PortPilot Error:', err);
  process.exit(1);
});
