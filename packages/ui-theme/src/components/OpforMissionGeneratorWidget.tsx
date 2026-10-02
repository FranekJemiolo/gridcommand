import React, { useState } from 'react';

export interface OpforBotDisplayState {
  id: string;
  callsign: string;
  role: 'SCOUT' | 'RIFLEMAN' | 'SENTRY' | 'COMMANDER';
  lat: number;
  lon: number;
  healthPercent: number;
  state: 'PATROLLING' | 'SEARCHING' | 'ENGAGING' | 'ELIMINATED';
  currentWaypoint: number;
  totalWaypoints: number;
  targetCallsign?: string;
}

export interface OpforMissionGeneratorWidgetProps {
  onGenerateMission?: (type: 'RAID' | 'PATROL' | 'DEFENSE' | 'AMBUSH', sector: string, difficulty: string) => void;
  onExportCoT?: () => void;
  readOnly?: boolean;
}

const DEFAULT_OPFOR_FLEET: OpforBotDisplayState[] = [
  {
    id: 'opfor_red_1',
    callsign: 'RED-SCOUT-1',
    role: 'SCOUT',
    lat: 54.414,
    lon: 18.532,
    healthPercent: 100,
    state: 'PATROLLING',
    currentWaypoint: 1,
    totalWaypoints: 4,
  },
  {
    id: 'opfor_red_2',
    callsign: 'RED-SENTRY-2',
    role: 'SENTRY',
    lat: 54.4085,
    lon: 18.543,
    healthPercent: 85,
    state: 'ENGAGING',
    currentWaypoint: 2,
    totalWaypoints: 3,
    targetCallsign: 'VIPER-1',
  },
  {
    id: 'opfor_red_3',
    callsign: 'RED-RIFLE-3',
    role: 'RIFLEMAN',
    lat: 54.402,
    lon: 18.549,
    healthPercent: 100,
    state: 'SEARCHING',
    currentWaypoint: 0,
    totalWaypoints: 4,
  },
  {
    id: 'opfor_red_4',
    callsign: 'RED-LEADER',
    role: 'COMMANDER',
    lat: 54.411,
    lon: 18.538,
    healthPercent: 100,
    state: 'PATROLLING',
    currentWaypoint: 3,
    totalWaypoints: 4,
  },
];

