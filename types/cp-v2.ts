import { VehicleStatus } from "./cp";

export interface Vehicle {
    trainNumber: number;
    runDate: string;
    delay: number;
    speed: number;
    occupancy: number | null;
    lastStation: string;
    lastDependency: string;
    latitude: string;
    longitude: string;
    source: string;
    status: VehicleStatus;
    timestamp: string;
    hasDisruptions: null;
    units: string[];
}

export interface VehicleDetailed extends Vehicle {
    stops: Record<
        string,
        {
            arrival: string;
            departure: string | null;
            arrDelay: number | null;
            depDelay: number | null;
        }
    >;
    platforms: Record<string, string>;
}

export interface Station {
    code: string;
    designation: string;
    latitude: string;
    longitude: string;
    region: string | null;
    railways: string[];
}
