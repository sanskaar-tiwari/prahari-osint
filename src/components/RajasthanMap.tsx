import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { geoCentroid } from 'd3-geo';
import { DistrictIntel, DistrictConnection, CrimeCategory } from '../types';
import { RAJASTHAN_DISTRICTS } from '../data/mockData';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup,
} from 'react-simple-maps';
import { sound } from '../utils/audio';

const rajasthanGeoUrl = '/rajasthan-districts.json';
const DEFAULT_CENTER: [number, number] = [73.9, 26.7];

// District name normalization map for TopoJSON spellings and variations
export const DISTRICT_NAME_NORMALIZATION: Record<string, string> = {
  ganganagar: 'Sri Ganganagar',
  jalor: 'Jalore',
  jhunjhunun: 'Jhunjhunu',
  chittaurgarh: 'Chittorgarh',
  dhaulpur: 'Dholpur',
  'sri ganganagar': 'Sri Ganganagar',
  'sri-ganganagar': 'Sri Ganganagar',
  jalore: 'Jalore',
  jhunjhunu: 'Jhunjhunu',
  chittorgarh: 'Chittorgarh',
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

// Static coordinate fallback table for 41 Rajasthan districts across 7 divisions
const DISTRICT_COORDINATES: Record<string, [number, number]> = {
  churu: [74.695, 28.3439],
  jhunjhunu: [75.5499, 28.092],
  jaisalmer: [70.8995, 27.0748],
  sikar: [75.2888, 27.6337],
  alwar: [76.6014, 27.5903],
  jaipur: [75.7179, 26.9764],
  jodhpur: [72.7872, 26.7466],
  bharatpur: [77.2761, 27.2476],
  nagaur: [74.1748, 27.0661],
  dausa: [76.5086, 26.8567],
  karauli: [76.9593, 26.522],
  dholpur: [77.7006, 26.681],
  barmer: [71.4742, 25.7348],
  'sawai madhopur': [76.4612, 26.2177],
  'sawai-madhopur': [76.4612, 26.2177],
  tonk: [75.6663, 26.1486],
  pali: [73.5178, 25.7065],
  bhilwara: [74.7272, 25.4806],
  jalore: [72.2099, 25.0989],
  bundi: [75.7913, 25.4879],
  kota: [76.1033, 25.1093],
  sirohi: [72.7765, 24.7618],
  baran: [76.7477, 24.9949],
  udaipur: [73.6897, 24.4183],
  jhalawar: [76.1919, 24.3359],
  dungarpur: [73.8535, 23.731],
  banswara: [74.3644, 23.4781],
  ajmer: [74.7722, 26.2326],
  rajsamand: [73.8902, 25.2271],
  chittorgarh: [74.7742, 24.8219],
  ganganagar: [73.5694, 29.3956],
  'sri ganganagar': [73.5694, 29.3956],
  'sri-ganganagar': [73.5694, 29.3956],
  hanumangarh: [74.5623, 29.266],
  bikaner: [73.174, 28.177],
  pratapgarh: [74.6514, 24.029],
  balotra: [72.2415, 25.8339],
  beawar: [74.3235, 26.1033],
  deeg: [77.3275, 27.4722],
  'didwana-kuchaman': [74.5764, 27.3994],
  didwana: [74.5764, 27.3994],
  kuchaman: [74.8622, 27.1472],
  'kotputli-behror': [76.2023, 27.7058],
  kotputli: [76.2023, 27.7058],
  behror: [76.2825, 27.8872],
  'khairthal-tijara': [76.8378, 27.9332],
  khairthal: [76.8378, 27.9332],
  tijara: [76.8525, 27.9322],
  phalodi: [72.3644, 27.1308],
  salumbar: [74.0433, 24.1333],
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
  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictIntel | null>(null);
  const [showArcs, setShowArcs] = useState(true);
  const [showRadar, setShowRadar] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);

  // Filter connections by active category
  const filteredConnections = connections.filter((conn) => {
    if (activeCategory === 'ALL') return true;
    return conn.category === activeCategory;
  });

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

      return (
        dNorm === normalized ||
        dClean === rawClean ||
        dClean === normalized ||
        dNorm === rawClean ||
        dId === normalized ||
        dId === rawClean
      );
    });
  };

  const getDistrictCoordinates = (
    d: DistrictIntel,
    dynamicMap?: Map<string, [number, number]>
  ): [number, number] | null => {
    if (d.coordinates && d.coordinates.length === 2) {
      return d.coordinates;
    }

    if (dynamicMap) {
      const norm = normalizeDistrictName(d.name).toLowerCase();
      if (dynamicMap.has(norm)) return dynamicMap.get(norm)!;
      if (dynamicMap.has(d.name.toLowerCase())) return dynamicMap.get(d.name.toLowerCase())!;
      if (dynamicMap.has(d.id.toLowerCase())) return dynamicMap.get(d.id.toLowerCase())!;
    }

    const idKey = d.id.toLowerCase();
    if (DISTRICT_COORDINATES[idKey]) return DISTRICT_COORDINATES[idKey];
    const nameKey = d.name.toLowerCase().trim();
    if (DISTRICT_COORDINATES[nameKey]) return DISTRICT_COORDINATES[nameKey];
    const stripped = nameKey.replace(/^sri\s+/, '');
    if (DISTRICT_COORDINATES[stripped]) return DISTRICT_COORDINATES[stripped];

    return null;
  };

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
                setZoomLevel((prev) => Math.min(prev + 0.3, 4));
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setZoomLevel((prev) => Math.max(prev - 0.3, 0.8));
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
                setMapCenter(DEFAULT_CENTER);
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Reset View"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Vector Map Canvas */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none cursor-grab active:cursor-grabbing">
        {/* Ultra-faint concentric radar sweep rings (border-white/[0.04]) */}
        {showRadar && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
            <div className="w-[580px] h-[580px] rounded-full border border-white/[0.04] relative">
              <div className="absolute inset-16 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-32 rounded-full border border-white/[0.02]" />
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-transparent via-transparent to-cyan-500/[0.04] animate-radar-sweep origin-center" />
            </div>
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center touch-none">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              center: DEFAULT_CENTER,
              scale: 4200,
            }}
            style={{ width: '100%', height: '100%' }}
          >
            <ZoomableGroup
              center={mapCenter}
              zoom={zoomLevel}
              minZoom={0.8}
              maxZoom={4}
              onMoveEnd={({ coordinates, zoom }) => {
                if (coordinates) setMapCenter(coordinates);
                if (typeof zoom === 'number') setZoomLevel(zoom);
              }}
            >
              <Geographies geography={rajasthanGeoUrl}>
                {({ geographies, borders, outline }) => {
                  const dynamicCentroidMap = new Map<string, [number, number]>();
                  geographies.forEach((geo) => {
                    const rawName = (geo.properties as Record<string, any> | null)?.district as
                      | string
                      | undefined;
                    if (rawName) {
                      const centroid = geoCentroid(geo) as [number, number];
                      dynamicCentroidMap.set(rawName.toLowerCase(), centroid);
                      dynamicCentroidMap.set(
                        normalizeDistrictName(rawName).toLowerCase(),
                        centroid
                      );
                    }
                  });

                  return (
                    <>
                      {/* Base Geographic Districts with Mapbox Dark Elevation */}
                      {geographies.map((geo) => {
                        const topoName = (geo.properties as Record<string, any> | null)
                          ?.district as string | undefined;
                        const matchedDistrict = getDistrictByName(topoName);
                        const normalizedTopo = normalizeDistrictName(topoName).toLowerCase();
                        const isSelected = Boolean(
                          selectedDistrict &&
                            (selectedDistrict.id === matchedDistrict?.id ||
                              normalizeDistrictName(selectedDistrict.name).toLowerCase() ===
                                normalizedTopo)
                        );
                        const isHovered = Boolean(
                          hoveredDistrict &&
                            (hoveredDistrict.id === matchedDistrict?.id ||
                              normalizeDistrictName(hoveredDistrict.name).toLowerCase() ===
                                normalizedTopo)
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

                        // Mapbox Dark Palette: Subtle obsidian-slate fills with hairline stroke
                        const strokeColor = isSelected
                          ? '#22D3EE'
                          : isHighlighted
                          ? '#00E5FF'
                          : isHovered
                          ? '#38BDF8'
                          : 'rgba(255, 255, 255, 0.08)';

                        const fillColor = isSelected
                          ? 'rgba(34, 211, 238, 0.14)'
                          : isHighlighted
                          ? 'rgba(0, 229, 255, 0.16)'
                          : isHovered
                          ? 'rgba(255, 255, 255, 0.06)'
                          : '#0B0F19';

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onMouseEnter={() => {
                              if (matchedDistrict) setHoveredDistrict(matchedDistrict);
                            }}
                            onMouseLeave={() => setHoveredDistrict(null)}
                            onClick={() => {
                              if (matchedDistrict) {
                                sound.playClick();
                                onSelectDistrict(matchedDistrict);
                              }
                            }}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 1.4 : isHovered ? 1.0 : 0.5}
                            style={{
                              outline: 'none',
                              cursor: matchedDistrict ? 'pointer' : 'default',
                              transition: 'fill 0.15s ease, stroke 0.15s ease',
                            }}
                          />
                        );
                      })}

                      {/* Subtle Internal District Boundaries */}
                      {borders?.svgPath && (
                        <path
                          d={borders.svgPath}
                          fill="none"
                          stroke="rgba(255, 255, 255, 0.05)"
                          strokeWidth={0.5}
                          pointerEvents="none"
                        />
                      )}

                      {/* State Perimeter Boundary (True Outer Border Only - excludes any internal cut segments) */}
                      {outline?.svgPath && (() => {
                        const subpaths = outline.svgPath.split(/(?=M)/g).filter(Boolean);
                        const statePerimeter = subpaths.reduce(
                          (longest, curr) => (curr.length > longest.length ? curr : longest),
                          ''
                        );
                        return statePerimeter ? (
                          <path
                            d={statePerimeter}
                            fill="none"
                            stroke="rgba(34, 211, 238, 0.35)"
                            strokeWidth={1.2}
                            pointerEvents="none"
                          />
                        ) : null;
                      })()}

                      {/* Smooth Curved Syndicate Arcs */}
                      {showArcs &&
                        filteredConnections.map((conn) => {
                          const fromDist = getDistrictById(conn.from);
                          const toDist = getDistrictById(conn.to);
                          if (!fromDist || !toDist) return null;
                          const fromCoords = getDistrictCoordinates(fromDist, dynamicCentroidMap);
                          const toCoords = getDistrictCoordinates(toDist, dynamicCentroidMap);
                          if (!fromCoords || !toCoords) return null;

                          const arcColor = getConnectionColor(conn);

                          return (
                            <Line
                              key={conn.id}
                              from={fromCoords}
                              to={toCoords}
                              stroke={arcColor}
                              strokeWidth={1.4}
                              strokeDasharray="4 3"
                              strokeOpacity={0.75}
                              className="animate-pulse"
                              style={{ pointerEvents: 'none' }}
                            />
                          );
                        })}

                      {/* Decluttered District Markers: Clean glowing dots; labels show for Hovered/Selected or Hotspots */}
                      {districts.map((district) => {
                        const coords = getDistrictCoordinates(district, dynamicCentroidMap);
                        if (!coords) return null;

                        const isSelected =
                          selectedDistrict?.id === district.id ||
                          normalizeDistrictName(selectedDistrict?.name).toLowerCase() ===
                            normalizeDistrictName(district.name).toLowerCase();
                        const isHovered =
                          hoveredDistrict?.id === district.id ||
                          normalizeDistrictName(hoveredDistrict?.name).toLowerCase() ===
                            normalizeDistrictName(district.name).toLowerCase();
                        const isHighlighted = Boolean(
                          highlightedDistrictIds &&
                            highlightedDistrictIds.length > 0 &&
                            highlightedDistrictIds.some(
                              (hid) =>
                                hid.toLowerCase() === district.id.toLowerCase() ||
                                normalizeDistrictName(district.name).toLowerCase() ===
                                  hid.toLowerCase()
                            )
                        );
                        const isHotspot =
                          district.threatLevel === 'CRITICAL' || district.threatLevel === 'HIGH';

                        // Show label if selected, hovered, or high-threat hotspot to prevent clutter
                        const showLabel = isSelected || isHovered || isHighlighted || isHotspot;
                        const threatColor = getThreatColor(district.threatLevel);

                        return (
                          <Marker
                            key={district.id}
                            coordinates={coords}
                            onClick={() => {
                              sound.playClick();
                              onSelectDistrict(district);
                            }}
                            onMouseEnter={() => setHoveredDistrict(district)}
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

                            {/* Minimal Glowing District Centroid Dot */}
                            <circle
                              r={isSelected ? 3.5 : isHighlighted ? 4 : isHovered ? 3 : 2}
                              fill={isSelected ? '#22D3EE' : isHighlighted ? '#00E5FF' : isHovered ? '#38BDF8' : threatColor}
                              stroke="#070A10"
                              strokeWidth={1}
                            />

                            {/* Full Label Rendered Decluttered */}
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
                                {district.name}
                              </text>
                            )}

                            {/* Minimal Pill Badge for Flagged Count */}
                            {showLabel && district.flaggedCount > 0 && (
                              <g transform="translate(6, -7)" style={{ pointerEvents: 'none' }}>
                                <rect
                                  x={-2}
                                  y={-5}
                                  width={district.flaggedCount > 9 ? 14 : 10}
                                  height={8}
                                  rx={2}
                                  fill="#070A10"
                                  stroke={threatColor}
                                  strokeWidth={0.6}
                                  opacity={0.9}
                                />
                                <text
                                  x={district.flaggedCount > 9 ? 5 : 3}
                                  y={1}
                                  textAnchor="middle"
                                  fill={threatColor}
                                  fontSize={5.5}
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {district.flaggedCount}
                                </text>
                              </g>
                            )}
                          </Marker>
                        );
                      })}
                    </>
                  );
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

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
                    {hoveredDistrict.division ? `${hoveredDistrict.division.toUpperCase()} DIVISION` : 'DISTRICT INTELLIGENCE'}
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
