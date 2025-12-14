"use client";

import { MapProvider } from "react-map-gl/maplibre";
import { ReactNode } from "react";
// import { ThemeProvider } from "@/components/ThemeProvider"

export default async function Providers({ children }: { children: ReactNode }) {
    return <MapProvider>{children}</MapProvider>;
}
