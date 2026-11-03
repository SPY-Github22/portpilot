import { describe, it, expect } from 'vitest';
import { parseHexIpv4, parseHexPort, parseProcNetTcp } from '../server/scanner';

describe('Linux /proc/net/tcp Parser', () => {
  it('should parse Linux hex IPv4 representations', () => {
    // 0100007F -> 127.0.0.1
    expect(parseHexIpv4('0100007F')).toBe('127.0.0.1');
    // 00000000 -> 0.0.0.0
    expect(parseHexIpv4('00000000')).toBe('0.0.0.0');
    // 0A00000A -> 10.0.0.10
    expect(parseHexIpv4('0A00000A')).toBe('10.0.0.10');
  });

  it('should parse Linux hex port representations', () => {
    // 0BB8 in hex = 3000 in decimal
    expect(parseHexPort('0BB8')).toBe(3000);
    // 1F90 in hex = 8080 in decimal
    expect(parseHexPort('1F90')).toBe(8080);
    // 14E8 in hex = 5352 in decimal
    expect(parseHexPort('14E8')).toBe(5352);
  });

  it('should extract listening ports from /proc/net/tcp format', () => {
    const sampleProcTcp = `  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode                                                     
   0: 0100007F:0BB8 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 148123 1 0000000000000000 100 0 0 10 0                     
   1: 00000000:1F90 00000000:0000 0A 00000000:00000000 00:00000000 00000000  1000        0 148124 1 0000000000000000 100 0 0 10 0                     
   2: 0100007F:1000 0100007F:9999 01 00000000:00000000 00:00000000 00000000  1000        0 148125 1 0000000000000000 100 0 0 10 0`; // state 01 is ESTABLISHED, not LISTEN

    const parsed = parseProcNetTcp(sampleProcTcp);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].port).toBe(3000);
    expect(parsed[0].address).toBe('127.0.0.1');
    expect(parsed[0].inode).toBe('148123');

    expect(parsed[1].port).toBe(8080);
    expect(parsed[1].address).toBe('0.0.0.0');
  });
});
