import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';

maplibregl.setWorkerUrl(maplibreWorkerUrl);
import { geoCentroid } from 'd3-geo';
import { DistrictIntel, DistrictConnection, CrimeCategory } from '../types';
import { RAJASTHAN_DISTRICTS } from '../data/mockData';
import { useRajasthanGeoJSON } from '../hooks/useRajasthanGeoJSON';
import { sound } from '../utils/audio';

const DARK_VECTOR_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
const DEFAULT_CENTER: [number, number] = [73.9, 26.6];
const DEFAULT_ZOOM = 5.45;

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

function buildCurvedArc(from: [number, number], to: [number, number], steps = 24): [number, number][] {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dist = Math.hypot(x2 - x1, y2 - y1);
  // Subtle northward bow proportional to distance
  const cx = mx - (y2 - y1) * 0.14;
  const cy = my + Math.max(Math.abs(x2 - x1) * 0.14, dist * 0.08);

  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const inv = 1 - t;
    const lng = inv * inv * x1 + 2 * inv * t * cx + t * t * x2;
    const lat = inv * inv * y1 + 2 * inv * t * cy + t * t * y2;
    coords.push([lng, lat]);
  }
  return coords;
}

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

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [hoveredDistrict, setHoveredDistrict] = useState<DistrictIntel | null>(null);
  const [showArcs, setShowArcs] = useState(true);
  const [showRadar, setShowRadar] = useState(true);

  // Keep latest callbacks/data in refs for MapLibre event handlers
  const districtsRef = useRef(districts);
  districtsRef.current = districts;
  const onSelectDistrictRef = useRef(onSelectDistrict);
  onSelectDistrictRef.current = onSelectDistrict;

  const filteredConnections = useMemo(
    () =>
      connections.filter((conn) => {
        if (activeCategory === 'ALL') return true;
        return conn.category === activeCategory;
      }),
    [connections, activeCategory]
  );

  const getDistrictById = (id: string) =>
    districtsRef.current.find((d) => d.id.toLowerCase() === id.toLowerCase());

  const getDistrictByName = (rawName?: string | null) => {
    if (!rawName) return undefined;
    const normalized = normalizeDistrictName(rawName).toLowerCase();
    const rawClean = rawName.trim().toLowerCase();

    return districtsRef.current.find((d) => {
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

  // Enrich GeoJSON features with matched DistrictIntel metadata & compute centroids
  const { enrichedGeoJson, centroidById } = useMemo(() => {
    if (!geoJson) {
      return { enrichedGeoJson: null, centroidById: new Map<string, [number, number]>() };
    }

    const centroids = new Map<string, [number, number]>();
    const features = geoJson.features.map((feature) => {
      const rawName =
        feature.properties?.district ||
        feature.properties?.dtname ||
        feature.properties?.name ||
        '';
      const matched = getDistrictByName(rawName);
      const center = geoCentroid(feature as any) as [number, number];
      const hasValidCenter =
        Array.isArray(center) && !Number.isNaN(center[0]) && !Number.isNaN(center[1]);

      if (matched && hasValidCenter) {
        centroids.set(matched.id.toLowerCase(), center);
      }

      return {
        ...feature,
        properties: {
          ...feature.properties,
          districtId: matched?.id || rawName.toLowerCase(),
          districtName: matched?.name || rawName,
          threatLevel: matched?.threatLevel || 'MODERATE',
          threatColor: getThreatColor(matched?.threatLevel || 'MODERATE'),
          flaggedCount: matched?.flaggedCount || 0,
        },
      };
    });

    return {
      enrichedGeoJson: {
        type: 'FeatureCollection' as const,
        features,
      },
      centroidById: centroids,
    };
  }, [geoJson, districts]);

  // Build Threat Pins GeoJSON FeatureCollection
  const pinsGeoJson = useMemo(() => {
    const features = districts
      .map((d) => {
        const coords = centroidById.get(d.id.toLowerCase()) || d.coordinates;
        if (!coords || coords.length !== 2) return null;
        const isHotspot = d.threatLevel === 'CRITICAL' || d.threatLevel === 'HIGH';
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: coords,
          },
          properties: {
            districtId: d.id,
            name: d.name,
            label: isHotspot && d.flaggedCount > 0 ? `${d.name} (${d.flaggedCount})` : d.name,
            threatLevel: d.threatLevel,
            threatColor: getThreatColor(d.threatLevel),
            flaggedCount: d.flaggedCount,
            isHotspot: isHotspot ? 1 : 0,
          },
        };
      })
      .filter(Boolean);

    return {
      type: 'FeatureCollection' as const,
      features: features as any[],
    };
  }, [districts, centroidById]);

  // Build Syndicate Arcs GeoJSON FeatureCollection
  const arcsGeoJson = useMemo(() => {
    const features = filteredConnections
      .map((conn) => {
        const fromDist = getDistrictById(conn.from);
        const toDist = getDistrictById(conn.to);
        if (!fromDist || !toDist) return null;

        const fromCoords = centroidById.get(fromDist.id.toLowerCase()) || fromDist.coordinates;
        const toCoords = centroidById.get(toDist.id.toLowerCase()) || toDist.coordinates;
        if (!fromCoords || !toCoords) return null;

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: buildCurvedArc(fromCoords, toCoords),
          },
          properties: {
            id: conn.id,
            color: getConnectionColor(conn),
          },
        };
      })
      .filter(Boolean);

    return {
      type: 'FeatureCollection' as const,
      features: features as any[],
    };
  }, [filteredConnections, centroidById, districts]);

  // 1. Initialize MapLibre GL instance with Carto Dark Matter vector style
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: DARK_VECTOR_STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 12,
      attributionControl: false,
    });

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, []);

  // 2. Mount / update GeoJSON sources & layers once map style is loaded
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !enrichedGeoJson) return;

    // Districts Source & Layers
    const existingDistrictSource = map.getSource('rajasthan-districts') as maplibregl.GeoJSONSource | undefined;
    if (existingDistrictSource) {
      existingDistrictSource.setData(enrichedGeoJson as any);
    } else {
      map.addSource('rajasthan-districts', {
        type: 'geojson',
        data: enrichedGeoJson as any,
      });

      map.addLayer({
        id: 'rajasthan-districts-fill',
        type: 'fill',
        source: 'rajasthan-districts',
        paint: {
          'fill-color': '#00E5FF',
          'fill-opacity': 0.03,
        },
      });

      map.addLayer({
        id: 'rajasthan-districts-line',
        type: 'line',
        source: 'rajasthan-districts',
        paint: {
          'line-color': '#00E5FF',
          'line-width': 1,
          'line-opacity': 0.45,
        },
      });

      // Interactive hover & click handlers on district polygons
      map.on('mousemove', 'rajasthan-districts-fill', (e: maplibregl.MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        const props = e.features?.[0]?.properties;
        const matched =
          getDistrictById(props?.districtId) || getDistrictByName(props?.districtName);
        if (matched) {
          setHoveredDistrict(matched);
        }
      });

      map.on('mouseleave', 'rajasthan-districts-fill', () => {
        map.getCanvas().style.cursor = '';
        setHoveredDistrict(null);
      });

      map.on('click', 'rajasthan-districts-fill', (e: maplibregl.MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        const matched =
          getDistrictById(props?.districtId) || getDistrictByName(props?.districtName);
        if (matched) {
          sound.playClick();
          onSelectDistrictRef.current(matched);
        }
      });
    }

    // Syndicate Arcs Source & Layer
    const existingArcsSource = map.getSource('syndicate-arcs') as maplibregl.GeoJSONSource | undefined;
    if (existingArcsSource) {
      existingArcsSource.setData(arcsGeoJson as any);
    } else {
      map.addSource('syndicate-arcs', {
        type: 'geojson',
        data: arcsGeoJson as any,
      });

      map.addLayer({
        id: 'syndicate-arcs-line',
        type: 'line',
        source: 'syndicate-arcs',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.8,
          'line-dasharray': [3, 2],
          'line-opacity': 0.8,
        },
      });
    }

    // Threat Pins Source & Layers
    const existingPinsSource = map.getSource('threat-pins') as maplibregl.GeoJSONSource | undefined;
    if (existingPinsSource) {
      existingPinsSource.setData(pinsGeoJson as any);
    } else {
      map.addSource('threat-pins', {
        type: 'geojson',
        data: pinsGeoJson as any,
      });

      map.addLayer({
        id: 'threat-pins-pulse',
        type: 'circle',
        source: 'threat-pins',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'threatLevel'], 'CRITICAL'], 10, 7],
          'circle-color': 'transparent',
          'circle-stroke-color': ['get', 'threatColor'],
          'circle-stroke-width': 1.2,
          'circle-stroke-opacity': 0.55,
        },
      });

      map.addLayer({
        id: 'threat-pins-core',
        type: 'circle',
        source: 'threat-pins',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'threatLevel'], 'CRITICAL'], 4.5, 3.5],
          'circle-color': ['get', 'threatColor'],
          'circle-stroke-color': '#070A10',
          'circle-stroke-width': 1.2,
        },
      });

      map.addLayer({
        id: 'threat-pins-label',
        type: 'symbol',
        source: 'threat-pins',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10.5,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#E2E8F0',
          'text-halo-color': '#070A10',
          'text-halo-width': 1.5,
        },
      });

      map.on('click', 'threat-pins-core', (e: maplibregl.MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties;
        const matched = getDistrictById(props?.districtId);
        if (matched) {
          sound.playClick();
          onSelectDistrictRef.current(matched);
        }
      });
    }
  }, [mapLoaded, enrichedGeoJson, arcsGeoJson, pinsGeoJson]);

  // 3. Synchronize dynamic highlight / hover / selection / arc visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const selectedId = selectedDistrict?.id || '';
    const hoveredId = hoveredDistrict?.id || '';
    const highlighted = highlightedDistrictIds.map((id) => id.toLowerCase());

    if (map.getLayer('rajasthan-districts-fill')) {
      map.setPaintProperty('rajasthan-districts-fill', 'fill-opacity', [
        'case',
        ['==', ['get', 'districtId'], selectedId],
        0.22,
        ['in', ['get', 'districtId'], ['literal', highlighted]],
        0.22,
        ['==', ['get', 'districtId'], hoveredId],
        0.16,
        0.02,
      ]);
    }

    if (map.getLayer('rajasthan-districts-line')) {
      map.setPaintProperty('rajasthan-districts-line', 'line-color', [
        'case',
        ['==', ['get', 'districtId'], selectedId],
        '#22D3EE',
        ['in', ['get', 'districtId'], ['literal', highlighted]],
        '#00E5FF',
        ['==', ['get', 'districtId'], hoveredId],
        '#38BDF8',
        '#00E5FF',
      ]);
      map.setPaintProperty('rajasthan-districts-line', 'line-width', [
        'case',
        ['==', ['get', 'districtId'], selectedId],
        2.0,
        ['==', ['get', 'districtId'], hoveredId],
        1.5,
        0.85,
      ]);
      map.setPaintProperty('rajasthan-districts-line', 'line-opacity', [
        'case',
        ['==', ['get', 'districtId'], selectedId],
        0.95,
        ['==', ['get', 'districtId'], hoveredId],
        0.8,
        0.45,
      ]);
    }

    if (map.getLayer('syndicate-arcs-line')) {
      map.setPaintProperty('syndicate-arcs-line', 'line-opacity', showArcs ? 0.8 : 0);
    }

    if (map.getLayer('threat-pins-pulse')) {
      map.setPaintProperty('threat-pins-pulse', 'circle-radius', [
        'case',
        ['==', ['get', 'districtId'], selectedId],
        14,
        ['in', ['get', 'districtId'], ['literal', highlighted]],
        14,
        ['==', ['get', 'threatLevel'], 'CRITICAL'],
        9.5,
        6.5,
      ]);
    }
  }, [mapLoaded, selectedDistrict, hoveredDistrict, highlightedDistrictIds, showArcs]);

  return (
    <div className="relative w-full h-full bg-[#070A10] overflow-hidden flex flex-col select-none">
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
                mapRef.current?.zoomIn({ duration: 250 });
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                mapRef.current?.zoomOut({ duration: 250 });
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                mapRef.current?.flyTo({
                  center: DEFAULT_CENTER,
                  zoom: DEFAULT_ZOOM,
                  duration: 600,
                });
              }}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05]"
              title="Reset View"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main MapLibre GL WebGL Vector Map Canvas */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Ultra-faint concentric radar sweep rings overlay */}
        {showRadar && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25 z-10">
            <div className="w-[540px] h-[540px] rounded-full border border-cyan-500/[0.08] relative">
              <div className="absolute inset-16 rounded-full border border-cyan-500/[0.06]" />
              <div className="absolute inset-32 rounded-full border border-cyan-500/[0.04]" />
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-transparent via-transparent to-cyan-500/[0.05] animate-radar-sweep origin-center" />
            </div>
          </div>
        )}

        {isLoading && !geoJson && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#070A10]/70 text-xs font-mono text-cyan-400/80 pointer-events-none">
            <span className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
            <span>INITIALIZING MAPLIBRE GIS ENGINE...</span>
          </div>
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
