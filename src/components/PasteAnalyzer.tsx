import React, { useState } from 'react';
import { Terminal, Copy, Check, Sparkles, Trash2, ArrowUpRight } from 'lucide-react';
import { parsePastedOutput, ParsedPasteResult } from '../core/pasteParser';
import { ListeningPort } from '../core/types';

interface PasteAnalyzerProps {
  onLoadIntoLive: (ports: ListeningPort[]) => void;
}

const SAMPLE_LSOF = `COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    14820 dev    19u  IPv4 148123      0t0  TCP *:3000 (LISTEN)
vite    14890 dev    22u  IPv6 148124      0t0  TCP *:5173 (LISTEN)
postgres 1201 postgres 5u  IPv4  23412      0t0  TCP 127.0.0.1:5432 (LISTEN)
python3 18902 dev    14u  IPv4  89123      0t0  TCP 127.0.0.1:8000 (LISTEN)`;

const SAMPLE_SS = `Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process
tcp   LISTEN 0      128    127.0.0.1:8080      0.0.0.0:*         users:(("java",pid=21980,fd=45))
tcp   LISTEN 0      511    0.0.0.0:6379        0.0.0.0:*         users:(("redis-server",pid=1102,fd=6))
tcp   LISTEN 0      128    0.0.0.0:27017       0.0.0.0:*         users:(("mongod",pid=3412,fd=12))`;

export const PasteAnalyzer: React.FC<PasteAnalyzerProps> = ({
  onLoadIntoLive,
}) => {
  const [pasteContent, setPasteContent] = useState(SAMPLE_LSOF);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const parsed: ParsedPasteResult = parsePastedOutput(pasteContent);

  const handleCopy = (cmdKey: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmdKey);
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  return (
    <div className="flex-1 flex flex-col p-4 space-y-4 overflow-auto bg-neutral-950 text-xs">
      {/* Input Box & Presets */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-400" />
            <span className="font-bold text-white text-xs">Terminal Output Diagnostic Mode</span>
            <span className="text-neutral-500 font-mono text-[11px]">
              (Paste raw lsof, ss, or netstat from any local or remote machine)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Try Sample:</span>
            </span>
            <button
              onClick={() => setPasteContent(SAMPLE_LSOF)}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition text-[11px]"
            >
              lsof (Node/Vite)
            </button>
            <button
              onClick={() => setPasteContent(SAMPLE_SS)}
              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition text-[11px]"
            >
              ss (Java/Redis)
            </button>
            <button
              onClick={() => setPasteContent('')}
              className="p-1 rounded text-neutral-500 hover:text-red-400 transition"
              title="Clear input"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <textarea
          value={pasteContent}
          onChange={(e) => setPasteContent(e.target.value)}
          placeholder="Paste terminal output here from `lsof -i :3000`, `ss -tulpn`, or `netstat -ano`..."
          className="w-full h-32 p-3 font-mono text-xs bg-neutral-950 border border-neutral-800 rounded-md text-neutral-200 outline-none focus:border-cyan-500 resize-none selection:bg-cyan-500/30 leading-relaxed"
          spellCheck={false}
        />

        <div className="flex items-center justify-between text-neutral-400 text-[11px]">
          <span>
            Detected Syntax: <span className="font-mono text-cyan-400 font-bold uppercase">{parsed.detectedFormat}</span> • {parsed.ports.length} listening sockets parsed
          </span>
          {parsed.ports.length > 0 && (
            <button
              onClick={() => onLoadIntoLive(parsed.ports)}
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium"
            >
              <span>Load into Live Ports View</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Parsed Results Grid */}
      <div className="space-y-2">
        <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[11px] block px-1">
          Parsed Sockets & Instant Kill Scripts ({parsed.ports.length})
        </span>

        {parsed.ports.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center text-neutral-500">
            Paste terminal output above to extract listening ports, PIDs, and kill commands.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {parsed.ports.map((item, idx) => {
              const cmdLinuxKey = `linux-${idx}`;
              const cmdMacKey = `mac-${idx}`;
              const cmdWinKey = `win-${idx}`;

              return (
                <div
                  key={idx}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                        :{item.port}
                      </span>
                      <span className="font-semibold text-white">{item.processName}</span>
                    </div>

                    <span className="font-mono text-neutral-400 text-[11px]">
                      PID: <span className="text-white font-bold">{item.pid ?? 'N/A'}</span>
                    </span>
                  </div>

                  {/* Copyable Shell Kill Commands */}
                  <div className="bg-neutral-950 border border-neutral-800/80 rounded p-2 space-y-1.5 font-mono text-[11px]">
                    {/* Linux */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500 w-12 shrink-0">Linux:</span>
                      <code className="text-emerald-300 truncate flex-1">{item.killCommands.linux}</code>
                      <button
                        onClick={() => handleCopy(cmdLinuxKey, item.killCommands.linux)}
                        className="p-1 text-neutral-400 hover:text-white transition"
                        title="Copy command"
                      >
                        {copiedCmd === cmdLinuxKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* macOS */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500 w-12 shrink-0">macOS:</span>
                      <code className="text-cyan-300 truncate flex-1">{item.killCommands.macos}</code>
                      <button
                        onClick={() => handleCopy(cmdMacKey, item.killCommands.macos)}
                        className="p-1 text-neutral-400 hover:text-white transition"
                        title="Copy command"
                      >
                        {copiedCmd === cmdMacKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Windows */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-neutral-500 w-12 shrink-0">Win:</span>
                      <code className="text-purple-300 truncate flex-1">{item.killCommands.windows}</code>
                      <button
                        onClick={() => handleCopy(cmdWinKey, item.killCommands.windows)}
                        className="p-1 text-neutral-400 hover:text-white transition"
                        title="Copy command"
                      >
                        {copiedCmd === cmdWinKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
