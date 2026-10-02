import React from 'react';
import { TickerEvent } from '../stores/gmStore';

export interface EventTickerProps {
  events: TickerEvent[];
}

export const EventTicker: React.FC<EventTickerProps> = ({ events }) => {
  const getBadgeColor = (type: TickerEvent['type']) => {
    switch (type) {
      case 'CAPT':
        return 'text-[#68d391] border-[#4e9b4e]/60 bg-[#4e9b4e]/20';
      case 'OVER':
        return 'text-[#f5b700] border-[#f5b700]/60 bg-[#f5b700]/20';
      case 'HAZ':
        return 'text-[#e09f3e] border-[#e09f3e]/60 bg-[#e09f3e]/20';
      case 'FREEZE':
        return 'text-[#fc8181] border-[#c5221f]/60 bg-[#c5221f]/20 font-black';
      default:
        return 'text-[#9ba89b] border-[#453724]';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#141c14] border-l-2 border-[#2e3d2e] font-mono select-none">
      <div className="p-3 border-b border-[#2e3d2e] flex items-center justify-between">
        <div className="text-xs font-bold text-[#e8ede8] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#68d391] animate-pulse" />
          EVENT STREAM // CRDT INGRESS
        </div>
        <div className="text-[10px] text-[#c7a76c]">{events.length} EVENTS</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {events.map((evt) => (
          <div
            key={evt.id}
            className="p-2.5 rounded bg-[#1c261c] border border-[#2e3d2e] hover:border-[#a67c52] transition-colors text-xs"
          >
            <div className="flex items-center justify-between mb-1 text-[10px]">
              <span className="text-[#9ba89b]">{evt.timeStr}</span>
              <span className={`px-1.5 py-0.5 rounded border uppercase text-[9px] font-bold ${getBadgeColor(evt.type)}`}>
                {evt.type}
              </span>
            </div>
            <div className="text-[#e8ede8] leading-snug">{evt.message}</div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-[#9ba89b]">
              <span>SQUAD: {evt.squad}</span>
              {evt.verified && <span className="text-[#68d391] font-bold">✓ SIG VALID</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
