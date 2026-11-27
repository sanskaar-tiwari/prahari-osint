import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Radio,
  ArrowRight,
  Terminal,
  Cpu,
  Layers,
  Network,
  Lock,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  MapPin
} from 'lucide-react';
import { TacticalConsole3D } from './TacticalConsole3D';
import { ClassifierPlayground } from './ClassifierPlayground';
import { sound } from '../utils/audio';
import { generateDossierPDF } from '../utils/pdfGenerator';
import { INITIAL_INTERCEPTS } from '../data/mockData';

interface EditorialShowcaseProps {
  onLaunchCommand: () => void;
  onExploreGraph: () => void;
}

export const EditorialShowcase: React.FC<EditorialShowcaseProps> = ({
  onLaunchCommand,
  onExploreGraph
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [isMuted, setIsMuted] = useState(!sound.enabled);

  // Synchronize audio state with global sound system singleton
  useEffect(() => {
    return sound.subscribe((enabled) => {
      setIsMuted(!enabled);
    });
  }, []);

  const sampleHash = "7c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d";

  const handleCopyHash = () => {
    sound.playSuccessChime();
    navigator.clipboard.writeText(sampleHash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadDemoPDF = () => {
    sound.playSuccessChime();
    generateDossierPDF(INITIAL_INTERCEPTS[0]);
  };

  const toggleSound = () => {
    sound.playMechanicalClick(true);
    sound.toggle();
  };

  return (
    <div className="min-h-screen bg-[#080808] text-slate-100 selection:bg-cyan-400 selection:text-black">
      {/* Top Telemetry Banner */}
      <div className="bg-[#0b0e14] border-b border-slate-800/80 px-4 sm:px-8 py-2 text-[11px] font-mono flex items-center justify-between text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
            LIVE SIGNAL INTERCEPT // PUBLIC TELEGRAM
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline text-slate-400">DOSSIER // PRAHARI-OSINT</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleSound}
            className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span className="text-[10px]">{isMuted ? 'MUTED' : 'AUDIO FX ON'}</span>
          </button>
          <span className="hidden md:inline bg-red-950/60 text-red-400 border border-red-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
            R4C HACKATHON 2026
          </span>
        </div>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-slate-800/60 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.3)]">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
              PRAHARI<span className="text-cyan-400 font-mono text-sm">// OSINT</span>
            </div>
            <div className="text-[9px] font-mono text-slate-500 tracking-wider">
              RAJASTHAN POLICE INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => {
              sound.playClick();
              const el = document.getElementById('classifier-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-cyan-400 px-3 py-1.5 rounded transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            TEST CLASSIFIER
          </button>

          <button
            onClick={() => {
              sound.playClick();
              const el = document.getElementById('pipeline-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono text-slate-300 hover:text-cyan-400 px-3 py-1.5 rounded transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            5-STAGE PIPELINE
          </button>

          <button
            onClick={() => {
              sound.playSuccessChime();
              onLaunchCommand();
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black px-4 sm:px-5 py-2 rounded-lg font-mono text-xs font-bold tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all transform active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            LAUNCH COMMAND CENTER
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-8 border-b border-slate-800/80 overflow-hidden">
        {/* Subtle grid and radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,229,255,0.08),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 dot-pattern opacity-15 pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          {/* Top Headline Tag */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-400 text-xs font-mono mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>BUILT FOR RAJASTHAN POLICE // R4C HACKATHON 2026</span>
          </motion.div>

          {/* Razor-sharp Editorial Typography */}
          <div className="space-y-2 mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-display tracking-tight text-white uppercase leading-[0.95]"
            >
              THE ADVERTISEMENTS <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-slate-300">
                ARE PUBLIC.
              </span><br />
              THE NETWORKS <span className="text-red-500 underline decoration-red-500/50">ARE NOT.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-base sm:text-xl text-slate-400 max-w-3xl font-normal leading-relaxed pt-3"
            >
              <strong className="text-slate-200 font-semibold">PRAHARI</strong> is a cross-channel OSINT and illicit trade intelligence platform. It monitors public Telegram channels and social media exports across Rajasthan to detect narcotics, illegal arms, fake documents, and mule bank accounts — mapping hidden syndicate links in seconds.
            </motion.p>
          </div>

          {/* Interactive 3D Tactical Console Centerpiece */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="my-10"
          >
            <TacticalConsole3D
              onLaunchCommand={onLaunchCommand}
              onExploreGraph={onExploreGraph}
            />
          </motion.div>

          {/* Dual CTAs & Telemetry Counter Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <button
              onClick={() => {
                sound.playSuccessChime();
                onLaunchCommand();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-black px-8 py-4 rounded-xl font-mono text-sm font-bold tracking-wider hover:brightness-110 shadow-[0_0_35px_rgba(0,229,255,0.4)] transition-all transform active:scale-95"
            >
              <Radio className="w-4 h-4 fill-black animate-pulse" />
              LAUNCH COMMAND CENTER
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onExploreGraph();
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#121924] hover:bg-slate-800 border border-slate-700 text-slate-200 px-6 py-4 rounded-xl font-mono text-sm font-semibold transition-all"
            >
              <Network className="w-4 h-4 text-cyan-400" />
              OPEN CROSS-CHANNEL GRAPH
            </button>
          </div>

          {/* 3 Telemetry Pillars */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 pt-10 border-t border-slate-800/80 font-mono">
            <div className="bg-[#0d121a] p-4 rounded-xl border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400">1,428+</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                PUBLIC CHANNELS MONITORED
              </div>
            </div>
            <div className="bg-[#0d121a] p-4 rounded-xl border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">96.8%</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                HINGLISH SLANG PRECISION
              </div>
            </div>
            <div className="bg-[#0d121a] p-4 rounded-xl border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-yellow-400">&lt; 3.0s</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                CROSS-CHANNEL CORRELATION
              </div>
            </div>
            <div className="bg-[#0d121a] p-4 rounded-xl border border-slate-800">
              <div className="text-2xl sm:text-3xl font-black text-red-400">100%</div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider mt-1">
                SEC 63 BSA COMPLIANT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 01 // THREAT ASYMMETRY */}
      <section className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#090C10]">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            01 // THREAT ASYMMETRY
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-6">
            THE CRIMINALS HAVE SCALED. <br />
            <span className="text-slate-400">INVESTIGATORS HAVEN'T.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
            {/* Card 1 */}
            <div className="bg-[#0f1520] border border-red-500/30 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Radio className="w-24 h-24 text-red-500" />
              </div>
              <div className="text-xs font-mono text-red-400 uppercase tracking-wider mb-2">
                ILLICIT SURFACE
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-black text-white mb-2">
                1,000s
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Public Telegram channels and social forums active daily broadcasting narcotics drops, illicit arms consignments, and mule accounts.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#0f1520] border border-slate-800 p-6 rounded-2xl relative overflow-hidden">
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                MANUAL CAPACITY
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-black text-slate-300 mb-2">
                5–10
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Channels an individual cyber-crime officer can realistically monitor manually, leading to massive intelligence blind spots.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#0f1520] border border-cyan-500/40 p-6 rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.1)]">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
                NETWORK VISIBILITY
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-black text-cyan-400 mb-2">
                ZERO
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automated cross-channel linking exists in legacy manual workflows. Isolated posts remain untracked as part of a single syndicated cartel.
              </p>
            </div>
          </div>

          {/* Callout Quote */}
          <div className="bg-gradient-to-r from-red-950/40 via-[#101722] to-cyan-950/40 border-l-4 border-cyan-400 p-6 sm:p-8 rounded-r-2xl font-mono">
            <p className="text-base sm:text-xl font-semibold text-slate-200 leading-snug">
              "THE SAME UPI ID APPEARS IN A NARCOTICS AD IN JAIPUR AND A MULE-ACCOUNT AD IN JODHPUR. NOBODY CONNECTS THEM. PRAHARI DOES."
            </p>
            <div className="mt-3 text-xs text-cyan-400 tracking-wider">
              — PRAHARI AUTONOMOUS CROSS-CHANNEL ENTITY CORRELATOR
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 02 // ARCHITECTURE: FIVE STAGES */}
      <section id="pipeline-section" className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#080808]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
                02 // ARCHITECTURE
              </div>
              <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white">
                FIVE STAGES. ONE INTELLIGENCE PIPELINE.
              </h2>
            </div>
            <div className="mt-4 md:mt-0 font-mono text-xs text-slate-500">
              STACK: TELETHON · SCIKIT-LEARN · NETWORKX · IMAGEHASH · HASHLIB · REPORTLAB
            </div>
          </div>

          {/* 5-Stage Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Stage 1 */}
            <div className="bg-[#0d131d] border border-slate-800 hover:border-cyan-500/50 p-5 rounded-xl transition-all group">
              <div className="font-mono text-2xl font-black text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                01
              </div>
              <div className="text-sm font-bold font-mono text-white mb-1">COLLECT</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Public channels live stream via Telethon daemon + CSV / JSON drag-and-drop batch ingestion.
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-[#0d131d] border border-slate-800 hover:border-cyan-500/50 p-5 rounded-xl transition-all group">
              <div className="font-mono text-2xl font-black text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                02
              </div>
              <div className="text-sm font-bold font-mono text-white mb-1">CLASSIFY</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Hinglish, Hindi, English, and coded emoji detection engine across DRUGS, ARMS, DOCUMENTS & FINANCIAL.
              </div>
            </div>

            {/* Stage 3 */}
            <div className="bg-[#0d131d] border border-slate-800 hover:border-cyan-500/50 p-5 rounded-xl transition-all group">
              <div className="font-mono text-2xl font-black text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                03
              </div>
              <div className="text-sm font-bold font-mono text-white mb-1">EXTRACT</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Precision regex extraction of UPI IDs, Indian phone numbers, Telegram usernames, and crypto wallets.
              </div>
            </div>

            {/* Stage 4 */}
            <div className="bg-[#0d131d] border border-slate-800 hover:border-cyan-500/50 p-5 rounded-xl transition-all group">
              <div className="font-mono text-2xl font-black text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                04
              </div>
              <div className="text-sm font-bold font-mono text-white mb-1">LINK</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                NetworkX graph topology linking the same identifier across disconnected channels and crime types.
              </div>
            </div>

            {/* Stage 5 */}
            <div className="bg-[#0d131d] border border-slate-800 hover:border-cyan-500/50 p-5 rounded-xl transition-all group">
              <div className="font-mono text-2xl font-black text-cyan-400 mb-3 group-hover:scale-105 transition-transform">
                05
              </div>
              <div className="text-sm font-bold font-mono text-white mb-1">ALERT</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                High-density GIS district map (41 districts across 7 divisions), four-layer hash chain, and Section 63 BSA forensic dossier export.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03 // HYBRID DETECTION ENGINE PLAYGROUND */}
      <section id="classifier-section" className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#090C10]">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            03 // HYBRID DETECTION ENGINE
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-4">
            SLANG-AWARE. EMOJI-AWARE. HINGLISH-AWARE.
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mb-8">
            Criminal syndicates deliberately bypass keyword blocks by combining Hinglish phonetics (<em>maal, chitta, desi katta</em>), coded emojis (🔥, 💊, 🔫), and obfuscated text. PRAHARI uses weighted multi-lingual dictionary vectors.
          </p>

          {/* Interactive Playground Component */}
          <ClassifierPlayground />
        </div>
      </section>

      {/* SECTION 04 // NETWORK TOPOLOGY PREVIEW */}
      <section className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#080808]">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            04 // NETWORK TOPOLOGY
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-4">
            SAME CRIMINAL. TWO CRIMES. ONE GRAPH.
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mb-10">
            How PRAHARI breaks information silos by exposing the central nexus identifier connecting seemingly unrelated cases:
          </p>

          <div className="bg-[#0b0e14] border border-slate-800 rounded-2xl p-6 sm:p-10 relative overflow-hidden">
            {/* Visual Topology Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {/* Left Column: Post 001 */}
              <div className="space-y-4">
                <div className="bg-[#121924] border border-red-500/40 p-4 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-red-400 font-bold">[DRUG 0.94]</span>
                    <span className="text-slate-500">@delhi_highs</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    "🔥 Pure white available. 5g = ₹8000. Advance to raj.pay@oksbi"
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">ID: post_001</div>
                </div>

                <div className="bg-[#121924] border border-orange-500/40 p-4 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-orange-400 font-bold">[ARMS 0.97]</span>
                    <span className="text-slate-500">@rajasthan_arms_hub</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    "Desi katta .32 bore. Call 9876543210. Location: Alwar border."
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">ID: post_003</div>
                </div>
              </div>

              {/* Center Column: The Hero Identifier */}
              <div className="flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-[#141d2b] to-[#0c121c] border-2 border-cyan-400 rounded-2xl shadow-[0_0_35px_rgba(0,229,255,0.25)]">
                <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center mb-3 animate-pulse">
                  <Network className="w-8 h-8 text-cyan-400" />
                </div>
                <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
                  HERO CROSS-CHANNEL IDENTIFIER
                </div>
                <div className="text-lg sm:text-xl font-mono font-black text-white">
                  raj.pay@oksbi
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-950 text-red-400 border border-red-800/60 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  <span>NARCOTICS + MULE SYNDICATE</span>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Shared across 3 channels & 2 crime categories. Investigating officer can immediately issue freeze request under CrPC Sec 102.
                </p>
              </div>

              {/* Right Column: Post 002 */}
              <div className="space-y-4">
                <div className="bg-[#121924] border border-emerald-500/40 p-4 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-emerald-400 font-bold">[FINANCIAL 0.91]</span>
                    <span className="text-slate-500">@mule_bazaar</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    "KYC verified current account + ATM card. ₹15,000. raj.pay@oksbi"
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">ID: post_002</div>
                </div>

                <div className="bg-[#121924] border border-purple-500/40 p-4 rounded-xl">
                  <div className="flex items-center justify-between text-xs font-mono mb-2">
                    <span className="text-purple-400 font-bold">[DOCUMENTS 0.95]</span>
                    <span className="text-slate-500">@doc_forge_raj</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    "Fake Aadhaar + PAN card set. WhatsApp 9876543210 @seller_raj"
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">ID: post_004</div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800 flex justify-center">
              <button
                onClick={() => {
                  sound.playClick();
                  onExploreGraph();
                }}
                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-mono text-xs font-bold"
              >
                <span>OPEN FULL INTERACTIVE GRAPH IN COMMAND CENTER</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05 // FORENSIC CHAIN OF CUSTODY */}
      <section className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#090C10]">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            05 // FORENSIC CHAIN OF CUSTODY
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-4">
            FORENSIC INTEGRITY & SECTION 63 BSA COMPLIANCE.
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl mb-10">
            Social media screenshots are easily disputed in court. Every post intercepted by PRAHARI is secured via a four-layer cryptographic integrity pipeline (hash chain, Ed25519 signature, RFC 3161 timestamp, raw wire JSON) structured to support Section 63 Bharatiya Sakshya Adhiniyam (BSA) 2023 forensic compliance.
          </p>

          {/* Dossier Card Preview */}
          <div className="bg-[#0b0f16] border border-slate-800 rounded-2xl p-6 sm:p-8 font-mono relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-slate-300 font-bold">CASE #INV-2026-1121</span>
                <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">
                  TAMPER-EVIDENT VERIFIED
                </span>
              </div>
              <div className="text-slate-500">
                CAPTURED AT: 2026-11-21T14:32:11Z
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6 text-xs">
              <div className="space-y-3">
                <div>
                  <span className="text-slate-500">CHANNEL: </span>
                  <span className="text-cyan-400">@mule_bazaar (Public Broadcast)</span>
                </div>
                <div>
                  <span className="text-slate-500">TIMESTAMP: </span>
                  <span className="text-slate-300">2026-11-21T13:01:00Z</span>
                </div>
                <div>
                  <span className="text-slate-500">CATEGORIES: </span>
                  <span className="text-yellow-400 font-bold">[FINANCIAL] [confidence: 0.91]</span>
                </div>
                <div>
                  <span className="text-slate-500">TEXT SNAPSHOT: </span>
                  <p className="text-slate-200 mt-1 font-sans bg-slate-950 p-3 rounded border border-slate-800">
                    "Selling fully KYC verified current account with ATM card + net-banking kit. ₹15000. UPI raj.pay@oksbi"
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-slate-500">CRYPTOGRAPHIC SHA-256 CHECKSUM:</div>
                <div className="bg-slate-950 p-3 rounded border border-cyan-500/30 text-cyan-300 break-all text-[11px]">
                  {sampleHash}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleCopyHash}
                    className="flex items-center gap-2 bg-[#121a24] hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? 'HASH COPIED!' : 'COPY SHA-256 HASH'}</span>
                  </button>

                  <button
                    onClick={handleDownloadDemoPDF}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,59,48,0.3)]"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>DOWNLOAD SECTION 63 BSA REPORT</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 06 // BUILT FOR INDIAN LAW ENFORCEMENT */}
      <section className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#080808]">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            06 // BUILT FOR INDIAN LAW ENFORCEMENT
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-4">
            HINDI. HINGLISH. ENGLISH. EMOJI. <br />
            <span className="text-cyan-400">WE SPEAK CRIMINAL.</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {/* Drugs */}
            <div className="bg-[#0f1520] border border-red-500/40 p-5 rounded-2xl">
              <div className="text-xs font-mono text-red-400 font-bold mb-2 flex items-center justify-between">
                <span>DRUGS / NARCOTICS</span>
                <span className="text-base">💊</span>
              </div>
              <div className="text-xs font-mono text-slate-300 italic mb-2">
                "maal available, DM karo" <br />
                "pure white 5g score" <br />
                "chitta border consignment"
              </div>
              <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 font-sans">
                Afeem, charas, doda post, MDMA, chitta, ice, mephedrone.
              </div>
            </div>

            {/* Arms */}
            <div className="bg-[#0f1520] border border-orange-500/40 p-5 rounded-2xl">
              <div className="text-xs font-mono text-orange-400 font-bold mb-2 flex items-center justify-between">
                <span>ILLEGAL ARMS</span>
                <span className="text-base">🔫</span>
              </div>
              <div className="text-xs font-mono text-slate-300 italic mb-2">
                "desi katta .32 bore available" <br />
                "tamancha with 10 rounds" <br />
                "bypass cash drop"
              </div>
              <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 font-sans">
                Country-made firearms, cartridges, magazines, live rounds.
              </div>
            </div>

            {/* Documents */}
            <div className="bg-[#0f1520] border border-purple-500/40 p-5 rounded-2xl">
              <div className="text-xs font-mono text-purple-400 font-bold mb-2 flex items-center justify-between">
                <span>FORGED DOCUMENTS</span>
                <span className="text-base">🪪</span>
              </div>
              <div className="text-xs font-mono text-slate-300 italic mb-2">
                "fake Aadhaar + PAN 3 din mein" <br />
                "hologram verified marksheet" <br />
                "instant biometric bypass"
              </div>
              <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 font-sans">
                Govt IDs, marksheets, driving licenses, vehicle RCs.
              </div>
            </div>

            {/* Financial */}
            <div className="bg-[#0f1520] border border-emerald-500/40 p-5 rounded-2xl">
              <div className="text-xs font-mono text-emerald-400 font-bold mb-2 flex items-center justify-between">
                <span>MULE ACCOUNTS</span>
                <span className="text-base">💳</span>
              </div>
              <div className="text-xs font-mono text-slate-300 italic mb-2">
                "KYC account kiraya pe available" <br />
                "current account + ATM kit" <br />
                "USDT crypto arbitrage rent"
              </div>
              <div className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800 font-sans">
                Mule bank kits, debit cards, net banking kits, SIM rentals.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 07 // OPERATIONAL IMPACT & R4C RUBRIC */}
      <section className="py-20 px-4 sm:px-8 border-b border-slate-800 bg-[#090C10]">
        <div className="max-w-6xl mx-auto">
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
            07 // OPERATIONAL IMPACT & R4C RUBRIC
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white mb-4">
            SAME INVESTIGATOR. 100X THE REACH.
          </h2>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs sm:text-sm border border-slate-800 rounded-2xl overflow-hidden">
              <thead className="bg-[#121924] text-slate-300 uppercase">
                <tr>
                  <th className="p-4 border-b border-slate-800">Capability Dimension</th>
                  <th className="p-4 border-b border-slate-800 text-red-400">Manual Cyber Cell Analyst</th>
                  <th className="p-4 border-b border-slate-800 text-cyan-400 font-bold">PRAHARI Intelligence Dashboard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-[#0a0e14]">
                <tr>
                  <td className="p-4 text-slate-400 font-medium">Channel Monitoring Volume</td>
                  <td className="p-4 text-slate-400">5 – 10 channels / day</td>
                  <td className="p-4 text-cyan-300 font-bold">1,000s concurrently</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-400 font-medium">Slang / Coded Emoji Detection</td>
                  <td className="p-4 text-slate-400">Subjective & misses dialects</td>
                  <td className="p-4 text-cyan-300 font-bold">Automated multi-dialect weighted NLP</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-400 font-medium">Cross-Channel Entity Correlation</td>
                  <td className="p-4 text-slate-400">Manual Excel lookup (Hours/Days)</td>
                  <td className="p-4 text-cyan-300 font-bold">Instant graph topology (&lt; 3s)</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-400 font-medium">Court Admissibility / Evidence</td>
                  <td className="p-4 text-slate-400">Loose screenshots (Contestable)</td>
                  <td className="p-4 text-cyan-300 font-bold">Four-Layer Hash Chain + Sec 63 BSA PDF</td>
                </tr>
                <tr>
                  <td className="p-4 text-slate-400 font-medium">Geospatial Intelligence</td>
                  <td className="p-4 text-slate-400">None / Static pins</td>
                  <td className="p-4 text-cyan-300 font-bold">Interactive Rajasthan District mesh with criminal arcs</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final CTA Banner */}
          <div className="mt-14 bg-gradient-to-r from-[#0d1624] via-[#122238] to-[#0d1624] border border-cyan-500/40 p-8 sm:p-12 rounded-3xl text-center shadow-[0_0_50px_rgba(0,229,255,0.2)]">
            <h3 className="text-2xl sm:text-4xl font-black font-display text-white mb-3">
              READY TO COMMENCE TACTICAL SURVEILLANCE?
            </h3>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto mb-6 font-sans">
              Access the live intelligence command center, inspect Rajasthan district hot-spots, and generate forensic dossiers.
            </p>
            <button
              onClick={() => {
                sound.playSuccessChime();
                onLaunchCommand();
              }}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-cyan-400 to-cyan-500 text-black px-8 py-4 rounded-xl font-mono text-sm font-bold tracking-wider hover:brightness-110 shadow-[0_0_30px_rgba(0,229,255,0.5)] transition-all transform active:scale-95"
            >
              <Zap className="w-4 h-4 fill-black" />
              LAUNCH COMMAND CENTER NOW
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-8 border-t border-slate-800 text-xs font-mono text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-bold">WE DON'T JUST FIND POSTS. WE FIND NETWORKS.</span>
          </div>

          <div className="flex items-center gap-4">
            <span>#PRAHARI</span>
            <span>·</span>
            <span>R4C HACKATHON 2026</span>
            <span>·</span>
            <span className="text-cyan-400">RAJASTHAN POLICE CYBER CELL</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
