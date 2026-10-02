import React, { useState } from 'react';
import { TacticalButton } from '@gridcommand/ui-theme';

export interface GlovePinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPin: (pin: string) => boolean;
  objectiveName: string;
}

export const GlovePinModal: React.FC<GlovePinModalProps> = ({
  isOpen,
  onClose,
  onSubmitPin,
  objectiveName,
}) => {
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setStatus('idle');
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setStatus('idle');
  };

  const handleClear = () => {
    setPin('');
    setStatus('idle');
  };

  const handleConfirm = () => {
    if (pin.length < 6) return;
    const ok = onSubmitPin(pin);
    if (ok) {
      setStatus('success');
      setTimeout(() => {
        onClose();
        setPin('');
        setStatus('idle');
      }, 700);
    } else {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 p-2 sm:p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#141c14] border-2 border-[#453724] rounded-t-xl sm:rounded-xl p-4 shadow-2xl font-mono">
        <div className="flex justify-between items-center pb-2 border-b border-[#2e3d2e]">
          <div className="text-xs font-bold text-[#c7a76c]">GLOVE PIN ENTRY // BACKUP</div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-sm font-bold text-[#9ba89b] border border-[#2e3d2e] rounded hover:text-white bg-[#0b0f0b]"
          >
            ✕
          </button>
        </div>

        <div className="my-3 text-center">
          <div className="text-xs text-[#f5b700] font-bold truncate">{objectiveName}</div>
          <div
            className={`mt-2 py-2 px-4 rounded border-2 text-2xl tracking-[0.3em] font-black ${
              status === 'error'
                ? 'border-[#c5221f] bg-[#c5221f]/20 text-[#fc8181]'
                : status === 'success'
                  ? 'border-[#4e9b4e] bg-[#4e9b4e]/20 text-[#68d391]'
                  : 'border-[#453724] bg-[#0b0f0b] text-[#f5b700]'
            }`}
          >
            {pin.padEnd(6, '·')}
          </div>
          {status === 'error' && (
            <div className="text-[11px] text-[#fc8181] mt-1 font-bold">INVALID PIN // RE-CHECK PHYSICAL TOKEN</div>
          )}
          {status === 'success' && (
            <div className="text-[11px] text-[#68d391] mt-1 font-bold">OBJECTIVE CAPTURED // CRDT COMMITTED</div>
          )}
        </div>

        {/* 10-Key Massive Glove Numpad (min 60x60px) */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <TacticalButton
              key={digit}
              variant="neutral"
              className="text-xl font-black h-16 border-[#2e3d2e] bg-[#1c261c]"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </TacticalButton>
          ))}
          <TacticalButton
            variant="neutral"
            className="text-xs text-[#9ba89b] h-16 border-[#2e3d2e] bg-[#1c261c]"
            onClick={handleClear}
          >
            CLR
          </TacticalButton>
          <TacticalButton
            variant="neutral"
            className="text-xl font-black h-16 border-[#2e3d2e] bg-[#1c261c]"
            onClick={() => handleDigit('0')}
          >
            0
          </TacticalButton>
          <TacticalButton
            variant="neutral"
            className="text-sm text-[#f5b700] h-16 border-[#2e3d2e] bg-[#1c261c]"
            onClick={handleBackspace}
          >
            ⌫
          </TacticalButton>
        </div>

        <div className="mt-3">
          <TacticalButton
            variant="yellow"
            fullWidth
            className="h-16 text-base font-black tracking-wider"
            onClick={handleConfirm}
            disabled={pin.length < 6}
          >
            CONFIRM CAPTURE (VOL UP)
          </TacticalButton>
        </div>
      </div>
    </div>
  );
};
