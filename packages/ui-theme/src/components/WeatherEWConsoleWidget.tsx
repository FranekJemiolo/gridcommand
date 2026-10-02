import React, { useState } from 'react';

export interface EWJammingZoneState {
  id: string;
  name: string;
  lat: number;
  lon: number;
  radiusMeters: number;
  frequencyBand: 'GNSS_L1' | 'LORA_868' | 'BLE_2400' | 'FULL_SPECTRUM';
  jammerPowerDbm: number;
  active: boolean;
}

export interface WeatherEWConsoleWidgetProps {
  initialCondition?: 'CLEAR' | 'OVERCAST' | 'RAIN' | 'HEAVY_RAIN' | 'FOG' | 'SMOKE_SCREEN';
  onWeatherChange?: (condition: string, windSpeed: number, windDir: number) => void;
  onDeploySmoke?: (lat: number, lon: number, radius: number) => void;
  onToggleJammer?: (zoneId: string, active: boolean) => void;
  readOnly?: boolean;
}

export const WeatherEWConsoleWidget: React.FC<WeatherEWConsoleWidgetProps> = ({
  initialCondition = 'OVERCAST',
  onWeatherChange,
  onDeploySmoke,
  onToggleJammer,
  readOnly = false,
}) => {
  const [condition, setCondition] = useState<string>(initialCondition);
  const [ambientTempC, setAmbientTempC] = useState<number>(14);
  const [windSpeedMps, setWindSpeedMps] = useState<number>(6.5);
  const [windDirectionDeg, setWindDirectionDeg] = useState<number>(240); // WSW wind
  const [activeTab, setActiveTab] = useState<'weather' | 'smoke' | 'ew'>('weather');

  // Smoke screen state
  const [smokeActive, setSmokeActive] = useState<boolean>(true);
  const [smokeDurationSec, setSmokeDurationSec] = useState<number>(240);
  const [smokeRadiusMeters, setSmokeRadiusMeters] = useState<number>(85);

  // EW Jamming zones
  const [jammerZones, setJammerZones] = useState<EWJammingZoneState[]>([
    {
      id: 'ew_moraine_alpha',
      name: 'KRASUKHA-4 TACTICAL (GPS/GNSS L1 DENIAL)',
      lat: 54.4082,
      lon: 18.5395,
      radiusMeters: 450,
      frequencyBand: 'GNSS_L1',
      jammerPowerDbm: 43,
      active: true,
    },
    {
      id: 'ew_ridge_bravo',
      name: 'SUTER-B SUB-GHZ BARRAGE (868MHZ MESH)',
      lat: 54.414,
      lon: 18.532,
      radiusMeters: 300,
      frequencyBand: 'LORA_868',
      jammerPowerDbm: 38,
      active: false,
    },
  ]);

  // Derived metrics based on weather condition
  const getConditionMetrics = () => {
    switch (condition) {
      case 'CLEAR':
        return { speedMod: 1.0, rfLoss: 0.0, visibilityKm: 12.0, status: 'NOMINAL' };
      case 'RAIN':
        return { speedMod: 0.8, rfLoss: 0.04, visibilityKm: 4.5, status: 'DEGRADED' };
      case 'HEAVY_RAIN':
        return { speedMod: 0.65, rfLoss: 0.08, visibilityKm: 1.5, status: 'SEVERE' };
      case 'FOG':
        return { speedMod: 0.75, rfLoss: 0.02, visibilityKm: 0.4, status: 'POOR_LOS' };
      case 'SMOKE_SCREEN':
        return { speedMod: 0.7, rfLoss: 0.01, visibilityKm: 0.1, status: 'SMOKE_BLANKET' };
      default: // OVERCAST
        return { speedMod: 0.95, rfLoss: 0.01, visibilityKm: 8.0, status: 'GOOD' };
    }
  };

  const metrics = getConditionMetrics();

  const handleConditionSelect = (cond: string) => {
    setCondition(cond);
    if (onWeatherChange) {
      onWeatherChange(cond, windSpeedMps, windDirectionDeg);
    }
  };

  const handleToggleZone = (id: string) => {
    setJammerZones((prev) =>
      prev.map((z) => {
        if (z.id === id) {
          const nextState = !z.active;
          if (onToggleJammer) onToggleJammer(id, nextState);
          return { ...z, active: nextState };
        }
        return z;
      })
    );
  };

  return (
    <div className="bg-tactical-surface border border-tactical-olive rounded-lg p-5 font-mono text-tactical-parchment shadow-xl">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-tactical-olive/60 pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌪️</span>
          <div>
            <h3 className="font-bold text-base text-amber-400 tracking-wide">
              BATTLESPACE ENVIRONMENT & EW CONSOLE
            </h3>
            <p className="text-xs text-tactical-muted">
              Dynamic Weather Simulation, Smoke Drift Modeling & Electronic Warfare (EW) Jamming
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded border border-tactical-olive/40 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('weather')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'weather'
                ? 'bg-tactical-olive text-tactical-parchment'
                : 'text-tactical-muted hover:text-tactical-parchment'
            }`}
          >
            WEATHER & WIND
          </button>
          <button
            onClick={() => setActiveTab('smoke')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'smoke'
                ? 'bg-tactical-olive text-tactical-parchment'
                : 'text-tactical-muted hover:text-tactical-parchment'
            }`}
          >
            SMOKE DISPERSION
          </button>
          <button
            onClick={() => setActiveTab('ew')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              activeTab === 'ew'
                ? 'bg-tactical-olive text-tactical-parchment'
                : 'text-tactical-muted hover:text-tactical-parchment'
            }`}
          >
            EW JAMMING ({jammerZones.filter((z) => z.active).length} ACTIVE)
          </button>
        </div>
      </div>

      {/* Tab 1: Weather & Atmospheric Wind */}
      {activeTab === 'weather' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-tactical-muted block mb-2 font-bold">
              METEOROLOGICAL CONDITIONS (SECTOR GDANSK-WEST / MORAINE):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { id: 'CLEAR', label: '☀️ CLEAR', desc: 'Full LOS, 0dB loss' },
                { id: 'OVERCAST', label: '☁️ OVERCAST', desc: 'Normal ops' },
                { id: 'RAIN', label: '🌧️ RAIN', desc: '-20% mobility' },
                { id: 'HEAVY_RAIN', label: '⛈️ HEAVY RAIN', desc: '+0.08dB/m RF loss' },
                { id: 'FOG', label: '🌫️ FOG', desc: '400m visual limit' },
                { id: 'SMOKE_SCREEN', label: '💨 SMOKE', desc: '100m IR cutoff' },
              ].map((item) => (
                <button
                  key={item.id}
                  disabled={readOnly}
                  onClick={() => handleConditionSelect(item.id)}
                  className={`p-2.5 rounded border text-left transition-all ${
                    condition === item.id
                      ? 'bg-amber-950/60 border-amber-400 text-amber-300 shadow-md'
                      : 'bg-black/40 border-tactical-olive/40 text-tactical-muted hover:border-tactical-olive hover:text-tactical-parchment'
                  }`}
                >
                  <div className="font-bold text-xs">{item.label}</div>
                  <div className="text-[10px] text-tactical-muted mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Wind & Temperature Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/30 p-3 rounded border border-tactical-olive/40">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-tactical-muted">WIND VELOCITY:</span>
                <span className="font-bold text-amber-400">{windSpeedMps} m/s ({Math.round(windSpeedMps * 3.6)} km/h)</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="0.5"
                disabled={readOnly}
                value={windSpeedMps}
                onChange={(e) => setWindSpeedMps(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-tactical-muted">Modulates smoke drift & thermal signature</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-tactical-muted">WIND DIRECTION:</span>
                <span className="font-bold text-amber-400">{windDirectionDeg}° (FROM WSW)</span>
              </div>
              <input
                type="range"
                min="0"
                max="355"
                step="5"
                disabled={readOnly}
                value={windDirectionDeg}
                onChange={(e) => setWindDirectionDeg(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-tactical-muted">Bearing smoke expands downwind</span>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-tactical-muted">AMBIENT TEMPERATURE:</span>
                <span className="font-bold text-amber-400">{ambientTempC}°C</span>
              </div>
              <input
                type="range"
                min="-10"
                max="35"
                step="1"
                disabled={readOnly}
                value={ambientTempC}
                onChange={(e) => setAmbientTempC(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-tactical-muted">Affects FLIR thermal contrast delta</span>
            </div>
          </div>

          {/* Telemetry Impact Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-black/50 p-2.5 rounded border border-tactical-olive/40">
              <div className="text-[10px] text-tactical-muted">INFANTRY MOBILITY</div>
              <div className="text-lg font-bold text-emerald-400">{Math.round(metrics.speedMod * 100)}%</div>
              <div className="text-[9px] text-tactical-muted">Max sprint 18 km/h</div>
            </div>
            <div className="bg-black/50 p-2.5 rounded border border-tactical-olive/40">
              <div className="text-[10px] text-tactical-muted">RF WET CANOPY LOSS</div>
              <div className="text-lg font-bold text-amber-400">+{metrics.rfLoss} dB/m</div>
              <div className="text-[9px] text-tactical-muted">Sub-GHz foliage margin</div>
            </div>
            <div className="bg-black/50 p-2.5 rounded border border-tactical-olive/40">
              <div className="text-[10px] text-tactical-muted">OPTICAL VISIBILITY</div>
              <div className="text-lg font-bold text-cyan-400">{metrics.visibilityKm} km</div>
              <div className="text-[9px] text-tactical-muted">Line-of-Sight cutoff</div>
            </div>
            <div className="bg-black/50 p-2.5 rounded border border-tactical-olive/40">
              <div className="text-[10px] text-tactical-muted">SECTOR ADVISORY</div>
              <div className="text-lg font-bold text-amber-300">{metrics.status}</div>
              <div className="text-[9px] text-tactical-muted">STANAG Met Advisory</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Smoke Screen Dispersion Modeling */}
      {activeTab === 'smoke' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-black/40 p-3 rounded border border-tactical-olive/40 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-bold text-amber-300 text-sm">HEXACHLOROETHANE (HCE) SMOKE SCREEN</span>
              </div>
              <p className="text-xs text-tactical-muted mt-1">
                Visual & Near-IR obscuration. Calculates downwind drift offset vector: ({Math.round(windSpeedMps * 4)}m drift at {windDirectionDeg}°).
              </p>
            </div>

            <button
              disabled={readOnly}
              onClick={() => {
                setSmokeActive(!smokeActive);
                if (!smokeActive && onDeploySmoke) {
                  onDeploySmoke(54.4095, 18.541, smokeRadiusMeters);
                }
              }}
              className={`px-4 py-2 rounded font-bold text-xs border transition-colors ${
                smokeActive
                  ? 'bg-amber-600 hover:bg-amber-500 text-black border-amber-400'
                  : 'bg-tactical-olive/50 hover:bg-tactical-olive text-tactical-parchment border-tactical-olive'
              }`}
            >
              {smokeActive ? '💨 DETONATE NEW CANISTER' : '💨 DEPLOY SMOKE SCREEN'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/30 p-3 rounded border border-tactical-olive/40 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-tactical-muted">BURST RADIUS:</span>
                  <span className="font-bold text-amber-400">{smokeRadiusMeters} meters</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="200"
                  step="5"
                  value={smokeRadiusMeters}
                  onChange={(e) => setSmokeRadiusMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-tactical-muted">EFFECTIVE DURATION:</span>
                  <span className="font-bold text-amber-400">{smokeDurationSec} seconds ({(smokeDurationSec / 60).toFixed(1)} min)</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="600"
                  step="30"
                  value={smokeDurationSec}
                  onChange={(e) => setSmokeDurationSec(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="text-[11px] text-tactical-muted pt-2 border-t border-tactical-olive/30 space-y-1">
                <div>• Thermal imaging attenuation: <strong>-14 dB</strong> (Blocks FLIR generation 2/3)</div>
                <div>• Laser designator dispersion: <strong>Diffused & Scattered</strong></div>
                <div>• Infantry within plume: <strong>Speed reduced by 30%</strong></div>
              </div>
            </div>

            {/* Visual smoke plume dispersion diagram */}
            <div className="h-48 bg-black/60 rounded border border-tactical-olive/40 relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#4ade80_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Origin canister */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
                <div className="w-3 h-3 rounded-full bg-red-600 border border-white" />
                <span className="text-[9px] text-red-400 font-bold mt-1">CANISTER #1</span>
              </div>

              {/* Drift plume ellipse */}
              <div
                className="absolute z-0 rounded-full border border-amber-400/80 bg-amber-400/20 backdrop-blur-sm transition-all duration-300"
                style={{
                  width: `${smokeRadiusMeters * 1.5}px`,
                  height: `${smokeRadiusMeters * 0.9}px`,
                  transform: `rotate(${windDirectionDeg}deg) translateX(${windSpeedMps * 4}px)`,
                }}
              />

              <div className="absolute bottom-2 left-2 text-[10px] text-tactical-muted">
                WIND DRIFT VECTOR: {windSpeedMps} m/s @ {windDirectionDeg}°
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Electronic Warfare (EW) Jamming Zones */}
      {activeTab === 'ew' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-black/40 p-2.5 rounded border border-tactical-olive/40 text-xs">
            <span className="text-tactical-muted">
              Active EW emitters degrade GPS positional fix and cause RF packet drop over designated zones.
            </span>
            <span className="text-amber-400 font-bold">
              {jammerZones.filter((z) => z.active).length} / {jammerZones.length} EMITTERS ACTIVE
            </span>
          </div>

          <div className="space-y-2">
            {jammerZones.map((zone) => (
              <div
                key={zone.id}
                className={`p-3 rounded border transition-all ${
                  zone.active
                    ? 'bg-red-950/30 border-red-500/80 shadow-lg'
                    : 'bg-black/30 border-tactical-olive/40 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        zone.active ? 'bg-red-500 animate-pulse' : 'bg-tactical-muted'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-xs text-white">{zone.name}</div>
                      <div className="text-[10px] text-tactical-muted">
                        RADIUS: {zone.radiusMeters}m | POWER: {zone.jammerPowerDbm} dBm | BAND: {zone.frequencyBand}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={readOnly}
                      onClick={() => handleToggleZone(zone.id)}
                      className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${
                        zone.active
                          ? 'bg-red-900/60 hover:bg-red-800 text-red-200 border-red-500'
                          : 'bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 border-emerald-600'
                      }`}
                    >
                      {zone.active ? 'DISABLE EMITTER' : 'ACTIVATE JAMMER'}
                    </button>
                  </div>
                </div>

                {zone.active && (
                  <div className="mt-2.5 pt-2 border-t border-red-900/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-black/40 p-1.5 rounded">
                      <span className="text-[9px] text-tactical-muted block">GPS ACCURACY JITTER</span>
                      <span className="font-bold text-amber-400">±25.0 to 45.0m</span>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded">
                      <span className="text-[9px] text-tactical-muted block">RF PACKET LOSS</span>
                      <span className="font-bold text-red-400">82.5% DROP RATE</span>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded">
                      <span className="text-[9px] text-tactical-muted block">EPIRB / SOS RELIABILITY</span>
                      <span className="font-bold text-amber-400">DEGRADED (BURST RETRY)</span>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded">
                      <span className="text-[9px] text-tactical-muted block">RECOMMENDED COUNTERMEASURE</span>
                      <span className="font-bold text-emerald-400">LORA SF12 + FHSS</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
