import React from 'react';

export type TacticalStatus = 'LOCKED' | 'ACTIVE' | 'RESOLVED' | 'HAZARD' | 'HIDDEN';

export interface StatusBadgeProps {
  status: TacticalStatus;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const styles = {
    LOCKED: 'border-[#8b949e]/50 bg-[#121820] text-[#8b949e]',
    ACTIVE: 'border-[#00f3ff] bg-[#00f3ff]/10 text-[#00f3ff] animate-pulse',
    RESOLVED: 'border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66]',
    HAZARD: 'border-[#ff2200] bg-[#ff2200]/20 text-[#ff2200] font-black',
    HIDDEN: 'border-transparent bg-transparent text-[#8b949e]/40',
  }[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider border uppercase ${styles}`}
    >
      {label || status}
    </span>
  );
};
