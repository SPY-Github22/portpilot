import { describe, it, expect } from 'vitest';
import { parseLsofOutput, parseSsOutput, parsePastedOutput } from '../src/core/pasteParser';

describe('Offline Paste Parser', () => {
  it('should parse standard lsof output', () => {
    const lsofSample = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   19u  IPv4 148123      0t0  TCP *:3000 (LISTEN)
vite    54321 user   22u  IPv6 148124      0t0  TCP *:5173 (LISTEN)`;

    const res = parseLsofOutput(lsofSample);
    expect(res).toHaveLength(2);
    expect(res[0].port).toBe(3000);
    expect(res[0].processName).toBe('node');
    expect(res[0].pid).toBe(12345);

    expect(res[1].port).toBe(5173);
    expect(res[1].processName).toBe('vite');
    expect(res[1].ipVersion).toBe('IPv6');
  });

  it('should parse standard Linux ss output', () => {
    const ssSample = `Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
tcp   LISTEN 0      128    127.0.0.1:8080      0.0.0.0:*         users:(("java",pid=9988,fd=32))
tcp   LISTEN 0      511    0.0.0.0:6379        0.0.0.0:*         users:(("redis-server",pid=1122,fd=6))`;

    const res = parseSsOutput(ssSample);
    expect(res).toHaveLength(2);
    expect(res[0].port).toBe(8080);
    expect(res[0].pid).toBe(9988);
    expect(res[0].processName).toBe('java');

    expect(res[1].port).toBe(6379);
    expect(res[1].processName).toBe('redis-server');
  });

  it('should auto-detect formats cleanly and enrich with kill commands', () => {
    const lsofSample = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
python3 44556 dev    12u  IPv4 148199      0t0  TCP 127.0.0.1:8000 (LISTEN)`;

    const parsed = parsePastedOutput(lsofSample);
    expect(parsed.detectedFormat).toBe('lsof');
    expect(parsed.ports).toHaveLength(1);
    expect(parsed.ports[0].killCommands.linux).toContain('kill -9 44556');
  });
});
