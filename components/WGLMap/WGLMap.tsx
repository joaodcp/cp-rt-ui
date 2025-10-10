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
                mapStyle="https://api.maptiler.com/maps/0199ce7f-9c4c-765a-b169-b904900e46d2/style.json?key=l6e23JveW0N5x5jC3TqN"
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
