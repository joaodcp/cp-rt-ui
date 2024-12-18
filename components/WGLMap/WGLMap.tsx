"use client";

import Map, { NavigationControl, ViewState } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { ReactNode, useState } from "react";
import { useTheme } from "next-themes";
import styles from "./WGLMap.module.css";
import { MapLayerMouseEvent, MapLibreEvent } from "maplibre-gl";
import { AttributionControl } from "react-map-gl/maplibre";

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
                onMove={(evt) => console.log(evt.viewState)}
                mapStyle={
                    resolvedTheme == "light"
                        ? "https://api.maptiler.com/maps/aa0ea5c8-575e-43df-84dd-f8382eb72402/style.json?key=NvTfdJJxC0xa6dknGF48"
                        : "https://api.maptiler.com/maps/e9d3c77d-4552-4ed6-83dd-1075b67bd977/style.json?key=NvTfdJJxC0xa6dknGF48"
                }
                attributionControl={false}
                onLoad={onLoad}
            >
                {/* <NavigationControl /> */}
                {children}
                <AttributionControl compact={true} position="bottom-left" />
            </Map>
        </div>
    );
}
