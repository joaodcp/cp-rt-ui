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
    Eye,
    Gauge,
    Info,
    MapPinSimple,
    Moon,
    Path,
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
import CPLogo from "@/components/CPLogo";
import ArrivingBusAnimation from "@/components/ArrivingBusAnimation/ArrivingBusAnimation";
import BusIcon from "@/components/BusIcon";
import { Service, TrainStop, Vehicle, VehicleStatus } from "@/types/cp";

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
    properties?: Vehicle & { type: string };
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

    const [vehicles, _setVehicles] = useState<Vehicle[] | null>(null);

    const [showPopup, setShowPopup] = useState<boolean>(true);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(
        null
    );

    const [cursor, setCursor] = useState<string>("auto");

    const [isLoading, _setIsLoading] = useState<boolean>(true);

    const [isSSEErrored, _setIsSSEErrored] = useState<boolean>(false);

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
    const setVehicles = (data: Vehicle[] | null) => {
        vehiclesRef.current = data;
        _setVehicles(data);
    };

    const { data: newVehicles } = useSWR<{
        vehicles: Vehicle[];
        updated_on: number;
    }>("/api/vehicles", unauthenticatedFetcher, {
        refreshInterval: 5_000,
    });

    useEffect(() => {
        console.log(isLoading);
        if (newVehicles?.vehicles) {
            isLoading && setIsLoading(false);

            setVehicles(
                newVehicles.vehicles.filter((v) => {
                    const completedAtHour = parseInt(
                        v.trainStops[v.trainStops.length - 1].eta.split(":")[1]
                    );
                    const currentHour = new Date().getHours();

                    // lazy calculation but meh
                    const completedHoursAgo = Math.abs(
                        completedAtHour - currentHour
                    );

                    return (
                        v.status !== VehicleStatus.Cancelled &&
                        v.status !== VehicleStatus.Completed &&
                        completedHoursAgo > 2
                    );
                })
            );
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

    const vehiclesGeoJSON: GeoJSON = {
        type: "FeatureCollection",
        features: [],
    };

    vehicles?.forEach((vehicle) => {
        vehiclesGeoJSON.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [vehicle.longitude, vehicle.latitude],
            },
            properties: { ...vehicle, type: "vehicle" },
        });
    });

    function onVehicleSelected(vehicle: Vehicle) {
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

            if (event?.features?.[0].properties.type === "vehicle") {
                const vehicle = event?.features?.[0].properties as Vehicle;
                // idk why but nested objects are stringified in the event properties??
                try {
                    vehicle.serviceCode = JSON.parse(
                        vehicle.serviceCode as unknown as string
                    ) as Service;
                    vehicle.trainStops = JSON.parse(
                        vehicle.trainStops as unknown as string
                    ) as TrainStop[];
                    // if (vehicle.stop)
                    //     vehicle.stop = JSON.parse(
                    //         vehicle.stop as unknown as string
                    //     ) as TrainStop;
                    onVehicleSelected(vehicle);
                } catch (e) {}
            }
        }
    };

    const handlePopupClose = () => {
        setShowPopup(false);

        // TODO: test this
        setSelectedVehicle(null);
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
                ["==", ["get", "status"], "COMPLETED"],
                "#808080", // gray color for completed status
                "#388344", // green color for other statuses
            ],
            "circle-radius": 5,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
        },
    };

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
            <CPLogo
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
            />
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
                <Source id="vehicles" type="geojson" data={vehiclesGeoJSON}>
                    <Layer {...vehiclesLayerStyle}></Layer>
                </Source>

                {showPopup && selectedVehicle && (
                    <Popup
                        longitude={selectedVehicle.longitude}
                        latitude={selectedVehicle.latitude}
                        // anchor={getPopupAnchorForHeading(
                        //     selectedVehicle.heading ?? 0
                        // )}
                        anchor="bottom"
                        offset={20}
                        onClose={handlePopupClose}
                    >
                        <h1
                            style={{
                                position: "absolute",
                                top: "12.5px",
                                left: "12.5px",
                                fontWeight: "900",
                                fontSize: "1.1rem",
                            }}
                        >
                            Comboio {selectedVehicle?.trainNumber}
                        </h1>

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
                                Atrasado {selectedVehicle.delay} minuto
                                {selectedVehicle.delay == 1 ? "" : "s"}
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
                                Adiantado {Math.abs(selectedVehicle.delay)}{" "}
                                minuto{selectedVehicle.delay == 1 ? "" : "s"}
                            </p>
                        )}

                        {!!selectedVehicle.occupancy &&
                            [1, 2, 3].includes(selectedVehicle.occupancy) &&
                            (selectedVehicle.occupancy == 1 ? (
                                <p className="text-green-500 font-bold">
                                    Muitos lugares disponíveis
                                </p>
                            ) : selectedVehicle.occupancy == 2 ? (
                                <p className="text-yellow-500 font-bold">
                                    Poucos lugares sentados
                                </p>
                            ) : (
                                <p className="text-red-500 font-bold">
                                    Comboio cheio
                                </p>
                            ))}

                        {/* {!!selectedVehicle.chapa && (
                            <>
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
                                    CHAPA {selectedVehicle?.chapa}
                                </p>
                                <div style={{ height: "10px" }}></div>
                            </>
                        )} */}

                        {!!selectedVehicle.serviceCode.designation && (
                            <>
                                <div style={{ height: "10px" }}></div>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-evenly",
                                    }}
                                >
                                    <Pill color={BadgeColor.green}>
                                        <p>
                                            {
                                                selectedVehicle.serviceCode
                                                    .designation
                                            }
                                        </p>
                                        <div style={{ width: "7px" }}></div>
                                        {/* {"Direction" in selectedVehicle &&
                                            (selectedVehicle.Direction === 0 ? (
                                                <ArrowUp
                                                    size={15}
                                                    weight="bold"
                                                />
                                            ) : (
                                                <ArrowDown
                                                    size={15}
                                                    weight="bold"
                                                />
                                            ))} */}
                                    </Pill>
                                    {/* {"tickets" in selectedVehicle && (
                                        <Pill>
                                            <Ticket size={20} />
                                            <div style={{ width: "7px" }}></div>
                                            <p>{selectedVehicle.tickets}</p>
                                        </Pill>
                                    )} */}
                                </div>
                                <div style={{ height: "10px" }}></div>
                            </>
                        )}

                        {/* {selectedVehicle.trainStops.length > 0 && (
                            <>
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "10px",
                                    }}
                                >
                                    <p
                                        style={{
                                            fontWeight: "700",
                                            fontSize: "0.8rem",
                                            color: "gray",
                                        }}
                                    >
                                        PRÓXIMAS PARAGENS
                                    </p>
                                    <div style={{ height: "5px" }}></div>
                                    {selectedVehicle.trainStops
                                        .filter((s) => s.eta || s.arrival)
                                        .map((stop) => {
                                            return (
                                                <div
                                                    key={stop.station.code}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
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
                                                        <p
                                                            style={{
                                                                fontWeight:
                                                                    "bold",
                                                                fontSize:
                                                                    "1rem",
                                                            }}
                                                        >
                                                            {
                                                                stop.station
                                                                    .designation
                                                            }
                                                        </p>
                                                    </div>
                                                    <div
                                                        style={{ width: "7px" }}
                                                    ></div>
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
                                                                color: "gray",
                                                            }}
                                                        >
                                                            {stop.eta}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                                <div style={{ height: "10px" }}></div>
                            </>
                        )} */}

                        {selectedVehicle.trainStops.length > 0 && (
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
                                    {
                                        selectedVehicle.trainStops[0].station
                                            .designation
                                    }
                                </h1>

                                <ArrowRight size={15} weight="bold" />
                                <h1
                                    style={{
                                        fontWeight: "400",
                                        fontSize: "1rem",
                                    }}
                                >
                                    {
                                        selectedVehicle.trainStops[
                                            selectedVehicle.trainStops.length -
                                                1
                                        ].station.designation
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
                                        {selectedVehicle.stationCode
                                            ? ` (${
                                                  selectedVehicle.trainStops.find(
                                                      (s) =>
                                                          s.station.code ===
                                                          selectedVehicle.stationCode
                                                  )?.station.designation
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
                                        A aproximar-se da próxima paragem
                                        <br />
                                        {selectedVehicle.stationCode
                                            ? ` (${
                                                  selectedVehicle.trainStops.find(
                                                      (s) =>
                                                          s.station.code ===
                                                          selectedVehicle.stationCode
                                                  )?.station.designation
                                              })`
                                            : ""}
                                    </p>
                                </div>
                            </>
                        )}

                        {/* {"speed" in selectedVehicle && (
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
                        )} */}

                        <div style={{ height: "20px" }}></div>

                        {/* <p>Trip ID: {selectedVehicle?.tripId}</p>
                        <p>AU: {selectedVehicle?.AU}</p>
                        <p>Chapa: {selectedVehicle?.chapa}</p>
                        <p>Tickets: {selectedVehicle?.tickets}</p> */}
                        {/* <p>Distance: {selectedVehicle?.distance}</p>
                        <p>Speed: {selectedVehicle?.speed}</p> */}
                        {/* <p>Time: {selectedVehicle?.time}</p> */}
                        {"updatedAt" in selectedVehicle &&
                            selectedVehicle.updatedAt && (
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
                                        selectedVehicle.updatedAt
                                    ).toLocaleTimeString()}
                                </p>
                            )}
                    </Popup>
                )}
            </WGLMap>
        </>
    );
}
