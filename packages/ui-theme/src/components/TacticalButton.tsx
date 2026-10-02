import React from 'react';

export interface TacticalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'cyan' | 'yellow' | 'red' | 'green' | 'neutral';
  size?: 'default' | 'large' | 'compact';
  fullWidth?: boolean;
}

export const TacticalButton: React.FC<TacticalButtonProps> = ({
  variant = 'cyan',
  size = 'default',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    cyan: 'bg-[#00f3ff]/10 text-[#00f3ff] border-[#00f3ff] hover:bg-[#00f3ff]/20 active:bg-[#00f3ff]/30',
    yellow: 'bg-[#ffe600]/10 text-[#ffe600] border-[#ffe600] hover:bg-[#ffe600]/20 active:bg-[#ffe600]/30',
    red: 'bg-[#ff2200]/10 text-[#ff2200] border-[#ff2200] hover:bg-[#ff2200]/20 active:bg-[#ff2200]/30',
    green: 'bg-[#00ff66]/10 text-[#00ff66] border-[#00ff66] hover:bg-[#00ff66]/20 active:bg-[#00ff66]/30',
    neutral: 'bg-[#121820] text-[#e6edf3] border-[#1e2638] hover:border-[#8b949e] active:bg-[#1a2332]',
  }[variant];

  const sizeStyles = {
    default: 'min-w-[60px] min-h-[60px] px-4 py-3 text-sm',
    large: 'min-w-[72px] min-h-[72px] px-6 py-4 text-base font-black',
    compact: 'min-w-[48px] min-h-[48px] px-3 py-2 text-xs',
  }[size];

  return (
    <button
      className={`tactical-btn select-none rounded ${variantStyles} ${sizeStyles} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
