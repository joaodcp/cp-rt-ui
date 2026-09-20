"use client";

import { useEffect, useState } from "react";
import { Map } from "maplibre-gl";

function getDistancePerPx(map: Map): number {
    const h = map.getContainer().clientHeight / 2;
    const left = map.unproject([0, h]);
    const right = map.unproject([1, h]);
    return left.distanceTo(right);
}

function roundToPretty(val: number): number {
    if (val <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(val)));
    const norm = val / pow;
    let pretty: number;
    if (norm <= 1.5) pretty = 1;
    else if (norm <= 2.5) pretty = 2;
    else if (norm <= 3.5) pretty = 3;
    else if (norm <= 5) pretty = 5;
    else if (norm <= 7.5) pretty = 7;
    else pretty = 10;
    return pretty * pow;
}

function getScaleData(map: Map) {
    const distPerPx = getDistancePerPx(map);
    const totalMeters = distPerPx * 200;

    let step = 1;
    const prettySteps = [25, 50, 75, 100, 125, 150, 200, 250, 500, 1000, 2000, 5000, 10000];
    for (const s of prettySteps) {
        step = s;
        if (totalMeters / s >= 2 && totalMeters / s <= 4) {
            break;
        }
    }

    let numSegments = Math.max(2, Math.min(4, Math.round(totalMeters / step)));
    step = roundToPretty(totalMeters / numSegments);
    const totalDistance = step * numSegments;
    const barPxWidth = totalDistance / distPerPx;

    return { numSegments, step, totalDistance, barPxWidth };
}

function formatNumber(val: number): string {
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}`;
    return Math.round(val).toString();
}

export default function ScaleBar({ map }: { map: Map }) {
    const [numSegments, setNumSegments] = useState(4);
    const [step, setStep] = useState(50);
    const [barWidth, setBarWidth] = useState(200);

    useEffect(() => {
        const update = () => {
            const data = getScaleData(map);
            setNumSegments(data.numSegments);
            setStep(data.step);
            setBarWidth(data.barPxWidth);
        };
        map.on("move", update);
        update();
        return () => { map.off("move", update); };
    }, [map]);

    const labels: string[] = [];
    for (let i = 0; i <= numSegments; i++) {
        const val = step * i;
        if (i === numSegments) {
            labels.push(`${formatNumber(val)}${val >= 1000 ? "km" : "m"}`);
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
