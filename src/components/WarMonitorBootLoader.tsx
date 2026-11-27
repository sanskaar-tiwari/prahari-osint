import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { sound } from '../utils/audio';

interface WarMonitorBootLoaderProps {
  onComplete: () => void;
}

export const WarMonitorBootLoader: React.FC<WarMonitorBootLoaderProps> = ({ onComplete }) => {
  const [percent, setPercent] = useState(0);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [authProgress, setAuthProgress] = useState(false);

  const bootLogs = [
    "[INT] Connecting to Telethon Telegram OSINT aggregators...",
    "[INT] Initializing Rajasthan UPI Escrow monitoring endpoints...",
    "[SEC] Loading District Threat Matrix (41 Rajasthan districts across 7 divisions)...",
    "[SEC] Loading Hinglish illicit trade dictionary (4,280 terms)...",
    "[SEC] Initializing Cross-Channel Entity Correlation Engine...",
    "[HUD] Loading Mapbox Dark vector district geometries...",
    "[VIS] Configuring Palantir Gotham tactical telemetry overlays...",
    "[CAM] Indexing CCTV and transport checkpoints in Jaipur/Jodhpur...",
    "[AIS] Connecting to border surveillance relays (Barmer/Jaisalmer)...",
    "[BNK] Verifying Section 63 BSA hash-chained tamper-evident forensic vault...",
    "[OK] All tactical telemetry layers active & verified.",
    "[OK] PRAHARI OSINT Command Center ready. Welcome, Operator."
  ];

  const handleSkip = useCallback(() => {
    sound.playSuccessChime();
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSkip]);

  useEffect(() => {
    sound.playRadarPing();
    // 3.8 - 4.2 seconds total duration
    const timer = setInterval(() => {
      setPercent(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setAuthProgress(true);
          sound.playSuccessChime();
          setTimeout(() => {
            onComplete();
          }, 800);
          return 100;
        }

        const next = Math.min(prev + (prev > 75 ? 2 : 2), 100);
        const logIndex = Math.floor((next / 100) * bootLogs.length);
        setTerminalLines(bootLogs.slice(0, logIndex + 1));
        if (next % 20 === 0) sound.playClick();
        return next;
      });
    }, 75);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070A10] flex flex-col items-center justify-center p-4 font-mono select-none">
      {/* Background radial ring */}
      <div className="relative mb-8 flex flex-col items-center">
        {/* Concentric radar rings */}
        <div className="relative w-20 h-20 flex items-center justify-center mb-5">
          <div className="absolute inset-0 rounded-full border border-cyan-500/20" />
          <div className="absolute inset-2.5 rounded-full border border-cyan-500/30" />
          <div className="absolute inset-5 rounded-full border border-cyan-500/40" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#22D3EE] animate-ping" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black tracking-[0.25em] text-white text-center mb-1 font-sans">
          PRAHARI // COMMAND
        </h1>
        <div className="text-[11px] tracking-[0.3em] text-cyan-400 uppercase text-center mb-4">
          Rajasthan Police Cross-Channel OSINT Platform
        </div>

        <div className="border border-white/[0.08] bg-white/[0.03] text-slate-300 text-[10px] tracking-widest px-3 py-0.5 rounded font-mono uppercase">
          DEFCON 2 // LAW ENFORCEMENT RESTRICTED
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-2 flex items-center justify-between text-[11px] text-slate-300 font-mono">
        <span className="tracking-widest text-slate-400">INITIALIZING SYSTEM MATRIX</span>
        <span className="font-semibold text-cyan-400">{percent}%</span>
      </div>
      <div className="w-full max-w-lg h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 shadow-[0_0_10px_#22D3EE] transition-all duration-75"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Terminal log box */}
      <div className="w-full max-w-lg h-60 bg-[#0C101A] border border-white/[0.08] rounded-xl p-4 font-mono text-[11px] overflow-hidden flex flex-col justify-between text-slate-400 shadow-2xl">
        <div className="space-y-1.5 overflow-y-auto pr-1">
          {terminalLines.map((line, idx) => (
            <div
              key={idx}
              className={`${
                line.includes('[OK]')
                  ? 'text-emerald-400 font-medium'
                  : line.includes('[SEC]')
                  ? 'text-cyan-300'
                  : 'text-slate-400'
              }`}
            >
              {line}
            </div>
          ))}

          {authProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pt-2 border-t border-white/[0.08] text-slate-300 space-y-0.5"
            >
              <div className="text-cyan-400 font-bold">[AUTH] CIPHER PROTOCOL VERIFIED</div>
              <div className="text-slate-400">OPERATOR: <span className="text-white">SIERRA-RAJ-09</span> ✓</div>
              <div className="text-slate-400">JURISDICTION: <span className="text-rose-400">STATE CYBER CELL</span> ✓</div>
              <div className="text-emerald-400">TOKEN: <span className="tracking-widest">••••••••••••••••</span> █</div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="mt-6 text-[10px] tracking-widest text-slate-500 hover:text-white transition-colors uppercase font-mono px-3 py-1 rounded bg-white/[0.02] border border-white/[0.06]"
      >
        PRESS TO SKIP [ESC]
      </button>
    </div>
  );
};
