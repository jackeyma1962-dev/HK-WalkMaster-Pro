import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { RoutePlan, Coordinate } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYER_URL, TILE_LAYER_ATTR } from '../constants';
import clsx from 'clsx';

interface MapComponentProps {
    routePlan: RoutePlan | null;
    startCoords: Coordinate | null;
    endCoords: Coordinate | null;
    selectionMode: 'start' | 'end' | null;
    onMapClick: (coord: Coordinate) => void;
}

// Component to handle map view updates
const MapUpdater: React.FC<{ center: Coordinate; zoom: number; bounds?: any }> = ({ center, zoom, bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Only fly to center if no bounds are set (e.g. initial load or single point update without route)
            // But we don't want to fly away if user is panning.
            // A simple strategy: flyTo if significantly different? 
            // For now, let's just respect the bounds if they exist.
             map.setView([center.lat, center.lng], map.getZoom());
        }
    }, [center, zoom, bounds, map]);
    return null;
};

// Click handler component
const MapClickHandler: React.FC<{ onClick: (coord: Coordinate) => void, mode: 'start' | 'end' | null }> = ({ onClick, mode }) => {
    useMapEvents({
        click(e) {
            if (mode) {
                onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
            }
        },
    });
    return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ 
    routePlan, 
    startCoords, 
    endCoords,
    selectionMode,
    onMapClick
}) => {
    let bounds = null;

    if (routePlan && routePlan.route.coordinates.length > 0) {
        const lats = routePlan.route.coordinates.map(c => c.lat);
        const lngs = routePlan.route.coordinates.map(c => c.lng);
        bounds = [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
        ];
    } else if (startCoords && endCoords) {
         bounds = [
            [Math.min(startCoords.lat, endCoords.lat), Math.min(startCoords.lng, endCoords.lng)],
            [Math.max(startCoords.lat, endCoords.lat), Math.max(startCoords.lng, endCoords.lng)]
        ];
    }

    return (
        <MapContainer 
            center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} 
            zoom={DEFAULT_ZOOM} 
            className={clsx(
                "w-full h-full z-0 transition-cursor",
                selectionMode ? "cursor-crosshair" : "cursor-grab"
            )}
            zoomControl={false}
        >
            <TileLayer attribution={TILE_LAYER_ATTR} url={TILE_LAYER_URL} />
            
            <MapClickHandler onClick={onMapClick} mode={selectionMode} />
            
            {/* Start Point */}
            {startCoords && (
                <CircleMarker center={[startCoords.lat, startCoords.lng]} radius={8} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }}>
                    <Popup>Start</Popup>
                </CircleMarker>
            )}

            {/* End Point */}
            {endCoords && (
                <CircleMarker center={[endCoords.lat, endCoords.lng]} radius={8} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}>
                    <Popup>Destination</Popup>
                </CircleMarker>
            )}

            {/* Route Line */}
            {routePlan && (
                <Polyline 
                    positions={routePlan.route.coordinates.map(c => [c.lat, c.lng])} 
                    pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.8 }} 
                />
            )}

            {/* Rest Stops */}
            {routePlan && routePlan.stops.map((stop) => (
                <CircleMarker 
                    key={stop.id}
                    center={[stop.coords.lat, stop.coords.lng]} 
                    radius={6} 
                    pathOptions={{ fillColor: '#ffbf24', fillOpacity: 1, weight: 2, color: 'white' }}
                >
                    <Popup>
                        <div className="text-center">
                            <strong className="block text-gray-800">Rest Stop #{stop.id}</strong>
                            <span className="text-xs text-gray-500">{Math.round(stop.distanceFromStart)}m from start</span>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </MapContainer>
    );
};

export default MapComponent;