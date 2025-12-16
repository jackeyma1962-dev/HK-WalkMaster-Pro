import { Coordinate, RouteData, LocationResult, RouteStep } from '../types';

// Hardcoded known locations to ensure the app works immediately for defaults
// and common landmarks without relying solely on the free API.
const KNOWN_LOCATIONS: Record<string, Coordinate> = {
    "central market": { lat: 22.2847, lng: 114.1557 },
    "tamar park": { lat: 22.2825, lng: 114.1656 },
    "hang hau station": { lat: 22.3155, lng: 114.2642 },
    "yau yue wan village": { lat: 22.3223, lng: 114.2608 },
    "tsim sha tsui": { lat: 22.2988, lng: 114.1722 },
    "mong kok": { lat: 22.3193, lng: 114.1694 },
    "central": { lat: 22.2819, lng: 114.1581 },
    "causeway bay": { lat: 22.2804, lng: 114.1857 }
};

// Helper to fetch from Nominatim
const fetchNominatim = async (q: string, extraParams: string = '') => {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=3&addressdetails=1${extraParams}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        return await response.json();
    } catch (e) {
        console.warn("Nominatim fetch failed for:", q);
        return [];
    }
};

export const searchLocation = async (query: string): Promise<LocationResult[]> => {
    try {
        const lowerQuery = query.toLowerCase().trim();

        // 1. Check Known Locations (Instant success for defaults)
        if (KNOWN_LOCATIONS[lowerQuery]) {
            return [{
                name: query, // Use original casing
                coords: KNOWN_LOCATIONS[lowerQuery]
            }];
        }

        // 2. Strategy: Strict HK Search
        let data = await fetchNominatim(query, '&countrycodes=hk');

        // 3. Strategy: Append "Hong Kong" (Relaxed API constraint)
        if (!data || data.length === 0) {
            data = await fetchNominatim(`${query} Hong Kong`);
        }
        
        // 4. Strategy: Heuristics & Replacements
        if (!data || data.length === 0) {
            
            // Handle "Station" -> "MTR Station" (Common HK issue)
            if (lowerQuery.includes('station') && !lowerQuery.includes('mtr')) {
                 const mtrQuery = query.replace(/Station/i, 'MTR Station');
                 data = await fetchNominatim(`${mtrQuery} Hong Kong`);
            }
            
            // Handle Chinese terms common in HK
            if ((!data || data.length === 0) && query.includes('地鐵站')) {
                const simplified = query.replace('地鐵站', '站'); 
                data = await fetchNominatim(`${simplified} Hong Kong`);
            }
        }

        if (!data || data.length === 0) return [];

        return data.map((item: any) => ({
            name: item.display_name.split(',')[0], // Simplified name
            coords: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) }
        }));
    } catch (error) {
        console.error("Geocoding error:", error);
        return [];
    }
};

export const getAddressFromCoords = async (coord: Coordinate): Promise<string> => {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coord.lat}&lon=${coord.lng}&zoom=18&addressdetails=1`;
        const res = await fetch(url);
        if (!res.ok) return `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`;
        const data = await res.json();
        
        const address = data.address || {};
        // Prioritize specific names
        const name = address.amenity || address.building || address.leisure || address.tourism || address.shop || address.road || address.suburb;
        
        if (name) return name;
        
        // Fallback to first part of display name
        if (data.display_name) return data.display_name.split(',')[0];

        return `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`;
    } catch (e) {
        console.warn("Reverse geocoding failed", e);
        return `${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)}`;
    }
};

// Helper to format OSRM step
const formatStepInstruction = (step: any): string => {
    const name = step.name || '';
    const maneuver = step.maneuver?.type || '';
    const modifier = step.maneuver?.modifier || '';

    if (maneuver === 'arrive') return `Arrive at destination`;
    if (maneuver === 'depart') return `Start on ${name || 'path'}`;
    
    if (name) {
        if (maneuver === 'turn' || maneuver === 'new name') {
            return `${modifier ? 'Turn ' + modifier + ' onto ' : 'Continue on '}${name}`;
        }
        return `Walk on ${name}`;
    }

    if (maneuver === 'turn' && modifier) return `Turn ${modifier}`;
    return `Continue`;
};

// Using OSRM for Routing
export const getRoutes = async (start: Coordinate, end: Coordinate): Promise<RouteData[]> => {
    try {
        const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data.routes || data.routes.length === 0) return [];

        return data.routes.map((route: any, index: number) => ({
            id: `route-${index}`,
            coordinates: route.geometry.coordinates.map((coord: number[]) => ({
                lat: coord[1],
                lng: coord[0]
            })),
            totalDistance: route.distance,
            totalDuration: route.duration,
            summary: route.legs[0]?.summary || `Route ${index + 1}`,
            steps: route.legs[0]?.steps.map((step: any) => ({
                instruction: formatStepInstruction(step),
                distance: step.distance,
                maneuver: step.maneuver?.type
            })) || []
        }));

    } catch (error) {
        console.error("Routing error:", error);
        return [];
    }
};

export const getDistance = (c1: Coordinate, c2: Coordinate): number => {
    const R = 6371e3; 
    const φ1 = c1.lat * Math.PI / 180;
    const φ2 = c2.lat * Math.PI / 180;
    const Δφ = (c2.lat - c1.lat) * Math.PI / 180;
    const Δλ = (c2.lng - c1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};
