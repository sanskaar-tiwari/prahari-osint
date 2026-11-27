import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Radio, ShieldAlert, Volume2, VolumeX, Network } from 'lucide-react';
import { sound } from '../utils/audio';

interface TacticalConsole3DProps {
  onLaunchCommand: () => void;
  onExploreGraph: () => void;
}

export const TacticalConsole3D: React.FC<TacticalConsole3DProps> = ({
  onLaunchCommand,
  onExploreGraph
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const [activeMode, setActiveMode] = useState<'SCAN' | 'GRAPH' | 'BURST'>('SCAN');
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(sound.enabled);
  
  // Real-time animated equalizer waveform frequency bars
  const [waveformBars, setWaveformBars] = useState<number[]>([
    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2
  ]);

  // Sync state seamlessly with global sound system singleton
  useEffect(() => {
    return sound.subscribe((enabled) => {
      setAudioEnabled(enabled);
    });
  }, []);

  // Real-time equalizer visualizer animation loop when AUDIO is ON
  useEffect(() => {
    if (!audioEnabled || !isPowerOn) {
      // Flatten bars when muted or powered off
      setWaveformBars([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
      return;
    }

    const interval = setInterval(() => {
      setWaveformBars(() =>
        Array.from({ length: 16 }, (_, idx) => {
          // Dynamic bell curve distribution with natural jitter for spectrum look
          const centerDist = Math.abs(idx - 7.5);
          const baseHeight = Math.max(5, 20 - centerDist * 1.6);
          const jitter = (Math.random() - 0.5) * 10;
          return Math.min(Math.max(Math.round(baseHeight + jitter), 4), 22);
        })
      );
    }, 85);

    return () => clearInterval(interval);
  }, [audioEnabled, isPowerOn]);

  const sampleAlerts = [
    {
      channel: '@delhi_highs',
      cat: 'DRUGS',
      conf: '0.94',
      text: '🔥 Pure white available. 5g = ₹8000. DM @seller_raj. UPI: raj.pay@oksbi',
      district: 'JAIPUR',
      time: '13:04 UTC'
    },
    {
      channel: '@mule_bazaar',
      cat: 'FINANCIAL',
      conf: '0.91',
      text: 'KYC verified current account + ATM card ready. ₹15,000. raj.pay@oksbi',
      district: 'JODHPUR',
      time: '13:01 UTC'
    },
    {
      channel: '@rajasthan_arms_hub',
      cat: 'ARMS',
      conf: '0.97',
      text: 'Desi katta .32 bore with 10 live rounds. Crypto bc1qar...mdq. Alwar border',
      district: 'ALWAR',
      time: '11:45 UTC'
    },
    {
      channel: '@doc_forge_raj',
      cat: 'DOCUMENTS',
      conf: '0.95',
      text: 'Fake Aadhaar + PAN set. 3 din mein delivery in Kota. WhatsApp 9876543210',
      district: 'KOTA',
      time: '10:15 UTC'
    }
  ];

  // Cycle alerts on mini-screen
  useEffect(() => {
    if (!isPowerOn) return;
    const interval = setInterval(() => {
      setActiveAlertIndex(prev => (prev + 1) % sampleAlerts.length);
      sound.playClick();
    }, 4200);
    return () => clearInterval(interval);
  }, [isPowerOn, sampleAlerts.length]);

  // Mouse Parallax Tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Normalized tilt
    setRotate({
      x: - (y / rect.height) * 16,
      y: (x / rect.width) * 16
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleToggleAudio = () => {
    // Play crisp mechanical click sound even if previously muted
    sound.playMechanicalClick(true);
    sound.toggle();
  };

  const currentAlert = sampleAlerts[activeAlertIndex];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-xl mx-auto perspective-[1200px] select-none py-4"
    >
      <motion.div
        animate={{
          rotateX: rotate.x,
          rotateY: rotate.y,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        className="relative bg-gradient-to-b from-[#18202c] via-[#0f151e] to-[#0a0d13] p-5 sm:p-7 rounded-3xl border-2 border-[#2b374b] shadow-[0_30px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(0,229,255,0.15)] tactical-border"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Top Hardware Screws & Status Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-900 shadow-inner" />
            <span className="text-cyan-400 font-bold tracking-wider">UNIT // PRAHARI-OSINT-T4</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className={`w-2 h-2 rounded-full ${isPowerOn ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
              <span className="text-[10px] text-emerald-400 font-semibold">{isPowerOn ? 'PWR ON' : 'STBY'}</span>
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-900 shadow-inner" />
          </div>
        </div>

        {/* Hardware Mini CRT Screen */}
        <div className="relative mt-4 bg-[#05070a] rounded-xl p-4 border border-cyan-950 shadow-[inset_0_0_25px_rgba(0,229,255,0.12)] overflow-hidden">
          {/* CRT scanline and curve shine */}
          <div className="absolute inset-0 crt-overlay opacity-50 pointer-events-none" />
          <div className="absolute top-0 right-0 w-32 h-16 bg-gradient-to-bl from-cyan-400/10 to-transparent pointer-events-none rounded-tr-xl" />

          {/* Mini-screen Header */}
          <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 pb-2 border-b border-slate-800/60">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>LIVE TELEGRAM INTERCEPT // {currentAlert.channel}</span>
            </div>
            <span className="text-red-400 font-bold">SCORE: {currentAlert.conf}</span>
          </div>

          {/* Alert Display with Hinglish text */}
          <div className="py-3 font-mono">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] px-2 py-0.5 rounded font-bold">
                {currentAlert.cat}
              </span>
              <span className="bg-cyan-950 text-cyan-400 border border-cyan-800/60 text-[9px] px-2 py-0.5 rounded">
                NEXUS: {currentAlert.district}
              </span>
              <span className="text-[9px] text-slate-500 ml-auto">{currentAlert.time}</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans font-medium">
              "{currentAlert.text}"
            </p>

            <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-900">
              <span className="text-cyan-400 font-mono">HERO IDENTIFIER LINK DETECTED</span>
              <span className="text-emerald-400 font-mono font-semibold">● SEC 63 BSA COMPLIANT</span>
            </div>
          </div>

          {/* Oscilloscope Mini Waveform / Equalizer Visualizer Bar */}
          <div className="flex items-end gap-1 pt-1.5 h-6">
            {waveformBars.map((barHeight, i) => (
              <div
                key={i}
                className={`flex-1 rounded-full transition-all duration-100 ${
                  audioEnabled
                    ? 'bg-gradient-to-t from-cyan-500 to-cyan-300 shadow-[0_0_8px_rgba(0,229,255,0.7)]'
                    : 'bg-slate-800/60 opacity-40'
                }`}
                style={{
                  height: `${barHeight}px`
                }}
              />
            ))}
          </div>
        </div>

        {/* Tactical Physical Buttons & Knobs Panel */}
        <div className="mt-5 grid grid-cols-4 gap-2.5">
          {/* Button 1: SCAN */}
          <button
            onClick={() => {
              sound.playRadarChirp();
              setActiveMode('SCAN');
              setActiveAlertIndex(prev => (prev + 1) % sampleAlerts.length);
            }}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-150 active:translate-y-1 ${
              activeMode === 'SCAN'
                ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-400 text-black shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Radio className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-mono font-bold">SCAN</span>
          </button>

          {/* Button 2: GRAPH */}
          <button
            onClick={() => {
              sound.playLockOnChime();
              setActiveMode('GRAPH');
              onExploreGraph();
            }}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-150 active:translate-y-1 ${
              activeMode === 'GRAPH'
                ? 'bg-gradient-to-b from-cyan-600 to-cyan-800 border-cyan-400 text-black shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <Network className="w-4 h-4 mb-1" />
            <span className="text-[10px] font-mono font-bold">GRAPH</span>
          </button>

          {/* Button 3: AUDIO (Toggles Active Tactical Audio Mode + Equalizer) */}
          <button
            onClick={handleToggleAudio}
            className={`relative flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-150 active:translate-y-1 ${
              audioEnabled
                ? 'bg-gradient-to-b from-cyan-950/90 to-[#07131e] border-[#00E5FF] text-cyan-300 shadow-[0_0_18px_rgba(0,229,255,0.45)]'
                : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            {/* Active Status LED Dot */}
            {audioEnabled && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
              </span>
            )}

            {audioEnabled ? (
              <Volume2 className="w-4 h-4 mb-1 text-[#00E5FF]" />
            ) : (
              <VolumeX className="w-4 h-4 mb-1 text-slate-500" />
            )}
            <span className="text-[10px] font-mono font-bold tracking-tight">
              {audioEnabled ? 'AUDIO: ON' : 'AUDIO: OFF'}
            </span>
          </button>

          {/* Button 4: ENTER / LAUNCH */}
          <button
            onClick={() => {
              sound.playLockOnChime();
              onLaunchCommand();
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-red-500/80 bg-gradient-to-b from-red-600 to-red-800 text-white font-bold shadow-[0_0_20px_rgba(255,59,48,0.4)] hover:brightness-110 active:translate-y-1 transition-all"
          >
            <ShieldAlert className="w-4 h-4 mb-1 text-white animate-pulse" />
            <span className="text-[10px] font-mono font-bold">ENTER</span>
          </button>
        </div>

        {/* Bottom Hardware Bevel & Parallax Label */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>SECURE HARDWARE ENCLAVE</span>
          <span className="text-cyan-400/80 tracking-widest">RAJASTHAN POLICE OSINT</span>
          <span>CH-01..32</span>
        </div>
      </motion.div>
    </div>
  );
};
