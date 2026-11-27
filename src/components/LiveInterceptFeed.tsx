import React, { useState } from 'react';
import { Search, Upload, AlertCircle, Clock, Eye, Radio, Sparkles, Network } from 'lucide-react';
import { InterceptPost, CrimeCategory } from '../types';
import { sound } from '../utils/audio';

interface LiveInterceptFeedProps {
  posts: InterceptPost[];
  selectedPost: InterceptPost | null;
  onSelectPost: (post: InterceptPost) => void;
  onExploreTopology?: (post: InterceptPost) => void;
  activeCategory: CrimeCategory | 'ALL';
  onSelectCategory: (cat: CrimeCategory | 'ALL') => void;
  onOpenUploadModal: () => void;
  isSimulating: boolean;
  onToggleSimulate: () => void;
}

const formatFeedTimestamp = (timestamp?: string, capturedAt?: string): string => {
  let date: Date | null = null;
  if (timestamp && timestamp !== 'Just now') {
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date) {
    date = new Date();
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const day = parts.find((p) => p.type === 'day')?.value || '27';
    const month = (parts.find((p) => p.type === 'month')?.value || 'NOV').toUpperCase();
    const year = parts.find((p) => p.type === 'year')?.value || '2026';
    const hour = parts.find((p) => p.type === 'hour')?.value || '13';
    const minute = parts.find((p) => p.type === 'minute')?.value || '04';

    return `${day} ${month} ${year} · ${hour}:${minute} IST`;
  } catch {
    return '27 NOV 2026 · 13:04 IST';
  }
};

