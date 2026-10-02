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
      <div className="w-full max-w-sm bg-[#0a0e14] border-2 border-[#1e2638] rounded-t-xl sm:rounded-xl p-4 shadow-2xl font-mono">
        <div className="flex justify-between items-center pb-2 border-b border-[#1e2638]">
          <div className="text-xs font-bold text-[#8b949e]">GLOVE PIN ENTRY // BACKUP</div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-sm font-bold text-[#8b949e] border border-[#1e2638] rounded hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="my-3 text-center">
          <div className="text-xs text-[#00f3ff] truncate">{objectiveName}</div>
          <div
            className={`mt-2 py-2 px-4 rounded border-2 text-2xl tracking-[0.3em] font-black ${
              status === 'error'
                ? 'border-[#ff2200] bg-[#ff2200]/10 text-[#ff2200]'
                : status === 'success'
                  ? 'border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66]'
                  : 'border-[#1e2638] bg-[#000000] text-[#00f3ff]'
            }`}
          >
            {pin.padEnd(6, '·')}
          </div>
          {status === 'error' && (
            <div className="text-[11px] text-[#ff2200] mt-1 font-bold">INVALID PIN // RE-CHECK PHYSICAL TOKEN</div>
          )}
          {status === 'success' && (
            <div className="text-[11px] text-[#00ff66] mt-1 font-bold">OBJECTIVE CAPTURED // CRDT COMMITTED</div>
          )}
        </div>

        {/* 10-Key Massive Glove Numpad (min 60x60px) */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <TacticalButton
              key={digit}
              variant="neutral"
              className="text-xl font-black h-16"
              onClick={() => handleDigit(digit)}
            >
              {digit}
            </TacticalButton>
          ))}
          <TacticalButton
            variant="neutral"
            className="text-xs text-[#8b949e] h-16"
            onClick={handleClear}
          >
            CLR
          </TacticalButton>
          <TacticalButton
            variant="neutral"
            className="text-xl font-black h-16"
            onClick={() => handleDigit('0')}
          >
            0
          </TacticalButton>
          <TacticalButton
            variant="neutral"
            className="text-sm text-[#ffe600] h-16"
            onClick={handleBackspace}
          >
            ⌫
          </TacticalButton>
        </div>

        <div className="mt-3">
          <TacticalButton
            variant="cyan"
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
