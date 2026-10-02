import React from 'react';
import { TickerEvent } from '../stores/gmStore';

export interface EventTickerProps {
  events: TickerEvent[];
}

export const EventTicker: React.FC<EventTickerProps> = ({ events }) => {
  const getBadgeColor = (type: TickerEvent['type']) => {
    switch (type) {
      case 'CAPT':
        return 'text-[#00ff66] border-[#00ff66]/40 bg-[#00ff66]/10';
      case 'OVER':
        return 'text-[#00f3ff] border-[#00f3ff]/40 bg-[#00f3ff]/10';
      case 'HAZ':
        return 'text-[#ffe600] border-[#ffe600]/40 bg-[#ffe600]/10';
      case 'FREEZE':
        return 'text-[#ff2200] border-[#ff2200]/40 bg-[#ff2200]/20 font-black';
      default:
        return 'text-[#8b949e] border-[#8b949e]/40';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0e14] border-l-2 border-[#1e2638] font-mono select-none">
      <div className="p-3 border-b border-[#1e2638] flex items-center justify-between">
        <div className="text-xs font-bold text-[#e6edf3] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
          EVENT STREAM // CRDT INGRESS
        </div>
        <div className="text-[10px] text-[#8b949e]">{events.length} EVENTS</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-2.5 rounded bg-[#121820] border border-[#1e2638] hover:border-[#8b949e]/50 transition-colors text-xs"
          >
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="text-[#8b949e]">{evt.timeStr}</span>
              <span className={`px-1.5 py-0.5 rounded border uppercase text-[9px] font-bold ${getBadgeColor(evt.type)}`}>
                {evt.type}
              </span>
            </div>
            <div className="text-[#e6edf3] leading-snug">{evt.message}</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-[#8b949e]">
              <span>SQUAD: {evt.squad}</span>
              {evt.verified && <span className="text-[#00f3ff]">✓ SIG VALID</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
