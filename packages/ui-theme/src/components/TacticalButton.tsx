import React from 'react';

export interface TacticalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'yellow' | 'olive' | 'coyote' | 'green' | 'red' | 'neutral' | 'cyan';
  size?: 'default' | 'large' | 'compact';
  fullWidth?: boolean;
}

export const TacticalButton: React.FC<TacticalButtonProps> = ({
  variant = 'yellow',
  size = 'default',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    yellow: 'bg-[#f5b700]/15 text-[#f5b700] border-[#f5b700] hover:bg-[#f5b700]/25 active:bg-[#f5b700]/35',
    olive: 'bg-[#3b5323]/30 text-[#84cc16] border-[#4e6b2f] hover:bg-[#3b5323]/45 active:bg-[#3b5323]/60',
    coyote: 'bg-[#8a6240]/25 text-[#d4a373] border-[#a67c52] hover:bg-[#8a6240]/40 active:bg-[#8a6240]/50',
    green: 'bg-[#4e9b4e]/20 text-[#68d391] border-[#4e9b4e] hover:bg-[#4e9b4e]/30 active:bg-[#4e9b4e]/40',
    red: 'bg-[#c5221f]/20 text-[#fc8181] border-[#c5221f] hover:bg-[#c5221f]/30 active:bg-[#c5221f]/40',
    cyan: 'bg-[#f5b700]/15 text-[#f5b700] border-[#f5b700] hover:bg-[#f5b700]/25 active:bg-[#f5b700]/35',
    neutral: 'bg-[#141c14] text-[#e8ede8] border-[#2e3d2e] hover:border-[#9ba89b] active:bg-[#1c261c]',
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
