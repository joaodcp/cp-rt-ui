"use strict";
"use client";

import WGLMap from "@/components/WGLMap/WGLMap";
import { useMap, Source, Layer, CircleLayer, Popup, LineLayer, SymbolLayer } from "react-map-gl/maplibre";
import { MapLayerMouseEvent } from "maplibre-gl";
import useSWR from "swr";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    CaretRight,
    Gauge,
    GithubLogo,
    Globe,
    MagnifyingGlass,
    Sparkle,
} from "@phosphor-icons/react";
import { Toaster } from "sonner";
import Pill, { BadgeColor } from "@/components/Pill/Pill";
import Loader from "@/components/Loader/Loader";
import Centered from "@/components/Centered/Centered";
import FadeInOut, { Fade } from "@/components/FadeInOut/FadeInOut";
import pkgInfo from "../package.json";
import TopBarButton from "@/components/TopBarButton/TopBarButton";
import ArrivingBusAnimation from "@/components/ArrivingBusAnimation/ArrivingBusAnimation";
import { Service, VehicleStatus } from "@/types/cp";
import {
    Station,
    EnrichedVehicle,
    GeneralStatistics,
    TrainArrival,
} from "@/types/cp-v2";
import SearchOverlay from "@/components/search/SearchBarOverlay/SearchBarOverlay";
import { formatDuration, parseHHMM, parseHHMMInTimeZone } from "@/utils/time";
import { Train, TrainIcon } from "lucide-react";
import { getFormattedFleetNumber } from "@/utils/fleet";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import { FERTAGUS_STATION_IDS } from "@/utils/stations";

const unauthenticatedFetcher = (url: string) =>
    fetch(url).then((res) => res.json());

interface GeoJSON {
    type: "FeatureCollection";
    features: GeoJSONFeature[];
}

interface GeoJSONFeature {
    type: "Feature";
    geometry: {
        coordinates: number[];
        type: "Point";
    };
    properties?:
    | (EnrichedVehicle & { type: string })
    | (Station & { type: string });
}

function trackUmamiEvent(eventName: string, eventData?: Record<string, any>) {
    if (typeof window !== "undefined" && (window as any).umami) {
        (window as any).umami.track(eventName, eventData);
    }
}

