import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  FileText,
  Copy,
  Check,
  ShieldCheck,
  AlertCircle,
  Clock,
  MapPin,
  Hash,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Library,
  ArrowLeft,
  Network,
  Download,
  Eye,
  Maximize2,
  X,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { InterceptPost } from '../types';
import { sound } from '../utils/audio';
import { generateDossierPDF } from '../utils/pdfGenerator';
import { INITIAL_INTERCEPTS } from '../data/mockData';

interface ForensicDossierProps {
  post: InterceptPost | null;
  allPosts?: InterceptPost[];
  onSelectPost?: (post: InterceptPost) => void;
  onReturnToCommand?: () => void;
  onExploreTopology?: () => void;
}

type DossierViewMode = 'BINDER' | 'VOLUMES';

export const ForensicDossier: React.FC<ForensicDossierProps> = ({
  post,
  allPosts = INITIAL_INTERCEPTS,
  onSelectPost,
  onReturnToCommand,
  onExploreTopology,
}) => {
  const caseList = allPosts.length > 0 ? allPosts : INITIAL_INTERCEPTS;
  const [activePost, setActivePost] = useState<InterceptPost>(() => post || caseList[0]);
  const [viewMode, setViewMode] = useState<DossierViewMode>('BINDER');
  const [copied, setCopied] = useState(false);
  const [showRawJsonModal, setShowRawJsonModal] = useState(false);
  const [copiedRawJson, setCopiedRawJson] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<{
    title: string;
    tag: string;
    content: string;
    type: 'CHAT' | 'CONTRABAND' | 'MAP' | 'CRYPTO';
  } | null>(null);

  // Keep activePost in sync if prop changes
  React.useEffect(() => {
    if (post) setActivePost(post);
  }, [post]);

  const currentIndex = caseList.findIndex((p) => p.id === activePost.id);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  const rawJsonContent = React.useMemo(() => {
    return JSON.stringify(
      activePost.rawPayload || {
        message_id: 104820 + parseInt(activePost.id.replace(/\D/g, '') || '1', 10),
        channel: activePost.channel,
        channel_subscribers: activePost.channelSubscribers,
        timestamp: activePost.timestamp,
        captured_at: activePost.capturedAt,
        raw_text: activePost.rawText,
        categories: activePost.categories,
        confidence_score: activePost.confidence,
        matched_slang: activePost.matchedSlang,
        entities: activePost.entities,
        district: activePost.districtName,
        sha256_hash: activePost.sha256,
        crypto_layers: activePost.cryptoLayers || {
          prev_hash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
          current_hash: activePost.sha256,
          ed25519_station_signature: `ed25519:${activePost.sha256.slice(0, 32)}9a4c2e`,
          station_key_id: 'RAJ-CYBER-NODE-01 (Jaipur HQ)',
          rfc3161_timestamp_token: `${activePost.capturedAt} [CERT-In NTP Stratum-1 Verified]`,
        },
        transport_security: 'Telegram MTProto 2.0 (TLS 1.3 / Perfect Forward Secrecy)',
        forensic_status: 'TAMPER_SEALED_IMMUTABLE',
      },
      null,
      2
    );
  }, [activePost]);

  const handleCopyRawJson = () => {
    sound.playSuccessChime();
    navigator.clipboard.writeText(rawJsonContent);
    setCopiedRawJson(true);
    setTimeout(() => setCopiedRawJson(false), 2000);
  };

  const handleDownloadRawJson = () => {
    sound.playClick();
    const blob = new Blob([rawJsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RAW_MTPROTO_WIRE_PAYLOAD_${activePost.id.toUpperCase()}_${activePost.districtName.toUpperCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrevCase = () => {
    sound.playPageTurn();
    const prevIdx = safeIndex > 0 ? safeIndex - 1 : caseList.length - 1;
    const nextPost = caseList[prevIdx];
    setActivePost(nextPost);
    if (onSelectPost) onSelectPost(nextPost);
  };

  const handleNextCase = () => {
    sound.playPageTurn();
    const nextIdx = safeIndex < caseList.length - 1 ? safeIndex + 1 : 0;
    const nextPost = caseList[nextIdx];
    setActivePost(nextPost);
    if (onSelectPost) onSelectPost(nextPost);
  };

  const handleCopyHash = () => {
    sound.playSuccessChime();
    navigator.clipboard.writeText(activePost.sha256);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWaxSealClick = () => {
    sound.playWaxSealStamp();
    generateDossierPDF(activePost);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'DRUGS':
        return { text: '#00E5FF', bg: 'rgba(0, 229, 255, 0.15)', border: '#00E5FF', label: 'NARCOTICS' };
      case 'ARMS':
        return { text: '#F43F5E', bg: 'rgba(244, 63, 94, 0.15)', border: '#F43F5E', label: 'ILLICIT ARMS' };
      case 'DOCUMENTS':
        return { text: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)', border: '#C084FC', label: 'DOC FORGERY' };
      case 'FINANCIAL':
        return { text: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: '#F59E0B', label: 'MULE ACCOUNTS' };
      default:
        return { text: '#00E5FF', bg: 'rgba(0, 229, 255, 0.15)', border: '#00E5FF', label: 'CRIME' };
    }
  };

  const catStyle = getCategoryColor(activePost.categories[0] || 'DRUGS');

  return (
    <div className="relative w-full h-full bg-[#110C09] text-amber-100 overflow-hidden select-none font-sans flex flex-col">
      {/* 1. ATMOSPHERIC DETECTIVE DESK LIGHTING & DUST MOTES */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 75% 20%, rgba(255, 230, 180, 0.12) 0%, rgba(220, 160, 90, 0.05) 35%, transparent 65%),
            linear-gradient(135deg, rgba(20, 14, 10, 0.95) 0%, rgba(14, 10, 7, 0.98) 100%)
          `,
        }}
      />

      {/* Subtle wood grain background */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #000 0px, #000 2px, transparent 2px, transparent 6px)`,
        }}
      />

      {/* Slanted sunbeam rays from window */}
      <div
        className="absolute -top-40 right-10 w-[700px] h-[900px] pointer-events-none opacity-20 transform rotate-12"
        style={{
          background: 'linear-gradient(to bottom, rgba(255, 240, 200, 0.25), transparent 85%)',
          filter: 'blur(45px)',
        }}
      />

      {/* ======================================================== */}
      {/* 2. TOP VINTAGE BRASS & GLASS COMMAND HEADER              */}
      {/* ======================================================== */}
      <header className="relative z-30 h-14 bg-[#18110C]/90 backdrop-blur-md border-b border-[#3D2817] px-4 sm:px-6 flex items-center justify-between shadow-2xl shrink-0">
        {/* Left: Return & Topology Switcher */}
        <div className="flex items-center gap-3">
          {onReturnToCommand && (
            <button
              onClick={() => {
                sound.playClick();
                onReturnToCommand();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#251A13] hover:bg-[#342419] border border-[#523722] text-xs font-mono text-amber-200 hover:text-white transition-all shadow-md active:translate-y-0.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>COMMAND CENTER</span>
            </button>
          )}

          {onExploreTopology && (
            <button
              onClick={() => {
                sound.playClick();
                onExploreTopology();
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#251A13] hover:bg-[#342419] border border-[#523722] text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-all shadow-md active:translate-y-0.5"
            >
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              <span>3D TOPOLOGY</span>
            </button>
          )}

          {/* Mode Switcher: OPEN BINDER vs ARCHIVE VOLUMES */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#120B07] border border-[#422C1A] text-xs">
            <button
              onClick={() => {
                sound.playPageTurn();
                setViewMode('BINDER');
              }}
              className={`px-3 py-1 rounded-md transition-all font-serif flex items-center gap-1.5 ${
                viewMode === 'BINDER'
                  ? 'bg-[#3D2817] text-amber-100 border border-[#7A5433] shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-amber-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>OPEN BINDER</span>
            </button>
            <button
              onClick={() => {
                sound.playPageTurn();
                setViewMode('VOLUMES');
              }}
              className={`px-3 py-1 rounded-md transition-all font-serif flex items-center gap-1.5 ${
                viewMode === 'VOLUMES'
                  ? 'bg-[#3D2817] text-amber-100 border border-[#7A5433] shadow-sm font-semibold'
                  : 'text-stone-400 hover:text-amber-200'
              }`}
            >
              <Library className="w-3.5 h-3.5 text-amber-400" />
              <span>ARCHIVE SHELF</span>
            </button>
          </div>
        </div>

        {/* Center: Vintage Case Dossier Seal Title */}
        <div className="hidden md:flex flex-col items-center">
          <span
            className="text-xs tracking-[0.25em] text-amber-300 uppercase font-bold"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            RAJASTHAN POLICE // SPECIAL CYBER ARCHIVE
          </span>
          <span className="text-[10px] font-mono text-amber-200/50">
            CONFIDENTIAL DIGITAL EVIDENCE JOURNAL
          </span>
        </div>

        {/* Right: Case Progress Counter & PDF Export */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#22160F] border border-[#4A321F] text-xs font-mono text-amber-300">
            <span className="text-stone-500">CASE:</span>
            <span className="font-bold text-amber-200">{safeIndex + 1}</span>
            <span className="text-stone-500">/</span>
            <span>{caseList.length}</span>
          </div>

          <button
            onClick={handleWaxSealClick}
            className="flex items-center gap-1.5 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:brightness-110 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-[0_0_15px_rgba(220,38,38,0.4)] border border-red-500/40 active:translate-y-0.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EXPORT OFFICIAL PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MAIN INTERACTIVE EXPERIENCE                           */}
      {/* ======================================================== */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-3 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* VIEW 1: OPEN SCRAPBOOK RING BINDER (Top Reference Style)    */}
          {/* ============================================================ */}
          {viewMode === 'BINDER' ? (
            <motion.div
              key="binder-view"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative w-full max-w-6xl h-full max-h-[820px] flex flex-col justify-between"
            >
              {/* THE OPEN RING BINDER BOOK SPREAD */}
              <div
                className="relative flex-1 w-full rounded-2xl border-4 border-[#3D2517] shadow-[0_35px_80px_rgba(0,0,0,0.9),0_0_50px_rgba(200,140,70,0.1)] flex flex-col lg:flex-row overflow-hidden"
                style={{
                  background: 'linear-gradient(to right, #24160E 0%, #1A0F0A 50%, #24160E 100%)',
                }}
              >
                {/* 4 Antique Brass Corner Protectors */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-600/70 pointer-events-none rounded-tl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-600/70 pointer-events-none rounded-tr" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-600/70 pointer-events-none rounded-bl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-600/70 pointer-events-none rounded-br" />

                {/* ========================================== */}
                {/* LEFT SPREAD: PHOTOGRAPHIC EVIDENCE BOARD   */}
                {/* ========================================== */}
                <div
                  className="flex-1 p-5 sm:p-7 relative overflow-y-auto border-b lg:border-b-0 lg:border-r border-[#3D2517]"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 30%, #EFE5D0 0%, #E3D4BC 60%, #D4C3A6 100%)',
                    boxShadow: 'inset 0 0 30px rgba(80, 50, 20, 0.25)',
                  }}
                >
                  {/* Subtle aged paper grain lines */}
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, #5A3D28 0, #5A3D28 1px, transparent 1px, transparent 26px)',
                    }}
                  />

                  {/* Header of Left Page */}
                  <div className="relative z-10 flex items-center justify-between pb-3 border-b-2 border-[#8C6B4B]/30 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#8C6B4B]/20 text-[#5C3D22] font-bold text-xs flex items-center justify-center font-mono">
                        {safeIndex + 1}
                      </span>
                      <span
                        className="text-xs tracking-[0.18em] font-bold text-[#4A321E] uppercase"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        PHYSICAL EVIDENCE EXHIBITS
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#7A5B3E] font-semibold">
                      DATE: {activePost.timestamp.split('T')[0] || '2026.11.21'}
                    </span>
                  </div>

                  {/* POLAROID & EVIDENCE CARD COLLAGE */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Polaroid 1: Contraband / Subject Exhibit (Tilted -2.5deg) */}
                    <motion.div
                      whileHover={{ scale: 1.04, rotate: 0 }}
                      onClick={() =>
                        setExpandedEvidence({
                          title: 'Primary Contraband Subject',
                          tag: 'EXHIBIT // ALPHA-01',
                          content: activePost.rawText,
                          type: 'CONTRABAND',
                        })
                      }
                      className="cursor-pointer bg-white p-2.5 pb-3 rounded shadow-xl border border-stone-300 transform -rotate-2 transition-transform relative group"
                    >
                      {/* Brass Paperclip at top-left */}
                      <div className="absolute -top-3 left-6 w-3 h-7 border-2 border-amber-700 rounded-full opacity-80 pointer-events-none" />

                      {/* Photo Thumbnail Container */}
                      <div
                        className="w-full h-32 rounded bg-[#1B140F] flex flex-col items-center justify-center p-3 relative overflow-hidden"
                        style={{
                          background:
                            activePost.categories[0] === 'ARMS'
                              ? 'linear-gradient(135deg, #2D1412 0%, #150A09 100%)'
                              : activePost.categories[0] === 'DOCUMENTS'
                              ? 'linear-gradient(135deg, #1C1226 0%, #0F0916 100%)'
                              : activePost.categories[0] === 'FINANCIAL'
                              ? 'linear-gradient(135deg, #261A0C 0%, #130B04 100%)'
                              : 'linear-gradient(135deg, #0A1E26 0%, #051014 100%)',
                        }}
                      >
                        <ShieldAlert className="w-8 h-8 mb-1" style={{ color: catStyle.text }} />
                        <span className="text-[11px] font-mono font-bold tracking-wider text-white text-center">
                          {catStyle.label}
                        </span>
                        <span className="text-[9px] font-mono text-stone-400 mt-0.5">
                          {activePost.districtName} POLICE JURISDICTION
                        </span>
                        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-amber-400/70">
                          CONF: {(activePost.confidence * 100).toFixed(0)}%
                        </div>
                      </div>

                      {/* Polaroid Caption */}
                      <div className="mt-2 text-center">
                        <div className="text-[10px] font-mono font-bold text-stone-800 tracking-wide uppercase">
                          EXHIBIT #01 · {activePost.categories[0]}
                        </div>
                        <div className="text-[9px] text-stone-500 font-serif italic">
                          Click to inspect high-res seizure
                        </div>
                      </div>
                    </motion.div>

                    {/* Polaroid 2: Intercepted Telegram Screen Capture (Tilted +2deg) */}
                    <motion.div
                      whileHover={{ scale: 1.04, rotate: 0 }}
                      onClick={() =>
                        setExpandedEvidence({
                          title: `Telegram Broadcast // ${activePost.channel}`,
                          tag: 'EXHIBIT // BETA-02',
                          content: activePost.rawText,
                          type: 'CHAT',
                        })
                      }
                      className="cursor-pointer bg-white p-2.5 pb-3 rounded shadow-xl border border-stone-300 transform rotate-2 transition-transform relative group"
                    >
                      {/* Red Stamp Label */}
                      <div className="absolute -top-2 right-4 bg-red-700 text-white font-mono text-[8px] font-bold px-1.5 py-0.5 rounded shadow">
                        AUTHENTICATED
                      </div>

                      {/* Simulated Screen Capture */}
                      <div className="w-full h-32 rounded bg-[#0A0E17] p-2 flex flex-col justify-between border border-cyan-900/40 font-mono text-[9px]">
                        <div className="flex items-center justify-between text-cyan-400 border-b border-cyan-950/60 pb-1">
                          <span>{activePost.channel}</span>
                          <span className="text-stone-500 text-[8px]">{activePost.views} views</span>
                        </div>
                        <p className="text-stone-300 line-clamp-3 leading-tight my-auto font-sans text-[10px]">
                          "{activePost.rawText}"
                        </p>
                        <div className="flex items-center justify-between text-[8px] text-emerald-400 pt-1 border-t border-cyan-950/60">
                          <span>SEC 63 BSA COMPLIANT</span>
                          <span>{activePost.capturedAt}</span>
                        </div>
                      </div>

                      <div className="mt-2 text-center">
                        <div className="text-[10px] font-mono font-bold text-stone-800 tracking-wide uppercase">
                          EXHIBIT #02 · TELEGRAM CHAT
                        </div>
                        <div className="text-[9px] text-stone-500 font-serif italic">
                          Tamper-proof digital packet
                        </div>
                      </div>
                    </motion.div>

                    {/* Evidence Card 3: District Tactical Jurisdiction Sector */}
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      onClick={() =>
                        setExpandedEvidence({
                          title: `${activePost.districtName} District Coordination`,
                          tag: 'TACTICAL SECTOR // MAP',
                          content: `Identified nexus coordinates centered on ${activePost.districtName} district (41 districts / 7 divisions). Evidence indicates drop and pickup locations active in border areas.`,
                          type: 'MAP',
                        })
                      }
                      className="cursor-pointer bg-[#F7F2E7] p-3 rounded shadow-lg border border-[#C5B396] relative col-span-1"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-mono font-bold text-stone-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-red-600" />
                          <span>SECTOR: {activePost.districtName.toUpperCase()}</span>
                        </span>
                        <span className="text-[8px] font-mono text-stone-500">TAG #03</span>
                      </div>
                      <div className="h-16 rounded bg-[#1B231D] flex items-center justify-center p-2 text-center border border-emerald-950">
                        <span className="font-mono text-emerald-400 text-[10px] leading-tight">
                          RAJASTHAN POLICE DISPATCH<br />
                          <span className="text-white font-bold">{activePost.districtName} CYBER CELL</span>
                        </span>
                      </div>
                      <div className="mt-1.5 text-[9px] text-stone-600 font-mono flex items-center justify-between">
                        <span>Threat: CRITICAL</span>
                        <span className="text-red-700 font-semibold">FLAGGED</span>
                      </div>
                    </motion.div>

                    {/* Evidence Card 4: Four-Layer Cryptographic Chain of Custody (Section 63 BSA) */}
                    <div className="bg-[#F7F2E7] p-2.5 rounded shadow-lg border border-[#C5B396] relative col-span-1 flex flex-col justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] font-mono font-bold text-stone-700 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-emerald-700" />
                            <span>FOUR-LAYER CRYPTO INTEGRITY</span>
                          </span>
                          <span className="text-[8px] font-mono bg-emerald-700/10 text-emerald-800 px-1 rounded border border-emerald-700/20 font-bold">
                            SEC 63 BSA
                          </span>
                        </div>

                        {/* Layer 1: Append-Only Hash Chain */}
                        <div className="bg-[#0A0D14] p-1.5 rounded border border-stone-800 text-[7.5px] font-mono">
                          <div className="text-[7px] text-stone-500 uppercase tracking-wider font-bold">L1 · APPEND-ONLY HASH CHAIN:</div>
                          <div className="text-cyan-400 break-all leading-tight font-mono">
                            <span className="text-stone-500">PREV:</span> {(activePost.cryptoLayers?.prevHash || '000000000019d668...').slice(0, 14)}… &rarr; <span className="text-stone-300">CURR:</span> {activePost.sha256.slice(0, 16)}…
                          </div>
                        </div>

                        {/* Layer 2 & 3: Ed25519 & RFC 3161 */}
                        <div className="grid grid-cols-2 gap-1 text-[7.5px] font-mono">
                          <div className="bg-[#EADECA] p-1 rounded border border-[#BFAC8E]">
                            <div className="text-stone-600 font-bold text-[7px]">L2 · ED25519 KEY</div>
                            <div className="text-emerald-800 font-bold truncate">RAJ-CYBER-NODE-01</div>
                          </div>
                          <div className="bg-[#EADECA] p-1 rounded border border-[#BFAC8E]">
                            <div className="text-stone-600 font-bold text-[7px]">L3 · RFC 3161 ANCHOR</div>
                            <div className="text-amber-800 font-bold truncate">CERT-In NTP Stratum-1</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1">
                        <button
                          onClick={handleCopyHash}
                          className="py-1 px-1 rounded bg-[#E4D5BC] hover:bg-[#D5C4A6] text-[#4A321E] border border-[#B39F80] text-[8px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          {copied ? <Check className="w-2.5 h-2.5 text-emerald-700" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>{copied ? 'COPIED' : 'COPY HASH'}</span>
                        </button>

                        <button
                          onClick={() => {
                            sound.playClick();
                            setShowRawJsonModal(true);
                          }}
                          className="py-1 px-1 rounded bg-[#2D1B0B] hover:bg-[#3D2517] text-cyan-300 border border-cyan-800/40 text-[8px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <FileText className="w-2.5 h-2.5 text-cyan-400" />
                          <span>RAW WIRE JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Extracted Identifiers Monospace Strip at bottom of left page */}
                  <div className="relative z-10 mt-4 p-2.5 rounded bg-[#E7DAC2] border border-[#BFAC8E] text-[10px] font-mono space-y-1 text-stone-800">
                    <div className="font-bold text-[#5A3B20] text-[9px] uppercase tracking-wider">
                      EXTRACTED CROSS-CHANNEL IDENTIFIERS:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activePost.entities.upis.map((u) => (
                        <span key={u} className="px-1.5 py-0.5 rounded bg-white text-cyan-800 border border-stone-300 font-bold">
                          UPI: {u}
                        </span>
                      ))}
                      {activePost.entities.phones.map((p) => (
                        <span key={p} className="px-1.5 py-0.5 rounded bg-white text-amber-800 border border-stone-300 font-bold">
                          TEL: {p}
                        </span>
                      ))}
                      {activePost.entities.wallets.map((w) => (
                        <span key={w} className="px-1.5 py-0.5 rounded bg-white text-rose-800 border border-stone-300 font-bold">
                          CRYPTO: {w.slice(0, 8)}…{w.slice(-4)}
                        </span>
                      ))}
                      {activePost.entities.handles.map((h) => (
                        <span key={h} className="px-1.5 py-0.5 rounded bg-white text-purple-800 border border-stone-300 font-bold">
                          HANDLE: {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ======================================================== */}
                {/* CENTRAL SPIRAL RING BINDER MECHANISM (6 Metal Rings)    */}
                {/* ======================================================== */}
                <div className="relative w-full lg:w-12 h-6 lg:h-full bg-gradient-to-r from-[#1A0E08] via-[#2A170D] to-[#1A0E08] flex lg:flex-col items-center justify-around py-3 px-2 z-20 shadow-inner">
                  {[0, 1, 2, 3, 4, 5].map((ringIdx) => (
                    <div key={ringIdx} className="relative flex items-center justify-center">
                      {/* Left paper punch hole */}
                      <div className="hidden lg:block absolute -left-3 w-3 h-3 rounded-full bg-[#140C07] shadow-inner" />
                      {/* Metal Spiral Ring */}
                      <div className="w-8 h-4 lg:w-4 lg:h-10 rounded-full bg-gradient-to-b from-stone-300 via-stone-100 to-stone-500 shadow-xl border border-stone-600/80 transform rotate-12 lg:rotate-0" />
                      {/* Right paper punch hole */}
                      <div className="hidden lg:block absolute -right-3 w-3 h-3 rounded-full bg-[#140C07] shadow-inner" />
                    </div>
                  ))}
                </div>

                {/* ======================================================== */}
                {/* RIGHT SPREAD: OFFICIAL LEGAL DOSSIER PARCHMENT          */}
                {/* ======================================================== */}
                <div
                  className="flex-1 p-5 sm:p-7 relative overflow-y-auto flex flex-col justify-between"
                  style={{
                    background:
                      'radial-gradient(circle at 70% 30%, #F5ECDA 0%, #E8DBC3 60%, #D8C7A9 100%)',
                    boxShadow: 'inset 0 0 35px rgba(80, 50, 20, 0.28)',
                  }}
                >
                  {/* Subtle watermarked police crest in background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                    <ShieldCheck className="w-96 h-96 text-stone-900" />
                  </div>

                  <div>
                    {/* Official Archival Letterhead */}
                    <div className="text-center pb-3 border-b-2 border-[#8C6B4B]/30 mb-4">
                      <div
                        className="text-sm sm:text-base font-bold tracking-[0.2em] text-[#3E2512] uppercase"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        RAJASTHAN POLICE STATE CYBER CRIME CELL
                      </div>
                      <div className="text-[10px] font-mono text-[#6E4F32] tracking-wider mt-0.5">
                        SPECIAL OSINT INVESTIGATION DIVISION · JAIPUR HEADQUARTERS
                      </div>
                      <div className="text-[11px] font-mono font-bold text-red-900 tracking-widest mt-1">
                        CONFIDENTIAL EVIDENCE DOSSIER // SECTION 63 BSA
                      </div>
                    </div>

                    {/* Official Legal Transcript Statement */}
                    <div className="space-y-3 font-serif text-[#332014] text-xs sm:text-sm leading-relaxed">
                      <p className="italic text-justify">
                        "I, Cyber Inspector on duty at the Rajasthan Police State Cyber Cell, hereby certify that the digital intelligence record recorded herein has been captured in real time via automated OSINT intercept mechanisms in accordance with the Schedule to Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 (BSA). This extract is designed to support statutory compliance and forensic integrity."
                      </p>

                      <div className="p-3 rounded bg-[#EADECA] border border-[#BFAC8E] font-mono text-xs space-y-1.5 text-stone-900">
                        <div className="flex justify-between items-center text-[11px] border-b border-[#C8B89E] pb-1">
                          <span className="text-stone-600">CASE DOSSIER ID:</span>
                          <span className="font-bold text-red-900">#CR-RAJ-2026-{activePost.id.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-stone-600">BROADCAST CHANNEL:</span>
                          <span className="font-bold text-cyan-900">{activePost.channel}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-stone-600">CRIME VERTICAL:</span>
                          <span className="font-bold" style={{ color: catStyle.text }}>
                            {activePost.categories.join(' · ')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-stone-600">ESTIMATED REACH:</span>
                          <span>{activePost.channelSubscribers || 'Public Telegram Channel'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-stone-600">ALGORITHM MATCH:</span>
                          <span className="font-bold text-emerald-800">
                            {(activePost.confidence * 100).toFixed(0)}% CONFIDENCE
                          </span>
                        </div>
                      </div>

                      {/* Raw Post Message Transcript Box */}
                      <div className="p-3 rounded bg-[#FFFDF8] border border-[#C5B396] shadow-sm">
                        <div className="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider mb-1">
                          AUTHENTICATED MESSAGE RECORD:
                        </div>
                        <p className="font-sans text-xs sm:text-sm text-stone-900 italic leading-relaxed">
                          "{activePost.rawText}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ======================================================== */}
                  {/* AUTHENTIC 3D RED WAX SEAL STAMP & OFFICIAL SIGN-OFF      */}
                  {/* (Directly modeled on the Wax Seal in the reference image) */}
                  {/* ======================================================== */}
                  <div className="mt-4 pt-3 border-t-2 border-[#8C6B4B]/30 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-stone-600 uppercase">
                        EXAMINING OFFICER / I.O.:
                      </div>
                      <div
                        className="text-xs font-bold text-[#3B2210] mt-0.5"
                        style={{ fontFamily: "'Cinzel', serif" }}
                      >
                        CYBER CELL INSP. // RAJ-049
                      </div>
                      <div className="text-[9px] font-mono text-emerald-800 font-semibold mt-0.5">
                        STATUS: HASH VERIFIED · AWAITING I.O. ENDORSEMENT
                      </div>
                    </div>

                    {/* INTERACTIVE 3D RED WAX SEAL STAMP */}
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={handleWaxSealClick}
                      className="cursor-pointer relative flex flex-col items-center group"
                      title="Click to stamp & generate Section 63 BSA certified forensic dossier"
                    >
                      {/* Ribbon tails below wax seal */}
                      <div className="absolute top-8 w-6 h-9 flex justify-center pointer-events-none">
                        <div className="w-2.5 h-full bg-red-900 transform -rotate-12 shadow" />
                        <div className="w-2.5 h-full bg-red-800 transform rotate-12 shadow" />
                      </div>

                      {/* 3D Wax Seal Body */}
                      <div
                        className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(153,27,27,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-red-700/80 transition-transform"
                        style={{
                          background:
                            'radial-gradient(circle at 35% 35%, #DC2626 0%, #B91C1C 45%, #7F1D1D 85%, #450A0A 100%)',
                        }}
                      >
                        {/* Embossed Ring & Emblem */}
                        <div className="w-12 h-12 rounded-full border border-red-900/60 flex items-center justify-center shadow-inner">
                          <ShieldCheck className="w-7 h-7 text-red-100 opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                        </div>

                        {/* Wax gloss specular highlight */}
                        <div className="absolute top-1.5 left-2.5 w-4 h-2 rounded-full bg-white/40 transform -rotate-45 pointer-events-none" />
                      </div>

                      <span className="text-[8px] font-mono text-red-900 font-bold uppercase mt-1 tracking-tighter group-hover:underline">
                        SEAL · EXPORT SEC 63 BSA PDF
                      </span>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* VINTAGE BRASS PAGE FLIPPER NAVIGATION (< 16/60 >)        */}
              {/* ======================================================== */}
              <div className="mt-3 flex items-center justify-between px-4">
                <button
                  onClick={handlePrevCase}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#241710] hover:bg-[#342217] border border-[#523722] text-xs font-mono text-amber-200 hover:text-white transition-all shadow active:translate-y-0.5"
                >
                  <ChevronLeft className="w-4 h-4 text-amber-400" />
                  <span>PREVIOUS CASE</span>
                </button>

                {/* Center Page Turn Dial */}
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-500/40" />
                  <span
                    className="text-xs font-mono font-bold tracking-widest text-amber-300"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    CASE {safeIndex + 1} OF {caseList.length} · {activePost.channel}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-amber-500/40" />
                </div>

                <button
                  onClick={handleNextCase}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#241710] hover:bg-[#342217] border border-[#523722] text-xs font-mono text-amber-200 hover:text-white transition-all shadow active:translate-y-0.5"
                >
                  <span>NEXT CASE</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* ============================================================ */
            /* VIEW 2: ARCHIVE CASE VOLUMES SHELF (Middle Reference Style)  */
            /* ============================================================ */
            <motion.div
              key="shelf-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative w-full max-w-5xl flex flex-col items-center justify-center p-4 space-y-8"
            >
              <div className="text-center space-y-1">
                <div
                  className="text-lg sm:text-2xl font-bold tracking-[0.25em] text-amber-300 uppercase"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  RAJASTHAN POLICE // CASE DOSSIER ARCHIVE
                </div>
                <p className="text-xs font-serif text-stone-400 italic">
                  Select an embossed investigative case volume from the shelf to open its forensic evidence scrapbook.
                </p>
              </div>

              {/* 3D EMBOSSED CASE BOOKS STANDING ON DESK */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                {/* Book 1: Golden-Brown Leather (Narcotics) */}
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => {
                    const narcoticsCase = caseList.find((p) => p.categories.includes('DRUGS')) || caseList[0];
                    sound.playPageTurn();
                    setActivePost(narcoticsCase);
                    setViewMode('BINDER');
                  }}
                  className="cursor-pointer relative h-80 rounded-r-2xl rounded-l-md p-6 flex flex-col justify-between shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] border-2 border-[#8A5A2B] group"
                  style={{
                    background:
                      'linear-gradient(135deg, #7C5325 0%, #4D3113 60%, #301E0A 100%)',
                  }}
                >
                  {/* Brass Corner Protectors */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-amber-300/60 rounded-tr" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-300/60 rounded-br" />

                  {/* Spine Ribs */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#231507] border-r border-[#6B441B] rounded-l-md shadow-inner" />

                  {/* Gold Foil Crest */}
                  <div className="text-center space-y-2 mt-4">
                    <ShieldCheck className="w-12 h-12 mx-auto text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    <div
                      className="text-sm font-bold tracking-[0.2em] text-amber-200 uppercase"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      VOLUME I · NARCOTICS
                    </div>
                    <div className="text-[10px] font-mono text-amber-400/80">
                      DELHI-JAIPUR HIGHWAY CORRIDOR
                    </div>
                  </div>

                  {/* Case Details */}
                  <div className="space-y-1 text-center font-mono text-xs text-amber-100/70 pt-4 border-t border-amber-500/30">
                    <div>CHANNEL: @delhi_highs</div>
                    <div>NEXUS: JAIPUR / BIKANER</div>
                    <div className="text-emerald-400 font-bold text-[10px]">SEC 63 BSA CERTIFIED</div>
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-mono px-3 py-1 rounded bg-[#2D1B0B] text-amber-300 border border-amber-600/50 group-hover:bg-amber-600 group-hover:text-black font-bold transition-colors">
                      OPEN CASE BINDER &rarr;
                    </span>
                  </div>
                </motion.div>

                {/* Book 2: Deep Crimson Leather with Ribbon & Wax Seal (Arms Case) */}
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => {
                    const armsCase = caseList.find((p) => p.categories.includes('ARMS')) || caseList[2] || caseList[0];
                    sound.playPageTurn();
                    setActivePost(armsCase);
                    setViewMode('BINDER');
                  }}
                  className="cursor-pointer relative h-80 rounded-r-2xl rounded-l-md p-6 flex flex-col justify-between shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.2)] border-2 border-red-900 group"
                  style={{
                    background:
                      'linear-gradient(135deg, #7F1D1D 0%, #450A0A 60%, #200404 100%)',
                  }}
                >
                  {/* Brass Corner Protectors */}
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-400/60 rounded-tr" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-400/60 rounded-br" />

                  {/* Spine Ribs */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#1C0505] border-r border-red-950 rounded-l-md shadow-inner" />

                  {/* Horizontal Paper Ribbon Band across center with Red Wax Seal */}
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-10 bg-[#E8DCB8] border-y border-[#B09E75] shadow flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-red-700 shadow-xl border border-red-900 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-100" />
                    </div>
                  </div>

                  {/* Gold Foil Crest */}
                  <div className="text-center space-y-2 mt-4 relative z-10">
                    <ShieldAlert className="w-12 h-12 mx-auto text-red-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    <div
                      className="text-sm font-bold tracking-[0.2em] text-red-200 uppercase"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      VOLUME II · ARMS TRADE
                    </div>
                    <div className="text-[10px] font-mono text-red-300/80">
                      MEWAT-ALWAR WEAPONS HUB
                    </div>
                  </div>

                  {/* Case Details */}
                  <div className="space-y-1 text-center font-mono text-xs text-red-100/70 pt-4 border-t border-red-500/30 relative z-10">
                    <div>CHANNEL: @rajasthan_arms_hub</div>
                    <div>NEXUS: ALWAR / SIKAR</div>
                    <div className="text-red-400 font-bold text-[10px]">THREAT: CRITICAL</div>
                  </div>

                  <div className="text-center relative z-10">
                    <span className="text-[10px] font-mono px-3 py-1 rounded bg-[#2D0A0A] text-red-300 border border-red-600/50 group-hover:bg-red-600 group-hover:text-white font-bold transition-colors">
                      OPEN CASE BINDER &rarr;
                    </span>
                  </div>
                </motion.div>

                {/* Book 3: Ghosted Gold Blueprint Book (Upcoming Cases) */}
                <motion.div
                  whileHover={{ y: -4 }}
                  onClick={() => {
                    sound.playClick();
                    const docCase = caseList.find((p) => p.categories.includes('DOCUMENTS')) || caseList[3] || caseList[0];
                    setActivePost(docCase);
                    setViewMode('BINDER');
                  }}
                  className="cursor-pointer relative h-80 rounded-r-2xl rounded-l-md p-6 flex flex-col justify-between shadow-xl border-2 border-dashed border-amber-600/40 bg-[#160E08]/70 backdrop-blur-sm group hover:border-amber-400"
                >
                  <div className="text-center space-y-2 mt-8">
                    <Sparkles className="w-10 h-10 mx-auto text-amber-400/60 animate-pulse" />
                    <div
                      className="text-sm font-bold tracking-[0.2em] text-amber-300 uppercase"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      VOLUME III · DOC FORGERY
                    </div>
                    <div className="text-[10px] font-mono text-stone-400">
                      KOTA BIOMETRIC BYPASS GUILD
                    </div>
                  </div>

                  <div className="text-center text-xs font-serif text-stone-400 italic px-4">
                    "Aadhaar card biometric bypass and fake PAN card syndicate under judicial investigation."
                  </div>

                  <div className="text-center">
                    <span className="text-[10px] font-mono px-3 py-1 rounded bg-[#28180E] text-amber-300 border border-amber-600/40 font-semibold group-hover:bg-amber-600 group-hover:text-black transition-colors">
                      LOAD ARCHIVE FILE &rarr;
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ======================================================== */}
      {/* 4. EXPANDED EVIDENCE LIGHTBOX MODAL                      */}
      {/* ======================================================== */}
      <AnimatePresence>
        {expandedEvidence && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setExpandedEvidence(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1C120C] border-2 border-[#5C3D24] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 font-sans text-amber-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#3D2817]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                    {expandedEvidence.tag}
                  </span>
                  <span
                    className="font-bold text-sm tracking-wide text-amber-200"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {expandedEvidence.title}
                  </span>
                </div>
                <button
                  onClick={() => setExpandedEvidence(null)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/[0.05]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-[#0F0A06] border border-[#3A2414] font-mono text-xs text-stone-300 space-y-3">
                <div className="text-[10px] text-amber-400/80">INTERCEPT TRANSCRIPT:</div>
                <p className="italic text-sm text-stone-100 leading-relaxed font-serif">
                  "{expandedEvidence.content}"
                </p>
                <div className="pt-2 border-t border-stone-800 flex justify-between text-[10px] text-stone-400">
                  <span>JURISDICTION: {activePost.districtName}</span>
                  <span>TIME: {activePost.capturedAt}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setExpandedEvidence(null)}
                  className="px-4 py-2 rounded-lg bg-[#2A180E] hover:bg-[#3D2517] text-xs font-mono text-amber-200 transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* 5. RAW WIRE PAYLOAD PRESERVATION MODAL (LAYER 4) */}
        {showRawJsonModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 font-mono"
            onClick={() => setShowRawJsonModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D0907] border-2 border-emerald-900/60 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-emerald-100 max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-sm tracking-widest text-emerald-300">
                      RAW WIRE PAYLOAD · FORENSIC ARTIFACT
                    </h3>
                    <p className="text-[10px] text-stone-400 font-sans">
                      Section 63 BSA Part B Digital Evidence · Exact Unmodified Telegram MTProto Intercept Stream
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyRawJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-xs text-emerald-200 transition-colors"
                  >
                    {copiedRawJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-emerald-400" />
                        <span>COPY JSON</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadRawJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-xs text-emerald-200 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>EXPORT .JSON</span>
                  </button>
                  <button
                    onClick={() => setShowRawJsonModal(false)}
                    className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-white/[0.05]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Payload metadata banner */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/30 text-[10px]">
                <div>
                  <span className="text-stone-400">ORIGIN:</span>{' '}
                  <span className="text-emerald-300 font-bold">{activePost.channel}</span>
                </div>
                <div>
                  <span className="text-stone-400">TIMESTAMP:</span>{' '}
                  <span className="text-emerald-300">{activePost.capturedAt}</span>
                </div>
                <div>
                  <span className="text-stone-400">SHA-256 DIGEST:</span>{' '}
                  <span className="text-emerald-300 font-mono truncate block" title={activePost.sha256}>
                    {activePost.sha256 ? `${activePost.sha256.substring(0, 16)}...` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* JSON Code Viewer */}
              <div className="flex-1 overflow-auto p-4 rounded-xl bg-black border border-emerald-900/40 text-xs text-emerald-400/90 font-mono leading-relaxed select-text shadow-inner">
                <pre>{rawJsonContent}</pre>
              </div>

              <div className="pt-2 border-t border-emerald-900/30 flex items-center justify-between text-[10px] text-stone-400">
                <span>Cryptographic Layer 4 / 4: RFC 3161 Timestamped + Ed25519 Signed Wire Stream</span>
                <button
                  onClick={() => setShowRawJsonModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200"
                >
                  Close Artifact
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