export const LiveInterceptFeed: React.FC<LiveInterceptFeedProps> = ({
  posts,
  selectedPost,
  onSelectPost,
  onExploreTopology,
  activeCategory,
  onSelectCategory,
  onOpenUploadModal,
  isSimulating,
  onToggleSimulate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [minConfidence, setMinConfidence] = useState(0.85);

  const categories: (CrimeCategory | 'ALL')[] = [
    'ALL',
    'DRUGS',
    'ARMS',
    'DOCUMENTS',
    'FINANCIAL',
  ];

  // Filter posts based on category, search, and confidence
  const filteredPosts = posts.filter((post) => {
    if (activeCategory !== 'ALL' && !post.categories.includes(activeCategory)) {
      return false;
    }
    if (post.confidence < minConfidence) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchText = post.rawText.toLowerCase().includes(q);
      const matchChannel = post.channel.toLowerCase().includes(q);
      const matchDistrict = post.districtName.toLowerCase().includes(q);
      const matchEntity = [
        ...post.entities.phones,
        ...post.entities.upis,
        ...post.entities.handles,
        ...post.entities.wallets,
      ].some((e) => e.toLowerCase().includes(q));

      if (!matchText && !matchChannel && !matchDistrict && !matchEntity) {
        return false;
      }
    }
    return true;
  });

  const getCategoryDot = (cat: CrimeCategory) => {
    switch (cat) {
      case 'DRUGS':
        return 'bg-rose-400';
      case 'ARMS':
        return 'bg-amber-400';
      case 'DOCUMENTS':
        return 'bg-violet-400';
      case 'FINANCIAL':
        return 'bg-emerald-400';
    }
  };

  // Sleek subtle keyword highlighter without harsh background boxes
  const highlightSlang = (text: string, matchedTerms: string[]) => {
    if (!matchedTerms || matchedTerms.length === 0) return text;

    const escaped = matchedTerms
      .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');
    if (!escaped) return text;
    const regex = new RegExp(`(${escaped})`, 'gi');

    const parts = text.split(regex);
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="text-rose-400 font-medium tracking-tight">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="h-full bg-[#070A10] border-r border-white/[0.07] flex flex-col select-none">
      {/* Refined Panel Header (Palantir/Linear style) */}
      <div className="p-4 border-b border-white/[0.07] bg-[#0C101A]/60 backdrop-blur-md space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <span className="font-sans font-semibold text-xs text-slate-200 tracking-wide uppercase">
              Signals Feed
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-medium text-slate-400 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-full">
              {filteredPosts.length} active
            </span>
          </div>
        </div>

        {/* Minimal Actions Bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onToggleSimulate();
            }}
            className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-sans font-medium flex items-center justify-center gap-2 transition-all ${
              isSimulating
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSimulating ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span>Simulation {isSimulating ? 'Live' : 'Paused'}</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onOpenUploadModal();
            }}
            className="py-1.5 px-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-slate-300 hover:text-white rounded-lg text-xs font-sans font-medium flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Import</span>
          </button>
        </div>

        {/* Sleek Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, identifiers, keywords..."
            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>

        {/* Sleek Underline / Minimal Ghost Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                sound.playClick();
                onSelectCategory(cat);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-sans font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
              }`}
            >
              {cat === 'ALL'
                ? 'All'
                : cat === 'DOCUMENTS'
                ? 'Docs'
                : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Clean Confidence Threshold Slider */}
        <div className="pt-0.5 flex items-center justify-between text-[11px] font-sans text-slate-400">
          <span className="text-[10px] uppercase tracking-wider text-slate-500">
            Confidence Floor
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-20 h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="font-mono text-cyan-400 text-xs font-semibold">
              {(minConfidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Intercepts List Container (Linear/Palantir clean cards) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredPosts.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs font-sans">No signals matching current criteria.</p>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const isSelected = selectedPost?.id === post.id;
            return (
              <div
                key={post.id}
                onClick={() => {
                  sound.playClick();
                  onSelectPost(post);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/[0.05] border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                }`}
              >
                {/* Post Header: Channel, Category Indicator, Confidence */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-medium text-xs text-slate-200">
                      {post.channel}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      · {post.districtName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.categories.map((c) => (
                      <span key={c} className="flex items-center gap-1 text-[10px] font-sans text-slate-400">
                        <span className={`w-1.5 h-1.5 rounded-full ${getCategoryDot(c)}`} />
                        <span>{c === 'DOCUMENTS' ? 'Docs' : c.charAt(0) + c.slice(1).toLowerCase()}</span>
                      </span>
                    ))}
                    <span className="font-mono text-[10px] text-cyan-400/90 font-semibold bg-cyan-950/40 border border-cyan-500/20 px-1.5 py-0.2 rounded">
                      {(post.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Raw Text with Subtle Highlight */}
                <p className="text-slate-300 font-sans text-xs leading-relaxed mb-2.5">
                  "{highlightSlang(post.rawText, post.matchedSlang)}"
                </p>

                {/* Extracted Identifiers (Minimal uniform monospace chips) */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {post.entities.upis.map((u) => (
                    <span
                      key={u}
                      className="bg-white/[0.03] text-slate-300 border border-white/[0.06] px-2 py-0.5 rounded font-mono text-[10px]"
                    >
                      UPI: <span className="text-cyan-300 font-medium">{u}</span>
                    </span>
                  ))}
                  {post.entities.phones.map((p) => (
                    <span
                      key={p}
                      className="bg-white/[0.03] text-slate-300 border border-white/[0.06] px-2 py-0.5 rounded font-mono text-[10px]"
                    >
                      TEL: <span className="text-amber-300 font-medium">{p}</span>
                    </span>
                  ))}
                  {post.entities.wallets.map((w) => (
                    <span
                      key={w}
                      className="bg-white/[0.03] text-slate-300 border border-white/[0.06] px-2 py-0.5 rounded font-mono text-[10px]"
                    >
                      CRYPTO: <span className="text-rose-300 font-medium">{w.slice(0, 10)}…</span>
                    </span>
                  ))}
                </div>

                {/* Footer Telemetry */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-white/[0.04] font-mono">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                    <Clock className="w-3 h-3 text-cyan-400/80" />
                    {formatFeedTimestamp(post.timestamp, post.capturedAt)}
                  </span>
                  
                  {onExploreTopology && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        sound.playClick();
                        onExploreTopology(post);
                      }}
                      className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30 transition-all shadow-[0_0_8px_rgba(0,229,255,0.15)]"
                      title="Inspect 3D Entity Topology for this case"
                    >
                      <Network className="w-2.5 h-2.5 text-cyan-400" />
                      <span>3D TOPOLOGY</span>
                    </button>
                  )}

                  <span className="text-emerald-400 font-sans text-[10px]">
                    Sec 63 BSA ✓
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
