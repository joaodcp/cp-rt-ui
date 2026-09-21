"use client";

import { useEffect, useRef, useState } from "react";
import { Map } from "maplibre-gl";

const MAX_WIDTH = 200;

function getPrettyDistance(maxMeters: number): number {
    const power = Math.pow(10, Math.floor(Math.log10(maxMeters)));
    const normalized = maxMeters / power;
    const multiplier = normalized >= 5 ? 5 : normalized >= 3 ? 3 : normalized >= 2 ? 2 : 1;
    return multiplier * power;
}

function getNumSegments(totalDistance: number): number {
    const power = Math.pow(10, Math.floor(Math.log10(totalDistance)));
    const normalized = totalDistance / power;
    if (normalized < 2.5) return 4;
    if (normalized < 4) return 3;
    return 2;
}

function getScaleData(map: Map, previousDistance: number | null) {
    const y = map.getContainer().clientHeight / 2;
    const maxMeters = map.unproject([0, y]).distanceTo(map.unproject([MAX_WIDTH, y]));
    let totalDistance = previousDistance ?? getPrettyDistance(maxMeters);
    let barPxWidth = totalDistance / maxMeters * MAX_WIDTH;

    // Keep the current interval around rounding boundaries to prevent label flicker.
    if (barPxWidth < 90 || barPxWidth > 220) {
        totalDistance = getPrettyDistance(maxMeters);
        barPxWidth = totalDistance / maxMeters * MAX_WIDTH;
    }

    const numSegments = getNumSegments(totalDistance);
    return { numSegments, step: totalDistance / numSegments, totalDistance, barPxWidth };
}

function formatNumber(val: number): string {
    return Number(val.toPrecision(3)).toString();
}

function getUnit(totalDistance: number) {
    if (totalDistance < 0.01) return { multiplier: 1000, suffix: "mm" };
    if (totalDistance < 1) return { multiplier: 100, suffix: "cm" };
    if (totalDistance >= 1000) return { multiplier: 0.001, suffix: "km" };
    return { multiplier: 1, suffix: "m" };
}

export default function ScaleBar({ map }: { map: Map }) {
    const [numSegments, setNumSegments] = useState(4);
    const [step, setStep] = useState(50);
    const [barWidth, setBarWidth] = useState(200);
    const totalDistanceRef = useRef<number | null>(null);

    useEffect(() => {
        totalDistanceRef.current = null;
        let frame: number | null = null;
        const update = () => {
            if (frame !== null) return;
            frame = requestAnimationFrame(() => {
                const data = getScaleData(map, totalDistanceRef.current);
                totalDistanceRef.current = data.totalDistance;
                setNumSegments(data.numSegments);
                setStep(data.step);
                setBarWidth(data.barPxWidth);
                frame = null;
            });
        };
        map.on("move", update);
        update();
        return () => {
            map.off("move", update);
            if (frame !== null) cancelAnimationFrame(frame);
        };
    }, [map]);

    const totalDistance = step * numSegments;
    const unit = getUnit(totalDistance);
    const labels: string[] = [];
    for (let i = 0; i <= numSegments; i++) {
        const val = step * i * unit.multiplier;
        if (i === numSegments) {
            labels.push(`${formatNumber(val)}${unit.suffix}`);
        } else if (i === 0) {
            labels.push("0");
        } else {
            labels.push(formatNumber(val));
        }
    }

    return (
        <div className="scale-bar" style={{ width: `${barWidth}px` }}>
            <div className="scale-bar__labels">
                {labels.map((label, i) => (
                    <span key={i} style={{ left: `${(i / numSegments) * 100}%` }}>
                        {label}
                    </span>
                ))}
            </div>
            <div className="scale-bar__track">
                {Array.from({ length: numSegments }).map((_, i) => (
                    <div key={i} className={i % 2 === 0 ? "scale-bar__seg--dark" : "scale-bar__seg--light"} />
                ))}
            </div>
        </div>
    );
}
