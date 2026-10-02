import React, { useState, useEffect } from 'react';

export interface VoiceBurstLogEntry {
  id: string;
  time: string;
  callsign: string;
  squad: string;
  channel: string;
  type: string;
  text: string;
  durationMs: number;
}

export interface TacticalIntercomWidgetProps {
  currentCallsign?: string;
  currentSquad?: string;
  onTransmitQuickShout?: (shoutId: string, channel: string) => void;
  onVoiceBurstRecorded?: (blobSize: number, durationMs: number) => void;
  readOnly?: boolean;
}

const QUICK_SHOUTS = [
  { id: 'CONTACT_FRONT', code: '0x01', text: 'CONTACT FRONT', color: 'bg-red-900/60 border-red-500 text-red-200' },
  { id: 'CONTACT_FLANK', code: '0x02', text: 'CONTACT FLANK', color: 'bg-red-900/60 border-red-500 text-red-200' },
  { id: 'FALL_BACK', code: '0x03', text: 'FALL BACK', color: 'bg-amber-900/60 border-amber-500 text-amber-200' },
  { id: 'AMMO_LOW', code: '0x04', text: 'AMMO CRITICAL', color: 'bg-amber-900/60 border-amber-500 text-amber-200' },
  { id: 'CASUALTY', code: '0x05', text: 'CASUALTY / MEDIC', color: 'bg-rose-900/70 border-rose-500 text-rose-200' },
  { id: 'OBJ_SECURED', code: '0x06', text: 'OBJECTIVE SECURED', color: 'bg-emerald-900/60 border-emerald-500 text-emerald-200' },
  { id: 'HOLD_POSITION', code: '0x07', text: 'HOLD POSITION', color: 'bg-blue-900/60 border-blue-500 text-blue-200' },
  { id: 'RADIO_SILENCE', code: '0x08', text: 'RADIO SILENCE', color: 'bg-zinc-800 border-zinc-500 text-zinc-300' },
];

