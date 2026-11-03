import React from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { PortConflict } from '../core/types';

interface ConflictBannerProps {
  conflicts: PortConflict[];
  onExorcisePort: (port: number) => void;
}

export const ConflictBanner: React.FC<ConflictBannerProps> = ({
  conflicts,
  onExorcisePort,
}) => {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-red-950/40 border-b border-red-900/60 p-4 space-y-2 text-xs">
      <div className="flex items-center gap-2 text-red-400 font-bold">
        <AlertTriangle className="w-4 h-4 animate-bounce" />
        <span>Port Collision Alert: {conflicts.length} conflict{conflicts.length === 1 ? '' : 's'} detected!</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {conflicts.map((conflict, idx) => (
          <div
            key={idx}
            className="bg-neutral-900/90 border border-red-900/80 rounded-lg p-3 flex items-center justify-between gap-3 text-neutral-300"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-red-400">Port {conflict.port}</span>
                <span className="text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.2 rounded border border-red-700/50">
                  Colliding
                </span>
              </div>
              <div className="text-[11px] text-neutral-400">{conflict.reason}</div>
            </div>

            <button
              onClick={() => onExorcisePort(conflict.port)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium shadow-sm transition whitespace-nowrap"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Exorcise Port</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
