export enum VehicleStatus {
    NotStarted = "NOT_STARTED",
    InTransit = "IN_TRANSIT",
    NearNext = "NEAR_NEXT",
    AtOrigin = "AT_ORIGIN",
    AtStation = "AT_STATION",
    Completed = "COMPLETED",
    Cancelled = "CANCELLED",
}

export interface Service {
    code: string;
    designation: string;
}

export interface TrainStop {
    station: {
        code: string;
        designation: string;
    };
    arrival: string;
    departure: string;
    platform: string;
    latitude: string;
    longitude: string;
    delay: number;
    eta: string;
    etd: string;
}

export interface Vehicle {
    trainNumber: number;
    serviceCode: Service;
    delay: number;
    occupancy: number;
    latitude: number;
    longitude: number;
    status: VehicleStatus;
    trainStops: TrainStop[];
    stationCode?: string; // if IN_TRANSIT or NEAR_NEXT it's the next stop, if AT_STATION or AT_ORIGIN it's the current stop
    updatedAt: number;

    // calculated
    heading?: number;
}