export const OpforMissionGeneratorWidget: React.FC<OpforMissionGeneratorWidgetProps> = ({
  onGenerateMission,
  onExportCoT,
  readOnly = false,
}) => {
  const [missionType, setMissionType] = useState<'RAID' | 'PATROL' | 'DEFENSE' | 'AMBUSH'>('RAID');
  const [selectedSector, setSelectedSector] = useState<string>('GDANSK_TRICITY');
  const [difficulty, setDifficulty] = useState<string>('ASSAULT');
  const [opforFleet, setOpforFleet] = useState<OpforBotDisplayState[]>(DEFAULT_OPFOR_FLEET);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationSummary, setGenerationSummary] = useState<string>(
    'Procedural RAID scenario active over Gdańsk Moraine Hills (34U DA 3512 2894). 4x autonomous OPFOR bots patrolling objectives.'
  );

  const handleProceduralGenerate = () => {
    if (readOnly) return;
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      const missionNames = {
        RAID: 'Operation Iron Moraine',
        PATROL: 'Operation Baltic Vigilance',
        DEFENSE: 'Operation Redoubt Citadel',
        AMBUSH: 'Operation Amber Shadow',
      };

      setGenerationSummary(
        `Generated ${missionNames[missionType]} (${difficulty}) over ${selectedSector.replace('_', ' ')}. Synthesized 6 DAG objectives and ${
          difficulty === 'RECON' ? 3 : difficulty === 'ASSAULT' ? 4 : 6
        } autonomous OPFOR bots with dynamic waypoints.`
      );

      if (onGenerateMission) {
        onGenerateMission(missionType, selectedSector, difficulty);
      }
    }, 400);
  };

  const handleTickSimulation = () => {
    setOpforFleet((prev) =>
      prev.map((bot) => {
        if (bot.state === 'ELIMINATED') return bot;
        const nextWp = (bot.currentWaypoint + 1) % bot.totalWaypoints;
        const jitterLat = (Math.random() * 0.001 - 0.0005);
        const jitterLon = (Math.random() * 0.001 - 0.0005);

        return {
          ...bot,
          lat: bot.lat + jitterLat,
          lon: bot.lon + jitterLon,
          currentWaypoint: nextWp,
          state: Math.random() > 0.7 ? 'ENGAGING' : 'PATROLLING',
          targetCallsign: Math.random() > 0.7 ? 'VIPER-1' : undefined,
        };
      })
    );
  };

  return (
    <div className="bg-tactical-surface border border-tactical-olive rounded-lg p-5 font-mono text-tactical-parchment shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-tactical-olive/60 pb-3 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <h3 className="font-bold text-base text-amber-400 tracking-wide">
              OPFOR RED-TEAM BOT FLEET & SCENARIO GENERATOR
            </h3>
            <p className="text-xs text-tactical-muted">
              Autonomous Patrol AI, Procedural Balanced DAG Generator & ATAK CoT Ingress
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTickSimulation}
            className="px-3 py-1 bg-tactical-olive/60 hover:bg-tactical-olive text-tactical-parchment border border-tactical-olive rounded text-xs font-bold"
          >
            ⏱️ TICK OPFOR AI
          </button>
          {onExportCoT && (
            <button
              onClick={onExportCoT}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/60 rounded text-xs font-bold"
            >
              🌐 EXPORT ATAK CoT
            </button>
          )}
        </div>
      </div>

      {/* Generator Configuration Panel */}
      <div className="bg-black/40 p-4 rounded border border-tactical-olive/40 space-y-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-tactical-muted block mb-1 font-bold">TACTICAL DOCTRINE / TYPE:</label>
            <select
              value={missionType}
              disabled={readOnly}
              onChange={(e) => setMissionType(e.target.value as any)}
              className="w-full bg-black/60 border border-tactical-olive rounded p-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="RAID">⚡ RAID / INFILTRATION</option>
              <option value="PATROL">🧭 PATROL & RECON</option>
              <option value="DEFENSE">🛡️ DEFENSIVE REDOUBT</option>
              <option value="AMBUSH">🎯 CHOKEPOINT AMBUSH</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-tactical-muted block mb-1 font-bold">OPERATIONAL SECTOR:</label>
            <select
              value={selectedSector}
              disabled={readOnly}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-black/60 border border-tactical-olive rounded p-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="GDANSK_TRICITY">🇵🇱 GDAŃSK MORAINE (ZONE 34U)</option>
              <option value="KATOWICE_SILESIA">🇵🇱 KATOWICE BASIN (ZONE 34U)</option>
              <option value="WARSAW_CITADEL">🇵🇱 WARSAW CITADEL (ZONE 34U)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-tactical-muted block mb-1 font-bold">DIFFICULTY & FORCE RATIO:</label>
            <select
              value={difficulty}
              disabled={readOnly}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-black/60 border border-tactical-olive rounded p-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="RECON">SQUAD RECON (3 BOTS, 4 OBJS)</option>
              <option value="ASSAULT">PLATOON ASSAULT (4 BOTS, 6 OBJS)</option>
              <option value="FORTIFIED">FORTIFIED (6 BOTS, 8 OBJS)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-tactical-olive/30">
          <div className="text-xs text-tactical-muted">
            <span className="font-bold text-tactical-parchment">STATUS: </span>
            {generationSummary}
          </div>

          <button
            disabled={readOnly || isGenerating}
            onClick={handleProceduralGenerate}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs rounded border border-amber-400 transition-all flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
          >
            <span>{isGenerating ? '⚙️ GENERATING...' : '🎲 GENERATE BALANCED SCENARIO'}</span>
          </button>
        </div>
      </div>

      {/* Autonomous OPFOR Bot Fleet Table */}
      <div>
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="text-tactical-muted font-bold">LIVE RED-TEAM OPFOR ASSETS (AUTONOMOUS PATROL BOT FLEET):</span>
          <span className="text-red-400 font-bold">{opforFleet.length} BOTS ACTIVE</span>
        </div>

        <div className="bg-black/50 rounded border border-tactical-olive/40 overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-tactical-olive/30">
            <thead className="bg-tactical-olive/30 text-tactical-muted">
              <tr>
                <th className="p-2.5">CALLSIGN</th>
                <th className="p-2.5">ROLE</th>
                <th className="p-2.5">COORDINATES</th>
                <th className="p-2.5">STATE</th>
                <th className="p-2.5">WAYPOINT</th>
                <th className="p-2.5">INTEGRITY</th>
                <th className="p-2.5 text-right">CONTACT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tactical-olive/20">
              {opforFleet.map((bot) => (
                <tr key={bot.id} className="hover:bg-black/40">
                  <td className="p-2.5 font-bold text-red-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {bot.callsign}
                  </td>
                  <td className="p-2.5 text-tactical-muted">{bot.role}</td>
                  <td className="p-2.5 font-mono text-[11px] text-tactical-parchment">
                    {bot.lat.toFixed(4)}°N, {bot.lon.toFixed(4)}°E
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        bot.state === 'ENGAGING'
                          ? 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                          : bot.state === 'SEARCHING'
                          ? 'bg-amber-950 text-amber-300 border-amber-600'
                          : 'bg-tactical-olive/40 text-tactical-muted border-tactical-olive/60'
                      }`}
                    >
                      {bot.state}
                    </span>
                  </td>
                  <td className="p-2.5 text-[11px] text-tactical-muted">
                    WP {bot.currentWaypoint + 1} / {bot.totalWaypoints}
                  </td>
                  <td className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-black rounded overflow-hidden border border-tactical-olive/40">
                        <div
                          className={`h-full ${
                            bot.healthPercent > 50 ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${bot.healthPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-tactical-muted">{bot.healthPercent}%</span>
                    </div>
                  </td>
                  <td className="p-2.5 text-right font-bold text-amber-400">
                    {bot.targetCallsign ? `⚠️ ${bot.targetCallsign}` : 'CLEAR'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
