import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sound } from '../utils/audio';

interface PreloaderProps {
  onComplete: () => void;
}

export const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
  const [percent, setPercent] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('[01/05] INITIALIZING TELETHON PACKET CAPTURE MATRIX...');

  const getStatusText = (val: number) => {
    if (val < 18) return '[01/05] INITIALIZING TELETHON PACKET CAPTURE MATRIX...';
    if (val < 38) return '[02/05] CONNECTING TO RAJASTHAN TELECOM & UPI ESCROW GATEWAYS...';
    if (val < 62) return '[03/05] PARSING HINGLISH ILLICIT TRADE DIALECTS (4,280 TOKENS)...';
    if (val < 84) return '[04/05] SYNCHRONIZING CROSS-CHANNEL CRIME SYNDICATE TOPOLOGY...';
    if (val < 100) return '[05/05] CRYPTOGRAPHIC SECTION 63 BSA HASH CHAIN & ED25519 VAULT VERIFIED...';
    return '[OK] ALL INTELLIGENCE VECTORS SYNCHRONIZED. READY.';
  };

  const handleSkip = useCallback(() => {
    sound.playSuccessChime();
    setIsFinishing(true);
    setTimeout(onComplete, 400);
  }, [onComplete]);

  // Handle ESC key press
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

    // 4.0 - 4.2 seconds total duration: 60ms interval with average 1.5% increment = ~67 steps * 60ms = ~4.0s
    const timer = setInterval(() => {
      setPercent(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsFinishing(true);
          sound.playSuccessChime();
          setTimeout(() => {
            onComplete();
          }, 700);
          return 100;
        }

        // Realistic staggered pace: slower at 35-40% and 80-85% for verification pauses
        let increment = 1;
        if (prev < 15) {
          increment = Math.floor(Math.random() * 2) + 1; // 1-2%
        } else if (prev >= 35 && prev <= 42) {
          increment = 1; // pause for dialect loading
        } else if (prev >= 78 && prev <= 84) {
          increment = 1; // pause for Section 63 BSA vault verification
        } else {
          increment = Math.floor(Math.random() * 3) + 1; // 1-3%
        }

        const next = Math.min(prev + increment, 100);
        setCurrentStatus(getStatusText(next));

        if (next === 25 || next === 50 || next === 75 || next === 100) {
          sound.playClick();
        }

        return next;
      });
    }, 58);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!isFinishing ? (
        <motion.div
          key="melon-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          className="fixed inset-0 z-50 bg-[#070A10] flex flex-col justify-between p-8 sm:p-14 select-none overflow-hidden font-sans"
        >
          {/* Subtle background coordinate grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Top Bar with Agency Header & Functional Skip Button */}
          <div className="relative z-10 flex justify-between items-center text-xs tracking-wider text-slate-400 font-mono">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-white font-semibold">PRAHARI // OSINT</span>
              <span className="text-slate-500 hidden sm:inline">| RAJASTHAN POLICE CYBER CELL</span>
            </div>
            <button
              onClick={handleSkip}
              className="text-slate-400 hover:text-white px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-md text-[11px] font-mono transition-colors"
            >
              SKIP [ESC]
            </button>
          </div>

          {/* Center: Emblem & Editorial Typography */}
          <div className="my-auto text-center flex flex-col items-center justify-center relative z-10">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="relative"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-widest uppercase mb-4">
                <span>R4C Hackathon 2026</span>
                <span>•</span>
                <span>Specialized Narcotics & Mule Detection</span>
              </div>

              <h1 className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-500 uppercase select-none">
                PRAHARI
              </h1>
              <div className="text-xs sm:text-sm tracking-[0.35em] font-mono text-cyan-400/90 uppercase mt-3">
                Cross-Channel OSINT & Illicit Trade Platform
              </div>
            </motion.div>
          </div>

          {/* Bottom Row: Detailed Status Line on left, Melon-style Percentage on right */}
          <div className="relative z-10 flex items-end justify-between font-mono">
            <div className="space-y-1.5 max-w-md">
              <div className="text-[10px] text-cyan-400 tracking-widest font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                SYSTEM INITIALIZATION
              </div>
              <div className="text-xs text-slate-300 font-mono tracking-wide truncate">
                {currentStatus}
              </div>
            </div>

            {/* Kinetic Percentage Counter */}
            <div className="text-right leading-none">
              <div className="text-7xl sm:text-9xl md:text-[10rem] font-bold text-white tracking-tighter font-sans select-none">
                {String(percent).padStart(3, '0')}
                <span className="text-2xl sm:text-5xl text-slate-500 ml-1 font-mono font-normal">%</span>
              </div>
            </div>
          </div>

          {/* Bottom Edge Vibrant Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/[0.05]">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-400 shadow-[0_0_15px_rgba(34,211,238,0.7)]"
              style={{ width: `${percent}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </motion.div>
      ) : (
        /* Smooth Liquid Curtain Transition into Main Interface */
        <motion.div
          key="liquid-curtain"
          initial={{ y: '100%' }}
          animate={{ y: '-100%' }}
          transition={{ duration: 0.85, ease: [0.77, 0, 0.175, 1] }}
          className="fixed inset-0 z-50 bg-[#0C101A] border-t border-cyan-400/50 flex items-center justify-center pointer-events-none"
        >
          <div className="text-white text-6xl sm:text-9xl font-black tracking-tight opacity-10">
            PRAHARI
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
