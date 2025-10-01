"use strict";
"use client";

import * as turf from "@turf/turf";
import { LineString, MultiLineString, Feature, Point } from "geojson";

// function splitLineStringByClosestPoint(lineString: LineString, point: Point) {
//     const closestPoint = turf.nearestPointOnLine(lineString, point);

//     const lines = turf.lineSplit(lineString, closestPoint);

//     return lines;
// }

// function getCalculatedHeading(
//     previousCoordinates: number[],
//     currentCoordinates: number[]
// ): number {
//     return turf.bearing(
//         turf.point(currentCoordinates),
//         turf.point(previousCoordinates)
//     );
// }

// function getPopupAnchorForHeading(heading: number): PositionAnchor {
//     if (heading >= 45 && heading < 135) {
//         return "top";
//     } else if (heading >= 135 && heading < 225) {
//         return "right";
//     } else if (heading >= 225 && heading < 315) {
//         return "left";
//     } else {
//         return "bottom";
//     }
// }

import WGLMap from "@/components/WGLMap/WGLMap";
import {
    useMap,
    Source,
    Layer,
    CircleLayer,
    Popup,
    LineLayer,
    SymbolLayer,
} from "react-map-gl/maplibre";
import {
    LngLatBoundsLike,
    MapGeoJSONFeature,
    MapLayerMouseEvent,
    PositionAnchor,
} from "maplibre-gl";
import useSWR from "swr";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    CaretRight,
    ChartBar,
    Eye,
    Gauge,
    Info,
    MagnifyingGlass,
    MapPinSimple,
    Moon,
    Path,
    Sparkle,
    Sun,
    Ticket,
} from "@phosphor-icons/react";

import { Toaster, toast } from "sonner";

import Pill, { BadgeColor } from "@/components/Pill/Pill";
import Loader from "@/components/Loader/Loader";
import Centered from "@/components/Centered/Centered";
import FadeInOut, { Fade } from "@/components/FadeInOut/FadeInOut";

import pkgInfo from "../package.json";
import TopBarButton from "@/components/TopBarButton/TopBarButton";
import { useTheme } from "next-themes";
import InfoDialog from "@/components/InfoDialog/InfoDialog";
// import CPLogo from "@/components/CPLogo";
import ArrivingBusAnimation from "@/components/ArrivingBusAnimation/ArrivingBusAnimation";
import BusIcon from "@/components/BusIcon";
import { Service, TrainStop, VehicleStatus } from "@/types/cp";
import { Station, EnrichedVehicle, GeneralStatistics } from "@/types/cp-v2";
import SearchOverlay from "@/components/search/SearchBarOverlay/SearchBarOverlay";
import { formatDuration } from "@/utils/time";
import { Train } from "lucide-react";
import { getFormattedFleetNumber } from "@/utils/fleet";
// import GeneralStatisticsOverlay from "@/components/stats/GeneralStatisticsOverlay";

const unauthenticatedFetcher = (url: string) =>
    fetch(url).then((res) => res.json());

interface GeoJSON {
    type: string;
    features: GeoJSONFeature[];
}

interface GeoJSONFeature {
    type: string;
    geometry: {
        coordinates: number[] | number[][];
        type: string;
    };
    properties?:
        | (EnrichedVehicle & { type: string })
        | (Station & { type: string });
}

