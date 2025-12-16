import React, { useState, useCallback } from 'react';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import { RouteData, RoutePlan, Coordinate, RestStop } from './types';
import { searchLocation, getRoutes, getDistance, getAddressFromCoords } from './services/routeService';
import { getRouteInsights } from './services/geminiService';

function App() {
    // Route Data
    const [routes, setRoutes] = useState<RouteData[]>([]);
    const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
    const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
    
    // Coordinates
    const [startCoords, setStartCoords] = useState<Coordinate | null>(null);
    const [endCoords, setEndCoords] = useState<Coordinate | null>(null);
    
    // Text Inputs (Lifted from Sidebar)
    // Updated defaults to "Central Market" and "Tamar Park" - these are extremely well-indexed landmarks
    const [startValue, setStartValue] = useState('Central Market');
    const [endValue, setEndValue] = useState('Tamar Park');
    
    // Selection Flags
    // Track if current coords were explicitly set via map click to avoid redundant geocoding
    const [isStartMapSet, setIsStartMapSet] = useState(false); 
    const [isEndMapSet, setIsEndMapSet] = useState(false);
    const [selectionMode, setSelectionMode] = useState<'start' | 'end' | null>(null);

    const [isSearching, setIsSearching] = useState(false);
    
    // Gemini State
    const [geminiInsight, setGeminiInsight] = useState<string | null>(null);
    const [isGeminiLoading, setIsGeminiLoading] = useState(false);

    // Calculate rest stops along the path
    const calculateStops = useCallback((route: RouteData, intervalMeters: number): RestStop[] => {
        const stops: RestStop[] = [];
        let accumulatedDistance = 0;
        let lastStopDistance = 0;

        for (let i = 0; i < route.coordinates.length - 1; i++) {
            const p1 = route.coordinates[i];
            const p2 = route.coordinates[i + 1];
            const segmentDist = getDistance(p1, p2);

            accumulatedDistance += segmentDist;

            // If we've passed the interval threshold since the last stop
            while (accumulatedDistance - lastStopDistance >= intervalMeters) {
                const distanceToTarget = (lastStopDistance + intervalMeters) - (accumulatedDistance - segmentDist);
                const ratio = distanceToTarget / segmentDist;

                // Linear Interpolation for the exact point
                const lat = p1.lat + (p2.lat - p1.lat) * ratio;
                const lng = p1.lng + (p2.lng - p1.lng) * ratio;

                lastStopDistance += intervalMeters;
                
                // Don't add a stop if it's very close to the end (e.g., within 100m)
                if (route.totalDistance - lastStopDistance > 100) {
                     stops.push({
                        id: stops.length + 1,
                        distanceFromStart: lastStopDistance,
                        coords: { lat, lng },
                        label: `Stop ${stops.length + 1}`
                    });
                }
            }
        }
        return stops;
    }, []);

    const handleInputChange = (type: 'start' | 'end', val: string) => {
        if (type === 'start') {
            setStartValue(val);
            setIsStartMapSet(false); // User typed, so map selection is invalidated (text takes precedence)
        } else {
            setEndValue(val);
            setIsEndMapSet(false);
        }
    };

    const handleMapClick = async (coord: Coordinate) => {
        if (!selectionMode) return;

        // Visual feedback immediately
        if (selectionMode === 'start') {
            setStartCoords(coord);
            setStartValue("Locating...");
            const address = await getAddressFromCoords(coord);
            setStartValue(address);
            setIsStartMapSet(true);
        } else {
            setEndCoords(coord);
            setEndValue("Locating...");
            const address = await getAddressFromCoords(coord);
            setEndValue(address);
            setIsEndMapSet(true);
        }
        setSelectionMode(null); // Exit selection mode
    };

    const handleReset = () => {
        setRoutes([]);
        setRoutePlan(null);
        setStartCoords(null);
        setEndCoords(null);
        // Reset to default (English - Reliable Landmarks)
        setStartValue('Central Market');
        setEndValue('Tamar Park');
        setIsStartMapSet(false);
        setIsEndMapSet(false);
        setGeminiInsight(null);
        setSelectionMode(null);
    };

    const handleSwap = () => {
        // Swap Text
        const tempText = startValue;
        setStartValue(endValue);
        setEndValue(tempText);

        // Swap Coords
        const tempCoords = startCoords;
        setStartCoords(endCoords);
        setEndCoords(tempCoords);

        // Swap Flags
        const tempFlag = isStartMapSet;
        setIsStartMapSet(isEndMapSet);
        setIsEndMapSet(tempFlag);

        // Clear current route results
        setRoutes([]);
        setRoutePlan(null);
        setGeminiInsight(null);
    };

    const handleSearch = async (interval: number) => {
        setIsSearching(true);
        setRoutes([]);
        setRoutePlan(null);
        setGeminiInsight(null);
        setIsGeminiLoading(true);

        try {
            let sCoord: Coordinate | null = startCoords;
            let eCoord: Coordinate | null = endCoords;

            // 1. Resolve Start Coordinates
            if (!isStartMapSet) {
                const startLocs = await searchLocation(startValue);
                if (startLocs.length === 0) {
                    alert(`Start location not found: ${startValue}`);
                    setIsSearching(false); setIsGeminiLoading(false); return;
                }
                sCoord = startLocs[0].coords;
                setStartCoords(sCoord);
            }

            // 2. Resolve End Coordinates
            if (!isEndMapSet) {
                const endLocs = await searchLocation(endValue);
                if (endLocs.length === 0) {
                    alert(`Destination not found: ${endValue}`);
                    setIsSearching(false); setIsGeminiLoading(false); return;
                }
                eCoord = endLocs[0].coords;
                setEndCoords(eCoord);
            }

            if (!sCoord || !eCoord) {
                throw new Error("Coordinates missing");
            }

            // 2. Get Routes
            const foundRoutes = await getRoutes(sCoord, eCoord);
            if (foundRoutes.length === 0) {
                alert("No walking route found between these points.");
                setIsSearching(false);
                setIsGeminiLoading(false);
                return;
            }

            setRoutes(foundRoutes);
            setSelectedRouteIdx(0);

            // 3. Process Initial Route Plan
            const initialRoute = foundRoutes[0];
            const stops = calculateStops(initialRoute, interval);
            setRoutePlan({
                route: initialRoute,
                stops,
                interval
            });

            // 4. Get Gemini Insights (Parallel)
            const distString = `${(initialRoute.totalDistance / 1000).toFixed(1)} km`;
            getRouteInsights(startValue, endValue, distString)
                .then(insight => {
                    setGeminiInsight(insight || "Enjoy your walk!");
                    setIsGeminiLoading(false);
                });

        } catch (e) {
            console.error(e);
            alert("An error occurred while planning.");
            setIsGeminiLoading(false);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectRoute = (idx: number) => {
        if (!routes[idx] || !routePlan) return;
        
        setSelectedRouteIdx(idx);
        const stops = calculateStops(routes[idx], routePlan.interval);
        setRoutePlan({
            ...routePlan,
            route: routes[idx],
            stops
        });
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-100">
            <Sidebar 
                onSearch={handleSearch}
                onReset={handleReset}
                routes={routes}
                selectedRouteIdx={selectedRouteIdx}
                onSelectRoute={handleSelectRoute}
                routePlan={routePlan}
                isSearching={isSearching}
                geminiInsight={geminiInsight}
                isGeminiLoading={isGeminiLoading}
                
                // Lifted State
                startValue={startValue}
                onStartChange={(v) => handleInputChange('start', v)}
                endValue={endValue}
                onEndChange={(v) => handleInputChange('end', v)}
                onSwapLocations={handleSwap}
                selectionMode={selectionMode}
                onSetSelectionMode={setSelectionMode}
                
                // Pass coords for map links
                startCoords={startCoords}
                endCoords={endCoords}
            />
            <div className="absolute inset-0 z-0">
                <MapComponent 
                    routePlan={routePlan}
                    startCoords={startCoords}
                    endCoords={endCoords}
                    selectionMode={selectionMode}
                    onMapClick={handleMapClick}
                />
            </div>
            
            {/* Footer / Branding */}
            <div className="absolute bottom-4 right-4 z-[500] bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-500 pointer-events-none">
                HK WalkMaster Pro • Powered by React & Gemini
            </div>
        </div>
    );
}

export default App;