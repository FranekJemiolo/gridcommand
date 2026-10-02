import React, { useState } from 'react';
import { TacticalButton } from '@gridcommand/ui-theme';

export interface TemporalScrubberProps {
  isLive: boolean;
  onToggleLive: (live: boolean) => void;
  scrubPosition: number;
  onScrub: (pos: number) => void;
}

export const TemporalScrubber: React.FC<TemporalScrubberProps> = ({
  isLive,
  onToggleLive,
  scrubPosition,
  onScrub,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Calculate simulated clock string based on scrubPosition (from 14:00:00 to 15:30:00)
  const baseMinutes = 14 * 60;
  const currentTotalMinutes = baseMinutes + (scrubPosition / 100) * 90;
  const hours = Math.floor(currentTotalMinutes / 60);
  const minutes = Math.floor(currentTotalMinutes % 60);
  const seconds = Math.floor(((currentTotalMinutes % 60) - minutes) * 60);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <footer className="w-full bg-[#141c14] border-t-2 border-[#2e3d2e] px-4 py-3 font-mono text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Mode Selector & Play Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleLive(!isLive)}
            className={`px-3 py-1.5 rounded font-black text-xs uppercase border transition-all ${
              isLive
                ? 'bg-[#4e9b4e]/20 border-[#4e9b4e] text-[#68d391] animate-pulse'
                : 'bg-[#f5b700]/20 border-[#f5b700] text-[#f5b700]'
            }`}
          >
            {isLive ? '● LIVE STREAM' : '⏸ DVR REPLAY'}
          </button>

          <TacticalButton
            size="compact"
            variant="neutral"
            onClick={() => {
              onToggleLive(false);
              setIsPlaying(!isPlaying);
            }}
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </TacticalButton>
        </div>

        {/* Timeline Slider (Temporal Scrubber) */}
        <div className="flex-1 w-full max-w-2xl flex items-center gap-3">
          <span className="text-[11px] text-[#9ba89b]">14:00:00</span>
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              value={scrubPosition}
              onChange={(e) => {
                onToggleLive(false);
                onScrub(Number(e.target.value));
              }}
              className="w-full h-2 bg-[#1c261c] rounded-lg appearance-none cursor-pointer accent-[#f5b700]"
            />
          </div>
          <span className="text-[11px] text-[#f5b700] font-bold">15:30:00</span>
        </div>

        {/* Time Readout */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-[#0b0f0b] border border-[#453724] rounded text-[#f5b700] font-bold">
            PLAYBACK: {timeString}
          </div>
          {isLive && (
            <span className="text-[10px] text-[#68d391] font-bold tracking-wider">[IN SYNC]</span>
          )}
        </div>
      </div>
    </footer>
  );
};
