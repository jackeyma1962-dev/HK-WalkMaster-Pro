import React, { useState } from 'react';
import { Search, MapPin, Footprints, Clock, Navigation2, Sparkles, Ruler, Map as MapIcon, X, RotateCcw, ArrowUpDown, ExternalLink, ChevronsDown, Map } from 'lucide-react';
import { RouteData, RoutePlan, Coordinate } from '../types';
import clsx from 'clsx';
import { motion } from 'framer-motion';

interface SidebarProps {
    onSearch: (interval: number) => void;
    onReset: () => void;
    routes: RouteData[];
    selectedRouteIdx: number;
    onSelectRoute: (idx: number) => void;
    routePlan: RoutePlan | null;
    isSearching: boolean;
    geminiInsight: string | null;
    isGeminiLoading: boolean;
    
    // Controlled inputs
    startValue: string;
    onStartChange: (val: string) => void;
    endValue: string;
    onEndChange: (val: string) => void;
    onSwapLocations: () => void;

    // Selection Mode
    selectionMode: 'start' | 'end' | null;
    onSetSelectionMode: (mode: 'start' | 'end' | null) => void;
    
    // Coords for External Links
    startCoords: Coordinate | null;
    endCoords: Coordinate | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    onSearch, 
    onReset,
    routes, 
    selectedRouteIdx, 
    onSelectRoute, 
    routePlan,
    isSearching,
    geminiInsight,
    isGeminiLoading,
    startValue,
    onStartChange,
    endValue,
    onEndChange,
    onSwapLocations,
    selectionMode,
    onSetSelectionMode,
    startCoords,
    endCoords
}) => {
    const [interval, setInterval] = useState(500); // meters

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (startValue && endValue) {
            onSearch(interval);
        }
    };

    // Construct a Google Maps URL with Start -> Waypoints -> End
    const openFullRouteInGoogleMaps = () => {
        if (!startCoords || !endCoords || !routePlan) return;

        const origin = `${startCoords.lat},${startCoords.lng}`;
        const destination = `${endCoords.lat},${endCoords.lng}`;
        
        // Google Maps allows waypoints in the 'dir' API
        const waypoints = routePlan.stops.map(s => `${s.coords.lat},${s.coords.lng}`).join('|');
        
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=walking`;
        window.open(url, '_blank');
    };

    return (
        <div className="absolute top-4 left-4 z-10 w-full max-w-md flex flex-col max-h-[90vh]">
            
            {/* Single Unified Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 flex flex-col overflow-hidden w-full h-full">
                
                {/* Scrollable Content Area */}
                <div className="overflow-y-auto p-6 scrollbar-thin flex flex-col gap-4">

                    {/* Header Section */}
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded-md inline-block mb-1 shadow-sm">
                                HK WalkMaster
                            </div>
                            <p className="text-xs text-gray-500">Plan your route with smart rest stops.</p>
                        </div>
                        {/* Reset Button */}
                        {(startValue || endValue || routes.length > 0) && (
                            <button 
                                onClick={onReset}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                                title="Reset All"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Start Input */}
                        <div className="flex gap-2 items-center">
                            <div className="relative group flex-1">
                                <MapPin className="absolute left-3 top-3 w-5 h-5 text-green-500 group-focus-within:scale-110 transition-transform" />
                                <input 
                                    type="text" 
                                    placeholder="Start Point" 
                                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black font-semibold transition-all text-sm"
                                    value={startValue}
                                    onChange={(e) => onStartChange(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => onSetSelectionMode(selectionMode === 'start' ? null : 'start')}
                                    className={clsx(
                                        "absolute right-2 top-2 p-1.5 rounded-lg transition-colors",
                                        selectionMode === 'start' ? "text-blue-600 bg-blue-100" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    <MapIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Swap Button */}
                        <div className="flex justify-center -my-3 relative z-10">
                            <button 
                                type="button"
                                onClick={onSwapLocations}
                                className="bg-gray-100 hover:bg-white border border-gray-200 p-1.5 rounded-full shadow-sm text-gray-500 hover:text-blue-600 transition-all active:rotate-180"
                            >
                                <ArrowUpDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* End Input */}
                        <div className="flex gap-2 items-center">
                            <div className="relative group flex-1">
                                <Navigation2 className="absolute left-3 top-3 w-5 h-5 text-red-500 group-focus-within:scale-110 transition-transform" />
                                <input 
                                    type="text" 
                                    placeholder="Destination" 
                                    className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black font-semibold transition-all text-sm"
                                    value={endValue}
                                    onChange={(e) => onEndChange(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => onSetSelectionMode(selectionMode === 'end' ? null : 'end')}
                                    className={clsx(
                                        "absolute right-2 top-2 p-1.5 rounded-lg transition-colors",
                                        selectionMode === 'end' ? "text-blue-600 bg-blue-100" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    <MapIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {selectionMode && (
                            <div className="text-xs text-center text-blue-600 font-semibold bg-blue-50 py-2 rounded-lg border border-blue-100 animate-pulse">
                                Tap on map to select location
                            </div>
                        )}

                        {/* Interval Slider */}
                        <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Ruler className="w-4 h-4 text-amber-500" />
                                    <span className="text-sm font-medium">Rest Every</span>
                                </div>
                                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md min-w-[60px] text-center">
                                    {interval < 1000 ? `${interval} m` : `${(interval / 1000).toFixed(1)} km`}
                                </span>
                            </div>
                            <input 
                                type="range" 
                                min="100" 
                                max="3000" 
                                step="100" 
                                value={interval}
                                onChange={(e) => setInterval(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                                <span>More Stops</span>
                                <span>Fewer Stops</span>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isSearching}
                            className="w-full bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-gray-200 active:scale-95 transition-all flex items-center justify-center text-sm tracking-wide uppercase"
                        >
                            {isSearching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Plan Route'}
                        </button>
                    </form>

                    {/* Results Section */}
                    {routes.length > 0 && (
                        <div className="flex flex-col gap-4 border-t-2 border-dashed border-gray-100 pt-4 mt-2">
                            <div className="flex items-center justify-between flex-shrink-0">
                                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Found {routes.length} Route{routes.length > 1 ? 's' : ''}
                                </h2>
                            </div>
                            
                            {/* Route Selection Buttons */}
                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                                {routes.map((route, idx) => (
                                    <button
                                        key={route.id}
                                        onClick={() => onSelectRoute(idx)}
                                        className={clsx(
                                            "flex-1 min-w-[130px] py-3 px-4 rounded-xl text-left transition-all border relative overflow-hidden group flex-shrink-0",
                                            selectedRouteIdx === idx 
                                                ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                                : "bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-gray-50"
                                        )}
                                    >
                                        <div className="flex flex-col gap-1">
                                            <span className={clsx("font-bold text-sm truncate pr-2", selectedRouteIdx === idx ? "text-white" : "text-gray-900")}>
                                                {route.summary || `Route ${idx + 1}`}
                                            </span>
                                            <span className={clsx("text-xs font-mono font-medium", selectedRouteIdx === idx ? "text-blue-100" : "text-gray-500")}>
                                                {(route.totalDistance / 1000).toFixed(2)} km
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {routePlan && (
                                <div className="flex flex-col gap-4">
                                    {/* Gemini Insight */}
                                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-purple-600" />
                                            <span className="text-xs font-bold text-purple-700 uppercase">AI Insight</span>
                                        </div>
                                        {isGeminiLoading ? (
                                            <div className="animate-pulse space-y-2">
                                                <div className="h-2 bg-purple-200 rounded w-3/4"></div>
                                                <div className="h-2 bg-purple-200 rounded w-1/2"></div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-purple-900 leading-relaxed">
                                                {geminiInsight || "Plan a route to see AI insights."}
                                            </p>
                                        )}
                                    </div>

                                    {/* Merged Directions + Timeline List */}
                                    <div className="relative pt-2 pl-2 pb-2">
                                        {/* Start Point */}
                                        <div className="flex gap-3 text-sm mb-4">
                                            <div className="flex flex-col items-center pt-1">
                                                <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white ring-1 ring-green-200 z-10 shadow-sm"></div>
                                                <div className="w-0.5 flex-1 bg-gray-100 my-0.5"></div>
                                            </div>
                                            <div className="pb-3 flex-1">
                                                <div className="font-bold text-gray-800">{startValue}</div>
                                                <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Start</div>
                                            </div>
                                        </div>

                                        {/* Steps & Interleaved Rest Stops */}
                                        {(() => {
                                            let currentDist = 0;
                                            const stops = [...routePlan.stops].sort((a, b) => a.distanceFromStart - b.distanceFromStart);
                                            
                                            return routePlan.route.steps.map((step, i) => {
                                                const stepStart = currentDist;
                                                const stepEnd = currentDist + step.distance;
                                                currentDist += step.distance;

                                                // Find stops in this segment
                                                const stopsInSegment = stops.filter(s => s.distanceFromStart > stepStart && s.distanceFromStart <= stepEnd);

                                                return (
                                                    <React.Fragment key={i}>
                                                        {/* The Step */}
                                                        <div className="flex gap-3 text-sm group min-h-[40px]">
                                                            <div className="flex flex-col items-center pt-1">
                                                                <div className="w-2 h-2 rounded-full bg-blue-300 group-hover:bg-blue-600 transition-colors" />
                                                                <div className="w-0.5 flex-1 bg-gray-100 my-0.5 group-hover:bg-blue-50" />
                                                            </div>
                                                            <div className="pb-4 flex-1 border-b border-gray-50 group-last:border-0">
                                                                <div className="text-gray-700 font-medium leading-snug">{step.instruction}</div>
                                                                <div className="text-gray-400 text-xs mt-0.5">{step.distance}m</div>
                                                            </div>
                                                        </div>

                                                        {/* The Stops (if any occur during this step) */}
                                                        {stopsInSegment.map(stop => (
                                                            <div key={`stop-${stop.id}`} className="flex gap-3 text-sm mb-4 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100 mx-[-8px]">
                                                                <div className="flex flex-col items-center pt-1 ml-2">
                                                                    <div className="w-6 h-6 bg-amber-400 rounded-full border-2 border-white shadow-sm z-10 text-[10px] flex items-center justify-center text-white font-bold">
                                                                        {stop.id}
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="font-bold text-gray-800 text-sm">Rest Stop #{stop.id}</div>
                                                                    <div className="text-xs text-amber-600 font-medium">Take a break here (~{(stop.distanceFromStart/1000).toFixed(2)}km)</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            });
                                        })()}

                                        {/* End Point */}
                                        <div className="flex gap-3 text-sm mt-4">
                                            <div className="flex flex-col items-center pt-1">
                                                <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-200 z-10 shadow-sm"></div>
                                            </div>
                                            <div className="pb-3 flex-1">
                                                <div className="font-bold text-gray-800">{endValue}</div>
                                                <div className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Destination</div>
                                            </div>
                                        </div>

                                        {/* Google Maps Button (Placed in Directions) */}
                                        <div className="mt-8 mb-2">
                                            <button 
                                                onClick={openFullRouteInGoogleMaps}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 group"
                                            >
                                                <Map className="w-5 h-5 group-hover:animate-bounce" />
                                                <span className="font-semibold text-sm">Open in Google Maps</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;