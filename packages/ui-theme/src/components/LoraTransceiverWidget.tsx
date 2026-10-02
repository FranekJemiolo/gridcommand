import React, { useState, useEffect } from 'react';
import { WearableSubHUDWidget } from './WearableSubHUDWidget';

export interface LoraTransceiverWidgetProps {
  initialFrequencyMhz?: number;
  initialSpreadingFactor?: number;
  onSendTestFrame?: () => void;
  readOnly?: boolean;
}

export const LoraTransceiverWidget: React.FC<LoraTransceiverWidgetProps> = ({
  initialFrequencyMhz = 868.1,
  initialSpreadingFactor = 10,
  onSendTestFrame,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'transceiver' | 'calibration' | 'wearable'>('transceiver');
  const [connectionMode, setConnectionMode] = useState<'serial' | 'ble' | 'simulated'>('simulated');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [frequencyMhz, setFrequencyMhz] = useState<number>(initialFrequencyMhz);
  const [spreadingFactor, setSpreadingFactor] = useState<number>(initialSpreadingFactor);
  const [txPowerDbm, setTxPowerDbm] = useState<number>(22);
  const [canopyDistanceMeters, setCanopyDistanceMeters] = useState<number>(2500);

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);
  const [calibrationSamples, setCalibrationSamples] = useState<number>(48);
  const [calibrationQuality, setCalibrationQuality] = useState<number>(94);
  const [currentPitch, setCurrentPitch] = useState<number>(3.2);
  const [currentRoll, setCurrentRoll] = useState<number>(-1.8);
  const [trueHeading, setTrueHeading] = useState<number>(342.5);

  // Simulated live packet frames
  const [packetFrames, setPacketFrames] = useState<
    Array<{ id: number; time: string; type: 'TX' | 'RX'; size: number; crc: string; snr: string; rssi: string }>
  >([
    { id: 101, time: '22:34:10', type: 'RX', size: 237, crc: '0x8F4A (OK)', snr: '+7.2 dB', rssi: '-104 dBm' },
    { id: 102, time: '22:34:12', type: 'TX', size: 184, crc: '0x3E11 (OK)', snr: '+6.8 dB', rssi: '-106 dBm' },
    { id: 103, time: '22:34:15', type: 'RX', size: 237, crc: '0x99A2 (OK)', snr: '+5.9 dB', rssi: '-109 dBm' },
  ]);

  // Periodic simulated packet ping
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const newFrame = {
        id: Date.now() % 1000,
        time: timeStr,
        type: (Math.random() > 0.4 ? 'RX' : 'TX') as 'RX' | 'TX',
        size: Math.floor(Math.random() * 50) + 180,
        crc: '0x' + Math.floor(Math.random() * 65535).toString(16).toUpperCase() + ' (OK)',
        snr: `+${(Math.random() * 4 + 4).toFixed(1)} dB`,
        rssi: `-${Math.floor(Math.random() * 10 + 102)} dBm`,
      };
      setPacketFrames((prev) => [newFrame, ...prev.slice(0, 5)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isConnected]);

  // Calculate theoretical Link Margin
  const freeSpaceLoss = 20 * Math.log10(canopyDistanceMeters / 1000 || 0.001) + 20 * Math.log10(frequencyMhz) + 32.44;
  const canopyLoss = Math.min(canopyDistanceMeters, 250) * 0.08;
  const totalLoss = freeSpaceLoss + canopyLoss;
  const sensitivity = -112 - spreadingFactor * 2; // approx -132 dBm for SF10
  const rssiEstimate = txPowerDbm + 4.0 - totalLoss;
  const linkMargin = rssiEstimate - sensitivity;

  const triggerAutoCalibration = () => {
    setIsCalibrating(true);
    let count = 0;
    const interval = setInterval(() => {
      count += 8;
      setCalibrationSamples((prev) => prev + 8);
      if (count >= 40) {
        clearInterval(interval);
        setIsCalibrating(false);
        setCalibrationQuality(98);
      }
    }, 200);
  };

  return (
    <div
      style={{
        backgroundColor: '#0c120c',
        border: '1px solid #3b5323',
        borderRadius: '6px',
        color: '#e5e7eb',
        fontFamily: 'monospace',
        padding: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #2d401a',
          paddingBottom: '10px',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>📡</span>
          <div>
            <div style={{ fontWeight: 800, color: '#f5b700', letterSpacing: '1px', fontSize: '15px' }}>
              HARDWARE INTEGRATION &amp; LORA BRIDGE
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
              LilyGO T-Echo SX1262 Transceiver • Sub-GHz Wet Canopy Mesh • Wearable Sub-HUD
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#131b13', padding: '3px', borderRadius: '4px' }}>
          <button
            onClick={() => setActiveTab('transceiver')}
            style={{
              background: activeTab === 'transceiver' ? '#2d401a' : 'transparent',
              color: activeTab === 'transceiver' ? '#39ff14' : '#9ca3af',
              border: 'none',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '3px',
            }}
          >
            📻 LORA SX1262
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            style={{
              background: activeTab === 'calibration' ? '#2d401a' : 'transparent',
              color: activeTab === 'calibration' ? '#f5b700' : '#9ca3af',
              border: 'none',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '3px',
            }}
          >
            🧭 SENSOR FUSION ({calibrationQuality}%)
          </button>
          <button
            onClick={() => setActiveTab('wearable')}
            style={{
              background: activeTab === 'wearable' ? '#2d401a' : 'transparent',
              color: activeTab === 'wearable' ? '#38bdf8' : '#9ca3af',
              border: 'none',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: '3px',
            }}
          >
            ⌚ WEARABLE HUD
          </button>
        </div>
      </div>

      {activeTab === 'transceiver' && (
        <div>
          {/* Connection status card */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#111911',
              border: '1px solid #2d401a',
              borderRadius: '4px',
              padding: '10px 14px',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isConnected ? '#39ff14' : '#ef4444',
                  boxShadow: isConnected ? '0 0 8px #39ff14' : 'none',
                }}
              />
              <div>
                <span style={{ fontWeight: 800, color: '#ffffff', fontSize: '12px' }}>
                  {isConnected ? 'NODE ATTACHED: LilyGO T-Echo SX1262' : 'DISCONNECTED'}
                </span>
                <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>
                  Firmware: Meshtastic v2.5.4 • EU868
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <select
                value={connectionMode}
                onChange={(e) => setConnectionMode(e.target.value as any)}
                style={{
                  backgroundColor: '#1b251b',
                  color: '#e5e7eb',
                  border: '1px solid #3b5323',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                }}
              >
                <option value="simulated">Hardware Emulation</option>
                <option value="serial">Web Serial (USB-C)</option>
                <option value="ble">Web Bluetooth (BLE)</option>
              </select>
              <button
                onClick={() => setIsConnected(!isConnected)}
                style={{
                  backgroundColor: isConnected ? '#451a03' : '#14532d',
                  color: isConnected ? '#fca5a5' : '#86efac',
                  border: '1px solid #374151',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                {isConnected ? 'Disconnect' : 'Connect Node'}
              </button>
            </div>
          </div>

          {/* Radio parameters & RF Link Budget grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              marginBottom: '14px',
            }}
          >
            <div style={{ backgroundColor: '#111711', border: '1px solid #223318', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>CARRIER FREQUENCY</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f5b700' }}>{frequencyMhz.toFixed(3)} MHz</div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>EU868 License-Free Sub-GHz</div>
            </div>

            <div style={{ backgroundColor: '#111711', border: '1px solid #223318', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>SPREADING FACTOR</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#38bdf8' }}>
                SF{spreadingFactor} <span style={{ fontSize: '11px', color: '#9ca3af' }}>(LongFast)</span>
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>Bandwidth: 125 kHz • CR: 4/5</div>
            </div>

            <div style={{ backgroundColor: '#111711', border: '1px solid #223318', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>TX POWER / MTU</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#39ff14' }}>
                +{txPowerDbm} dBm <span style={{ fontSize: '11px', color: '#9ca3af' }}>(237B)</span>
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>SX1262 Max Legal Limit</div>
            </div>

            <div style={{ backgroundColor: '#111711', border: '1px solid #223318', borderRadius: '4px', padding: '10px' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>ESTIMATED CANOPY REACH</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: linkMargin > 0 ? '#39ff14' : '#ef4444' }}>
                {(canopyDistanceMeters / 1000).toFixed(1)} km
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280' }}>
                Link Margin: <span style={{ color: '#86efac', fontWeight: 'bold' }}>+{linkMargin.toFixed(1)} dB</span>
              </div>
            </div>
          </div>

          {/* Interactive RF Distance & Canopy Slider */}
          <div
            style={{
              backgroundColor: '#0d150d',
              border: '1px solid #1f2e14',
              borderRadius: '4px',
              padding: '10px 14px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '6px' }}>
              <span style={{ color: '#f5b700', fontWeight: 'bold' }}>FOREST CANOPY PROPAGATION MODEL:</span>
              <span style={{ color: '#39ff14' }}>
                Distance: {canopyDistanceMeters}m | Path Loss: {totalLoss.toFixed(1)} dB | Est. RSSI:{' '}
                {rssiEstimate.toFixed(1)} dBm
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={6000}
              step={100}
              value={canopyDistanceMeters}
              onChange={(e) => setCanopyDistanceMeters(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: '#39ff14', cursor: 'pointer' }}
            />
          </div>

          {/* Live Packet Log */}
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#9ca3af',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>SUB-GHZ 237-BYTE PACKET LOG (CRDT DELTAS)</span>
              <span style={{ color: '#68d391' }}>CRC16 CCITT Active</span>
            </div>

            <div style={{ backgroundColor: '#070a07', border: '1px solid #1f2e14', borderRadius: '4px', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#131e13', color: '#9ca3af', borderBottom: '1px solid #2d401a' }}>
                    <th style={{ padding: '6px 10px' }}>TIME</th>
                    <th style={{ padding: '6px 10px' }}>DIR</th>
                    <th style={{ padding: '6px 10px' }}>FRAME SIZE</th>
                    <th style={{ padding: '6px 10px' }}>CHECKSUM</th>
                    <th style={{ padding: '6px 10px' }}>SNR</th>
                    <th style={{ padding: '6px 10px' }}>RSSI</th>
                  </tr>
                </thead>
                <tbody>
                  {packetFrames.map((frame) => (
                    <tr key={frame.id} style={{ borderBottom: '1px solid #141f14' }}>
                      <td style={{ padding: '6px 10px', color: '#9ca3af' }}>{frame.time}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span
                          style={{
                            backgroundColor: frame.type === 'RX' ? '#14532d' : '#854d0e',
                            color: '#ffffff',
                            padding: '1px 5px',
                            borderRadius: '2px',
                            fontWeight: 700,
                            fontSize: '9px',
                          }}
                        >
                          {frame.type}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#e5e7eb' }}>{frame.size} Bytes (MTU 237)</td>
                      <td style={{ padding: '6px 10px', color: '#39ff14' }}>{frame.crc}</td>
                      <td style={{ padding: '6px 10px', color: '#38bdf8' }}>{frame.snr}</td>
                      <td style={{ padding: '6px 10px', color: '#f5b700' }}>{frame.rssi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calibration' && (
        <div>
          {/* Compass Readouts & Artificial Horizon */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            {/* Heading dial */}
            <div
              style={{
                backgroundColor: '#111711',
                border: '1px solid #223318',
                borderRadius: '4px',
                padding: '14px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '4px' }}>TRUE BEARING (BALTIC +6.2° DECL.)</div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#39ff14' }}>{trueHeading.toFixed(1)}°</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f5b700' }}>NNW (342°)</div>
            </div>

            {/* Pitch & Roll */}
            <div
              style={{
                backgroundColor: '#111711',
                border: '1px solid #223318',
                borderRadius: '4px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '8px' }}>TILT SENSOR ATTITUDE (PITCH/ROLL)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>PITCH (ELEVATION):</span>
                <span style={{ color: '#38bdf8', fontWeight: 800 }}>+{currentPitch}°</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#9ca3af', fontSize: '11px' }}>ROLL (BANK):</span>
                <span style={{ color: '#38bdf8', fontWeight: 800 }}>{currentRoll}°</span>
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '10px' }}>
                Tilt-compensation algorithm: Trigonometric projection active.
              </div>
            </div>
          </div>

          {/* Hard-Iron Calibration Box */}
          <div
            style={{
              backgroundColor: '#090e09',
              border: '1px solid #1f2e14',
              borderRadius: '4px',
              padding: '14px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <span style={{ fontWeight: 800, color: '#f5b700', fontSize: '12px' }}>
                  MAGNETOMETER RIG AUTO-CALIBRATION
                </span>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                  Samples Collected: {calibrationSamples} | Calibration Quality:{' '}
                  <span style={{ color: '#39ff14', fontWeight: 'bold' }}>{calibrationQuality}% (EXCELLENT)</span>
                </div>
              </div>

              <button
                onClick={triggerAutoCalibration}
                disabled={isCalibrating}
                style={{
                  backgroundColor: isCalibrating ? '#854d0e' : '#22543d',
                  color: '#ffffff',
                  border: '1px solid #3b5323',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  cursor: isCalibrating ? 'wait' : 'pointer',
                }}
              >
                {isCalibrating ? '⏳ SAMPLING SWEEP...' : '🔄 RUN FIGURE-8 CALIBRATION'}
              </button>
            </div>

            {/* Quality meter */}
            <div
              style={{
                height: '8px',
                backgroundColor: '#1f2937',
                borderRadius: '4px',
                overflow: 'hidden',
                margin: '10px 0',
              }}
            >
              <div
                style={{
                  width: `${calibrationQuality}%`,
                  backgroundColor: calibrationQuality >= 80 ? '#22c55e' : '#f5b700',
                  height: '100%',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px' }}>
              <div style={{ color: '#9ca3af' }}>Hard-Iron Bx: <span style={{ color: '#e5e7eb' }}>+24.8 μT</span></div>
              <div style={{ color: '#9ca3af' }}>Hard-Iron By: <span style={{ color: '#e5e7eb' }}>-15.2 μT</span></div>
              <div style={{ color: '#9ca3af' }}>Hard-Iron Bz: <span style={{ color: '#e5e7eb' }}>+39.7 μT</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'wearable' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '10px', textAlign: 'center' }}>
            Interactive Watch Face Preview (WearOS 4.0 / Apple Watch Series 10 Tactical Format)
          </div>
          <WearableSubHUDWidget
            targetName="Bunker Pachołek Moraine Crest"
            targetCode="ECHO-1"
            distanceMeters={142}
            relativeBearingDegrees={330}
            clockPosition={11}
            cardinal="NW"
            objectiveStatus="ACTIVE"
            operatorCallsign="Viper-1"
            squad="ALPHA"
            heartRateBpm={138}
            loraRssiDbm={-104}
          />
        </div>
      )}
    </div>
  );
};
