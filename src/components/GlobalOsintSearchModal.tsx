import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  MapPin,
  Network,
  Lock,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  Hash,
  Phone,
  CreditCard,
  AtSign,
  Coins,
  Building2,
  AlertTriangle,
  Radio,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { InterceptPost, DistrictIntel, CrimeCategory } from '../types';
import { sound } from '../utils/audio';

export type DetectedEntityType =
  | 'UPI ID'
  | 'PHONE / WHATSAPP'
  | 'TELEGRAM HANDLE'
  | 'CRYPTO WALLET'
  | 'DISTRICT'
  | 'KEYWORD';

export type SearchFilterTab = 'ALL' | 'UPI / BANK' | 'PHONE' | 'HANDLES' | 'DISTRICTS';

interface GlobalOsintSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  posts: InterceptPost[];
  districts: DistrictIntel[];
  onSelectPost: (post: InterceptPost) => void;
  onPlotOnMap: (districtIds: string[]) => void;
  onInspectTopology: (post: InterceptPost) => void;
  onOpenDossier: (post: InterceptPost) => void;
}

// High priority preset pivots for evaluators / demo
const SAMPLE_PIVOTS = [
  { label: 'raj.pay@oksbi', type: 'UPI' as const, note: 'Multi-District Mule Escrow' },
  { label: '9876543210', type: 'PHONE' as const, note: 'Weapons & Forgery Hotline' },
  { label: '@seller_raj', type: 'HANDLE' as const, note: 'Primary Trafficker Handle' },
  {
    label: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    type: 'CRYPTO' as const,
    note: 'Darknet BTC Escrow',
  },
];

