"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    MagnifyingGlass,
    X,
    Train,
    CaretRight,
    ArrowRight,
    User,
    Users,
    UsersThree,
    MapPin,
} from "@phosphor-icons/react";
import { formatDuration } from "@/utils/time";
import { EnrichedVehicle, Station } from "@/types/cp-v2";
import { getFormattedFleetNumber } from "@/utils/fleet";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";

// Add keyframe animations
const styles = `
  @keyframes slide-in-from-top {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  .animate-in {
    animation-fill-mode: both;
  }
  
  .slide-in-from-top-2 {
    animation-name: slide-in-from-top;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
`;

// Inject styles
if (typeof document !== "undefined") {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    vehicles?: EnrichedVehicle[];
    stations: Station[];
    onVehicleSelect?: (vehicle: EnrichedVehicle) => void;
    onStationSelect?: (station: Station) => void;
}

type SearchResult =
    | { type: "vehicle"; data: EnrichedVehicle }
    | { type: "station"; data: Station };

// Normalize string for better matching (removes accents)
const normalizeString = (str: string) => {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

const SearchOverlay: React.FC<SearchOverlayProps> = ({
    isOpen,
    onClose,
    vehicles = [],
    stations = [],
    onVehicleSelect,
    onStationSelect,
}) => {
    const { t, ready } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredResults, setFilteredResults] = useState<SearchResult[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Memoize normalized vehicles data
    const normalizedVehicles = useMemo(
        () =>
            vehicles.map((v) => ({
                vehicle: v,
                designationNormalized: normalizeString(
                    v.service?.designation || "",
                ),
                originNormalized: normalizeString(v.origin?.designation || ""),
                destinationNormalized: normalizeString(
                    v.destination?.designation || "",
                ),
            })),
        [vehicles],
    );

    // Memoize normalized stations data
    const normalizedStations = useMemo(
        () =>
            stations.map((s) => ({
                station: s,
                designationNormalized: normalizeString(s.designation || ""),
            })),
        [stations],
    );

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            // Small delay to ensure the animation starts
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const normalizedQuery = normalizeString(query);

        // Filter vehicles using memoized normalized data
        const filteredVehicles = normalizedVehicles
            .filter((item) => {
                if (item.vehicle.status === "CANCELLED") return false;
                return (
                    item.vehicle.trainNumber
                        ?.toString()
                        .toLowerCase()
                        .includes(query) ||
                    item.designationNormalized.includes(normalizedQuery) ||
                    item.originNormalized.includes(normalizedQuery) ||
                    item.destinationNormalized.includes(normalizedQuery) ||
                    item.vehicle.units?.includes(query)
                );
            })
            .map((item) => item.vehicle);

        // Filter stations using memoized normalized data
        const filteredStations = normalizedStations
            .filter((item) => {
                return (
                    item.station.code?.toLowerCase().includes(query) ||
                    item.designationNormalized.includes(normalizedQuery)
                );
            })
            .map((item) => item.station);

        // Combine results with smart prioritization
        const vehicleResults = filteredVehicles.map((v) => ({
            type: "vehicle" as const,
            data: v,
        }));
        const stationResults = filteredStations.map((s) => ({
            type: "station" as const,
            data: s,
        }));

        // Prioritize stations if there are 1-2 results (user is likely searching for a specific station)
        let combined: SearchResult[];
        if (stationResults.length >= 1 && stationResults.length <= 2) {
            combined = [...stationResults, ...vehicleResults].slice(0, 8);
        } else {
            combined = [...vehicleResults, ...stationResults].slice(0, 8);
        }
        setFilteredResults(combined);
    }, [searchQuery, normalizedVehicles, normalizedStations]);

    const handleClose = () => {
        setSearchQuery("");
        setFilteredResults([]);
        onClose();
    };

    const handleResultClick = (result: SearchResult) => {
        if (result.type === "vehicle" && onVehicleSelect) {
            onVehicleSelect(result.data);
        } else if (result.type === "station" && onStationSelect) {
            onStationSelect(result.data);
        }
        handleClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            handleClose();
        }

        if (e.key === "Enter" && filteredResults.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            handleResultClick(filteredResults[0]);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    if (!ready) return null;

    return (
        <div
            className={`fixed inset-0 z-50 transition-all duration-[400ms] ease-out ${
                isOpen ? "visible" : "invisible"
            }`}
            onClick={handleBackdropClick}
        >
            {/* Blur backdrop */}
            <div
                className={`absolute inset-0 transition-all duration-[400ms] ease-out ${
                    isOpen
                        ? "backdrop-blur-md bg-black/20"
                        : "backdrop-blur-none bg-transparent"
                }`}
                style={{
                    backdropFilter: isOpen ? "blur(8px)" : "blur(0px)",
                }}
            />

            {/* Content container */}
            <div
                className={`relative z-10 h-full transition-all duration-[400ms] ease-out ${
                    isOpen
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-8 opacity-0"
                }`}
            >
                {/* Search input */}
                <div className="p-4 pt-6">
                    <div className="max-w-2xl mx-auto">
                        <div className="relative bg-[#1c1c1c] rounded-xl shadow-2xl border-2 border-[#16341b]">
                            <div className="flex items-center p-3">
                                <MagnifyingGlass
                                    size={24}
                                    className="text-gray-400 mr-3 flex-shrink-0"
                                />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    placeholder={t("search.field_placeholder")}
                                    className="flex-1 text-lg bg-transparent border-none outline-none text-gray-100 placeholder-gray-500"
                                />
                                <button
                                    onClick={handleClose}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors ml-2 flex-shrink-0"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search results - separate from search bar */}
                {filteredResults.length > 0 && (
                    <div className="px-4 pb-4 overflow-scroll h-[calc(100vh-120px)]">
                        <div className="max-w-2xl mx-auto">
                            <div className="space-y-3 mt-4">
                                {filteredResults.map(
                                    (result: SearchResult, index) => {
                                        if (result.type === "vehicle") {
                                            const vehicle = result.data;
                                            return (
                                                <div
                                                    key={`vehicle-${vehicle.trainNumber}`}
                                                    onClick={() =>
                                                        handleResultClick(
                                                            result,
                                                        )
                                                    }
                                                    className={`bg-[#1e1e1e] backdrop-blur-sm rounded-2xl p-4 cursor-pointer 
                                  hover:bg-[#2e2e2e] dark:hover:bg-gray-800 hover:shadow-lg 
                                   transition-all duration-200 hover:scale-[1.02]
                                  animate-in slide-in-from-top-2 fade-in`}
                                                    style={{
                                                        animationDelay: `${
                                                            index * 50
                                                        }ms`,
                                                        animationDuration:
                                                            "300ms",
                                                        animationFillMode:
                                                            "both",
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            {/* Train icon */}
                                                            <div
                                                                className={`p-2 rounded-full ${
                                                                    vehicle.status ===
                                                                    "CANCELLED"
                                                                        ? "bg-red-900/30"
                                                                        : vehicle.status ===
                                                                            "COMPLETED"
                                                                          ? "bg-gray-700"
                                                                          : "bg-green-900/30"
                                                                }`}
                                                            >
                                                                <Train
                                                                    size={20}
                                                                    className={`${
                                                                        vehicle.status ===
                                                                        "CANCELLED"
                                                                            ? "text-red-400"
                                                                            : vehicle.status ===
                                                                                "COMPLETED"
                                                                              ? "text-gray-400"
                                                                              : "text-green-400"
                                                                    }`}
                                                                />
                                                            </div>

                                                            {/* Train info */}
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <h3 className="font-bold text-gray-100 text-lg">
                                                                        {
                                                                            vehicle.trainNumber
                                                                        }
                                                                    </h3>
                                                                    <p className="ml-auto text-xs text-gray-400">
                                                                        {vehicle.units &&
                                                                            vehicle.units
                                                                                .map(
                                                                                    (
                                                                                        u,
                                                                                    ) =>
                                                                                        getFormattedFleetNumber(
                                                                                            u,
                                                                                        ),
                                                                                )
                                                                                .join(
                                                                                    " + ",
                                                                                )}
                                                                    </p>
                                                                    {vehicle
                                                                        .service
                                                                        ?.designation && (
                                                                        <span className="px-2 py-1 text-xs font-medium text-green-300 bg-green-900/30 rounded-full">
                                                                            {
                                                                                vehicle
                                                                                    .service
                                                                                    .designation
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {vehicle.origin &&
                                                                    vehicle
                                                                        .origin
                                                                        .designation &&
                                                                    vehicle.destination &&
                                                                    vehicle
                                                                        .destination
                                                                        .designation && (
                                                                        <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                                                                            {
                                                                                vehicle
                                                                                    .origin
                                                                                    .designation
                                                                            }
                                                                            <ArrowRight
                                                                                size={
                                                                                    15
                                                                                }
                                                                                weight="bold"
                                                                            />
                                                                            {
                                                                                vehicle
                                                                                    .destination
                                                                                    .designation
                                                                            }
                                                                        </p>
                                                                    )}

                                                                {/* Delay info */}
                                                                <div className="mt-1 flex items-center gap-2">
                                                                    {vehicle.delay ===
                                                                        0 && (
                                                                        <span className="text-xs font-medium text-green-400">
                                                                            {t(
                                                                                "vehicle_popup.schedule_adherence.on_time",
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {vehicle.delay >
                                                                        0 && (
                                                                        <span className="text-xs font-medium text-red-400">
                                                                            {t(
                                                                                "vehicle_popup.schedule_adherence.late",
                                                                                {
                                                                                    formattedDuration:
                                                                                        formatDuration(
                                                                                            vehicle.delay,
                                                                                            true,
                                                                                        ),
                                                                                },
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {vehicle.delay <
                                                                        0 && (
                                                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                            {t(
                                                                                "vehicle_popup.schedule_adherence.early",
                                                                                {
                                                                                    formattedDuration:
                                                                                        formatDuration(
                                                                                            Math.abs(
                                                                                                vehicle.delay,
                                                                                            ),
                                                                                            true,
                                                                                        ),
                                                                                },
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {!!vehicle.occupancy &&
                                                                        vehicle.occupancy <=
                                                                            65 && (
                                                                            <User
                                                                                size={
                                                                                    15
                                                                                }
                                                                                weight="bold"
                                                                                className="text-green-500"
                                                                            />
                                                                        )}
                                                                    {!!vehicle.occupancy &&
                                                                        vehicle.occupancy >
                                                                            65 &&
                                                                        vehicle.occupancy <=
                                                                            85 && (
                                                                            <Users
                                                                                size={
                                                                                    15
                                                                                }
                                                                                weight="bold"
                                                                                className="text-yellow-500"
                                                                            />
                                                                        )}
                                                                    {!!vehicle.occupancy &&
                                                                        vehicle.occupancy >
                                                                            85 && (
                                                                            <UsersThree
                                                                                size={
                                                                                    15
                                                                                }
                                                                                weight="bold"
                                                                                className="text-red-500"
                                                                            />
                                                                        )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right chevron */}
                                                        <CaretRight
                                                            size={20}
                                                            className="text-gray-500 flex-shrink-0"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            const station = result.data;
                                            return (
                                                <div
                                                    key={`station-${station.code}`}
                                                    onClick={() =>
                                                        handleResultClick(
                                                            result,
                                                        )
                                                    }
                                                    className={`bg-[#1e1e1e] backdrop-blur-sm rounded-2xl p-4 cursor-pointer 
                                  hover:bg-[#2e2e2e] dark:hover:bg-gray-800 hover:shadow-lg 
                                   transition-all duration-200 hover:scale-[1.02]
                                  animate-in slide-in-from-top-2 fade-in`}
                                                    style={{
                                                        animationDelay: `${
                                                            index * 50
                                                        }ms`,
                                                        animationDuration:
                                                            "300ms",
                                                        animationFillMode:
                                                            "both",
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-3">
                                                            {/* Station icon */}
                                                            <div className="p-2 rounded-full bg-blue-900/40">
                                                                <MapPin
                                                                    size={20}
                                                                    className="text-blue-400"
                                                                />
                                                            </div>

                                                            {/* Station info */}
                                                            <div className="flex-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <h3 className="font-bold text-gray-100 text-lg">
                                                                        {
                                                                            station.designation
                                                                        }
                                                                    </h3>
                                                                    {/* <span className="px-2 py-1 text-xs font-medium text-orange-300 bg-orange-900/30 rounded-full">
                                                                        {t(
                                                                            "station.label",
                                                                        ) ||
                                                                            "Station"}
                                                                    </span> */}
                                                                </div>

                                                                <p className="text-sm text-gray-400 mt-1">
                                                                    {
                                                                        station.code
                                                                    }
                                                                </p>

                                                                {station.region && (
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {
                                                                            station.region
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Right chevron */}
                                                        <CaretRight
                                                            size={20}
                                                            className="text-gray-500 flex-shrink-0"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        }
                                    },
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state - no search query */}
                {!searchQuery && (
                    <div className="px-4 pt-16">
                        <div className="max-w-2xl mx-auto text-center">
                            {/* Train icon */}
                            <div className="flex justify-center mb-6">
                                <Train size={48} className="text-gray-400" />
                            </div>

                            {/* Title */}
                            <h3 className="text-xl font-medium text-gray-300 mb-3">
                                {t("search.title")}
                            </h3>

                            {/* Description */}
                            <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
                                {t("search.prompt")}
                            </p>
                        </div>
                    </div>
                )}

                {/* No results */}
                {searchQuery && filteredResults.length === 0 && (
                    <div className="px-4">
                        <div className="max-w-2xl mx-auto">
                            <div
                                className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 text-center 
                            border border-gray-200/50 dark:border-gray-700/50 mt-4"
                            >
                                <p className="text-gray-500 dark:text-gray-400">
                                    Nenhum resultado encontrado para "
                                    {searchQuery}"
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default dynamic(() => Promise.resolve(SearchOverlay), {
    ssr: false,
});
