"use client";

import dynamic from "next/dynamic";

const MapEditor = dynamic(() => import("@/components/MapEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[80vh]">
      <p className="text-gray-500">Kaarteditor laden...</p>
    </div>
  ),
});

export function MapEditorLoader() {
  return <MapEditor />;
}
