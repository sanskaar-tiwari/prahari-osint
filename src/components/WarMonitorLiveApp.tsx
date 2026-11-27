import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Shield,
  Radio,
  Network,
  Lock,
  Clock,
  Search,
  X,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Camera,
  MapPin,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Layers,
  Copy,
  Check,
  FileText,
  Activity,
} from 'lucide-react';
import { RajasthanMap } from './RajasthanMap';
import { LiveInterceptFeed } from './LiveInterceptFeed';
import { ForensicDossier } from './ForensicDossier';
import { EntityTopologyPage } from './EntityTopologyPage';
import { IntelModeModal } from './IntelModeModal';
import { UploadModal } from './UploadModal';
import { GlobalOsintSearchModal } from './GlobalOsintSearchModal';
import { InterceptPost, DistrictIntel, CrimeCategory, DistrictConnection } from '../types';
import {
  RAJASTHAN_DISTRICTS,
  DISTRICT_CONNECTIONS,
  INITIAL_INTERCEPTS,
  enrichPostWithCryptoLayers,
} from '../data/mockData';
import { sound } from '../utils/audio';
import { generateDossierPDF } from '../utils/pdfGenerator';
import { classifyText, generateSHA256 } from '../utils/detectionEngine';
import { renderHighlightedText } from '../utils/highlightIdentifiers';
import { prahariApi } from '../services/api';

interface WarMonitorLiveAppProps {
  onOpenEditorial: () => void;
}

export type WarMonitorNavTab = 'COMMAND' | 'TOPOLOGY' | 'DOSSIER';

