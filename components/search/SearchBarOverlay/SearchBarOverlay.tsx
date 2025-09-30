import React, { useState, useEffect, useRef } from "react";
import {
    MagnifyingGlass,
    X,
    Train,
    CaretRight,
    ArrowRight,
    User,
    Users,
    UsersThree,
} from "@phosphor-icons/react";
import { formatDuration } from "@/utils/time";
import { EnrichedVehicle } from "@/types/cp-v2";
import { getFormattedFleetNumber } from "@/utils/fleet";

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
    vehicles?: EnrichedVehicle[]; // Replace with your Vehicle type
    onVehicleSelect?: (vehicle: EnrichedVehicle) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({
    isOpen,
    onClose,
    vehicles = [],
    onVehicleSelect,
}) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredResults, setFilteredResults] = useState<any[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

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

        const filtered = vehicles.filter((vehicle) => {
            const query = searchQuery.toLowerCase();
            if (vehicle.status === "CANCELLED") return false;
            return (
                vehicle.trainNumber?.toString().toLowerCase().includes(query) ||
                vehicle.service?.designation?.toLowerCase().includes(query) ||
                vehicle.origin?.designation?.toLowerCase().includes(query) ||
                vehicle.destination?.designation
                    ?.toLowerCase()
                    .includes(query) ||
                vehicle.units.includes(query)
                // || vehicle.trainStops?.some((stop: any) =>
                //     stop.station.designation.toLowerCase().includes(query)
                // )
            );
        });

        setFilteredResults(filtered.slice(0, 8)); // Limit to 8 results
    }, [searchQuery, vehicles]);

    const handleClose = () => {
        setSearchQuery("");
        setFilteredResults([]);
        onClose();
    };

    const handleVehicleClick = (vehicle: any) => {
        if (onVehicleSelect) {
            onVehicleSelect(vehicle);
        }
        handleClose();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            handleClose();
        }

        if (e.key === "Enter" && filteredResults.length > 0) {
            handleVehicleClick(filteredResults[0]);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

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
                                    placeholder="Procurar comboio, linha ou estação..."
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
                                    (vehicle: EnrichedVehicle, index) => (
                                        <div
                                            key={vehicle.trainNumber}
                                            onClick={() =>
                                                handleVehicleClick(vehicle)
                                            }
                                            className={`bg-[#1e1e1e] backdrop-blur-sm rounded-2xl p-4 cursor-pointer 
                              hover:bg-[#2e2e2e] dark:hover:bg-gray-800 hover:shadow-lg 
                               transition-all duration-200 hover:scale-[1.02]
                              animate-in slide-in-from-top-2 fade-in`}
                                            style={{
                                                animationDelay: `${
                                                    index * 50
                                                }ms`,
                                                animationDuration: "300ms",
                                                animationFillMode: "both",
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
                                                                {vehicle.units
                                                                    .map((u) =>
                                                                        getFormattedFleetNumber(
                                                                            u
                                                                        )
                                                                    )
                                                                    .join(
                                                                        " + "
                                                                    )}
                                                            </p>
                                                            {vehicle.service
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
                                                            vehicle.origin
                                                                .designation &&
                                                            vehicle.destination &&
                                                            vehicle.destination
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
                                                                    A horas
                                                                </span>
                                                            )}
                                                            {vehicle.delay >
                                                                0 && (
                                                                <span className="text-xs font-medium text-red-400">
                                                                    Atrasado{" "}
                                                                    {formatDuration(
                                                                        vehicle.delay,
                                                                        true
                                                                    )}
                                                                </span>
                                                            )}
                                                            {vehicle.delay <
                                                                0 && (
                                                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                    Adiantado{" "}
                                                                    {formatDuration(
                                                                        Math.abs(
                                                                            vehicle.delay
                                                                        ),
                                                                        true
                                                                    )}
                                                                </span>
                                                            )}
                                                            {vehicle.occupancy &&
                                                                vehicle.occupancy <=
                                                                    50 && (
                                                                    <User
                                                                        size={
                                                                            15
                                                                        }
                                                                        weight="bold"
                                                                        className="text-green-500"
                                                                    />
                                                                )}
                                                            {vehicle.occupancy &&
                                                                vehicle.occupancy >
                                                                    50 &&
                                                                vehicle.occupancy <=
                                                                    80 && (
                                                                    <Users
                                                                        size={
                                                                            15
                                                                        }
                                                                        weight="bold"
                                                                        className="text-yellow-500"
                                                                    />
                                                                )}
                                                            {vehicle.occupancy &&
                                                                vehicle.occupancy >
                                                                    80 && (
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
                                    )
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
                                Procurar Comboios
                            </h3>

                            {/* Description */}
                            <p className="text-gray-500 text-base max-w-sm mx-auto leading-relaxed">
                                Comece a escrever o número do comboio, nome do
                                serviço ou estação para encontrar informações em
                                tempo real
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

export default SearchOverlay;
