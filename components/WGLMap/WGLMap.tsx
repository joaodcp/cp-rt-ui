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
                mapStyle={process.env.NEXT_PUBLIC_MAP_STYLE_URL!}
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
