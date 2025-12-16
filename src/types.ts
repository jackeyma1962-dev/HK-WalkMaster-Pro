export interface Coordinate {
    lat: number;
    lng: number;
}

export interface LocationResult {
    name: string;
    coords: Coordinate;
}

export interface RouteStep {
    instruction: string;
    distance: number;
    maneuver?: string;
}

export interface RouteData {
    id: string;
    coordinates: Coordinate[];
    totalDistance: number; // in meters
    totalDuration: number; // in seconds
    summary: string;
    steps: RouteStep[];
}

export interface RestStop {
    id: number;
    distanceFromStart: number;
    coords: Coordinate;
    label: string;
}

export interface RoutePlan {
    route: RouteData;
    stops: RestStop[];
    interval: number;
}