export default function Home() {
    const { data: version } = useSWR("/api/version", unauthenticatedFetcher, {
        refreshInterval: 30_000,
    });

    useEffect(() => {
        if (version && version.version !== pkgInfo.version) {
            // running different version than the latest one
            window.location.reload();
        }
    }, [version]);

    const { theme, resolvedTheme, setTheme } = useTheme();

    const [vehicles, _setVehicles] = useState<EnrichedVehicle[] | null>(null);

    const [showPopup, setShowPopup] = useState<boolean>(true);
    const [selectedVehicle, setSelectedVehicle] =
        useState<EnrichedVehicle | null>(null);

    const [cursor, setCursor] = useState<string>("auto");

    const [isLoading, _setIsLoading] = useState<boolean>(true);

    const [isSSEErrored, _setIsSSEErrored] = useState<boolean>(false);

    const [showSearchOverlay, setShowSearchOverlay] = useState<boolean>(false);
    const [showStatsOverlay, setShowStatsOverlay] = useState<boolean>(false);

    const onMouseEnter = useCallback(() => setCursor("pointer"), []);
    const onMouseLeave = useCallback(() => setCursor("auto"), []);

    // const [isMapLoading, setIsMapLoading] = useState<boolean>(true);

    const { map } = useMap();

    useEffect(() => {
        if (map) {
            map.loadImage("arrow.png").then((res) =>
                map.addImage("arrow", res.data, { sdf: true })
            );

            map.loadImage("cp_vehicle_oriented_w_inv.png").then((res) =>
                map.addImage("bus", res.data)
            );
        }
    }, [map]);

    // useEffect(() => {
    //     setIsMapLoading(!map?.loaded());
    // }, [map?.loaded()]);

    const [toastId, _setToastId] = useState<string | number | null>(null);

    const toastIdRef = useRef(toastId);
    const setToastId = (data: string | number | null) => {
        toastIdRef.current = data;
        _setToastId(data);
    };

    const isSSEErroredRef = useRef(isSSEErrored);
    const setIsSSEErrored = (data: boolean) => {
        isSSEErroredRef.current = data;
        _setIsSSEErrored(data);
    };

    const isLoadingRef = useRef(isLoading);
    const setIsLoading = (data: boolean) => {
        isLoadingRef.current = data;
        _setIsLoading(data);
    };

    const vehiclesRef = useRef(vehicles);
    const setVehicles = (data: EnrichedVehicle[] | null) => {
        vehiclesRef.current = data;
        _setVehicles(data);
    };

    const { data: newVehicles } = useSWR<{
        vehicles: EnrichedVehicle[];
    }>("/api/vehicles", unauthenticatedFetcher, {
        refreshInterval: 5_000,
    });

    const { data: stations } = useSWR<{
        stations: Station[];
    }>("/api/stations", unauthenticatedFetcher, {
        refreshInterval: 240_000,
    });

    const { data: stats } = useSWR<{
        stats: GeneralStatistics;
    }>("/api/stats", unauthenticatedFetcher, {
        refreshInterval: 60_000,
    });

    useEffect(() => {
        console.log(isLoading);
        if (newVehicles?.vehicles) {
            isLoading && setIsLoading(false);

            // setVehicles(
            //     newVehicles.vehicles.filter((v) => {
            //         const completedAtHour = parseInt(
            //             v.trainStops[v.trainStops.length - 1].eta.split(":")[1]
            //         );
            //         const currentHour = new Date().getHours();

            //         // lazy calculation but meh
            //         const completedHoursAgo = Math.abs(
            //             completedAtHour - currentHour
            //         );

            //         return (
            //             v.status !== VehicleStatus.Cancelled &&
            //             v.status !== VehicleStatus.Completed &&
            //             completedHoursAgo > 2
            //         );
            //     })
            // );
            setVehicles(newVehicles.vehicles);
        }
    }, [newVehicles]);

    useEffect(() => {
        if (vehicles && isLoading) {
            setIsLoading(false);
        }
        if (showPopup && selectedVehicle && vehicles) {
            const updatedSelectedVehicle =
                vehicles?.find(
                    (vehicle) =>
                        vehicle.trainNumber === selectedVehicle?.trainNumber
                ) || null;

            setSelectedVehicle(updatedSelectedVehicle);
        }
    }, [vehicles]);

    // if (isLoading) return <div> </div>;

    // if (error) return <div>Error</div>;

    // const stationsGeoJSON: GeoJSON = {
    //     type: "FeatureCollection",
    //     features:
    //         stations?.stations.map((station) => ({
    //             type: "Feature",
    //             geometry: {
    //                 type: "Point",
    //                 coordinates: [
    //                     parseFloat(station.longitude),
    //                     parseFloat(station.latitude),
    //                 ],
    //             },
    //             properties: { ...station, type: "station" },
    //         })) || [],
    // };

    const vehiclesGeoJSON: GeoJSON = {
        type: "FeatureCollection",
        features: [],
    };

    vehicles?.forEach((vehicle) => {
        vehiclesGeoJSON.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [
                    parseFloat(vehicle.longitude),
                    parseFloat(vehicle.latitude),
                ],
            },
            properties: { ...vehicle, type: "vehicle" },
        });
    });

    function onVehicleSelected(vehicle: EnrichedVehicle) {
        console.log("SETTING VEHICLE:", vehicle);
        setSelectedVehicle(vehicle);
        console.log(selectedVehicle);
        console.log("Trying to select vehicle", vehicle);
        console.log("SelectedVehicle", selectedVehicle);
        setShowPopup(true);
    }

    const handleLayerClick = (event: MapLayerMouseEvent) => {
        console.log("MapClickEvent", event);
        if (event?.features?.[0]) {
            console.log(event?.features?.[0].properties.type);
            console.log(event?.features?.[0]);

            if (event?.features?.[0].properties.type === "vehicle") {
                const vehicle = event?.features?.[0]
                    .properties as EnrichedVehicle;
                // idk why but nested objects are stringified in the event properties??
                try {
                    if (vehicle.service) {
                        vehicle.service = JSON.parse(
                            vehicle.service as unknown as string
                        ) as Service;
                    }
                    if (vehicle.origin) {
                        vehicle.origin = JSON.parse(
                            vehicle.origin as unknown as string
                        ) as Service;
                    }
                    if (vehicle.destination) {
                        vehicle.destination = JSON.parse(
                            vehicle.destination as unknown as string
                        ) as Service;
                    }
                    // vehicle.trainStops = JSON.parse(
                    //     vehicle.trainStops as unknown as string
                    // ) as TrainStop[];
                    // if (vehicle.stop)
                    //     vehicle.stop = JSON.parse(
                    //         vehicle.stop as unknown as string
                    //     ) as TrainStop;
                    if (vehicle.units) {
                        vehicle.units = JSON.parse(
                            vehicle.units as unknown as string
                        ) as string[];
                    }
                    onVehicleSelected(vehicle);
                } catch (e) {
                    console.log("Error parsing vehicle data", e);
                }
            }
        }
    };

    const handlePopupClose = () => {
        setShowPopup(false);

        // TODO: test this
        setSelectedVehicle(null);
    };

    const handleSearchVehicleSelect = (vehicle: EnrichedVehicle) => {
        onVehicleSelected(vehicle);
        map?.flyTo({
            center: [
                parseFloat(vehicle.longitude),
                parseFloat(vehicle.latitude),
            ],
            zoom: 15,
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
        });
        setShowSearchOverlay(false);
    };

    // const vehiclesLayerStyle: SymbolLayer = {
    //     source: "vehicles",
    //     id: "vehicle",
    //     type: "symbol",
    //     layout: {
    //         "icon-image": "bus",
    //         "icon-allow-overlap": true,
    //         "icon-ignore-placement": true,
    //         "icon-anchor": "center",
    //         "symbol-placement": "point",
    //         "icon-rotation-alignment": "map",
    //         "icon-size": [
    //             "interpolate",
    //             ["linear"],
    //             ["zoom"],
    //             10,
    //             0.1,
    //             20,
    //             0.4,
    //         ],
    //         "icon-offset": [0, 0],
    //         "icon-rotate": ["get", "heading"],
    //     },
    // };

    const vehiclesLayerStyle: CircleLayer = {
        source: "vehicles",
        id: "vehicle",
        type: "circle",
        paint: {
            "circle-color": [
                "case",
                ["==", ["get", "status"], "CANCELLED"],
                "#D7263D", // strong red
                ["==", ["get", "status"], "COMPLETED"],
                "#808080", // gray
                "#388344", // default green
            ],
            "circle-radius": 5,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
        },
    };

    // const stationsLayerStyle: CircleLayer = {
    //     source: "stations",
    //     id: "station",
    //     type: "circle",
    //     paint: {
    //         "circle-color": "#1E90FF",
    //         "circle-radius": 3,
    //         "circle-stroke-width": 2,
    //         "circle-stroke-color": "#ffffff",
    //     },
    // };

    const selectedLineLayerStyle: LineLayer = {
        source: "line",
        id: "line",
        type: "line",
        paint: {
            "line-color": "#cb1a1a",
            "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 20, 12],
            // "line-width": 4,
            "line-opacity": 0.8,
            // "line-pattern": "arrow",
        },
        layout: {
            "line-cap": "round",
            "line-join": "round",
        },
    };

    return (
        <>
            {/* <InfoDialog
                open={showInfoDialog}
                onClose={() => setShowInfoDialog(false)}
            /> */}
            <Toaster richColors />
            <SearchOverlay
                isOpen={showSearchOverlay}
                onClose={() => setShowSearchOverlay(false)}
                vehicles={vehicles || []}
                onVehicleSelect={handleSearchVehicleSelect}
            />
            <GeneralStatisticsOverlay
                isOpen={showStatsOverlay}
                onClose={() => setShowStatsOverlay(false)}
                statistics={stats?.stats}
            />
            {/* <CPLogo
                style={{
                    height: "5%",
                    width: "auto",
                    position: "absolute",
                    top: "20px",
                    left: 0,
                    right: 0,
                    margin: "auto",
                    zIndex: 4,
                    pointerEvents: "none",
                }}
            /> */}
            <h1
                style={{
                    position: "absolute",
                    top: "15px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    margin: "auto",
                    zIndex: 4,
                    pointerEvents: "none",
                    textAlign: "center",
                    fontSize: "2rem",
                }}
            >
                🚆 🇵🇹 🗺️ 🧭
            </h1>
            {/* <TopBarButton
                style={{ position: "absolute", zIndex: 1 }}
                onClick={() => {
                    resolvedTheme == "light"
                        ? setTheme("dark")
                        : setTheme("light");
                }}
            > */}
            {/* If you use the manual theme button, there is currently no way to get back into system. */}
            {/* <Sun
                    className="absolute rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
                    size={26}
                />
                <Moon
                    className="rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
                    size={26}
                />
            </TopBarButton> */}
            {/* <TopBarButton
                style={{
                    position: "absolute",
                    zIndex: 1,
                    right: 0,
                }}
                onClick={() => {
                    setShowStopsOnMap(!showStopsOnMap);
                }}
            >
                <MapPinSimple size={26} />
            </TopBarButton> */}
            <TopBarButton
                style={{
                    position: "absolute",
                    zIndex: 1,
                    left: 0,
                }}
                onClick={() => {
                    setShowStatsOverlay(!showStatsOverlay);
                }}
            >
                <ChartBar size={26} />
            </TopBarButton>
            <TopBarButton
                style={{
                    position: "absolute",
                    zIndex: 1,
                    right: 0,
                }}
                onClick={() => {
                    setShowSearchOverlay(!showSearchOverlay);
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
                interactiveLayerIds={["vehicle", "stop"]}
                onClick={handleLayerClick}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onLoad={(evt) => {
                    // set color of the train railways to green
                    evt.target.setPaintProperty(
                        "railway",
                        "line-color",
                        "#1c4122"
                    );

                    evt.target.setPaintProperty(
                        "railway_minor",
                        "line-color",
                        "#112714"
                    );

                    evt.target.setLayerZoomRange("railway", 4, 22);
                    evt.target.setLayerZoomRange("railway_minor", 15, 22);
                }}
                cursor={cursor}
            >
                <Source
                    id="vehicles"
                    type="geojson"
                    data={vehiclesGeoJSON}
                    attribution="CP – Comboios de Portugal, E. P. E."
                >
                    <Layer {...vehiclesLayerStyle}></Layer>
                </Source>

                {/* <Source id="stations" type="geojson" data={stationsGeoJSON}>
                    <Layer {...stationsLayerStyle}></Layer>
                </Source> */}

                {showPopup && selectedVehicle && (
                    <Popup
                        longitude={parseFloat(selectedVehicle.longitude)}
                        latitude={parseFloat(selectedVehicle.latitude)}
                        // anchor={getPopupAnchorForHeading(
                        //     selectedVehicle.heading ?? 0
                        // )}
                        anchor="bottom"
                        offset={20}
                        onClose={handlePopupClose}
                    >
                        <div className="flex items-start absolute top-[12.5px] left-[12.5px] justify-between w-[290px]">
                            <h1
                                style={{
                                    fontWeight: "900",
                                    fontSize: "1.1rem",
                                }}
                            >
                                Comboio {selectedVehicle?.trainNumber}
                            </h1>

                            {selectedVehicle?.units &&
                                selectedVehicle?.units.length > 0 && (
                                    <Pill color={BadgeColor.green} wrapping>
                                        <div className="flex items-center gap-1 pr-2 pl-2">
                                            <Train size={15} />
                                            <p>
                                                {selectedVehicle?.units
                                                    .map((u) =>
                                                        getFormattedFleetNumber(
                                                            u
                                                        )
                                                    )
                                                    .join(" + ")}
                                            </p>
                                        </div>
                                    </Pill>
                                )}
                        </div>

                        {selectedVehicle.delay == 0 && (
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
                                A horas
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
                                Atrasado{" "}
                                {formatDuration(selectedVehicle.delay, true)}
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
                                Adiantado{" "}
                                {formatDuration(
                                    Math.abs(selectedVehicle.delay),
                                    true
                                )}
                            </p>
                        )}

                        {!!selectedVehicle.occupancy && (
                            <p
                                className={`font-bold ${
                                    selectedVehicle.occupancy < 65
                                        ? "text-green-500"
                                        : selectedVehicle.occupancy < 85
                                        ? "text-yellow-500"
                                        : "text-red-500"
                                }`}
                            >
                                {selectedVehicle.occupancy < 65
                                    ? "Muitos lugares disponíveis"
                                    : selectedVehicle.occupancy < 85
                                    ? "Poucos lugares sentados"
                                    : "Comboio cheio"}{" "}
                                ({selectedVehicle.occupancy}% ocupado)
                            </p>
                        )}

                        <div className="flex items-center justify-evenly p-2">
                            {selectedVehicle.service &&
                                selectedVehicle.service.designation && (
                                    <>
                                        <div style={{ height: "5px" }}></div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-evenly",
                                            }}
                                        >
                                            <Pill
                                                color={BadgeColor.subtleGreen}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <p>
                                                        {selectedVehicle.service.designation.replace(
                                                            "(Alta Qualidade)",
                                                            ""
                                                        )}
                                                    </p>
                                                    {selectedVehicle.service.designation.endsWith(
                                                        "(Alta Qualidade)"
                                                    ) && (
                                                        <Sparkle
                                                            size={15}
                                                            weight="fill"
                                                        />
                                                    )}
                                                </div>
                                            </Pill>
                                        </div>
                                        <div style={{ height: "10px" }}></div>
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

                                        <div style={{ width: "7px" }}></div>
                                        {selectedVehicle?.speed.toFixed(1)}
                                        <div style={{ width: "7px" }}></div>
                                        <p>km/h</p>
                                    </Pill>
                                </div>
                            )}
                        </div>

                        {selectedVehicle.origin &&
                            selectedVehicle.origin.designation &&
                            selectedVehicle.destination &&
                            selectedVehicle.destination.designation && (
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
                                        {
                                            selectedVehicle.destination
                                                .designation
                                        }
                                    </h1>
                                </div>
                            )}

                        {selectedVehicle.status === VehicleStatus.Completed && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "gray",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Viagem terminada
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedVehicle.status ===
                            VehicleStatus.NotStarted && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "gray",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Viagem a iniciar
                                    </p>
                                </div>
                            </>
                        )}

                        <div style={{ height: "5px" }}></div>

                        {selectedVehicle.status === VehicleStatus.InTransit && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "gray",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Em viagem
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedVehicle.status === VehicleStatus.AtOrigin && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "gray",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Na estação inicial
                                        {stations?.stations &&
                                        selectedVehicle.lastStation
                                            ? ` (${
                                                  stations.stations.find(
                                                      (s) =>
                                                          s.code ===
                                                          selectedVehicle.lastStation
                                                  )?.designation || ""
                                              })`
                                            : ""}
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedVehicle.status === VehicleStatus.AtStation && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "gray",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Na estação
                                        {stations?.stations &&
                                        selectedVehicle.lastStation
                                            ? ` (${
                                                  stations.stations.find(
                                                      (s) =>
                                                          s.code ===
                                                          selectedVehicle.lastStation
                                                  )?.designation || ""
                                              })`
                                            : ""}
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedVehicle.status === VehicleStatus.NearNext && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "gray",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                            textAlign: "center",
                                        }}
                                    >
                                        A aproximar-se da próxima estação
                                        {stations?.stations &&
                                        selectedVehicle.lastStation
                                            ? ` (${
                                                  stations.stations.find(
                                                      (s) =>
                                                          s.code ===
                                                          selectedVehicle.lastStation
                                                  )?.designation || ""
                                              })`
                                            : ""}
                                    </p>
                                </div>
                            </>
                        )}

                        {selectedVehicle.status === VehicleStatus.Cancelled && (
                            <>
                                <div style={{ height: "5px" }}></div>

                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "center",
                                    }}
                                >
                                    <p
                                        style={{
                                            color: "#d7263d",
                                            fontSize: "0.8rem",
                                            fontWeight: "700",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        Suprimido
                                    </p>
                                </div>
                            </>
                        )}

                        <div style={{ height: "20px" }}></div>

                        <div>
                            {selectedVehicle.timestamp &&
                                selectedVehicle.timestamp && (
                                    <p
                                        style={{
                                            color: "gray",
                                            position: "absolute",
                                            bottom: "2px",
                                            left: "10px",
                                        }}
                                    >
                                        Atualizado às:{" "}
                                        {new Date(
                                            selectedVehicle.timestamp
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
                        </div>
                    </Popup>
                )}
            </WGLMap>
        </>
    );
}