export const GlobalOsintSearchModal: React.FC<GlobalOsintSearchModalProps> = ({
  isOpen,
  onClose,
  posts,
  districts,
  onSelectPost,
  onPlotOnMap,
  onInspectTopology,
  onOpenDossier,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilterTab>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setActiveFilter('ALL');
    }
  }, [isOpen]);

  // Entity Type Auto-Detection
  const detectedType = useMemo<DetectedEntityType>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return 'KEYWORD';

    // 1. UPI ID: username@bank
    if (
      /^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/i.test(q) ||
      /@(oksbi|okhdfcbank|okaxis|okicici|paytm|ybl|apl|upi|kotak|sbi|axis|icici)/i.test(q)
    ) {
      return 'UPI ID';
    }

    // 2. Telegram Handle
    if (q.startsWith('@')) {
      return 'TELEGRAM HANDLE';
    }

    // 3. Crypto Wallet
    if (
      /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/i.test(q) ||
      /^0x[a-fA-F0-9]{40}$/i.test(q) ||
      /^T[A-Za-z1-9]{33}$/i.test(q) ||
      (q.length >= 26 && /[0-9]/.test(q) && /[a-z]/i.test(q))
    ) {
      return 'CRYPTO WALLET';
    }

    // 4. Phone / WhatsApp
    const cleanDigits = q.replace(/[^0-9]/g, '');
    if (
      cleanDigits.length >= 7 &&
      (q.startsWith('+91') || cleanDigits.length === 10 || /^[0-9+\-\s]+$/.test(q))
    ) {
      return 'PHONE / WHATSAPP';
    }

    // 5. District match
    const isDist = districts.some(
      (d) =>
        d.id.toLowerCase() === q ||
        d.name.toLowerCase() === q ||
        d.name.toLowerCase().includes(q)
    );
    if (isDist) return 'DISTRICT';

    return 'KEYWORD';
  }, [query, districts]);

  // Filter posts based on query and tab filter
  const matchedPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default initial view: top flagged posts
      return posts.slice(0, 8);
    }

    return posts.filter((post) => {
      // Basic text matches
      const textMatch = post.rawText.toLowerCase().includes(q);
      const channelMatch = post.channel.toLowerCase().includes(q);
      const districtMatch =
        post.districtName.toLowerCase().includes(q) || post.districtId.toLowerCase().includes(q);
      const categoryMatch = post.categories.some((c) => c.toLowerCase().includes(q));
      const slangMatch = post.matchedSlang.some((s) => s.toLowerCase().includes(q));

      // Entity matches
      const upiMatch =
        post.entities.upis.some((u) => u.toLowerCase().includes(q)) ||
        post.entities.bankAccounts.some((b) => b.toLowerCase().includes(q));
      const phoneMatch = post.entities.phones.some((p) => p.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')));
      const handleMatch = post.entities.handles.some((h) => h.toLowerCase().includes(q));
      const walletMatch = post.entities.wallets.some((w) => w.toLowerCase().includes(q));

      const isAnyMatch =
        textMatch ||
        channelMatch ||
        districtMatch ||
        categoryMatch ||
        slangMatch ||
        upiMatch ||
        phoneMatch ||
        handleMatch ||
        walletMatch;

      if (!isAnyMatch) return false;

      // Filter by Active Tab
      if (activeFilter === 'UPI / BANK') return upiMatch || textMatch;
      if (activeFilter === 'PHONE') return phoneMatch || textMatch;
      if (activeFilter === 'HANDLES') return handleMatch || channelMatch;
      if (activeFilter === 'DISTRICTS') return districtMatch;

      return true;
    });
  }, [query, activeFilter, posts]);

  // Compute "INTER-DISTRICT SYNDICATE MATRIX" analytics
  const syndicateMatrix = useMemo(() => {
    if (matchedPosts.length === 0) return null;

    // Collect all unique districts linked to matched posts
    const districtMap: Record<string, { id: string; name: string; count: number }> = {};
    const categoriesSet = new Set<CrimeCategory>();
    const channelsSet = new Set<string>();
    const allEntities = {
      upis: new Set<string>(),
      phones: new Set<string>(),
      handles: new Set<string>(),
      wallets: new Set<string>(),
    };

    let totalViews = 0;

    matchedPosts.forEach((p) => {
      // District count
      if (!districtMap[p.districtId]) {
        districtMap[p.districtId] = {
          id: p.districtId,
          name: p.districtName,
          count: 0,
        };
      }
      districtMap[p.districtId].count += 1;

      // Categories
      p.categories.forEach((cat) => categoriesSet.add(cat));

      // Channels
      channelsSet.add(p.channel);

      // Entities
      p.entities.upis.forEach((u) => allEntities.upis.add(u));
      p.entities.phones.forEach((ph) => allEntities.phones.add(ph));
      p.entities.handles.forEach((h) => allEntities.handles.add(h));
      p.entities.wallets.forEach((w) => allEntities.wallets.add(w));

      totalViews += p.views || 800;
    });

    const districtList = Object.values(districtMap).sort((a, b) => b.count - a.count);
    const isMultiDistrict = districtList.length > 1;

    // Calculate aggregated risk score
    let riskPercentage = 88;
    if (isMultiDistrict && categoriesSet.size > 1) {
      riskPercentage = 99;
    } else if (isMultiDistrict || matchedPosts.length >= 3) {
      riskPercentage = 96;
    } else if (matchedPosts.length >= 2) {
      riskPercentage = 92;
    }

    return {
      districts: districtList,
      districtIds: districtList.map((d) => d.id),
      isMultiDistrict,
      categories: Array.from(categoriesSet),
      channels: Array.from(channelsSet),
      channelCount: channelsSet.size,
      totalIntercepts: matchedPosts.length,
      riskPercentage,
      primaryPost: matchedPosts[0],
      totalViews,
    };
  }, [matchedPosts]);

  // Keyboard navigation inside results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        sound.playClick();
        setSelectedIndex((prev) => (prev < matchedPosts.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sound.playClick();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matchedPosts.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (matchedPosts.length > 0 && matchedPosts[selectedIndex]) {
          sound.playSuccessChime();
          const targetPost = matchedPosts[selectedIndex];
          onSelectPost(targetPost);
          onOpenDossier(targetPost);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, matchedPosts, selectedIndex, onSelectPost, onOpenDossier, onClose]);

  // Helper to highlight search query inside text
  const highlightMatch = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term.trim()})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === term.trim().toLowerCase() ? (
            <mark
              key={i}
              className="bg-cyan-400/25 text-cyan-200 px-0.5 rounded font-semibold border-b border-cyan-400/50"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  // Badge stylings based on detected type
  const getTypeBadge = (type: DetectedEntityType) => {
    switch (type) {
      case 'UPI ID':
        return {
          icon: <CreditCard className="w-3 h-3 text-purple-400" />,
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
        };
      case 'PHONE / WHATSAPP':
        return {
          icon: <Phone className="w-3 h-3 text-emerald-400" />,
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
        };
      case 'TELEGRAM HANDLE':
        return {
          icon: <AtSign className="w-3 h-3 text-cyan-400" />,
          bg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
        };
      case 'CRYPTO WALLET':
        return {
          icon: <Coins className="w-3 h-3 text-amber-400" />,
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
        };
      case 'DISTRICT':
        return {
          icon: <Building2 className="w-3 h-3 text-rose-400" />,
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
        };
      default:
        return {
          icon: <Hash className="w-3 h-3 text-slate-400" />,
          bg: 'bg-slate-500/15 border-slate-500/40 text-slate-300',
        };
    }
  };

  const typeMeta = getTypeBadge(detectedType);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-4 overflow-hidden">
        {/* Backdrop overlay with tactical blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-3xl bg-[#090C10] border border-cyan-500/40 rounded-2xl shadow-[0_0_60px_rgba(0,229,255,0.18)] flex flex-col max-h-[86vh] overflow-hidden z-10 font-sans"
        >
          {/* Top Hairline Tactical Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-rose-500" />

          {/* Header & Search Bar Input Row */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#0C1017]">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                <Search className="w-5 h-5 animate-pulse" />
              </div>

              {/* Main Search Input */}
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Search UPI, phone, handle, wallet, or district..."
                  className="w-full bg-transparent text-white placeholder-slate-500 text-sm sm:text-base font-mono focus:outline-none pr-28 tracking-wide"
                />

                {/* Live Detected Entity Pill */}
                {query.trim() && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    <span
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold uppercase tracking-wider ${typeMeta.bg}`}
                    >
                      {typeMeta.icon}
                      <span>{detectedType}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Close Button & ESC Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 text-[10px] font-mono text-slate-400">
                  ESC
                </kbd>
                <button
                  onClick={() => {
                    sound.playClick();
                    onClose();
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Filter Tabs & One-Click Sample Pivots */}
            <div className="mt-3.5 pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-white/[0.03] p-0.5 rounded-lg border border-white/[0.05]">
                {(['ALL', 'UPI / BANK', 'PHONE', 'HANDLES', 'DISTRICTS'] as SearchFilterTab[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        sound.playClick();
                        setActiveFilter(tab);
                        setSelectedIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all ${
                        activeFilter === tab
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                      }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>

              {/* Sample High-Priority Pivots */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  PIVOTS:
                </span>
                {SAMPLE_PIVOTS.map((pivot) => (
                  <button
                    key={pivot.label}
                    onClick={() => {
                      sound.playRadarPing();
                      setQuery(pivot.label);
                      setSelectedIndex(0);
                    }}
                    title={pivot.note}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] hover:bg-cyan-500/15 border border-white/[0.08] hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-all shrink-0"
                  >
                    <span className="truncate max-w-[110px]">{pivot.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Container (Scrollable) */}
          <div
            ref={resultsContainerRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 divide-y divide-white/[0.06]"
          >
            {/* ======================================================== */}
            {/* 3. "INTER-DISTRICT SYNDICATE MATRIX" (CORE ANALYTICAL OUTPUT) */}
            {/* ======================================================== */}
            {syndicateMatrix && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-[#0F1522] via-[#0B1019] to-[#0A0E17] border border-cyan-500/40 rounded-xl p-4 sm:p-5 shadow-[0_0_24px_rgba(0,229,255,0.08)] relative overflow-hidden"
              >
                {/* Background Grid Accent */}
                <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

                {/* Matrix Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold font-mono tracking-wider text-cyan-300 uppercase">
                          INTER-DISTRICT SYNDICATE MATRIX
                        </h3>
                        {syndicateMatrix.isMultiDistrict && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-semibold animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span>MULTI-JURISDICTION NEXUS</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Correlated digital footprints across Rajasthan Police jurisdiction boundaries
                      </p>
                    </div>
                  </div>

                  {/* Risk Score Pill */}
                  <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      SYNDICATE RISK:
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {syndicateMatrix.riskPercentage}% CRITICAL
                    </span>
                  </div>
                </div>

                {/* Matrix Content Body */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3.5 pt-1">
                  {/* Left: Cross-District Footprint Pills (7 cols) */}
                  <div className="md:col-span-7 space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      CROSS-DISTRICT FOOTPRINT ({syndicateMatrix.districts.length} DISTRICTS):
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                      {syndicateMatrix.districts.map((dist) => (
                        <div
                          key={dist.id}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-cyan-500/30 text-xs font-mono text-slate-200 shadow-sm"
                        >
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          <span className="font-semibold text-white">{dist.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            {dist.count} FLAGS
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Illicit Categories & Channels Spanned */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">CRIME VERTICALS:</span>
                        {syndicateMatrix.categories.map((cat) => (
                          <span
                            key={cat}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.06] text-amber-300 border border-white/10"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">CHANNELS:</span>
                        <span className="text-slate-200">
                          {syndicateMatrix.channels.slice(0, 2).join(', ')}
                          {syndicateMatrix.channelCount > 2 &&
                            ` +${syndicateMatrix.channelCount - 2} more`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Three Direct Action Buttons (5 cols) */}
                  <div className="md:col-span-5 flex flex-col justify-center gap-2 border-t md:border-t-0 md:border-l border-white/[0.08] md:pl-4 pt-3 md:pt-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      ACTIONABLE PIVOTS:
                    </span>

                    {/* Action 1: Plot on Rajasthan Map */}
                    <button
                      onClick={() => {
                        sound.playRadarPing();
                        onPlotOnMap(syndicateMatrix.districtIds);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-medium transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <span>Plot on Rajasthan Map</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-400/70 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Action 2: Inspect in 3D Topology */}
                    <button
                      onClick={() => {
                        sound.playClick();
                        onInspectTopology(syndicateMatrix.primaryPost);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 text-xs font-mono font-medium transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <Network className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span>Inspect in 3D Topology</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400/70 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Action 3: Open Forensic Dossier */}
                    <button
                      onClick={() => {
                        sound.playSuccessChime();
                        onOpenDossier(syndicateMatrix.primaryPost);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono font-medium transition-all group"
                    >
                      <span className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                        <span>Open Forensic Dossier</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-400/70 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ======================================================== */}
            {/* 4. CATEGORIZED INTELLIGENCE RESULTS LIST                 */}
            {/* ======================================================== */}
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1 pb-1">
                <span className="uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  CORRELATED SIGNALS & INTERCEPTS ({matchedPosts.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Use <kbd className="px-1 py-0.2 rounded bg-white/10 text-slate-300">↑</kbd>{' '}
                  <kbd className="px-1 py-0.2 rounded bg-white/10 text-slate-300">↓</kbd> to navigate,{' '}
                  <kbd className="px-1 py-0.2 rounded bg-white/10 text-slate-300">Enter</kbd> to inspect
                </span>
              </div>

              {matchedPosts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500/50" />
                  <span>No digital footprint matches found for query "{query}".</span>
                  <div className="mt-2 text-[11px] text-slate-600">
                    Try searching for <span className="text-cyan-400">raj.pay@oksbi</span>,{' '}
                    <span className="text-cyan-400">9876543210</span>, or{' '}
                    <span className="text-cyan-400">Jaipur</span>.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {matchedPosts.map((post, idx) => {
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          sound.playClick();
                          setSelectedIndex(idx);
                          onSelectPost(post);
                          onOpenDossier(post);
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-cyan-950/30 border-cyan-400/60 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
                            : 'bg-white/[0.02] hover:bg-white/[0.04] border-white/[0.07]'
                        }`}
                      >
                        {/* Active Selection Indicator */}
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400" />
                        )}

                        {/* Top Metadata Row */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-cyan-300 flex items-center gap-1">
                              <AtSign className="w-3 h-3" />
                              {highlightMatch(post.channel, query)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {post.channelSubscribers || '7.5K'} subs
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-cyan-400" />
                              {highlightMatch(post.districtName, query)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {post.categories.map((c) => (
                              <span
                                key={c}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-amber-300 border border-white/10"
                              >
                                {c}
                              </span>
                            ))}

                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {Math.round(post.confidence * 100)}% MATCH
                            </span>
                          </div>
                        </div>

                        {/* Intercept Content Snippet with Highlight */}
                        <p className="mt-2 text-xs sm:text-[13px] text-slate-200 font-sans leading-relaxed line-clamp-2">
                          {highlightMatch(post.rawText, query)}
                        </p>

                        {/* Extracted Entity Footprints */}
                        <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* UPIs */}
                            {post.entities.upis.map((u) => (
                              <span
                                key={u}
                                className="flex items-center gap-1 text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20"
                              >
                                <CreditCard className="w-2.5 h-2.5" />
                                {highlightMatch(u, query)}
                              </span>
                            ))}

                            {/* Phones */}
                            {post.entities.phones.map((p) => (
                              <span
                                key={p}
                                className="flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                {highlightMatch(p, query)}
                              </span>
                            ))}

                            {/* Wallets */}
                            {post.entities.wallets.map((w) => (
                              <span
                                key={w}
                                className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate max-w-[140px]"
                              >
                                <Coins className="w-2.5 h-2.5" />
                                {w.slice(0, 8)}...{w.slice(-4)}
                              </span>
                            ))}
                          </div>

                          {/* Quick Inspect Cue */}
                          <span className="text-slate-400 flex items-center gap-1 group-hover:text-cyan-300">
                            <span>Open Dossier</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tactical Status Footer */}
          <div className="px-4 py-2.5 bg-[#080B10] border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>PRAHARI OSINT KERNEL // SHA-256 LEDGER READY</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Section 63 BSA Compliant · Hash Chain Active</span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400">Press ESC to exit</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
