import { VehicleStatus } from "./cp";

export interface GenericEntity {
    code: string;
    designation: string;
}

export interface Vehicle {
    trainNumber: number;
    runDate: string;
    delay: number;
    speed?: number;
    occupancy?: number | null;
    lastStation: string;
    lastDependency?: string;
    latitude: string;
    longitude: string;
    source?: string;
    status: VehicleStatus;
    timestamp?: string;
    hasDisruptions: null;
    units?: string[];
}

export interface EnrichedVehicle extends Vehicle {
    service: GenericEntity;
    origin: GenericEntity;
    destination: GenericEntity;
    gtfs: {
        tripId: string | null;
        stopId?: string | null;
        stopIdWithPlatform?: string | null;
        stopSequence?: number | null;
    };
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

export interface GeneralStatistics {
    cancelled: number;
    running: number;
    avgSpeed: number;
    avgDelay: number;
    maxDelay: number;
    maxRunningDelay: number;
    maxAheadness: number;
    maxRunningAheadness: number;
    maxOccupancy: number;
    minOccupancy: number;
    trainsSupportingOccupancyData: number;
}

export interface TrainArrival {
    trainNumber: number;
    trainService: GenericEntity;
    trainOrigin: GenericEntity;
    trainDestination: GenericEntity;

    // static values
    arrivalTime: string;
    departureTime: string;

    platform: string;
    delay: number;
    occupancy: number;
    supression: GenericEntity | null;

    // realtime values
    ETA: number;
    ETD: number;
}