export const TacticalIntercomWidget: React.FC<TacticalIntercomWidgetProps> = ({
  currentCallsign = 'VIPER-1',
  currentSquad = 'squad_alpha',
  onTransmitQuickShout,
  onVoiceBurstRecorded,
  readOnly = false,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('CH 1: ALPHA SQUAD');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [txDurationSec, setTxDurationSec] = useState<number>(0);
  const [volume, setVolume] = useState<number>(85);
  const [squelchDb, setSquelchDb] = useState<number>(-95);

  const [burstLogs, setBurstLogs] = useState<VoiceBurstLogEntry[]>([
    {
      id: 'log_1',
      time: '23:01:14',
      callsign: 'DOC-1',
      squad: 'ALPHA',
      channel: 'CH 1',
      type: 'QUICK_SHOUT',
      text: 'OBJECTIVE SECURED',
      durationMs: 450,
    },
    {
      id: 'log_2',
      time: '23:01:45',
      callsign: 'LEADER-2',
      squad: 'BRAVO',
      channel: 'CH 1',
      type: 'VOICE_BURST',
      text: '[VOICE BURST 1.8s - 32kbps Opus]',
      durationMs: 1800,
    },
    {
      id: 'log_3',
      time: '23:02:10',
      callsign: 'POINTMAN',
      squad: 'ALPHA',
      channel: 'CH 1',
      type: 'QUICK_SHOUT',
      text: 'CONTACT FRONT',
      durationMs: 420,
    },
  ]);

  // Transmit timer
  useEffect(() => {
    let timer: any;
    if (isTransmitting) {
      timer = setInterval(() => {
        setTxDurationSec((d) => d + 0.1);
      }, 100);
    } else {
      setTxDurationSec(0);
    }
    return () => clearInterval(timer);
  }, [isTransmitting]);

  const handleStartPTT = () => {
    if (readOnly) return;
    setIsTransmitting(true);
  };

  const handleStopPTT = () => {
    if (!isTransmitting) return;
    setIsTransmitting(false);
    const duration = Math.max(0.5, txDurationSec);
    const newLog: VoiceBurstLogEntry = {
      id: `log_${Date.now()}`,
      time: new Date().toTimeString().split(' ')[0],
      callsign: currentCallsign,
      squad: currentSquad.toUpperCase().replace('SQUAD_', ''),
      channel: selectedChannel.split(':')[0],
      type: 'VOICE_BURST',
      text: `[VOICE BURST ${duration.toFixed(1)}s - 32kbps Opus]`,
      durationMs: Math.round(duration * 1000),
    };
    setBurstLogs((prev) => [newLog, ...prev.slice(0, 7)]);
    if (onVoiceBurstRecorded) {
      onVoiceBurstRecorded(Math.round(duration * 4000), Math.round(duration * 1000));
    }
  };

  const handleSendQuickShout = (shout: typeof QUICK_SHOUTS[0]) => {
    if (readOnly) return;
    const newLog: VoiceBurstLogEntry = {
      id: `log_${Date.now()}`,
      time: new Date().toTimeString().split(' ')[0],
      callsign: currentCallsign,
      squad: currentSquad.toUpperCase().replace('SQUAD_', ''),
      channel: selectedChannel.split(':')[0],
      type: 'QUICK_SHOUT',
      text: shout.text,
      durationMs: 380,
    };
    setBurstLogs((prev) => [newLog, ...prev.slice(0, 7)]);
    if (onTransmitQuickShout) {
      onTransmitQuickShout(shout.id, selectedChannel);
    }
  };

  return (
    <div className="bg-tactical-surface border border-tactical-olive rounded-lg p-5 font-mono text-tactical-parchment shadow-xl">
      {/* Intercom Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-tactical-olive/60 pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎙️</span>
          <div>
            <h3 className="font-bold text-base text-amber-400 tracking-wide">
              TACTICAL INTERCOM & VOICE BURST COMMS
            </h3>
            <p className="text-xs text-tactical-muted">
              LoRa & Sub-GHz Micro-Audio Bursts / 1-Tap Acoustic Tactical Quick-Shouts
            </p>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-tactical-muted">NET:</span>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            disabled={readOnly}
            className="bg-black/60 border border-tactical-olive rounded px-2.5 py-1 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
          >
            <option value="CH 1: ALPHA SQUAD">CH 1: ALPHA SQUAD</option>
            <option value="CH 2: BRAVO SQUAD">CH 2: BRAVO SQUAD</option>
            <option value="CH 3: TACTICAL GUARD">CH 3: TACTICAL GUARD</option>
            <option value="CH 4: AIR / JTAC NET">CH 4: AIR / JTAC NET</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: PTT Transmitter & Audio VU */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-black/40 p-4 rounded border border-tactical-olive/40 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-tactical-muted">TRANSMIT STATUS:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                  isTransmitting
                    ? 'bg-red-900 text-red-200 border border-red-500 animate-pulse'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                }`}
              >
                {isTransmitting ? `🔴 TRANSMITTING (${txDurationSec.toFixed(1)}s)` : '🟢 STANDBY / MONITOR'}
              </span>
            </div>

            {/* Simulated Live Audio VU Meter / Waveform */}
            <div className="h-16 bg-black/70 rounded border border-tactical-olive/60 flex items-center justify-center px-4 gap-1 overflow-hidden">
              {Array.from({ length: 28 }).map((_, i) => {
                const height = isTransmitting
                  ? Math.sin((i + Date.now() / 150) * 0.8) * 24 + 28
                  : Math.max(4, Math.random() * 8);

                return (
                  <div
                    key={i}
                    className={`w-1 rounded-sm transition-all duration-75 ${
                      isTransmitting ? (i > 22 ? 'bg-red-500' : i > 16 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-tactical-olive/40'
                    }`}
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
          </div>

          {/* Large PTT Push-To-Talk Button */}
          <div className="flex flex-col items-center">
            <button
              disabled={readOnly}
              onMouseDown={handleStartPTT}
              onMouseUp={handleStopPTT}
              onTouchStart={handleStartPTT}
              onTouchEnd={handleStopPTT}
              className={`w-full py-5 rounded-lg border-2 font-bold text-sm tracking-widest transition-all shadow-xl select-none flex flex-col items-center justify-center gap-1 ${
                isTransmitting
                  ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_#ef4444]'
                  : 'bg-tactical-olive hover:bg-tactical-olive/80 border-amber-500 text-tactical-parchment'
              }`}
            >
              <span className="text-xl">🎙️</span>
              <span>{isTransmitting ? 'TRANSMITTING VOICE BURST' : 'PRESS & HOLD PTT TO TALK'}</span>
              <span className="text-[10px] font-normal text-tactical-parchment/80">
                Encrypted Opus 32kbps Burst over LoRa MTU
              </span>
            </button>
          </div>

          {/* Volume and Squelch Knobs */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-tactical-olive/30 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-tactical-muted">VOLUME:</span>
                <span className="font-bold text-amber-400">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-tactical-muted">SQUELCH:</span>
                <span className="font-bold text-amber-400">{squelchDb} dBm</span>
              </div>
              <input
                type="range"
                min="-120"
                max="-70"
                value={squelchDb}
                onChange={(e) => setSquelchDb(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right Column: 1-Tap Quick-Shout Buttons & Burst Log */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-tactical-muted font-bold">
                1-TAP ACOUSTIC QUICK-SHOUTS (SUB-SECOND TRANSMISSION):
              </span>
              <span className="text-[10px] text-tactical-muted">CRC16 ARQ CONFIRMATION</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {QUICK_SHOUTS.map((shout) => (
                <button
                  key={shout.id}
                  disabled={readOnly}
                  onClick={() => handleSendQuickShout(shout)}
                  className={`p-2.5 rounded border text-center transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center ${shout.color}`}
                >
                  <span className="text-[10px] opacity-75 font-mono">{shout.code}</span>
                  <span className="font-bold text-xs mt-0.5 leading-tight">{shout.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Voice Burst Event Log */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="text-tactical-muted font-bold">INTERCOM TRAFFIC LOG:</span>
              <span className="text-[10px] text-amber-400">{burstLogs.length} EVENTS RECORDED</span>
            </div>

            <div className="bg-black/50 rounded border border-tactical-olive/40 divide-y divide-tactical-olive/30 max-h-48 overflow-y-auto">
              {burstLogs.map((entry) => (
                <div key={entry.id} className="p-2 flex items-center justify-between text-xs hover:bg-black/40">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-tactical-muted">{entry.time}</span>
                    <span className="px-1.5 py-0.5 rounded bg-tactical-olive/40 text-[10px] font-bold text-amber-300">
                      {entry.callsign} ({entry.squad})
                    </span>
                    <span className="text-tactical-parchment font-semibold">{entry.text}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-tactical-muted">{entry.durationMs}ms</span>
                    <button
                      onClick={() => {}}
                      className="px-1.5 py-0.5 bg-black/60 hover:bg-tactical-olive/50 border border-tactical-olive/40 rounded text-[10px] text-tactical-muted"
                      title="Replay Audio"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
