import { useState, useEffect } from 'react';
import type { GeoPermissibleObjects } from 'd3-geo';

export interface RajasthanGeoFeature {
  type: 'Feature';
  properties: {
    district?: string;
    dtname?: string;
    name?: string;
    dt_code?: string;
    division?: string;
    st_code?: string;
    st_nm?: string;
    year?: string;
    [key: string]: any;
  };
  geometry: GeoPermissibleObjects;
}

export interface RajasthanFeatureCollection {
  type: 'FeatureCollection';
  features: RajasthanGeoFeature[];
}

// Official public GitHub raw CDN GeoJSON source for Rajasthan districts
const UPSTREAM_RAJASTHAN_GEOJSON_URL =
  'https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/states/rajasthan.geojson';

// Local bundled 41-district fallback GeoJSON
const LOCAL_FALLBACK_GEOJSON_URL = '/rajasthan_districts.geojson';

const CACHE_KEY = 'prahari_rajasthan_geojson_v2';
const CACHE_TIMESTAMP_KEY = 'prahari_rajasthan_geojson_ts_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isValid41DistrictGeoJSON(data: any): data is RajasthanFeatureCollection {
  return (
    Boolean(data) &&
    data.type === 'FeatureCollection' &&
    Array.isArray(data.features) &&
    data.features.length >= 41
  );
}

export function useRajasthanGeoJSON() {
  const [geoJson, setGeoJson] = useState<RajasthanFeatureCollection | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (isValid41DistrictGeoJSON(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
    return null;
  });

  const [source, setSource] = useState<'cache' | 'local' | 'cdn'>(geoJson ? 'cache' : 'local');
  const [isLoading, setIsLoading] = useState<boolean>(!geoJson);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadGeoJSON() {
      // 1. Ensure local 41-district fallback loads immediately if not cached
      if (!geoJson) {
        try {
          const localRes = await fetch(LOCAL_FALLBACK_GEOJSON_URL, {
            signal: controller.signal,
          });
          if (localRes.ok) {
            const localData = await localRes.json();
            if (isMounted && localData?.type === 'FeatureCollection' && Array.isArray(localData.features)) {
              setGeoJson(localData);
              setSource('local');
              setIsLoading(false);
              try {
                localStorage.setItem(CACHE_KEY, JSON.stringify(localData));
              } catch {
                // Ignore storage quota errors
              }
            }
          }
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            console.warn('Local Rajasthan GeoJSON load notice:', err);
          }
        }
      }

      // 2. Check upstream CDN if TTL expired (updates automatically when upstream adds 41+ districts)
      try {
        const lastSync = Number(localStorage.getItem(CACHE_TIMESTAMP_KEY) || '0');
        if (Date.now() - lastSync < CACHE_TTL_MS && geoJson) {
          return;
        }

        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const cdnRes = await fetch(UPSTREAM_RAJASTHAN_GEOJSON_URL, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (cdnRes.ok) {
          const cdnData = await cdnRes.json();
          localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));

          // Only replace local 41-district GeoJSON if upstream contains all 41+ reorganized districts
          if (isMounted && isValid41DistrictGeoJSON(cdnData)) {
            setGeoJson(cdnData);
            setSource('cdn');
            setIsLoading(false);
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify(cdnData));
            } catch {
              // Ignore storage quota errors
            }
          }
        }
      } catch {
        // Offline or CDN blocked — local fallback already active
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGeoJSON();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return { geoJson, isLoading, source };
}
