import React, { useState } from 'react';
import { X, Skull, Copy, Check, Terminal, ShieldAlert, Box } from 'lucide-react';
import { ListeningPort } from '../core/types';
import { generateKillCommands, generateDockerCommands } from '../core/commands';

interface KillModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPort: ListeningPort | null;
  onConfirmKill: (pid: number, signal: 'SIGTERM' | 'SIGKILL', port?: number) => void;
}

export const KillModal: React.FC<KillModalProps> = ({
  isOpen,
  onClose,
  targetPort,
  onConfirmKill,
}) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen || !targetPort || !targetPort.pid) return null;

  const validPid = targetPort.pid > 1 ? targetPort.pid : 99999;
  const commands = generateKillCommands(validPid, targetPort.port);
  const isDocker = targetPort.processName.toLowerCase().includes('docker');
  const dockerCommands = isDocker ? generateDockerCommands(targetPort.port) : null;

  const handleCopy = (key: string, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <Skull className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Terminate Process on Port :{targetPort.port}
              </h2>
              <p className="text-xs text-neutral-400">
                Confirm process termination or copy manual terminal command
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Body */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3.5 space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-500">Process Name:</span>
              <span className="font-mono font-bold text-white">{targetPort.processName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Process ID (PID):</span>
              <span className="font-mono font-bold text-cyan-400">{targetPort.pid}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Listening Socket:</span>
              <span className="font-mono text-neutral-300">{targetPort.address}:{targetPort.port} ({targetPort.protocol})</span>
            </div>
            {targetPort.commandLine && (
              <div className="pt-2 border-t border-neutral-800/80">
                <span className="text-neutral-500 block mb-1">Command Line:</span>
                <code className="text-[11px] font-mono text-neutral-300 block bg-neutral-900 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
                  {targetPort.commandLine}
                </code>
              </div>
            )}
          </div>

          {/* Docker specific container stop commands */}
          {dockerCommands && (
            <div className="space-y-1.5 bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg">
              <span className="font-semibold text-blue-400 text-[11px] flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" />
                <span>Docker Container Detected:</span>
              </span>
              <div className="bg-neutral-950 border border-neutral-800 rounded p-2 flex items-center justify-between font-mono text-[11px]">
                <code className="text-blue-300 truncate flex-1">{dockerCommands.stopContainer}</code>
                <button
                  onClick={() => handleCopy('docker', dockerCommands.stopContainer)}
                  className="p-1 text-neutral-400 hover:text-white transition"
                  title="Copy docker stop command"
                >
                  {copiedCmd === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Fallback Shell Command */}
          <div className="space-y-1.5">
            <span className="font-semibold text-neutral-400 text-[11px] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-orange-400" />
              <span>Copy Manual Shell Command (if preferred):</span>
            </span>

            <div className="bg-neutral-950 border border-neutral-800 rounded p-2 flex items-center justify-between font-mono text-[11px]">
              <code className="text-emerald-300 truncate flex-1">{commands.linux}</code>
              <button
                onClick={() => handleCopy('linux', commands.linux)}
                className="p-1 text-neutral-400 hover:text-white transition"
                title="Copy command"
              >
                {copiedCmd === 'linux' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-amber-400/90 bg-amber-950/20 border border-amber-900/30 p-2.5 rounded text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Terminating this process will immediately close all active network connections to port :{targetPort.port}.</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onConfirmKill(targetPort.pid!, 'SIGTERM', targetPort.port);
                onClose();
              }}
              className="px-3 py-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition"
              title="Graceful termination"
            >
              Graceful Stop (SIGTERM)
            </button>

            <button
              onClick={() => {
                onConfirmKill(targetPort.pid!, 'SIGKILL', targetPort.port);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-xs font-medium shadow-sm transition"
              title="Immediate force termination"
            >
              Force Kill (SIGKILL)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
