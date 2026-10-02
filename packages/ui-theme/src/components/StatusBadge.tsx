import React from 'react';

export type TacticalStatus = 'LOCKED' | 'ACTIVE' | 'RESOLVED' | 'HAZARD' | 'HIDDEN';

export interface StatusBadgeProps {
  status: TacticalStatus;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const styles = {
    LOCKED: 'border-[#453724] bg-[#141c14] text-[#9ba89b]',
    ACTIVE: 'border-[#f5b700] bg-[#f5b700]/15 text-[#f5b700] animate-pulse',
    RESOLVED: 'border-[#4e9b4e] bg-[#4e9b4e]/20 text-[#68d391]',
    HAZARD: 'border-[#c5221f] bg-[#c5221f]/20 text-[#fc8181] font-black',
    HIDDEN: 'border-transparent bg-transparent text-[#9ba89b]/40',
  }[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider border uppercase ${styles}`}
    >
      {label || status}
    </span>
  );
};
