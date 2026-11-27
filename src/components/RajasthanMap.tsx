import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { geoMercator, geoPath } from 'd3-geo';
import { DistrictIntel, DistrictConnection, CrimeCategory } from '../types';
import { RAJASTHAN_DISTRICTS } from '../data/mockData';
import { useRajasthanGeoJSON, RajasthanGeoFeature } from '../hooks/useRajasthanGeoJSON';
import { sound } from '../utils/audio';

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const MAP_PADDING = 24;

// District name normalization map for GeoJSON spellings and variations (41 districts across 7 divisions)
export const DISTRICT_NAME_NORMALIZATION: Record<string, string> = {
  ganganagar: 'Sri Ganganagar',
  'sri ganganagar': 'Sri Ganganagar',
  'sri-ganganagar': 'Sri Ganganagar',
  jalor: 'Jalore',
  jalore: 'Jalore',
  jhunjhunun: 'Jhunjhunu',
  jhunjhunu: 'Jhunjhunu',
  chittaurgarh: 'Chittorgarh',
  chittorgarh: 'Chittorgarh',
  dhaulpur: 'Dholpur',
  dholpur: 'Dholpur',
  'sawai madhopur': 'Sawai Madhopur',
  'sawai-madhopur': 'Sawai Madhopur',
  sawaimadhopur: 'Sawai Madhopur',
  balotra: 'Balotra',
  beawar: 'Beawar',
  deeg: 'Deeg',
  'didwana-kuchaman': 'Didwana-Kuchaman',
  didwana: 'Didwana-Kuchaman',
  kuchaman: 'Didwana-Kuchaman',
  'didwana kuchaman': 'Didwana-Kuchaman',
  'kotputli-behror': 'Kotputli-Behror',
  kotputli: 'Kotputli-Behror',
  behror: 'Kotputli-Behror',
  'kotputli behror': 'Kotputli-Behror',
  'khairthal-tijara': 'Khairthal-Tijara',
  khairthal: 'Khairthal-Tijara',
  tijara: 'Khairthal-Tijara',
  'khairthal tijara': 'Khairthal-Tijara',
  phalodi: 'Phalodi',
  salumbar: 'Salumbar',
};

export const normalizeDistrictName = (rawName?: string | null): string => {
  if (!rawName) return '';
  const clean = rawName.trim().toLowerCase();
  return DISTRICT_NAME_NORMALIZATION[clean] || rawName.trim();
};

interface RajasthanMapProps {
  districts: DistrictIntel[];
  connections: DistrictConnection[];
  selectedDistrict: DistrictIntel | null;
  onSelectDistrict: (district: DistrictIntel) => void;
  onOpenDossier?: (district: DistrictIntel) => void;
  activeCategory: CrimeCategory | 'ALL';
  highlightedDistrictIds?: string[];
}

