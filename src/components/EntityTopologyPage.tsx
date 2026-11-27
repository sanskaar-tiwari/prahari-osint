import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Search,
  Filter,
  ShieldAlert,
  MapPin,
  ExternalLink,
  ChevronRight,
  X,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Hash,
  Activity,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { ENTITY_GRAPH_DATA, INITIAL_INTERCEPTS } from '../data/mockData';
import { EntityNode, EntityEdge, InterceptPost, CrimeCategory } from '../types';
import { sound } from '../utils/audio';
import { prahariApi } from '../services/api';
import { NodeAvatarCharacter } from './NodeAvatarCharacter';

interface EntityTopologyPageProps {
  selectedPost?: InterceptPost | null;
  allPosts?: InterceptPost[];
  onSelectPost?: (post: InterceptPost) => void;
  onLocateDistrict?: (districtId: string) => void;
  onOpenDossier?: (postId: string) => void;
  onReturnToCommand?: () => void;
}

type NodeFilterType = 'ALL' | 'HERO' | 'SELLER' | 'CRYPTO' | 'POSTS';
type ViewScopeMode = 'CASE' | 'GLOBAL';

export const EntityTopologyPage: React.FC<EntityTopologyPageProps> = ({
  selectedPost,
  allPosts = INITIAL_INTERCEPTS,
  onSelectPost,
  onLocateDistrict,
  onOpenDossier,
  onReturnToCommand,
}) => {
  // Available cases list (default to allPosts or mock seed)
  const caseList = useMemo(() => {
    return allPosts.length > 0 ? allPosts : INITIAL_INTERCEPTS;
  }, [allPosts]);

  // Active Case being investigated (defaults to selectedPost or first case)
  const [activeCase, setActiveCase] = useState<InterceptPost>(() => {
    return selectedPost || caseList[0];
  });

  // Keep activeCase in sync if parent changes selectedPost
  useEffect(() => {
    if (selectedPost) {
      setActiveCase(selectedPost);
    }
  }, [selectedPost]);

  // Mode: Focused Case Investigation vs Master Global Syndicate
  const [viewScope, setViewScope] = useState<ViewScopeMode>('CASE');

  // Global graph data from backend / mock
  const [globalGraphData, setGlobalGraphData] = useState<{ nodes: EntityNode[]; edges: EntityEdge[] }>(
    ENTITY_GRAPH_DATA
  );

  // Selected node for the right-hand Inspector Drawer
  const [selectedNode, setSelectedNode] = useState<EntityNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<NodeFilterType>('ALL');

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const hasMovedRef = useRef<boolean>(false);

  // Load live dynamic graph from FastAPI backend if available
  useEffect(() => {
    let isMounted = true;
    prahariApi.getGraph().then((liveGraph) => {
      if (isMounted && liveGraph && liveGraph.nodes.length > 0) {
        setGlobalGraphData(liveGraph);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Trackpad pinch-to-zoom and two-finger scroll zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const sensitivity = e.ctrlKey ? 0.015 : 0.002;
      const delta = -e.deltaY * sensitivity;

      setZoom((prevZoom) => {
        const nextZoom = prevZoom * (1 + delta);
        return Math.min(Math.max(nextZoom, 0.4), 2.8);
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Pointer Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.node-element') || (e.target as Element).closest('button')) {
      return;
    }
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const resetView = () => {
    sound.playClick();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // =========================================================================
  // DYNAMIC CASE-SPECIFIC GRAPH GENERATOR
  // Generates a tailored, unique 3D entity topology for the selected case!
  // =========================================================================
  const activeCaseGraph = useMemo<{ nodes: EntityNode[]; edges: EntityEdge[]; centerId: string }>(() => {
    if (!activeCase) return { ...globalGraphData, centerId: '' };

    const primaryCat = activeCase.categories[0] || 'DRUGS';
    const nodes: EntityNode[] = [];
    const edges: EntityEdge[] = [];
    const nodeIds = new Set<string>();

    const addNode = (n: EntityNode) => {
      if (!nodeIds.has(n.id)) {
        nodeIds.add(n.id);
        nodes.push(n);
      }
    };

    const addEdge = (e: EntityEdge) => {
      edges.push(e);
    };

    // 1. Determine Central Focal Hero Identifier for this case
    let centerId = '';
    if (activeCase.entities.upis.length > 0) {
      centerId = activeCase.entities.upis[0];
      addNode({
        id: centerId,
        label: centerId,
        type: 'upi',
        category: primaryCat,
        channels: [activeCase.channel],
        riskScore: 0.99,
        isHero: true,
      });
    } else if (activeCase.entities.wallets.length > 0) {
      centerId = activeCase.entities.wallets[0];
      const shortWallet = centerId.slice(0, 8) + '…' + centerId.slice(-4);
      addNode({
        id: centerId,
        label: shortWallet,
        type: 'crypto',
        category: primaryCat,
        channels: [activeCase.channel],
        riskScore: 0.97,
        isHero: true,
      });
    } else if (activeCase.entities.phones.length > 0) {
      centerId = activeCase.entities.phones[0];
      addNode({
        id: centerId,
        label: centerId,
        type: 'phone',
        category: primaryCat,
        channels: [activeCase.channel],
        riskScore: 0.96,
        isHero: true,
      });
    } else {
      // Fallback: case post itself as focal hub
      centerId = activeCase.id;
      addNode({
        id: centerId,
        label: activeCase.channel,
        type: 'post',
        category: primaryCat,
        channels: [activeCase.channel],
        riskScore: activeCase.confidence,
        isHero: true,
      });
    }

    // 2. Add Inner Ring Direct Case Intelligence Nodes
    // Post Intercept Node
    if (centerId !== activeCase.id) {
      addNode({
        id: activeCase.id,
        label: activeCase.id,
        type: 'post',
        category: primaryCat,
        channels: [activeCase.channel],
        riskScore: activeCase.confidence,
      });
      addEdge({
        id: `e_${activeCase.id}_${centerId}`,
        source: activeCase.id,
        target: centerId,
        label: activeCase.entities.upis.includes(centerId)
          ? 'UPI ESCROW'
          : activeCase.entities.wallets.includes(centerId)
          ? 'CRYPTO ESCROW'
          : 'CALL / ORDER',
        category: primaryCat,
      });
    }

    // Channel Broadcast Node
    addNode({
      id: activeCase.channel,
      label: activeCase.channel,
      type: 'telegram',
      category: primaryCat,
      channels: [activeCase.channel],
      riskScore: 0.92,
    });
    addEdge({
      id: `e_${activeCase.channel}_${centerId}`,
      source: activeCase.channel,
      target: centerId,
      label: 'SYNDICATE CHANNEL',
      category: primaryCat,
    });

    // District Jurisdiction Nexus Node
    const distNodeId = `nexus_${activeCase.districtId}`;
    addNode({
      id: distNodeId,
      label: `${activeCase.districtName} Nexus`,
      type: 'district',
      category: primaryCat,
      channels: [activeCase.channel],
      riskScore: 0.88,
    });
    addEdge({
      id: `e_${distNodeId}_${centerId}`,
      source: distNodeId,
      target: centerId,
      label: 'POLICE JURISDICTION',
      category: primaryCat,
    });

    // Case Specific Phone Numbers
    activeCase.entities.phones.forEach((phone) => {
      if (phone !== centerId) {
        addNode({
          id: phone,
          label: phone,
          type: 'phone',
          category: primaryCat,
          channels: [activeCase.channel],
          riskScore: 0.94,
        });
        addEdge({
          id: `e_${phone}_${centerId}`,
          source: phone,
          target: centerId,
          label: 'DISPATCH BROKER',
          category: primaryCat,
        });
      }
    });

    // Case Specific Telegram Seller Handles
    activeCase.entities.handles.forEach((handle) => {
      if (handle !== activeCase.channel && handle !== centerId) {
        addNode({
          id: handle,
          label: handle,
          type: 'telegram',
          category: primaryCat,
          channels: [activeCase.channel],
          riskScore: 0.95,
        });
        addEdge({
          id: `e_${handle}_${centerId}`,
          source: handle,
          target: centerId,
          label: 'DARK SELLER',
          category: primaryCat,
        });
      }
    });

    // Case Specific Cryptocurrency Wallets
    activeCase.entities.wallets.forEach((wallet) => {
      if (wallet !== centerId) {
        const short = wallet.slice(0, 8) + '…' + wallet.slice(-4);
        addNode({
          id: wallet,
          label: short,
          type: 'crypto',
          category: primaryCat,
          channels: [activeCase.channel],
          riskScore: 0.96,
        });
        addEdge({
          id: `e_${wallet}_${centerId}`,
          source: wallet,
          target: centerId,
          label: 'ESCROW WALLET',
          category: primaryCat,
        });
      }
    });

    // 3. Add Outer Ring: Cross-Channel Syndicates that share ANY entity with this case!
    caseList.forEach((otherPost) => {
      if (otherPost.id === activeCase.id) return;

      let sharedReason = '';
      let sharedEntityId = '';

      // Check for shared UPI
      const sharedUpi = otherPost.entities.upis.find((u) => activeCase.entities.upis.includes(u));
      if (sharedUpi) {
        sharedReason = 'SHARED MULE UPI';
        sharedEntityId = sharedUpi;
      }

      // Check for shared Phone
      if (!sharedReason) {
        const sharedPhone = otherPost.entities.phones.find((p) =>
          activeCase.entities.phones.includes(p)
        );
        if (sharedPhone) {
          sharedReason = 'SHARED ARMS BROKER';
          sharedEntityId = sharedPhone;
        }
      }

      // Check for shared Seller Handle
      if (!sharedReason) {
        const sharedHandle = otherPost.entities.handles.find((h) =>
          activeCase.entities.handles.includes(h)
        );
        if (sharedHandle) {
          sharedReason = 'SHARED SELLER HANDLE';
          sharedEntityId = sharedHandle;
        }
      }

      // Check for shared Crypto Wallet
      if (!sharedReason) {
        const sharedWallet = otherPost.entities.wallets.find((w) =>
          activeCase.entities.wallets.includes(w)
        );
        if (sharedWallet) {
          sharedReason = 'SHARED CRYPTO ESCROW';
          sharedEntityId = sharedWallet;
        }
      }

      // If a cross-channel criminal nexus exists, wire it into the outer ring!
      if (sharedReason && sharedEntityId) {
        addNode({
          id: otherPost.id,
          label: otherPost.channel,
          type: 'post',
          category: otherPost.categories[0],
          channels: [otherPost.channel],
          riskScore: otherPost.confidence,
        });
        addEdge({
          id: `e_cross_${otherPost.id}_${sharedEntityId}`,
          source: otherPost.id,
          target: sharedEntityId,
          label: sharedReason,
          category: otherPost.categories[0],
        });
      }
    });

    return { nodes, edges, centerId };
  }, [activeCase, caseList, globalGraphData]);

  // Current active graph based on viewScope mode
  const currentGraphData = viewScope === 'CASE' ? activeCaseGraph : globalGraphData;

  // Initialize selected node on case change
  useEffect(() => {
    if (viewScope === 'CASE' && activeCaseGraph.nodes.length > 0) {
      const hero =
        activeCaseGraph.nodes.find((n) => n.isHero) ||
        activeCaseGraph.nodes.find((n) => n.id === activeCaseGraph.centerId) ||
        activeCaseGraph.nodes[0];
      setSelectedNode(hero);
    } else if (viewScope === 'GLOBAL' && globalGraphData.nodes.length > 0) {
      const hero = globalGraphData.nodes.find((n) => n.isHero) || globalGraphData.nodes[0];
      setSelectedNode(hero);
    }
  }, [viewScope, activeCaseGraph, globalGraphData]);

  // Filter and search logic
  const filteredNodes = useMemo(() => {
    return currentGraphData.nodes.filter((node) => {
      // Category filter
      if (activeFilter === 'HERO' && !node.isHero && node.type !== 'upi') return false;
      if (activeFilter === 'SELLER' && node.type !== 'telegram') return false;
      if (activeFilter === 'CRYPTO' && node.type !== 'crypto') return false;
      if (activeFilter === 'POSTS' && node.type !== 'post') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = node.id.toLowerCase().includes(q);
        const matchesLabel = node.label.toLowerCase().includes(q);
        const matchesType = node.type.toLowerCase().includes(q);
        const matchesChannels = node.channels?.some((c) => c.toLowerCase().includes(q));
        return matchesId || matchesLabel || matchesType || matchesChannels;
      }
      return true;
    });
  }, [currentGraphData.nodes, activeFilter, searchQuery]);

  // Edges filtered
  const visibleEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    return currentGraphData.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [currentGraphData.edges, filteredNodes]);

  // ========================================================
  // STRICT CONCENTRIC RADIAL LAYOUT ENGINE
  // Center Core (r = 0): Case Hero Nexus at (700, 450)
  // Inner Ring (r = 175px): Direct Case Identifiers
  // Outer Ring (r = 330px): Cross-Channel Syndicate Infiltration
  // ========================================================
  const nodePositionMap = useMemo(() => {
    const map: Record<
      string,
      { x: number; y: number; districtNexus: string; ring: 'center' | 'inner' | 'outer' }
    > = {};

    // Center focal node
    const hero =
      filteredNodes.find((n) => n.isHero) ||
      (activeCaseGraph.centerId ? filteredNodes.find((n) => n.id === activeCaseGraph.centerId) : null) ||
      filteredNodes[0];

    if (hero) {
      map[hero.id] = {
        x: 700,
        y: 450,
        districtNexus: activeCase ? activeCase.districtId : 'jaipur',
        ring: 'center',
      };
    }

    const innerList = filteredNodes.filter((n) => n.id !== hero?.id && n.type !== 'post');
    const outerList = filteredNodes.filter((n) => n.id !== hero?.id && n.type === 'post');

    // Inner ring (r = 175)
    const R_INNER = 175;
    const totalInner = Math.max(innerList.length, 1);
    const innerAngleStep = (2 * Math.PI) / totalInner;

    innerList.forEach((n, idx) => {
      const angle = -Math.PI / 2 + idx * innerAngleStep;
      map[n.id] = {
        x: Math.round(700 + Math.cos(angle) * R_INNER),
        y: Math.round(450 + Math.sin(angle) * R_INNER),
        districtNexus: activeCase ? activeCase.districtId : 'jaipur',
        ring: 'inner',
      };
    });

    // Outer ring (r = 330)
    const R_OUTER = 330;
    const totalOuter = Math.max(outerList.length, 1);
    const outerAngleStep = (2 * Math.PI) / totalOuter;

    outerList.forEach((n, idx) => {
      const angle = -Math.PI / 2 + (idx + 0.5) * outerAngleStep;
      map[n.id] = {
        x: Math.round(700 + Math.cos(angle) * R_OUTER),
        y: Math.round(450 + Math.sin(angle) * R_OUTER),
        districtNexus: activeCase ? activeCase.districtId : 'jaipur',
        ring: 'outer',
      };
    });

    return map;
  }, [filteredNodes, activeCase, activeCaseGraph]);

  // Color generator for connections based on category & hero links
  const getEdgeColors = (edge: EntityEdge) => {
    if (edge.label?.includes('SHARED MULE')) {
      return { base: '#00E5FF', stream: '#00FF88' };
    }
    if (edge.label?.includes('SHARED ARMS')) {
      return { base: '#F43F5E', stream: '#F59E0B' };
    }
    if (edge.label?.includes('SHARED CRYPTO')) {
      return { base: '#F59E0B', stream: '#00E5FF' };
    }
    if (edge.label?.includes('SHARED SELLER')) {
      return { base: '#C084FC', stream: '#00FF88' };
    }
    if (edge.category === 'ARMS') {
      return { base: '#F43F5E', stream: '#F59E0B' };
    }
    if (edge.category === 'DOCUMENTS') {
      return { base: '#C084FC', stream: '#00FF88' };
    }
    if (edge.category === 'FINANCIAL') {
      return { base: '#F59E0B', stream: '#00E5FF' };
    }
    return { base: '#00E5FF', stream: '#00FF88' };
  };

  // Node details for drawer
  const selectedNodeInfo = useMemo(() => {
    if (!selectedNode) return null;
    const nexusDistrictId = nodePositionMap[selectedNode.id]?.districtNexus || (activeCase ? activeCase.districtId : 'jaipur');
    const connectedEdges = currentGraphData.edges.filter(
      (e) => e.source === selectedNode.id || e.target === selectedNode.id
    );

    return {
      node: selectedNode,
      districtId: nexusDistrictId,
      connectionsCount: connectedEdges.length,
      connectedEdges,
    };
  }, [currentGraphData.edges, selectedNode, nodePositionMap, activeCase]);

  // Case category dot color helper
  const getCategoryDot = (cat?: CrimeCategory | string) => {
    switch (cat) {
      case 'DRUGS':
        return 'bg-cyan-400';
      case 'ARMS':
        return 'bg-rose-400';
      case 'DOCUMENTS':
        return 'bg-purple-400';
      case 'FINANCIAL':
        return 'bg-amber-400';
      default:
        return 'bg-slate-400';
    }
  };

  const handleSelectCase = (post: InterceptPost) => {
    sound.playClick();
    setActiveCase(post);
    if (onSelectPost) onSelectPost(post);
  };

  return (
    <div className="relative w-full h-full bg-[#070A10] overflow-hidden select-none font-sans">
      {/* ======================================================== */}
      {/* 1. TOP CASE NAVIGATION & SCOPE SWITCHER BAR              */}
      {/* ======================================================== */}
      <div className="absolute top-3 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Return & Scope Switcher */}
        <div className="flex items-center gap-2">
          {onReturnToCommand && (
            <button
              onClick={() => {
                sound.playClick();
                onReturnToCommand();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0C101A]/90 hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white transition-colors backdrop-blur-md shadow-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>COMMAND CENTER</span>
            </button>
          )}

          {/* Mode Switcher: FOCUSED CASE vs GLOBAL MASTER */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#0C101A]/90 border border-white/[0.08] backdrop-blur-md text-xs font-sans">
            <button
              onClick={() => {
                sound.playClick();
                setViewScope('CASE');
              }}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                viewScope === 'CASE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3 h-3 text-cyan-400" />
              <span>CASE TOPOLOGY</span>
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setViewScope('GLOBAL');
              }}
              className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                viewScope === 'GLOBAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Network className="w-3 h-3 text-cyan-400" />
              <span>GLOBAL SYNDICATE</span>
            </button>
          </div>
        </div>

        {/* Center/Right: Case Selector Pills (Switch case dynamically) */}
        {viewScope === 'CASE' && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-2xl py-0.5">
            <span className="text-[10px] font-mono text-slate-500 hidden xl:inline">CASES:</span>
            {caseList.slice(0, 7).map((p) => {
              const isActive = activeCase?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectCase(p)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                      : 'bg-[#0C101A]/80 border-white/[0.08] text-slate-400 hover:border-white/[0.2] hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${getCategoryDot(p.categories[0])}`} />
                  <span>{p.channel}</span>
                  <span className="text-[9px] text-slate-500 font-sans">({p.districtName})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. EXPANSIVE CANVAS WITH DRAG & PINCH-TO-ZOOM             */}
      {/* ======================================================== */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`w-full h-full touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } relative flex items-center justify-center`}
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.04) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      >
        {/* Ambient Radial Glow centered around the focal hero */}
        <div
          className="absolute w-[850px] h-[850px] rounded-full pointer-events-none opacity-25"
          style={{
            background:
              activeCase?.categories[0] === 'ARMS'
                ? 'radial-gradient(circle, rgba(244, 63, 94, 0.25) 0%, rgba(245, 158, 11, 0.08) 40%, transparent 70%)'
                : activeCase?.categories[0] === 'DOCUMENTS'
                ? 'radial-gradient(circle, rgba(192, 132, 252, 0.25) 0%, rgba(0, 255, 136, 0.06) 40%, transparent 70%)'
                : activeCase?.categories[0] === 'FINANCIAL'
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(0, 229, 255, 0.08) 40%, transparent 70%)'
                : 'radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, rgba(0, 255, 136, 0.08) 40%, transparent 70%)',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        />

        {/* 3D GRAPH SVG CANVAS */}
        <svg
          viewBox="0 0 1400 900"
          className="w-full h-full pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <defs>
            {/* Glowing drop shadow filter */}
            <filter id="topo_glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Central Pedestal Hologram Radial Gradient */}
            <radialGradient id="topo_hero_pedestal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#00FF88" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#070A10" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* CONCENTRIC ALIGNMENT RINGS (Inner Ring r=175px, Outer Ring r=330px) */}
          <g transform="translate(700, 450)" className="pointer-events-none">
            {/* Central Core Aura */}
            <circle
              r="80"
              fill="url(#topo_hero_pedestal)"
              className="animate-pulse"
              style={{ animationDuration: '3.5s' }}
            />
            {/* Inner Ring Guideline */}
            <circle
              r="175"
              fill="none"
              stroke="#00E5FF"
              strokeWidth="1"
              strokeDasharray="4 8"
              strokeOpacity="0.22"
            />
            {/* Outer Ring Guideline */}
            <circle
              r="330"
              fill="none"
              stroke="#00FF88"
              strokeWidth="1"
              strokeDasharray="6 10"
              strokeOpacity="0.16"
            />
          </g>

          {/* ANIMATED RUNNING CONNECTION LINES (Green & Blue Data Streams) */}
          <g className="edges-layer">
            {visibleEdges.map((edge, idx) => {
              const srcPos = nodePositionMap[edge.source];
              const tgtPos = nodePositionMap[edge.target];
              if (!srcPos || !tgtPos) return null;

              // Generate gentle curved Bezier line
              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;
              const dx = tgtPos.x - srcPos.x;
              const dy = tgtPos.y - srcPos.y;
              const offset = 26;
              const controlX = midX - dy * (offset / 420);
              const controlY = midY + dx * (offset / 420);

              const isHighlighted =
                selectedNode &&
                (selectedNode.id === edge.source || selectedNode.id === edge.target);
              const isHovered =
                (hoveredNodeId && (hoveredNodeId === edge.source || hoveredNodeId === edge.target)) ||
                hoveredEdgeId === edge.id;

              const colors = getEdgeColors(edge);
              const pathD = `M ${srcPos.x} ${srcPos.y - 8} Q ${controlX} ${controlY} ${tgtPos.x} ${tgtPos.y - 8}`;

              // Edge label visibility: ONLY show when edge or connected node is hovered or selected
              const showEdgeLabel = isHighlighted || isHovered;

              return (
                <g
                  key={edge.id}
                  className="cursor-pointer pointer-events-auto"
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                >
                  {/* Layer 1: Base Glowing Tube */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={colors.base}
                    strokeWidth={isHighlighted ? 3.8 : isHovered ? 2.8 : 1.6}
                    strokeOpacity={isHighlighted ? 0.95 : isHovered ? 0.75 : 0.35}
                    filter={isHighlighted || isHovered ? 'url(#topo_glow)' : undefined}
                  />

                  {/* Layer 2: Live Animated Running Stream (continuous running flow) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={colors.stream}
                    strokeWidth={isHighlighted ? 2.4 : 1.6}
                    strokeDasharray="8 14"
                    strokeOpacity={isHighlighted ? 1 : isHovered ? 0.85 : 0.65}
                    className="animate-stream-flow"
                    style={{ animationDuration: isHighlighted ? '0.9s' : '1.5s' }}
                  />

                  {/* Layer 3: Directional Traveling Light Pulse / Photon Particle */}
                  <circle
                    r={isHighlighted ? '3.5' : '2.5'}
                    fill={colors.stream}
                    filter="url(#topo_glow)"
                    opacity={isHighlighted ? '1' : '0.8'}
                  >
                    <animateMotion
                      path={pathD}
                      dur={`${1.8 + (idx % 3) * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Clean Midpoint Label: REVEAL ONLY ON HOVER OR SELECTION */}
                  {showEdgeLabel && edge.label && (
                    <g transform={`translate(${controlX}, ${controlY})`} className="pointer-events-none">
                      <rect
                        x="-52"
                        y="-10"
                        width="104"
                        height="20"
                        rx="4"
                        fill="#070A10"
                        stroke={colors.base}
                        strokeWidth="1.2"
                        filter="url(#topo_glow)"
                      />
                      <text
                        textAnchor="middle"
                        y="4"
                        className="font-mono text-[9px] tracking-wider fill-cyan-300 font-semibold"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* 3D FIGURINE NODES WITH SINGLE CLEAN BOTTOM PILL */}
          <g className="nodes-layer">
            {filteredNodes.map((node) => {
              const pos = nodePositionMap[node.id];
              if (!pos) return null;

              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isHero = Boolean(node.isHero || pos.ring === 'center');

              // Pedestal neon color
              const pedestalColor = isHero
                ? '#00E5FF'
                : node.type === 'crypto'
                ? '#F43F5E'
                : node.type === 'phone'
                ? '#F59E0B'
                : node.type === 'telegram'
                ? '#C084FC'
                : node.type === 'district'
                ? '#10B981'
                : '#00FF88';

              // Node Scale: prominent hero and balanced outer nodes
              const nodeScale = isHero ? (isSelected ? 1.85 : 1.7) : isSelected ? 1.45 : 1.3;

              // Display label (clean and truncated to prevent horizontal collisions)
              const displayLabel =
                node.label.length > 17 ? node.label.slice(0, 16) + '…' : node.label;
              const pillWidth = Math.min(Math.max(displayLabel.length * 6.5 + 24, 76), 125);

              return (
                <g
                  key={node.id}
                  className="node-element cursor-pointer pointer-events-auto transition-transform duration-200"
                  transform={`translate(${pos.x}, ${pos.y}) scale(${nodeScale})`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playClick();
                    setSelectedNode(node);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* 3D Figurine: hideInternalLabels=true removes redundant internal text */}
                  <NodeAvatarCharacter
                    node={node}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    pedestalColor={pedestalColor}
                    hideInternalLabels={true}
                  />

                  {/* SINGLE CLEAN PILL BADGE BELOW AVATAR (translateY +36px, Zero Overlap) */}
                  <g transform="translate(0, 36)" className="pointer-events-none select-none">
                    {/* Dark Translucent Glass Pill */}
                    <rect
                      x={-pillWidth / 2}
                      y="-10"
                      width={pillWidth}
                      height="20"
                      rx="5"
                      fill="#070A10"
                      fillOpacity="0.94"
                      stroke={
                        isSelected
                          ? '#00E5FF'
                          : isHero
                          ? '#00FF88'
                          : 'rgba(255, 255, 255, 0.16)'
                      }
                      strokeWidth={isSelected ? 1.6 : 1}
                      filter={isSelected ? 'url(#topo_glow)' : undefined}
                      className="shadow-2xl"
                    />

                    {/* Status Indicator Dot */}
                    <circle
                      cx={-pillWidth / 2 + 8}
                      cy="0"
                      r="2.5"
                      fill={pedestalColor}
                    />

                    {/* Clean Monospace Identifier Label */}
                    <text
                      x={-pillWidth / 2 + 16}
                      y="3.5"
                      textAnchor="start"
                      className={`font-mono text-[9px] font-medium tracking-wide ${
                        isSelected
                          ? 'fill-cyan-300 font-bold'
                          : isHero
                          ? 'fill-emerald-300 font-semibold'
                          : 'fill-slate-200'
                      }`}
                    >
                      {displayLabel}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 3. FLOATING TOP-LEFT FILTER & SEARCH BAR                 */}
      {/* ======================================================== */}
      <div className="absolute top-16 left-4 z-20 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {/* Active Case Badge */}
        {viewScope === 'CASE' && activeCase && (
          <div className="pointer-events-auto bg-[#0C101A]/90 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-2.5 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${getCategoryDot(activeCase.categories[0])} animate-pulse`} />
              <div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <span>{activeCase.channel}</span>
                  <span className="text-[10px] text-cyan-400 font-normal">({activeCase.districtName})</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  {activeCase.categories.join(' · ')} · {((activeCase.confidence) * 100).toFixed(0)}% MATCH
                </div>
              </div>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SEC 63 BSA
            </span>
          </div>
        )}

        {/* Search Input Card */}
        <div className="pointer-events-auto bg-[#0C101A]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl p-2.5 shadow-2xl flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400 shrink-0 ml-1" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search identifier in this topology..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Filter Pills Bar */}
        <div className="pointer-events-auto bg-[#0C101A]/85 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1.5 shadow-xl flex items-center gap-1 overflow-x-auto text-[11px] font-sans">
          {(
            [
              { key: 'ALL', label: 'All Nodes' },
              { key: 'HERO', label: 'Hero / Escrow' },
              { key: 'SELLER', label: 'Handles' },
              { key: 'CRYPTO', label: 'Crypto' },
              { key: 'POSTS', label: 'Syndicates' },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => {
                sound.playClick();
                setActiveFilter(item.key);
              }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeFilter === item.key
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Match Count Badge */}
        <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-slate-400 self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>
            {filteredNodes.length} of {currentGraphData.nodes.length} Entities in View
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. FLOATING GLASS ENTITY INSPECTOR DRAWER (RIGHT SIDE)   */}
      {/* ======================================================== */}
      <AnimatePresence>
        {selectedNodeInfo && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute top-16 right-4 bottom-4 z-20 w-[360px] bg-[#0C101A]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans select-none"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedNodeInfo.node.isHero ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
                  }`}
                />
                <span className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                  {selectedNodeInfo.node.type} // DOSSIER
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                {selectedNodeInfo.node.category || activeCase?.categories[0] || 'CRIME'}
              </span>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Avatar Big Preview */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl relative overflow-hidden">
                <div className="w-24 h-28 flex items-center justify-center">
                  <svg viewBox="-30 -70 60 90" className="w-full h-full overflow-visible">
                    <NodeAvatarCharacter
                      node={selectedNodeInfo.node}
                      isSelected={true}
                      isHovered={false}
                      pedestalColor={
                        selectedNodeInfo.node.isHero
                          ? '#00E5FF'
                          : selectedNodeInfo.node.type === 'crypto'
                          ? '#F43F5E'
                          : selectedNodeInfo.node.type === 'phone'
                          ? '#F59E0B'
                          : '#00FF88'
                      }
                      hideInternalLabels={false}
                    />
                  </svg>
                </div>
                <div className="mt-2 text-center">
                  <div className="text-sm font-mono font-bold text-white break-all">
                    {selectedNodeInfo.node.label}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    IDENTIFIER REF // {selectedNodeInfo.node.id}
                  </div>
                </div>
              </div>

              {/* Risk Score Meter */}
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono">THREAT RISK CONVICTION</span>
                  <span className="font-mono font-bold text-rose-400">
                    {(selectedNodeInfo.node.riskScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-500 rounded-full"
                    style={{ width: `${selectedNodeInfo.node.riskScore * 100}%` }}
                  />
                </div>
              </div>

              {/* Linked Telegram Channels */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase">
                  ASSOCIATED BROADCAST CHANNELS
                </div>
                <div className="space-y-1">
                  {(selectedNodeInfo.node.channels || [activeCase?.channel || '@delhi_highs']).map(
                    (chan) => (
                      <div
                        key={chan}
                        className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-xs font-mono text-cyan-300 flex items-center justify-between"
                      >
                        <span>{chan}</span>
                        <span className="text-[10px] text-emerald-400">MONITORED</span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Connected Edges */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono text-slate-400 uppercase">
                  NETWORK RELATIONS ({selectedNodeInfo.connectionsCount})
                </div>
                <div className="space-y-1">
                  {selectedNodeInfo.connectedEdges.slice(0, 5).map((e) => (
                    <div
                      key={e.id}
                      className="p-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-xs flex items-center justify-between"
                    >
                      <span className="text-slate-300 font-mono text-[11px]">
                        {e.source === selectedNodeInfo.node.id ? e.target : e.source}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                        {e.label || 'LINKED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-3 border-t border-white/[0.07] bg-[#070A10]/60 space-y-2">
              {onLocateDistrict && (
                <button
                  onClick={() => {
                    sound.playClick();
                    onLocateDistrict(selectedNodeInfo.districtId);
                  }}
                  className="w-full py-2 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Locate on Rajasthan Map</span>
                </button>
              )}

              {onOpenDossier && activeCase && (
                <button
                  onClick={() => {
                    sound.playSuccessChime();
                    onOpenDossier(activeCase.id);
                  }}
                  className="w-full py-2 px-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-cyan-950/40"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Inspect Forensic Case Dossier</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 5. FLOATING BOTTOM-RIGHT ZOOM & RESET CONTROLS           */}
      {/* ======================================================== */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-[#0C101A]/90 backdrop-blur-xl border border-white/[0.08] rounded-xl p-1.5 shadow-2xl">
        <button
          onClick={() => {
            sound.playClick();
            setZoom((z) => Math.min(z * 1.25, 2.8));
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            sound.playClick();
            setZoom((z) => Math.max(z * 0.8, 0.4));
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/[0.08]" />
        <button
          onClick={resetView}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
          title="Reset View"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
