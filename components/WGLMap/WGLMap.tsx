"use client";

import Map, { NavigationControl, ViewState } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { ReactNode, useState } from "react";
import { useTheme } from "next-themes";
import styles from "./WGLMap.module.css";
import { MapLayerMouseEvent, MapLibreEvent, Map as MaplibreMap } from "maplibre-gl";
import { AttributionControl } from "react-map-gl/maplibre";
import ScaleBar from "./ScaleBar";

export default function WGLMap({
    id,
    initialViewState,
    interactiveLayerIds,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onLoad,
    cursor,
    children,
}: {
    id: string;
    initialViewState: ViewState | object;
    interactiveLayerIds: string[];
    onClick: (event: MapLayerMouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onLoad: (evt: MapLibreEvent) => void;
    cursor: string;
    children: ReactNode;
}) {
    const { resolvedTheme } = useTheme();
    const [map, setMap] = useState<MaplibreMap | null>(null);

    return (
        <div className={styles.map}>
            <Map
                id={id}
                interactiveLayerIds={interactiveLayerIds}
                initialViewState={initialViewState}
                onClick={onClick}
                dragRotate={true}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                cursor={cursor}
                mapStyle="https://tiles.openfreemap.org/styles/dark"
                attributionControl={false}
                onLoad={(evt) => {
                    setMap(evt.target);
                    onLoad(evt);
                }}
            >
                {/* <NavigationControl /> */}
                {children}
                <AttributionControl compact={true} position="bottom-left" />
                {map && <ScaleBar map={map} />}
            </Map>
        </div>
    );
}