export const RajasthanMap: React.FC<RajasthanMapProps> = ({
  districts = RAJASTHAN_DISTRICTS,
  connections,
  selectedDistrict,
  onSelectDistrict,
  onOpenDossier,
  activeCategory,
  highlightedDistrictIds = [],
}) => {
  const { geoJson, isLoading } = useRajasthanGeoJSON();

  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictIntel | null>(null);
  const [showArcs, setShowArcs] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Filter connections by active category
  const filteredConnections = useMemo(
    () =>
      connections.filter((conn) => {
        if (activeCategory === 'ALL') return true;
        return conn.category === activeCategory;
      }),
    [connections, activeCategory]
  );

  const getDistrictById = (id: string) =>
    districts.find((d) => d.id.toLowerCase() === id.toLowerCase());

  const getDistrictByName = (rawName?: string | null) => {
    if (!rawName) return undefined;
    const normalized = normalizeDistrictName(rawName).toLowerCase();
    const rawClean = rawName.trim().toLowerCase();

    return districts.find((d) => {
      const dNorm = normalizeDistrictName(d.name).toLowerCase();
      const dClean = d.name.trim().toLowerCase();
      const dId = d.id.toLowerCase().replace(/-/g, ' ');
      const dIdRaw = d.id.toLowerCase();

      return (
        dNorm === normalized ||
        dClean === rawClean ||
        dClean === normalized ||
        dNorm === rawClean ||
        dId === normalized ||
        dId === rawClean ||
        dIdRaw === normalized ||
        dIdRaw === rawClean
      );
    });
  };

  // Compute d3-geo Mercator projection fitted cleanly to the 800x600 SVG viewport
  const { projection, pathGenerator } = useMemo(() => {
    if (!geoJson) return { projection: null, pathGenerator: null };
    const proj = geoMercator().fitExtent(
      [
        [MAP_PADDING, MAP_PADDING],
        [MAP_WIDTH - MAP_PADDING, MAP_HEIGHT - MAP_PADDING],
      ],
      geoJson as any
    );
    const pathGen = geoPath().projection(proj);
    return { projection: proj, pathGenerator: pathGen };
  }, [geoJson]);

  // Precompute SVG paths and dead-center polygon centroids for all 41 GeoJSON features
  const { renderedFeatures, centroidById } = useMemo(() => {
    if (!geoJson || !pathGenerator) {
      return {
        renderedFeatures: [] as {
          key: string;
          feature: RajasthanGeoFeature;
          pathData: string;
          centroid: [number, number] | null;
          matchedDistrict: DistrictIntel | undefined;
          normalizedName: string;
        }[],
        centroidById: new Map<string, [number, number]>(),
      };
    }

    const centroids = new Map<string, [number, number]>();
    const items = geoJson.features.map((feature, index) => {
      const rawName =
        feature.properties?.district ||
        feature.properties?.dtname ||
        feature.properties?.name ||
        '';
      const matchedDistrict = getDistrictByName(rawName);
      const normalizedName = normalizeDistrictName(rawName).toLowerCase();
      const pathData = pathGenerator(feature as any) || '';
      const rawCentroid = pathGenerator.centroid(feature as any);
      const centroid: [number, number] | null =
        rawCentroid && !Number.isNaN(rawCentroid[0]) && !Number.isNaN(rawCentroid[1])
          ? [rawCentroid[0], rawCentroid[1]]
          : null;

      if (centroid) {
        if (matchedDistrict) {
          centroids.set(matchedDistrict.id.toLowerCase(), centroid);
          centroids.set(matchedDistrict.name.toLowerCase(), centroid);
        }
        if (normalizedName) {
          centroids.set(normalizedName, centroid);
        }
      }

      return {
        key: `${feature.properties?.dt_code || rawName || 'dist'}-${index}`,
        feature,
        pathData,
        centroid,
        matchedDistrict,
        normalizedName,
      };
    });

    return { renderedFeatures: items, centroidById: centroids };
  }, [geoJson, pathGenerator, districts]);

  const getConnectionColor = (conn: DistrictConnection) => {
    if (conn.type === 'UPI') return '#22D3EE'; // cyan
    if (conn.type === 'PHONE' || conn.category === 'ARMS') return '#F59E0B'; // amber
    if (conn.type === 'CRYPTO' || conn.category === 'DRUGS') return '#F43F5E'; // rose
    return '#818CF8';
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return '#F43F5E';
      case 'HIGH':
        return '#F59E0B';
      case 'ELEVATED':
        return '#22D3EE';
      default:
        return '#64748B';
    }
  };

  // Pan & Zoom Handlers
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: pan.x,
      origY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPan({
      x: dragState.current.origX + dx,
      y: dragState.current.origY + dy,
    });
  };

  const handlePointerUp = () => {
    dragState.current.dragging = false;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.18 : -0.18;
    setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.8), 4));
  };

  return (
    <div className="relative w-full h-full bg-[#070A10] overflow-hidden flex flex-col select-none touch-none">
      {/* Soft background grid - 5% opacity per Palantir/Mapbox spec */}
      <div className="absolute inset-0 radar-grid opacity-5 pointer-events-none" />

      {/* Top Map Header Bar: Badge (Left) + Controls (Right) */}
      <div className="absolute top-3.5 left-4 right-4 z-20 flex items-center justify-between gap-2 pointer-events-none">
        {/* Floating Administrative Structure Badge */}
        <div className="hidden lg:flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#0C101A]/85 backdrop-blur-md border border-white/[0.08] px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl text-[10px] xl:text-[11px] font-mono whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-white font-semibold">RAJASTHAN</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300 font-bold">41 DISTRICTS · 7 DIVISIONS</span>
          </div>
        </div>

        {/* Floating Compact Glass Toolbar */}
        <div className="ml-auto flex items-center gap-2 pointer-events-auto">
          <div className="bg-[#0C101A]/85 backdrop-blur-md border border-white/[0.08] px-2.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xl">
            <button
              onClick={() => {
                sound.playClick();
                setShowArcs(!showArcs);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-all ${
                showArcs
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Syndicate Arcs
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setShowRadar(!showRadar);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-sans font-medium transition-all ${
                showRadar
                  ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Radar Pulse
            </button>

            <div className="h-3.5 w-px bg-white/[0.08] mx-0.5" />

            <button
              onClick={() => {
                sound.playClick();
                setZoomLevel((prev) => Math.min(prev + 0.35, 4));
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setZoomLevel((prev) => Math.max(prev - 0.35, 0.8));
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setZoomLevel(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Reset View"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main d3-geo Vector Map Canvas */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none cursor-grab active:cursor-grabbing">
        {/* Ultra-faint concentric radar sweep rings */}
        {showRadar && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <div className="w-[580px] h-[580px] rounded-full border border-white/[0.04] relative">
              <div className="absolute inset-16 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-32 rounded-full border border-white/[0.02]" />
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-transparent via-transparent to-cyan-500/[0.04] animate-radar-sweep origin-center" />
            </div>
          </div>
        )}

        {isLoading && !geoJson ? (
          <div className="flex flex-col items-center gap-2 text-xs font-mono text-cyan-400/80">
            <span className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            <span>LOADING RAJASTHAN GEOJSON MESH...</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-full rsm-svg"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onWheel={handleWheel}
          >
            <g
              transform={`translate(${MAP_WIDTH / 2 + pan.x}, ${MAP_HEIGHT / 2 + pan.y}) scale(${zoomLevel}) translate(${-MAP_WIDTH / 2}, ${-MAP_HEIGHT / 2})`}
            >
              {/* 1. Render all 41 District Boundary Polygons generated by d3-geo */}
              <g className="rsm-geographies">
                {renderedFeatures.map(({ key, pathData, matchedDistrict, normalizedName }) => {
                  const isSelected = Boolean(
                    selectedDistrict &&
                      (selectedDistrict.id === matchedDistrict?.id ||
                        normalizeDistrictName(selectedDistrict.name).toLowerCase() === normalizedName)
                  );
                  const isHovered = Boolean(
                    hoveredDistrict &&
                      (hoveredDistrict.id === matchedDistrict?.id ||
                        normalizeDistrictName(hoveredDistrict.name).toLowerCase() === normalizedName)
                  );
                  const isHighlighted = Boolean(
                    highlightedDistrictIds &&
                      highlightedDistrictIds.length > 0 &&
                      matchedDistrict &&
                      highlightedDistrictIds.some(
                        (hid) =>
                          hid.toLowerCase() === matchedDistrict.id.toLowerCase() ||
                          normalizeDistrictName(matchedDistrict.name).toLowerCase() ===
                            hid.toLowerCase()
                      )
                  );

                  const strokeColor = isSelected
                    ? '#22D3EE'
                    : isHighlighted
                    ? '#00E5FF'
                    : isHovered
                    ? '#38BDF8'
                    : 'rgba(148, 163, 184, 0.24)';

                  const fillColor = isSelected
                    ? 'rgba(34, 211, 238, 0.16)'
                    : isHighlighted
                    ? 'rgba(0, 229, 255, 0.16)'
                    : isHovered
                    ? 'rgba(56, 189, 248, 0.10)'
                    : '#0B0F19';

                  return (
                    <path
                      key={key}
                      d={pathData}
                      className="rsm-geography"
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={(isSelected ? 1.5 : isHovered ? 1.1 : 0.65) / Math.sqrt(zoomLevel)}
                      strokeLinejoin="round"
                      onMouseEnter={() => {
                        if (matchedDistrict) setHoveredDistrict(matchedDistrict);
                      }}
                      onMouseLeave={() => setHoveredDistrict(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (matchedDistrict) {
                          sound.playClick();
                          onSelectDistrict(matchedDistrict);
                        }
                      }}
                      style={{
                        outline: 'none',
                        cursor: matchedDistrict ? 'pointer' : 'default',
                        transition: 'fill 0.15s ease, stroke 0.15s ease',
                      }}
                    />
                  );
                })}
              </g>

              {/* 2. Smooth Curved Syndicate Arcs between District Centroids */}
              {showArcs &&
                projection &&
                filteredConnections.map((conn) => {
                  const fromDist = getDistrictById(conn.from);
                  const toDist = getDistrictById(conn.to);
                  if (!fromDist || !toDist) return null;

                  const fromPt =
                    centroidById.get(fromDist.id.toLowerCase()) ||
                    (fromDist.coordinates ? projection(fromDist.coordinates) : null);
                  const toPt =
                    centroidById.get(toDist.id.toLowerCase()) ||
                    (toDist.coordinates ? projection(toDist.coordinates) : null);

                  if (!fromPt || !toPt) return null;

                  const [x1, y1] = fromPt;
                  const [x2, y2] = toPt;
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2;
                  const dist = Math.hypot(x2 - x1, y2 - y1);
                  const arcHeight = Math.min(dist * 0.22, 48);
                  const arcPath = `M ${x1},${y1} Q ${mx},${my - arcHeight} ${x2},${y2}`;
                  const arcColor = getConnectionColor(conn);

                  return (
                    <path
                      key={conn.id}
                      d={arcPath}
                      fill="none"
                      stroke={arcColor}
                      strokeWidth={1.3 / Math.sqrt(zoomLevel)}
                      strokeDasharray="4 3"
                      strokeOpacity={0.75}
                      className="animate-pulse pointer-events-none"
                    />
                  );
                })}

              {/* 3. Dead-Center Radar Pins & Labels via pathGenerator.centroid() */}
              {renderedFeatures.map(({ key, centroid, matchedDistrict }) => {
                if (!matchedDistrict || !centroid) return null;
                const [cx, cy] = centroid;

                const isSelected =
                  selectedDistrict?.id === matchedDistrict.id ||
                  normalizeDistrictName(selectedDistrict?.name).toLowerCase() ===
                    normalizeDistrictName(matchedDistrict.name).toLowerCase();
                const isHovered =
                  hoveredDistrict?.id === matchedDistrict.id ||
                  normalizeDistrictName(hoveredDistrict?.name).toLowerCase() ===
                    normalizeDistrictName(matchedDistrict.name).toLowerCase();
                const isHighlighted = Boolean(
                  highlightedDistrictIds &&
                    highlightedDistrictIds.length > 0 &&
                    highlightedDistrictIds.some(
                      (hid) =>
                        hid.toLowerCase() === matchedDistrict.id.toLowerCase() ||
                        normalizeDistrictName(matchedDistrict.name).toLowerCase() ===
                          hid.toLowerCase()
                    )
                );
                const isHotspot =
                  matchedDistrict.threatLevel === 'CRITICAL' ||
                  matchedDistrict.threatLevel === 'HIGH';

                const showLabel = isSelected || isHovered || isHighlighted || isHotspot;
                const threatColor = getThreatColor(matchedDistrict.threatLevel);
                const invScale = 1 / Math.sqrt(zoomLevel);

                return (
                  <g
                    key={`pin-${key}`}
                    transform={`translate(${cx}, ${cy}) scale(${invScale})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playClick();
                      onSelectDistrict(matchedDistrict);
                    }}
                    onMouseEnter={() => setHoveredDistrict(matchedDistrict)}
                    onMouseLeave={() => setHoveredDistrict(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Outer Pulse Ping for Selected or Highlighted Node */}
                    {(isSelected || isHighlighted) && (
                      <circle
                        r={isHighlighted ? 12 : 8}
                        fill="none"
                        stroke={isHighlighted ? '#00E5FF' : '#22D3EE'}
                        strokeWidth={isHighlighted ? 1.6 : 1.2}
                        className="animate-ping"
                        opacity={isHighlighted ? 0.8 : 0.6}
                      />
                    )}

                    {/* Glowing District Centroid Dot */}
                    <circle
                      r={isSelected ? 3.5 : isHighlighted ? 4 : isHovered ? 3 : 2.1}
                      fill={
                        isSelected
                          ? '#22D3EE'
                          : isHighlighted
                          ? '#00E5FF'
                          : isHovered
                          ? '#38BDF8'
                          : threatColor
                      }
                      stroke="#070A10"
                      strokeWidth={1}
                    />

                    {/* Decluttered District Name */}
                    {showLabel && (
                      <text
                        textAnchor="middle"
                        y={10}
                        fill={isSelected ? '#38BDF8' : isHovered ? '#F1F5F9' : '#94A3B8'}
                        fontSize={isSelected ? 8 : 6.5}
                        fontFamily="sans-serif"
                        fontWeight={isSelected || isHovered ? '600' : '500'}
                        style={{
                          pointerEvents: 'none',
                          userSelect: 'none',
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                        }}
                      >
                        {matchedDistrict.name}
                      </text>
                    )}

                    {/* Minimal Pill Badge for Flagged Count */}
                    {showLabel && matchedDistrict.flaggedCount > 0 && (
                      <g transform="translate(6, -7)" style={{ pointerEvents: 'none' }}>
                        <rect
                          x={-2}
                          y={-5}
                          width={matchedDistrict.flaggedCount > 9 ? 14 : 10}
                          height={8}
                          rx={2}
                          fill="#070A10"
                          stroke={threatColor}
                          strokeWidth={0.6}
                          opacity={0.9}
                        />
                        <text
                          x={matchedDistrict.flaggedCount > 9 ? 5 : 3}
                          y={1}
                          textAnchor="middle"
                          fill={threatColor}
                          fontSize={5.5}
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {matchedDistrict.flaggedCount}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Compact, Translucent Floating Pill Legend (Bottom Left) */}
        <div className="absolute bottom-3.5 left-4 z-20 bg-[#0C101A]/85 backdrop-blur-md border border-white/[0.08] px-3.5 py-1.5 rounded-full flex items-center gap-3.5 text-[10px] font-sans text-slate-400 shadow-xl">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
            <span className="text-slate-300 font-medium">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-300 font-medium">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-medium">Elevated</span>
          </div>
          <div className="h-3 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2 font-mono text-[9px] text-slate-400">
            <span className="text-cyan-300">● UPI</span>
            <span className="text-amber-300">● Phone</span>
            <span className="text-rose-300">● Crypto</span>
          </div>
        </div>

        {/* Floating Minimal HUD Tooltip for Hovered District */}
        <AnimatePresence>
          {hoveredDistrict && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-14 left-4 z-30 bg-[#0C101A]/95 backdrop-blur-xl border border-white/[0.1] p-3.5 rounded-xl shadow-2xl w-60 pointer-events-none"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <div>
                  <div className="text-white font-sans font-semibold text-xs flex items-center gap-1.5">
                    <span>{hoveredDistrict.name}</span>
                    <span className="text-slate-500 text-[10px] font-normal">
                      ({hoveredDistrict.hindiName})
                    </span>
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">
                    {hoveredDistrict.division
                      ? `${hoveredDistrict.division.toUpperCase()} DIVISION`
                      : 'DISTRICT INTELLIGENCE'}
                  </div>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-sans font-semibold"
                  style={{
                    backgroundColor: `${getThreatColor(hoveredDistrict.threatLevel)}15`,
                    color: getThreatColor(hoveredDistrict.threatLevel),
                    border: `1px solid ${getThreatColor(hoveredDistrict.threatLevel)}30`,
                  }}
                >
                  {hoveredDistrict.threatLevel}
                </span>
              </div>

              <div className="mt-2.5 space-y-1.5 text-[11px] font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Division:</span>
                  <span className="text-cyan-300 font-mono font-medium text-[10px]">
                    {hoveredDistrict.division || 'Rajasthan'} Division
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Flagged Cases:</span>
                  <span className="text-slate-200 font-mono font-medium">
                    {hoveredDistrict.flaggedCount}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Top Threats:</span>
                  <span className="text-slate-300 text-[10px]">
                    {hoveredDistrict.topCategories.join(', ')}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Active Channels:</span>
                  <div className="text-cyan-300 font-mono text-[10px] truncate">
                    {hoveredDistrict.activeChannels.join(', ')}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Selected District Callout (Sleek Mapbox Glass Bar) */}
        {selectedDistrict && (
          <div className="absolute bottom-3.5 right-4 z-20 bg-[#0C101A]/90 backdrop-blur-md border border-white/[0.08] px-3 py-2 rounded-xl flex items-center gap-3.5 shadow-xl text-xs font-sans">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <div className="text-white font-medium text-xs flex items-center gap-1.5">
                  <span>{selectedDistrict.name} Focused</span>
                  <span className="font-mono text-[10px] text-cyan-400 font-semibold bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-500/20">
                    {selectedDistrict.flaggedCount} cases
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Top Entity: {selectedDistrict.topIdentifiers[0]}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                if (onOpenDossier) {
                  onOpenDossier(selectedDistrict);
                } else {
                  onSelectDistrict(selectedDistrict);
                }
              }}
              className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 px-3 py-1 rounded-lg text-xs font-medium transition-all shadow-sm active:translate-y-0.5 flex items-center gap-1.5"
            >
              <span>View Dossier</span>
              <span className="text-[10px]">&rarr;</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