export const WarMonitorLiveApp: React.FC<WarMonitorLiveAppProps> = ({ onOpenEditorial }) => {
  // Navigation Tab: COMMAND CENTER | 3D ENTITY TOPOLOGY | FORENSIC DOSSIER
  const [activeNavTab, setActiveNavTab] = useState<WarMonitorNavTab>('COMMAND');

  const [posts, setPosts] = useState<InterceptPost[]>(INITIAL_INTERCEPTS);
  const [districts, setDistricts] = useState<DistrictIntel[]>(RAJASTHAN_DISTRICTS);
  const [connections, setConnections] = useState<DistrictConnection[]>(DISTRICT_CONNECTIONS);
  const [selectedPost, setSelectedPost] = useState<InterceptPost | null>(INITIAL_INTERCEPTS[0]);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictIntel | null>(
    RAJASTHAN_DISTRICTS[0]
  );

  const [isIntelModeModalOpen, setIsIntelModeModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedDistricts, setHighlightedDistricts] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);
  const [isBackendLive, setIsBackendLive] = useState(false);

  // Active state filters
  const [activeCategory, setActiveCategory] = useState<CrimeCategory | 'ALL'>('ALL');
  const [copiedHash, setCopiedHash] = useState(false);
  const [isMuted, setIsMuted] = useState(!sound.enabled);
  const [clockUtc, setClockUtc] = useState('');

  // Active filtered intercepts (respecting category filter)
  const activeFilteredPosts = useMemo(() => {
    if (activeCategory === 'ALL') return posts;
    return posts.filter((p) => p.categories.includes(activeCategory));
  }, [posts, activeCategory]);

  // Dynamically compute cross-district syndicate connection arcs from shared identifiers
  const dynamicConnections = useMemo<DistrictConnection[]>(() => {
    type IdEntry = {
      districtId: string;
      category: CrimeCategory;
      type: DistrictConnection['type'];
      rawId: string;
    };
    const index = new Map<string, IdEntry[]>();

    const addEntry = (
      raw: string,
      type: DistrictConnection['type'],
      districtId: string,
      category: CrimeCategory
    ) => {
      const norm = raw.trim().toLowerCase();
      if (!norm || !districtId) return;
      const list = index.get(norm) || [];
      if (!list.some((item) => item.districtId.toLowerCase() === districtId.toLowerCase())) {
        list.push({ districtId: districtId.toLowerCase(), category, type, rawId: raw });
        index.set(norm, list);
      }
    };

    for (const p of activeFilteredPosts) {
      const cat = p.categories[0] || 'DRUGS';
      const dist = (p.districtId || '').toLowerCase();
      p.entities.upis.forEach((u) => addEntry(u, 'UPI', dist, cat));
      p.entities.phones.forEach((ph) => addEntry(ph.replace(/\s+/g, ''), 'PHONE', dist, cat));
      p.entities.bankAccounts.forEach((b) => addEntry(b, 'BANK', dist, cat));
      p.entities.wallets.forEach((w) => addEntry(w, 'CRYPTO', dist, cat));
      p.entities.handles.forEach((h) => addEntry(h, 'TELEGRAM', dist, cat));
    }

    const result: DistrictConnection[] = [];
    const seenPairs = new Set<string>();

    index.forEach((entries) => {
      if (entries.length < 2) return;
      for (let i = 0; i < entries.length - 1; i++) {
        const a = entries[i];
        const b = entries[i + 1];
        if (a.districtId === b.districtId) continue;
        const pairKey = [a.districtId, b.districtId].sort().join('::') + `::${a.type}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);
        result.push({
          id: `dyn-${a.districtId}-${b.districtId}-${a.type}-${result.length}`,
          from: a.districtId,
          to: b.districtId,
          identifier: a.rawId,
          type: a.type,
          category: a.category,
        });
      }
    });

    return result;
  }, [activeFilteredPosts]);

  // Global shortcut: Cmd + K / Ctrl + K to toggle OSINT Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        sound.playClick();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize audio state with global sound system singleton
  useEffect(() => {
    return sound.subscribe((enabled) => {
      setIsMuted(!enabled);
    });
  }, []);

  // Connect to live FastAPI backend on mount
  useEffect(() => {
    let isMounted = true;

    prahariApi.checkHealth().then((isLive) => {
      if (isMounted) setIsBackendLive(isLive);
      if (isLive) {
        prahariApi.getFeed().then((feed) => {
          if (isMounted && feed.length > 0) {
            setPosts((prev) => {
              const ids = new Set(prev.map((p) => p.id));
              const uniqueNew = feed.filter((f) => !ids.has(f.id));
              return [...uniqueNew, ...prev];
            });
            setSelectedPost(feed[0]);
          }
        });
      }
    });

    // Real-time WebSocket connection to Python engine
    const unsubscribe = prahariApi.subscribeToStream((newPost) => {
      sound.playRadarPing();
      setPosts((prev) => [newPost, ...prev.slice(0, 49)]);
      setSelectedPost(newPost);
      setDistricts((prev) =>
        prev.map((d) =>
          d.id === newPost.districtId ? { ...d, flaggedCount: d.flaggedCount + 1 } : d
        )
      );
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Clock formatted in UTC / IST
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockUtc(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Background feed simulation: generates live intercepts every 12 seconds
  useEffect(() => {
    if (!isSimulating) return;

    const sampleSimulations = [
      {
        channel: '@border_drop_01',
        text: 'Chitta delivery ready at Sri Ganganagar border point. 10g pure white score, payment via UPI raj.pay@oksbi',
        districtId: 'ganganagar',
        category: 'DRUGS' as CrimeCategory,
      },
      {
        channel: '@mule_bazaar',
        text: 'New current account kit with ATM card + netbanking SIM available for rent. Jaipur delivery. Escrow verified.',
        districtId: 'jaipur',
        category: 'FINANCIAL' as CrimeCategory,
      },
      {
        channel: '@shekhawati_weapons',
        text: 'Desi 315 bore katta with 10 raund available. Alwar / Sikar pickup only. DM @seller_raj or WhatsApp 9876543210',
        districtId: 'alwar',
        category: 'ARMS' as CrimeCategory,
      },
      {
        channel: '@doc_forge_raj',
        text: 'Aadhaar card biometric bypass + Driving license original PVC card dispatched to Kota client.',
        districtId: 'kota',
        category: 'DOCUMENTS' as CrimeCategory,
      },
    ];

    let idx = 0;
    const interval = setInterval(async () => {
      const sim = sampleSimulations[idx % sampleSimulations.length];
      idx++;

      const detected = classifyText(sim.text);
      const sha = await generateSHA256(sim.text + Date.now().toString());
      const now = new Date();

      const newPost: InterceptPost = {
        id: `sim_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
        channel: sim.channel,
        channelSubscribers: '14.2K members',
        timestamp: now.toISOString(),
        capturedAt: now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
        rawText: sim.text,
        categories: detected.categories,
        confidence: detected.confidence,
        matchedSlang: detected.matchedTerms,
        entities: detected.extracted,
        districtId: sim.districtId,
        districtName: sim.districtId.charAt(0).toUpperCase() + sim.districtId.slice(1),
        sha256: sha,
        views: Math.floor(Math.random() * 400) + 120,
        verified: true,
        status: 'FLAGGED',
      };

      setPosts((prev) => [newPost, ...prev.slice(0, 49)]);
      sound.playRadarPing();

      setDistricts((prev) =>
        prev.map((d) =>
          d.id === sim.districtId
            ? { ...d, flaggedCount: d.flaggedCount + 1 }
            : d
        )
      );
    }, 12000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleCopyHash = (hash: string) => {
    sound.playSuccessChime();
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleDownloadPDF = (post: InterceptPost) => {
    sound.playSuccessChime();
    generateDossierPDF(post);
  };

  const toggleSound = () => {
    sound.playMechanicalClick(true);
    sound.toggle();
  };

  const handleLocateDistrictFromTopology = (districtId: string) => {
    const foundDistrict = districts.find(
      (d) => d.id.toLowerCase() === districtId.toLowerCase()
    );
    if (foundDistrict) {
      setSelectedDistrict(foundDistrict);
      const postInDistrict = posts.find((p) => p.districtId === foundDistrict.id);
      if (postInDistrict) setSelectedPost(postInDistrict);
    }
    setActiveNavTab('COMMAND');
  };

  return (
    <div className="h-screen w-screen bg-[#070A10] text-slate-100 flex flex-col overflow-hidden font-sans select-none relative">
      {/* ======================================================== */}
      {/* 1. PALANTIR / LINEAR 52PX SINGLE-ROW GLASS TOP COMMAND BAR */}
      {/* ======================================================== */}
      <header className="h-[52px] bg-[#070A10]/85 backdrop-blur-md border-b border-white/[0.07] px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left Section: Branding & Return to Editorial */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onOpenEditorial();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white text-xs font-sans font-medium transition-colors"
            title="Return to Product Showcase"
          >
            <span>← EDITORIAL</span>
          </button>

          <div className="h-4 w-px bg-white/[0.08]" />

          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
            <span className="font-sans font-bold text-sm tracking-tight text-white">
              PRAHARI
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline uppercase">
              // Rajasthan Police OSINT
            </span>
          </div>
        </div>

        {/* Center Section: Sleek Linear/Vercel-inspired Glass Segmented Tab Switcher */}
        <div className="flex items-center p-1 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs font-sans">
          <button
            onClick={() => {
              sound.playClick();
              setActiveNavTab('COMMAND');
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeNavTab === 'COMMAND'
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            COMMAND CENTER
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveNavTab('TOPOLOGY');
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeNavTab === 'TOPOLOGY'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" />
            <span>3D ENTITY TOPOLOGY</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveNavTab('DOSSIER');
            }}
            className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeNavTab === 'DOSSIER'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span>FORENSIC DOSSIER</span>
          </button>
        </div>

        {/* Persistent Monospace Tactical Search Bar Trigger (Cmd + K / Ctrl + K) */}
        <div className="flex-1 max-w-sm lg:max-w-md mx-3 hidden md:block">
          <button
            onClick={() => {
              sound.playClick();
              setIsSearchOpen(true);
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-cyan-500/25 hover:border-cyan-400/50 text-xs font-mono text-slate-300 hover:text-white transition-all shadow-[0_0_15px_rgba(0,229,255,0.05)] group"
            title="Global OSINT Cross-Case Search (Cmd + K / Ctrl + K)"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform shrink-0" />
              <span className="text-slate-400 group-hover:text-slate-200 truncate">
                Search UPI, phone, handle, wallet, or district...
              </span>
            </div>
            <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] text-cyan-300 font-mono font-medium shrink-0 shadow-inner">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Section: Telemetry pill, Clock, Audio & Ingest Button */}
        <div className="flex items-center gap-3">
          {/* Mobile Search Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsSearchOpen(true);
            }}
            className="md:hidden p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-white/[0.05] rounded-lg transition-colors border border-cyan-500/30"
            title="Global Search (⌘K)"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          {/* Real Backend Status Pill */}
          {isBackendLive && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PYTHON OSINT: ONLINE</span>
            </div>
          )}

          {/* Status Pill */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-sans font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>DEFCON 2 · ELEVATED</span>
          </div>

          <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

          {/* Clock */}
          <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
            {clockUtc}
          </span>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
            title="Toggle Audio"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            )}
          </button>

          {/* Import Dataset Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsUploadModalOpen(true);
            }}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 px-3 py-1 rounded-md text-xs font-sans font-semibold transition-all shadow-[0_0_12px_rgba(34,211,238,0.25)]"
          >
            IMPORT INTEL
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. DYNAMIC MAIN VIEW SWITCHER                            */}
      {/* ======================================================== */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* VIEW A: DEDICATED FULL-SCREEN 3D ENTITY TOPOLOGY PAGE */}
        {activeNavTab === 'TOPOLOGY' && (
          <motion.div
            key="view-topology"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full"
          >
            <EntityTopologyPage
              selectedPost={selectedPost}
              allPosts={posts}
              onSelectPost={(post) => setSelectedPost(post)}
              onLocateDistrict={handleLocateDistrictFromTopology}
              onOpenDossier={(postId) => {
                const p = posts.find((post) => post.id === postId);
                if (p) setSelectedPost(p);
                setActiveNavTab('DOSSIER');
              }}
              onReturnToCommand={() => setActiveNavTab('COMMAND')}
            />
          </motion.div>
        )}

        {/* VIEW B: DEDICATED FULL-SCREEN FORENSIC DOSSIER */}
        {activeNavTab === 'DOSSIER' && (
          <motion.div
            key="view-dossier"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full overflow-hidden"
          >
            <ForensicDossier
              post={selectedPost}
              allPosts={posts}
              onSelectPost={(post) => setSelectedPost(post)}
              onReturnToCommand={() => setActiveNavTab('COMMAND')}
              onExploreTopology={() => setActiveNavTab('TOPOLOGY')}
            />
          </motion.div>
        )}

        {/* VIEW C: CLEANED UP COMMAND CENTER (Tactical Map + Feed + Compact Quick Intel) */}
        {activeNavTab === 'COMMAND' && (
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[#070A10]">
            {/* LEFT PANEL: Live Intercept Feed & Filters (3.2 cols on lg) */}
            <div className="md:col-span-4 lg:col-span-3 h-full overflow-hidden border-r border-white/[0.07]">
              <LiveInterceptFeed
                posts={posts}
                selectedPost={selectedPost}
                onSelectPost={(post) => {
                  setSelectedPost(post);
                  const dist = districts.find((d) => d.id === post.districtId);
                  if (dist) setSelectedDistrict(dist);
                }}
                onExploreTopology={(post) => {
                  setSelectedPost(post);
                  const dist = districts.find((d) => d.id === post.districtId);
                  if (dist) setSelectedDistrict(dist);
                  setActiveNavTab('TOPOLOGY');
                }}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                isSimulating={isSimulating}
                onToggleSimulate={() => setIsSimulating(!isSimulating)}
              />
            </div>

            {/* CENTERPIECE: Wide-Breathing Rajasthan Tactical Map (5.8 cols on lg) */}
            <div className="md:col-span-8 lg:col-span-6 h-full p-2 bg-[#070A10] overflow-hidden flex flex-col relative">
              {/* Highlighted Syndicate Floating Banner */}
              {highlightedDistricts.length > 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#090C10]/90 backdrop-blur-md border border-cyan-400/60 shadow-[0_0_20px_rgba(0,229,255,0.25)] text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-cyan-300 font-semibold">
                    SYNDICATE MESH: {highlightedDistricts.length} DISTRICTS HIGHLIGHTED
                  </span>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setHighlightedDistricts([]);
                    }}
                    className="ml-1 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-300 hover:text-white"
                  >
                    CLEAR
                  </button>
                </div>
              )}

              <RajasthanMap
                districts={districts}
                connections={dynamicConnections}
                selectedDistrict={selectedDistrict}
                highlightedDistrictIds={highlightedDistricts}
                onSelectDistrict={(district) => {
                  setSelectedDistrict(district);
                  const distPost = posts.find(
                    (p) =>
                      p.districtId?.toLowerCase() === district.id.toLowerCase() ||
                      p.districtName?.toLowerCase() === district.name.toLowerCase()
                  );
                  if (distPost) setSelectedPost(distPost);
                }}
                onOpenDossier={(district) => {
                  sound.playPageTurn();
                  setSelectedDistrict(district);

                  // 1. Locate existing post for this district
                  let targetPost: InterceptPost | undefined = posts.find(
                    (p) =>
                      p.districtId?.toLowerCase() === district.id.toLowerCase() ||
                      p.districtName?.toLowerCase() === district.name.toLowerCase()
                  );

                  // 2. If no post exists yet for this district (e.g. Udaipur, Barmer, etc.),
                  // synthesize an authentic verified forensic case dossier on the fly!
                  if (!targetPost) {
                    const category = (district.topCategories[0] || 'DRUGS') as CrimeCategory;
                    const topId = district.topIdentifiers?.[0] || 'raj.pay@oksbi';
                    const baseSynthesized: InterceptPost = {
                      id: `case_${district.id}_${Date.now().toString(36).slice(-4)}`,
                      channel: `@${district.id.replace(/-/g, '_')}_syndicate_intel`,
                      channelSubscribers: `${district.flaggedCount || 17}K members`,
                      timestamp: new Date().toISOString(),
                      capturedAt: new Date().toLocaleTimeString('en-IN') + ' IST',
                      rawText: `Critical illicit ${category.toLowerCase()} telemetry flagged in ${district.name} jurisdiction. Threat level: ${district.threatLevel}. Syndicate nexus identified coordinating illicit logistics. Escrow entity: ${topId}.`,
                      categories: [category],
                      confidence: 0.95,
                      status: 'FLAGGED',
                      districtId: district.id,
                      districtName: district.name,
                      divisionName: district.division,
                      sha256: '798fbb739040eeb0bada2d6fa28be16ada33f746b4bd941e31eb0e647722d3ad',
                      views: (district.flaggedCount || 15) * 48,
                      verified: true,
                      entities: {
                        upis: district.topIdentifiers.filter((id) => id.includes('@')),
                        phones: district.topIdentifiers.filter((id) => /^\+?\d{10}/.test(id)),
                        wallets: ['bc1qar0srr7x9z4xpmdq9g4t69'],
                        handles: [`@${district.id.replace(/-/g, '_')}_ops`],
                        bankAccounts: ['623401928374'],
                      },
                      matchedSlang: ['consignment', 'drop point', 'escrow payment', 'delivery hub'],
                    };

                    targetPost = enrichPostWithCryptoLayers(baseSynthesized);
                    setPosts((prev) => [targetPost!, ...prev]);
                  }

                  setSelectedPost(targetPost);
                  setActiveNavTab('DOSSIER');
                }}
                activeCategory={activeCategory}
              />
            </div>

            {/* RIGHT PANEL: Compact Quick Intel & Forensic Summary (3 cols on lg) */}
            <div className="hidden lg:flex lg:col-span-3 h-full flex-col overflow-y-auto bg-[#0C101A] border-l border-white/[0.07] p-3.5 space-y-3.5 select-none font-sans">
              {/* Quick Action Card: Launch Dedicated Full-Screen 3D Entity Topology */}
              <div
                onClick={() => {
                  sound.playClick();
                  setActiveNavTab('TOPOLOGY');
                }}
                className="group p-3.5 bg-gradient-to-br from-cyan-950/40 via-white/[0.02] to-white/[0.01] hover:from-cyan-950/60 border border-cyan-500/30 hover:border-cyan-400/50 rounded-xl cursor-pointer transition-all shadow-lg"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <Network className="w-4 h-4 text-cyan-400" />
                    <span>3D Case Topology</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {selectedPost ? selectedPost.districtName.toUpperCase() : 'CASE'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedPost
                    ? `Explore 3D network connecting ${selectedPost.channel}'s extracted UPIs, Telegram handles, and cross-channel mule nexus.`
                    : 'Inspect the organic 3D figurine network constellation connecting UPIs, Telegram handles, and cryptocurrency escrows.'}
                </p>
                <div className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore {selectedPost ? selectedPost.channel : 'Active Case'} 3D Graph</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Selected Post Quick Intel Summary */}
              {selectedPost ? (
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Active Intercept Dossier</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      SEC 63 BSA COMPLIANT
                    </span>
                  </div>

                  {/* Tactical Intercept Selector Dropdown */}
                  <div className="relative">
                    <select
                      aria-label="Select Active Intercept"
                      value={selectedPost.id}
                      onChange={(e) => {
                        const chosen = posts.find((p) => p.id === e.target.value);
                        if (chosen) {
                          sound.playClick();
                          setSelectedPost(chosen);
                          const matchedDist = districts.find(
                            (d) =>
                              d.id.toLowerCase() === chosen.districtId?.toLowerCase() ||
                              d.name.toLowerCase() === chosen.districtName?.toLowerCase()
                          );
                          if (matchedDist) {
                            setSelectedDistrict(matchedDist);
                          }
                        }
                      }}
                      className="w-full appearance-none bg-[#070A10] border border-white/[0.1] hover:border-cyan-500/40 text-slate-200 text-[11px] font-mono rounded-lg pl-3 pr-9 py-2 focus:outline-none focus:border-cyan-400 transition-colors cursor-pointer"
                    >
                      {activeFilteredPosts.map((p) => {
                        const cat = p.categories[0] || 'INTEL';
                        const catLabel =
                          cat === 'DOCUMENTS'
                            ? 'Docs'
                            : cat.charAt(0) + cat.slice(1).toLowerCase();
                        return (
                          <option key={p.id} value={p.id} className="bg-[#0C101A] text-slate-200">
                            {`${p.channel} · ${p.districtName} · ${catLabel} · ${(p.confidence * 100).toFixed(0)}% MATCH`}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Channel & Confidence */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-cyan-300 font-medium">{selectedPost.channel}</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {(selectedPost.confidence * 100).toFixed(0)}% MATCH
                    </span>
                  </div>

                  {/* Raw Text Snippet with Inline Color-Coded Identifier Highlighting */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#070A10] p-2.5 rounded-lg border border-white/[0.05]">
                    "{renderHighlightedText(selectedPost.rawText, selectedPost.matchedSlang)}"
                  </p>

                  {/* Monospace SHA-256 Hash Box */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                      SHA-256 INTEGRITY HASH
                    </div>
                    <div className="p-2 bg-[#070A10] rounded-lg border border-white/[0.06] text-cyan-400 font-mono text-[9px] break-all">
                      {selectedPost.sha256}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => handleCopyHash(selectedPost.sha256)}
                      className="flex items-center justify-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white py-2 rounded-lg text-xs font-medium transition-colors"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadPDF(selectedPost)}
                      className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white py-2 rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    >
                      <FileText className="w-3 h-3" />
                      <span>PDF Report</span>
                    </button>

                    <button
                      onClick={() => {
                        sound.playPageTurn();
                        setActiveNavTab('DOSSIER');
                      }}
                      className="col-span-2 flex items-center justify-center gap-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm active:translate-y-0.5"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>OPEN FULL FORENSIC DOSSIER &rarr;</span>
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Selected District Jurisdiction Card */}
              {selectedDistrict && (
                <div className="p-3.5 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-white">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{selectedDistrict.name} District</span>
                      <span className="text-slate-400 text-[11px] font-normal">({selectedDistrict.hindiName})</span>
                    </div>
                    <span className="text-[10px] font-mono text-rose-400 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                      {selectedDistrict.threatLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-[#070A10] p-2 rounded-lg border border-white/[0.05]">
                      <div className="text-[10px] text-slate-500 font-mono">FLAGGED POSTS</div>
                      <div className="text-cyan-400 font-mono font-bold text-sm mt-0.5">{selectedDistrict.flaggedCount}</div>
                    </div>
                    <div className="bg-[#070A10] p-2 rounded-lg border border-white/[0.05]">
                      <div className="text-[10px] text-slate-500 font-mono">TOP THREAT</div>
                      <div className="text-amber-400 font-mono font-bold text-sm mt-0.5">
                        {selectedDistrict.topCategories[0] || 'DRUGS'}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 pt-1 break-all">
                    <span className="text-slate-500 font-mono text-[10px]">MONITORED IDS: </span>
                    <span className="text-cyan-300 font-mono break-all">{selectedDistrict.topIdentifiers.join(', ')}</span>
                  </div>

                  <button
                    onClick={() => {
                      sound.playPageTurn();
                      // Find or synthesize case for this district and navigate
                      let distPost: InterceptPost | undefined = posts.find(
                        (p) =>
                          p.districtId?.toLowerCase() === selectedDistrict.id.toLowerCase() ||
                          p.districtName?.toLowerCase() === selectedDistrict.name.toLowerCase()
                      );
                      if (!distPost) {
                        const cat = (selectedDistrict.topCategories[0] || 'DRUGS') as CrimeCategory;
                        const rawDistPost: InterceptPost = {
                          id: `case_${selectedDistrict.id}_${Date.now().toString(36).slice(-4)}`,
                          channel: `@${selectedDistrict.id.replace(/-/g, '_')}_syndicate_intel`,
                          channelSubscribers: `${selectedDistrict.flaggedCount || 17}K members`,
                          timestamp: new Date().toISOString(),
                          capturedAt: new Date().toLocaleTimeString('en-IN') + ' IST',
                          rawText: `Critical illicit ${cat.toLowerCase()} telemetry flagged in ${selectedDistrict.name} jurisdiction. High threat score (${selectedDistrict.threatLevel}). Syndicate nexus detected coordinating cross-border drops. Primary escrow identifier: ${selectedDistrict.topIdentifiers[0] || 'raj.pay@oksbi'}.`,
                          categories: [cat],
                          confidence: 0.95,
                          status: 'FLAGGED',
                          districtId: selectedDistrict.id,
                          districtName: selectedDistrict.name,
                          divisionName: selectedDistrict.division,
                          sha256: '798fbb739040eeb0bada2d6fa28be16ada33f746b4bd941e31eb0e647722d3ad',
                          views: (selectedDistrict.flaggedCount || 15) * 48,
                          verified: true,
                          entities: {
                            upis: selectedDistrict.topIdentifiers.filter((id) => id.includes('@')),
                            phones: selectedDistrict.topIdentifiers.filter((id) => /^\+?\d{10}/.test(id)),
                            wallets: ['bc1qar0srr7x9z4xpmdq9g4t69'],
                            handles: [`@${selectedDistrict.id.replace(/-/g, '_')}_ops`],
                            bankAccounts: ['623401928374'],
                          },
                          matchedSlang: ['consignment', 'drop point', 'escrow payment', 'delivery hub'],
                        };
                        distPost = enrichPostWithCryptoLayers(rawDistPost);
                        setPosts((prev) => [distPost!, ...prev]);
                      }
                      setSelectedPost(distPost);
                      setActiveNavTab('DOSSIER');
                    }}
                    className="w-full mt-2 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm active:translate-y-0.5"
                  >
                    <span>View {selectedDistrict.name} Forensic Dossier</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onIngestPosts={(newPosts) => {
          setPosts((prev) => [...newPosts, ...prev]);
          if (newPosts.length > 0) setSelectedPost(newPosts[0]);
        }}
      />

      {/* Global Cross-Case OSINT Search Modal (Cmd + K / Ctrl + K) */}
      <GlobalOsintSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        posts={posts}
        districts={districts}
        onSelectPost={(post) => setSelectedPost(post)}
        onPlotOnMap={(districtIds) => {
          setHighlightedDistricts(districtIds);
          if (districtIds.length > 0) {
            const primary = districts.find(
              (d) =>
                d.id.toLowerCase() === districtIds[0].toLowerCase() ||
                d.name.toLowerCase() === districtIds[0].toLowerCase()
            );
            if (primary) setSelectedDistrict(primary);
          }
          setActiveNavTab('COMMAND');
        }}
        onInspectTopology={(post) => {
          setSelectedPost(post);
          setActiveNavTab('TOPOLOGY');
        }}
        onOpenDossier={(post) => {
          setSelectedPost(post);
          setActiveNavTab('DOSSIER');
        }}
      />
    </div>
  );
};