function Home() {
    const { t, i18n } = useTranslation();
    const { data: version } = useSWR("/api/version", unauthenticatedFetcher, {
        refreshInterval: 30_000,
    });

    useEffect(() => {
        if (version && version.version !== pkgInfo.version) {
            window.location.reload();
        }
    }, [version]);

    const [selectedVehicle, setSelectedVehicle] =
        useState<EnrichedVehicle | null>(null);
    const [showPopup, setShowPopup] = useState(true);

    const [showStationPopup, setShowStationPopup] = useState(false);
    const [selectedStation, setSelectedStation] = useState<Station | null>(
        null,
    );

    const [selectedStationNextArrivals, _setSelectedStationNextArrivals] =
        useState<
            (TrainArrival & { durationToArrivalMinutes: number })[] | null
        >(null);
    const selectedStationNextArrivalsRef = useRef(selectedStationNextArrivals);
    const arrivalsRequestIdRef = useRef(0);

    const setSelectedStationNextArrivals = useCallback(
        (
            data: (TrainArrival & { durationToArrivalMinutes: number })[] | null,
        ) => {
            selectedStationNextArrivalsRef.current = data;
            _setSelectedStationNextArrivals(data);
        },
        [],
    );

    const [isLoadingArrivals, setIsLoadingArrivals] = useState(false);
    const [cursor, setCursor] = useState("auto");
    const [isLoading, setIsLoading] = useState(true);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);

    const { map } = useMap();

    useEffect(() => {
        if (!map) return;

        const loadSvgImage = async (url: string, id: string) => {
            if (map.hasImage(id)) return;
            const response = await fetch(url);
            const svgText = await response.text();
            const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
            const img = new Image();
            img.src = dataUrl;
            await img.decode();
            if (!map.hasImage(id)) {
                map.addImage(id, img);
            }
        };

        loadSvgImage("vehicle_arrow_w.svg", "vehicle_arrow").catch(
            console.error,
        );
    }, [map]);

    const { data: cpData } = useSWR<{ vehicles: EnrichedVehicle[] }>(
        "/api/vehicles",
        unauthenticatedFetcher,
        { refreshInterval: 3_000 },
    );

    const { data: fertagusData } = useSWR<{ vehicles: EnrichedVehicle[] }>(
        "/api/vehicles?excludes=defaultAgencies&includes=extraAgencies",
        unauthenticatedFetcher,
        { refreshInterval: 3_000 },
    );

    const { data: stations } = useSWR<{ stations: Station[] }>(
        "/api/stations",
        unauthenticatedFetcher,
        { refreshInterval: 240_000 },
    );

    const { data: stats } = useSWR<{ stats: GeneralStatistics }>(
        "/api/stats",
        unauthenticatedFetcher,
        { refreshInterval: 60_000 },
    );

    const cpVehicles = cpData?.vehicles ?? [];
    const fertagusVehicles = fertagusData?.vehicles ?? [];

    // the map is usable as soon as either realtime feed has arrived.
    useEffect(() => {
        if (cpData || fertagusData) {
            setIsLoading(false);
        }
    }, [cpData, fertagusData]);

    const cpVehiclesByTrainNumber = useMemo(
        () => new Map(cpVehicles.map((vehicle) => [vehicle.trainNumber, vehicle])),
        [cpVehicles],
    );

    const fertagusVehiclesByTrainNumber = useMemo(
        () =>
            new Map(
                fertagusVehicles.map((vehicle) => [
                    vehicle.trainNumber,
                    vehicle,
                ]),
            ),
        [fertagusVehicles],
    );

    const getVehicle = useCallback(
        (agencyId: string | undefined, trainNumber: number) => {
            if (agencyId === "FT") {
                return fertagusVehiclesByTrainNumber.get(trainNumber);
            }

            return cpVehiclesByTrainNumber.get(trainNumber);
        },
        [cpVehiclesByTrainNumber, fertagusVehiclesByTrainNumber],
    );

    const stationsGeoJSON = useMemo<GeoJSON>(
        () => ({
            type: "FeatureCollection",
            features:
                stations?.stations.map((station) => ({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [
                            parseFloat(station.longitude),
                            parseFloat(station.latitude),
                        ],
                    },
                    properties: { ...station, type: "station" },
                })) ?? [],
        }),
        [stations],
    );

    const makeVehiclesGeoJSON = useCallback(
        (vehicles: EnrichedVehicle[]): GeoJSON => ({
            type: "FeatureCollection",
            features: vehicles
                .filter((vehicle) => vehicle.latitude && vehicle.longitude)
                .map((vehicle) => ({
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [
                            parseFloat(vehicle.longitude),
                            parseFloat(vehicle.latitude),
                        ],
                    },
                    properties: { ...vehicle, type: "vehicle" },
                })),
        }),
        [],
    );

    // each source is memoized independently: cp updates do not rebuild ft's source.
    const cpVehiclesGeoJSON = useMemo(
        () => makeVehiclesGeoJSON(cpVehicles),
        [cpVehicles, makeVehiclesGeoJSON],
    );

    const fertagusVehiclesGeoJSON = useMemo(
        () => makeVehiclesGeoJSON(fertagusVehicles),
        [fertagusVehicles, makeVehiclesGeoJSON],
    );

    const fetchStationArrivals = useCallback(
        async (stationCode: string, agencyIds?: string) => {
            const url = agencyIds
                ? `/api/stations/${stationCode}/arrivals?agencyIds=${encodeURIComponent(agencyIds)}`
                : `/api/stations/${stationCode}/arrivals`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`failed to fetch arrivals: ${response.status}`);
            }

            return (await response.json()) as { arrivals: TrainArrival[] };
        },
        [],
    );

    const mergeArrivals = useCallback(
        (existing: TrainArrival, incoming: TrainArrival): TrainArrival => ({
            ...existing,
            ...incoming,
            trainService: incoming.trainService ?? existing.trainService,
            trainOrigin: incoming.trainOrigin ?? existing.trainOrigin,
            trainDestination:
                incoming.trainDestination ?? existing.trainDestination,
            arrivalTime: incoming.arrivalTime ?? existing.arrivalTime,
            departureTime: incoming.departureTime ?? existing.departureTime,
            platform: incoming.platform ?? existing.platform,
            delay: incoming.delay ?? existing.delay,
            occupancy: incoming.occupancy ?? existing.occupancy,
            supression: incoming.supression ?? existing.supression,
            ETA: incoming.ETA ?? existing.ETA,
            ETD: incoming.ETD ?? existing.ETD,
        }),
        [],
    );

    const parseArrivalsForStation = useCallback(
        (stationCode: string, arrivals: TrainArrival[]) =>
            arrivals
                .filter(
                    (arrival) =>
                        !arrival.supression &&
                        (arrival.ETA !== null ||
                            arrival.ETD !== null ||
                            arrival.delay !== null),
                )
                .map((arrival) => {
                    const hasEtaOrEtd =
                        arrival.ETA !== null || arrival.ETD !== null;

                    const arrivalTime = String(
                        arrival.ETA ??
                        arrival.ETD ??
                        arrival.arrivalTime ??
                        arrival.departureTime,
                    );

                    const parsedArrival = stationCode.startsWith("71-")
                        ? parseHHMMInTimeZone(arrivalTime, "Europe/Madrid")
                        : parseHHMM(arrivalTime);

                    if (!parsedArrival) return null;

                    let durationToArrivalMinutes = Math.round(
                        (parsedArrival.getTime() - Date.now()) / 60000,
                    );

                    if (!hasEtaOrEtd) {
                        durationToArrivalMinutes += arrival.delay ?? 0;
                    }

                    return {
                        ...arrival,
                        durationToArrivalMinutes,
                    };
                })
                .filter(
                    (
                        arrival,
                    ): arrival is TrainArrival & {
                        durationToArrivalMinutes: number;
                    } => arrival !== null,
                ),
        [],
    );

    const mergeParsedArrivals = useCallback(
        (
            existing: (TrainArrival & {
                durationToArrivalMinutes: number;
            })[],
            incoming: (TrainArrival & {
                durationToArrivalMinutes: number;
            })[],
        ) =>
            incoming
                .reduce(
                    (accumulator, arrival) => {
                        const existingIndex = accumulator.findIndex(
                            (candidate) =>
                                candidate.trainNumber === arrival.trainNumber,
                        );

                        if (existingIndex === -1) {
                            accumulator.push(arrival);
                        } else {
                            accumulator[existingIndex] = {
                                ...mergeArrivals(
                                    accumulator[existingIndex],
                                    arrival,
                                ),
                                durationToArrivalMinutes:
                                    arrival.durationToArrivalMinutes,
                            };
                        }

                        return accumulator;
                    },
                    [...existing],
                )
                .sort(
                    (a, b) =>
                        a.durationToArrivalMinutes -
                        b.durationToArrivalMinutes,
                ),
        [mergeArrivals],
    );

    const fetchAndSetSelectedStationNextArrivals = useCallback(() => {
        if (!selectedStation) return;

        const requestId = ++arrivalsRequestIdRef.current;
        const stationCode = selectedStation.code;

        if (!selectedStationNextArrivalsRef.current) {
            setIsLoadingArrivals(true);
        }

        const applyArrivals = (
            arrivals: TrainArrival[],
            shouldClearLoading = false,
        ) => {
            if (requestId !== arrivalsRequestIdRef.current) return;

            const parsedArrivals = parseArrivalsForStation(
                stationCode,
                arrivals,
            );

            setSelectedStationNextArrivals(
                selectedStationNextArrivalsRef.current
                    ? mergeParsedArrivals(
                        selectedStationNextArrivalsRef.current,
                        parsedArrivals,
                    )
                    : parsedArrivals,
            );

            if (shouldClearLoading) {
                setIsLoadingArrivals(false);
            }
        };

        // cp/default source controls the loading state; ft remains optional.
        fetchStationArrivals(stationCode)
            .then((data) => applyArrivals(data.arrivals, true))
            .catch(() => {
                if (requestId === arrivalsRequestIdRef.current) {
                    setIsLoadingArrivals(false);
                }
            });

        if (FERTAGUS_STATION_IDS.includes(stationCode)) {
            fetchStationArrivals(stationCode, "FT")
                .then((data) => applyArrivals(data.arrivals))
                .catch(() => {
                    // ft is optional.
                });
        }
    }, [
        fetchStationArrivals,
        mergeParsedArrivals,
        parseArrivalsForStation,
        selectedStation,
        setSelectedStationNextArrivals,
    ]);

    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval> | null = null;

        if (selectedStation && showStationPopup) {
            fetchAndSetSelectedStationNextArrivals();
            intervalId = setInterval(
                fetchAndSetSelectedStationNextArrivals,
                5_000,
            );
        } else {
            arrivalsRequestIdRef.current++;
            setSelectedStationNextArrivals(null);
            setIsLoadingArrivals(false);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [
        selectedStation,
        showStationPopup,
        fetchAndSetSelectedStationNextArrivals,
        setSelectedStationNextArrivals,
    ]);

    const onMouseEnter = useCallback(() => setCursor("pointer"), []);
    const onMouseLeave = useCallback(() => setCursor("auto"), []);

    const onStationSelected = useCallback(
        (station: Station) => {
            arrivalsRequestIdRef.current++;
            setSelectedStationNextArrivals(null);
            setSelectedStation(station);
            setShowStationPopup(true);

            trackUmamiEvent("station_selected", {
                stationId: station.code,
                stationName: station.designation,
            });
        },
        [setSelectedStationNextArrivals],
    );

    const onVehicleSelected = useCallback((vehicle: EnrichedVehicle) => {
        setSelectedVehicle(vehicle);
        setShowPopup(true);

        trackUmamiEvent("vehicle_selected", {
            trainNumber: vehicle.trainNumber,
            agencyId: vehicle.agencyId,
            status: vehicle.status,
        });
    }, []);

    const handleLayerClick = useCallback(
        (event: MapLayerMouseEvent) => {
            const feature = event.features?.[0];

            if (!feature) {
                setShowPopup(false);
                setShowStationPopup(false);
                setSelectedVehicle(null);
                setSelectedStation(null);
                setSelectedStationNextArrivals(null);
                return;
            }

            const type = feature.properties?.type;

            if (type === "vehicle") {
                const vehicle = feature.properties as EnrichedVehicle & {
                    type: string;
                };

                try {
                    if (vehicle.service) {
                        vehicle.service = JSON.parse(
                            vehicle.service as unknown as string,
                        ) as Service;
                    }
                    if (vehicle.origin) {
                        vehicle.origin = JSON.parse(
                            vehicle.origin as unknown as string,
                        ) as Service;
                    }
                    if (vehicle.destination) {
                        vehicle.destination = JSON.parse(
                            vehicle.destination as unknown as string,
                        ) as Service;
                    }
                    if (vehicle.gtfs) {
                        vehicle.gtfs = JSON.parse(
                            vehicle.gtfs as unknown as string,
                        ) as EnrichedVehicle["gtfs"];
                    }
                    if (vehicle.units) {
                        vehicle.units = JSON.parse(
                            vehicle.units as unknown as string,
                        ) as string[];
                    }

                    onVehicleSelected(vehicle);
                } catch (error) {
                    console.error("error parsing vehicle data", error);
                }
            } else if (type === "station") {
                onStationSelected(feature.properties as Station);
            }
        },
        [onStationSelected, onVehicleSelected, setSelectedStationNextArrivals],
    );

    const handlePopupClose = useCallback(() => {
        setShowPopup(false);
        setSelectedVehicle(null);
    }, []);

    const handleStationPopupClose = useCallback(() => {
        arrivalsRequestIdRef.current++;
        setShowStationPopup(false);
        setSelectedStation(null);
        setSelectedStationNextArrivals(null);
    }, []);

    const handleSearchVehicleSelect = useCallback(
        (vehicle: EnrichedVehicle) => {
            onVehicleSelected(vehicle);
            map?.flyTo({
                center: [
                    parseFloat(vehicle.longitude),
                    parseFloat(vehicle.latitude),
                ],
                zoom: 15,
                essential: true,
            });
            setShowSearchOverlay(false);
        },
        [map, onVehicleSelected],
    );

    const handleSearchStationSelect = useCallback(
        (station: Station) => {
            onStationSelected(station);
            map?.flyTo({
                center: [
                    parseFloat(station.longitude),
                    parseFloat(station.latitude),
                ],
                zoom: 14,
                essential: true,
            });
            setShowSearchOverlay(false);
        },
        [map, onStationSelected],
    );

    const onFlyToTrain = useCallback(
        (trainNumber: number, agencyId?: string) => {
            const vehicle = getVehicle(agencyId, trainNumber);
            if (!vehicle) return;

            handlePopupClose();

            map?.flyTo({
                center: [
                    parseFloat(vehicle.longitude),
                    parseFloat(vehicle.latitude),
                ],
                zoom: 16,
                essential: true,
            });

            onVehicleSelected(vehicle);
        },
        [getVehicle, handlePopupClose, map, onVehicleSelected],
    );

    const vehiclesLayerStyle = useMemo<CircleLayer>(
        () => ({
            source: "cp-vehicles",
            id: "cp-vehicle",
            type: "circle",
            paint: {
                "circle-color": [
                    "case",
                    ["==", ["get", "status"], "CANCELLED"],
                    "#D7263D",
                    ["==", ["get", "status"], "COMPLETED"],
                    "#808080",
                    "#388344",
                ],
                "circle-radius": 5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
            },
        }),
        [],
    );

    const fertagusVehiclesLayerStyle = useMemo<CircleLayer>(
        () => ({
            source: "fertagus-vehicles",
            id: "fertagus-vehicle",
            type: "circle",
            paint: {
                "circle-color": [
                    "case",
                    ["==", ["get", "status"], "CANCELLED"],
                    "#D7263D",
                    ["==", ["get", "status"], "COMPLETED"],
                    "#808080",
                    "#C74F4F",
                ],
                "circle-radius": 5,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
            },
        }),
        [],
    );

    const makeArrowLayer = useCallback(
        (source: string, id: string): SymbolLayer => ({
            source,
            id,
            type: "symbol",
            filter: [
                "all",
                ["has", "bearing"],
                ["!=", ["get", "bearing"], ["literal", null]],
            ],
            layout: {
                "icon-image": "vehicle_arrow",
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "icon-anchor": "center",
                "symbol-placement": "point",
                "icon-rotation-alignment": "map",
                "icon-size": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    10,
                    0.2,
                    20,
                    0.2,
                ],
                "icon-offset": [0, -12],
                "icon-rotate": ["get", "bearing"],
            },
            paint: {
                "icon-opacity": [
                    "interpolate",
                    ["exponential", 1.5],
                    ["zoom"],
                    8,
                    0,
                    10,
                    1,
                ],
            },
        }),
        [],
    );

    const cpVehiclesArrowsLayerStyle = useMemo(
        () => makeArrowLayer("cp-vehicles", "cp-vehicle-arrow"),
        [makeArrowLayer],
    );

    const fertagusVehiclesArrowsLayerStyle = useMemo(
        () => makeArrowLayer("fertagus-vehicles", "fertagus-vehicle-arrow"),
        [makeArrowLayer],
    );

    const stationsLayerStyle = useMemo<CircleLayer>(
        () => ({
            source: "stations",
            id: "station",
            type: "circle",
            minzoom: 7,
            paint: {
                "circle-color": "#7fb3d5",
                "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    1.5,
                    12,
                    2.5,
                ],
                "circle-opacity": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    0.45,
                    12,
                    0.65,
                ],
                "circle-stroke-width": 1,
                "circle-stroke-color": "#0b1a2a",
                "circle-stroke-opacity": 0.8,
            },
        }),
        [],
    );

    const stationsHitboxLayerStyle = useMemo<CircleLayer>(
        () => ({
            source: "stations",
            id: "station-hitbox",
            type: "circle",
            minzoom: 7,
            paint: {
                "circle-color": "#7fb3d5",
                "circle-radius": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    7,
                    10,
                    12,
                    14,
                ],
                "circle-opacity": 0.01,
                "circle-stroke-width": 0,
            },
        }),
        [],
    );

    const selectedStationNextArrivalsNext3Hours =
        selectedStationNextArrivals?.filter(
            (arrival) =>
                arrival.durationToArrivalMinutes >= 0 &&
                arrival.durationToArrivalMinutes <= 180,
        );

    const selectedVehicleTripInfoUrl =
        selectedVehicle?.agencyId === "CP"
            ? `/api/trips/${selectedVehicle.trainNumber}`
            : null;

    const { data: currentlySelectedVehicleTripInfo } = useSWR<{
        occupancy: number | null;
    }>(selectedVehicleTripInfoUrl, unauthenticatedFetcher, {
        refreshInterval: 5_000,
    });

    const searchVehicles = useMemo(
        () => [...cpVehicles, ...fertagusVehicles],
        [cpVehicles, fertagusVehicles],
    );

    return (
        <>
            <Toaster richColors />

            <SearchOverlay
                isOpen={showSearchOverlay}
                onClose={() => setShowSearchOverlay(false)}
                vehicles={searchVehicles}
                stations={stations?.stations || []}
                onVehicleSelect={handleSearchVehicleSelect}
                onStationSelect={handleSearchStationSelect}
            />

            <div
                style={{
                    position: "absolute",
                    top: "22px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    margin: "auto",
                    zIndex: 4,
                    pointerEvents: "none",
                    fontSize: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.55rem",
                    }}
                >
                    <img
                        src="/emojis/train.png"
                        alt="🚆"
                        style={{ height: "1em", verticalAlign: "middle" }}
                    />
                    <img
                        src="/emojis/portugal.png"
                        alt="🇵🇹"
                        style={{ height: "1em", verticalAlign: "middle" }}
                    />
                    <img
                        src="/emojis/map.png"
                        alt="🗺️"
                        style={{ height: "1em", verticalAlign: "middle" }}
                    />
                    <img
                        src="/emojis/compass.png"
                        alt="🧭"
                        style={{ height: "1em", verticalAlign: "middle" }}
                    />
                </div>
            </div>

            <div
                style={{
                    position: "absolute",
                    zIndex: 1,
                    left: 0,
                    top: 0,
                    display: "flex",
                    flexDirection: "row",
                    margin: "20px",
                    gap: "1rem",
                }}
            >
                <TopBarButton
                    onClick={() => {
                        window.open(
                            "https://github.com/joaodcp/cp-rt-ui",
                            "_blank",
                        );
                        trackUmamiEvent("github_link_clicked", {
                            source: "top_bar_button",
                        });
                    }}
                >
                    <GithubLogo size={26} />
                </TopBarButton>

                <TopBarButton
                    onClick={() => {
                        i18n.changeLanguage(
                            i18n.language === "en" ? "pt" : "en",
                        );
                        trackUmamiEvent("language_changed", {
                            source: "top_bar_button",
                            newLanguage:
                                i18n.language === "en" ? "pt" : "en",
                        });
                    }}
                    style={{ position: "relative" }}
                >
                    <Globe size={26} />
                    <span
                        style={{
                            position: "absolute",
                            bottom: 2,
                            right: 4,
                            fontSize: 8,
                            fontWeight: "bold",
                            color: "white",
                            textShadow: "0 0 2px rgba(0,0,0,0.7)",
                            pointerEvents: "none",
                        }}
                    >
                        {i18n.language.toUpperCase()}
                    </span>
                </TopBarButton>
            </div>

            <TopBarButton
                style={{
                    position: "absolute",
                    zIndex: 1,
                    right: 0,
                    margin: "20px",
                }}
                onClick={() => {
                    setShowSearchOverlay(!showSearchOverlay);
                    trackUmamiEvent("search_overlay_opened", {
                        source: "top_bar_button",
                    });
                }}
            >
                <MagnifyingGlass size={26} />
            </TopBarButton>

            <div className="loader-container">
                <FadeInOut fade={isLoading ? Fade.none : Fade.out}>
                    <Centered style={{ background: "#000" }}>
                        <Loader />
                    </Centered>
                </FadeInOut>
            </div>

            <WGLMap
                id="map"
                initialViewState={{
                    latitude: 39.514525450960036,
                    longitude: -7.969213273122932,
                    zoom: 6.4444226078908144,
                }}
                interactiveLayerIds={[
                    "cp-vehicle",
                    "fertagus-vehicle",
                    "station",
                    "station-hitbox",
                ]}
                onClick={handleLayerClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onLoad={(evt) => {
                    evt.target.setPaintProperty(
                        "railway",
                        "line-color",
                        "#1c4122",
                    );
                    evt.target.setPaintProperty(
                        "railway_minor",
                        "line-color",
                        "#112714",
                    );
                    evt.target.setLayerZoomRange("railway", 4, 22);
                    evt.target.setLayerZoomRange(
                        "railway_minor",
                        15,
                        22,
                    );
                }}
                cursor={cursor}
            >
                <Source id="stations" type="geojson" data={stationsGeoJSON}>
                    <Layer {...stationsHitboxLayerStyle} />
                    <Layer {...stationsLayerStyle} />
                </Source>

                <Source
                    id="cp-vehicles"
                    type="geojson"
                    data={cpVehiclesGeoJSON}
                >
                    <Layer {...vehiclesLayerStyle} />
                    <Layer {...cpVehiclesArrowsLayerStyle} />
                </Source>

                <Source
                    id="fertagus-vehicles"
                    type="geojson"
                    data={fertagusVehiclesGeoJSON}
                >
                    <Layer {...fertagusVehiclesLayerStyle} />
                    <Layer {...fertagusVehiclesArrowsLayerStyle} />
                </Source>

                {showPopup && selectedVehicle && (
                    <Popup
                        longitude={parseFloat(selectedVehicle.longitude)}
                        latitude={parseFloat(selectedVehicle.latitude)}
                        anchor="bottom"
                        offset={20}
                        onClose={handlePopupClose}
                        closeButton
                        closeOnClick={false}
                    >
                        <div className="flex items-start absolute top-[12.5px] left-[12.5px] justify-between w-[290px]">
                            <h1
                                style={{
                                    fontWeight: "900",
                                    fontSize: "1.1rem",
                                }}
                            >
                                {t("vehicle_popup.train", {
                                    trainNumber:
                                        selectedVehicle.trainNumber,
                                })}
                            </h1>

                            {!!selectedVehicle.units?.length && (
                                <Pill
                                    color={
                                        selectedVehicle.agencyId === "FT"
                                            ? BadgeColor.fertagusRed
                                            : BadgeColor.green
                                    }
                                    wrapping
                                >
                                    <div className="flex items-center gap-1 pr-2 pl-2">
                                        <Train size={15} />
                                        <p>
                                            {selectedVehicle.units
                                                .map((unit) =>
                                                    getFormattedFleetNumber(
                                                        unit,
                                                        selectedVehicle.agencyId,
                                                    ),
                                                )
                                                .join(" + ")}
                                        </p>
                                    </div>
                                </Pill>
                            )}
                        </div>

                        {selectedVehicle.delay === 0 && (
                            <p
                                style={{
                                    position: "absolute",
                                    top: "30.5px",
                                    left: "12.5px",
                                    fontWeight: "700",
                                    fontSize: "0.8rem",
                                    color: "gray",
                                }}
                            >
                                {t(
                                    "vehicle_popup.schedule_adherence.on_time",
                                )}
                            </p>
                        )}

                        {selectedVehicle.delay > 0 && (
                            <p
                                style={{
                                    position: "absolute",
                                    top: "30.5px",
                                    left: "12.5px",
                                    fontWeight: "700",
                                    fontSize: "0.8rem",
                                    color: "gray",
                                }}
                            >
                                {t("vehicle_popup.schedule_adherence.late", {
                                    formattedDuration: formatDuration(
                                        selectedVehicle.delay,
                                        true,
                                    ),
                                })}
                            </p>
                        )}

                        {selectedVehicle.delay < 0 && (
                            <p
                                style={{
                                    position: "absolute",
                                    top: "30.5px",
                                    left: "12.5px",
                                    fontWeight: "700",
                                    fontSize: "0.8rem",
                                    color: "gray",
                                }}
                            >
                                {t("vehicle_popup.schedule_adherence.early", {
                                    formattedDuration: formatDuration(
                                        Math.abs(selectedVehicle.delay),
                                        true,
                                    ),
                                })}
                            </p>
                        )}

                        {!!currentlySelectedVehicleTripInfo?.occupancy && (
                            <p
                                className={`font-bold ${currentlySelectedVehicleTripInfo
                                    .occupancy === 1
                                    ? "text-green-500"
                                    : currentlySelectedVehicleTripInfo
                                        .occupancy === 2
                                        ? "text-yellow-500"
                                        : "text-red-500"
                                    }`}
                                style={{ marginTop: "-3px", marginLeft: "2px" }}
                            >
                                {currentlySelectedVehicleTripInfo.occupancy ===
                                    1
                                    ? t("vehicle_popup.occupancy.low")
                                    : currentlySelectedVehicleTripInfo.occupancy ===
                                        2
                                        ? t("vehicle_popup.occupancy.medium")
                                        : t("vehicle_popup.occupancy.high")}
                            </p>
                        )}

                        <div className="flex items-center justify-evenly p-2">
                            {selectedVehicle.service?.designation && (
                                <>
                                    <div style={{ height: "5px" }} />
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-evenly",
                                        }}
                                    >
                                        <Pill
                                            color={
                                                selectedVehicle.agencyId ===
                                                    "FT"
                                                    ? BadgeColor.subtleRed
                                                    : BadgeColor.subtleGreen
                                            }
                                        >
                                            <div className="flex items-center gap-1">
                                                <p>
                                                    {selectedVehicle.service.designation.replace(
                                                        "(Alta Qualidade)",
                                                        "",
                                                    )}
                                                </p>
                                                {selectedVehicle.service.designation.endsWith(
                                                    "(Alta Qualidade)",
                                                ) && (
                                                        <Sparkle
                                                            size={15}
                                                            weight="fill"
                                                        />
                                                    )}
                                            </div>
                                        </Pill>
                                    </div>
                                    <div style={{ height: "10px" }} />
                                </>
                            )}

                            {"speed" in selectedVehicle && (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Pill>
                                        <Gauge size={15} />
                                        <div style={{ width: "7px" }} />
                                        {selectedVehicle.speed?.toFixed(1)}
                                        <div style={{ width: "7px" }} />
                                        <p>km/h</p>
                                    </Pill>
                                </div>
                            )}
                        </div>

                        {selectedVehicle.origin?.designation &&
                            selectedVehicle.destination?.designation && (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        gap: "10px",
                                    }}
                                >
                                    <h1
                                        style={{
                                            fontWeight: "400",
                                            fontSize: "1rem",
                                        }}
                                    >
                                        {selectedVehicle.origin.designation}
                                    </h1>
                                    <ArrowRight size={15} weight="bold" />
                                    <h1
                                        style={{
                                            fontWeight: "400",
                                            fontSize: "1rem",
                                        }}
                                    >
                                        {selectedVehicle.destination.designation}
                                    </h1>
                                </div>
                            )}

                        {selectedVehicle.status ===
                            VehicleStatus.Completed && (
                                <VehicleStatusText>
                                    {t("vehicle_popup.status.completed")}
                                </VehicleStatusText>
                            )}

                        {selectedVehicle.status ===
                            VehicleStatus.NotStarted && (
                                <VehicleStatusText>
                                    {t("vehicle_popup.status.not_started")}
                                </VehicleStatusText>
                            )}

                        {selectedVehicle.status ===
                            VehicleStatus.InTransit && (
                                <VehicleStatusText>
                                    {t("vehicle_popup.status.in_transit")}
                                </VehicleStatusText>
                            )}

                        {selectedVehicle.status === VehicleStatus.AtOrigin && (
                            <VehicleStatusText>
                                {t("vehicle_popup.status.at_origin")}
                                {getStationSuffix(
                                    stations?.stations,
                                    selectedVehicle.lastStation,
                                )}
                            </VehicleStatusText>
                        )}

                        {selectedVehicle.status === VehicleStatus.AtStation && (
                            <VehicleStatusText>
                                {t("vehicle_popup.status.at_station")}
                                {getStationSuffix(
                                    stations?.stations,
                                    selectedVehicle.lastStation,
                                )}
                            </VehicleStatusText>
                        )}

                        {selectedVehicle.status === VehicleStatus.NearNext && (
                            <VehicleStatusText center>
                                {t("vehicle_popup.status.near_next")}
                                <br />
                                {getStationSuffix(
                                    stations?.stations,
                                    selectedVehicle.gtfs?.stopId?.replace(
                                        "_",
                                        "-",
                                    ),
                                )}
                            </VehicleStatusText>
                        )}

                        {selectedVehicle.status ===
                            VehicleStatus.Cancelled && (
                                <VehicleStatusText color="#d7263d">
                                    {t("vehicle_popup.status.cancelled")}
                                </VehicleStatusText>
                            )}

                        <div style={{ height: "20px" }} />

                        {selectedVehicle.timestamp && (
                            <p
                                style={{
                                    color: "gray",
                                    position: "absolute",
                                    bottom: "2px",
                                    left: "10px",
                                }}
                            >
                                {t("vehicle_popup.updated_at")}:{" "}
                                {new Date(
                                    selectedVehicle.timestamp,
                                ).toLocaleTimeString()}
                            </p>
                        )}

                        {selectedVehicle.source && (
                            <p
                                style={{
                                    color: "gray",
                                    position: "absolute",
                                    bottom: "2px",
                                    right: "10px",
                                }}
                            >
                                via {selectedVehicle.source}
                            </p>
                        )}
                    </Popup>
                )}

                {showStationPopup && selectedStation && (
                    <Popup
                        longitude={parseFloat(selectedStation.longitude)}
                        latitude={parseFloat(selectedStation.latitude)}
                        anchor="bottom"
                        offset={20}
                        onClose={handleStationPopupClose}
                        closeButton
                        closeOnClick={false}
                    >
                        <div>
                            <p
                                style={{
                                    fontWeight: "700",
                                    fontSize: "0.8rem",
                                    color: "gray",
                                    textTransform: "uppercase",
                                }}
                            >
                                {t("station_popup.station_header")}
                            </p>

                            <h1
                                style={{
                                    fontWeight: "900",
                                    fontSize: "1.1rem",
                                }}
                            >
                                {selectedStation.designation}
                            </h1>

                            <div style={{ height: "10px" }} />

                            <p style={{ color: "gray", opacity: 0.5 }}>
                                {"ID: " + selectedStation.code}
                            </p>

                            <div style={{ height: "15px" }} />

                            {isLoadingArrivals ? (
                                <Loader />
                            ) : selectedStationNextArrivalsNext3Hours?.length ===
                                0 ? (
                                <p
                                    style={{
                                        fontWeight: "700",
                                        fontSize: "0.8rem",
                                        color: "gray",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    {t("station_popup.no_arrivals")}
                                </p>
                            ) : (
                                <>
                                    <p
                                        style={{
                                            fontWeight: "700",
                                            fontSize: "0.8rem",
                                            color: "gray",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        {t("station_popup.next_arrivals")}
                                    </p>

                                    <div style={{ height: "5px" }} />

                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "10px",
                                        }}
                                    >
                                        {selectedStationNextArrivalsNext3Hours?.map(
                                            (arrival) => {
                                                const vehicle = getVehicle(
                                                    arrival.trainService?.code ===
                                                        "FT"
                                                        ? "FT"
                                                        : "CP",
                                                    arrival.trainNumber!,
                                                );

                                                return (
                                                    <div
                                                        key={`${arrival.trainService?.code ?? "CP"}:${arrival.trainNumber}`}
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "10px",
                                                            }}
                                                        >
                                                            <Pill
                                                                color={
                                                                    arrival
                                                                        .trainService
                                                                        .code ===
                                                                        "FT"
                                                                        ? BadgeColor.fertagusRed
                                                                        : BadgeColor.green
                                                                }
                                                            >
                                                                <p
                                                                    style={{
                                                                        fontSize: 11,
                                                                    }}
                                                                >
                                                                    {`${arrival.trainService.code.replace(
                                                                        "FT",
                                                                        "U",
                                                                    )}\u00A0${arrival.trainNumber}`}
                                                                </p>
                                                            </Pill>

                                                            <ArrowRight
                                                                size={15}
                                                                weight="bold"
                                                            />

                                                            <p
                                                                style={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    fontSize:
                                                                        "0.8rem",
                                                                }}
                                                            >
                                                                {
                                                                    stations?.stations.find(
                                                                        (station) =>
                                                                            station.code ===
                                                                            arrival
                                                                                .trainDestination
                                                                                .code,
                                                                    )
                                                                        ?.designation
                                                                }
                                                            </p>
                                                        </div>

                                                        <div
                                                            style={{
                                                                width: "7px",
                                                            }}
                                                        />

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "5px",
                                                            }}
                                                        >
                                                            <p
                                                                style={{
                                                                    fontWeight:
                                                                        "bold",
                                                                    color: "green",
                                                                }}
                                                            >
                                                                {!arrival.durationToArrivalMinutes ||
                                                                    arrival.durationToArrivalMinutes <=
                                                                    0 ? (
                                                                    <ArrivingBusAnimation color="green" />
                                                                ) : (
                                                                    formatDuration(
                                                                        arrival.durationToArrivalMinutes *
                                                                        60,
                                                                        false,
                                                                        true,
                                                                    )
                                                                )}
                                                            </p>

                                                            {vehicle && (
                                                                <button
                                                                    onClick={() =>
                                                                        onFlyToTrain(
                                                                            arrival.trainNumber!,
                                                                            arrival
                                                                                .trainService
                                                                                ?.code ===
                                                                                "FT"
                                                                                ? "FT"
                                                                                : "CP",
                                                                        )
                                                                    }
                                                                    style={{
                                                                        cursor: "pointer",
                                                                    }}
                                                                >
                                                                    <Pill
                                                                        color={
                                                                            arrival
                                                                                .trainService
                                                                                .code ===
                                                                                "FT"
                                                                                ? BadgeColor.fertagusRed
                                                                                : BadgeColor.green
                                                                        }
                                                                        wrapping
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                display:
                                                                                    "flex",
                                                                                alignItems:
                                                                                    "center",
                                                                                gap: "5px",
                                                                                padding:
                                                                                    "0 5px",
                                                                            }}
                                                                        >
                                                                            <TrainIcon
                                                                                color="white"
                                                                                size={
                                                                                    12
                                                                                }
                                                                            />
                                                                            <CaretRight
                                                                                size={
                                                                                    15
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </Pill>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            },
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </Popup>
                )}
            </WGLMap>
        </>
    );
}

function VehicleStatusText({
    children,
    color = "gray",
    center = false,
}: {
    children: React.ReactNode;
    color?: string;
    center?: boolean;
}) {
    return (
        <>
            <div style={{ height: "10px" }} />
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <p
                    style={{
                        color,
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        textAlign: center ? "center" : undefined,
                    }}
                >
                    {children}
                </p>
            </div>
        </>
    );
}

function getStationSuffix(
    stations: Station[] | undefined,
    stationCode: string | undefined,
) {
    if (!stationCode) return "";

    const station = stations?.find((s) => s.code === stationCode);
    return station ? ` (${station.designation})` : "";
}

export default dynamic(() => Promise.resolve(Home), {
    ssr: false,
});
