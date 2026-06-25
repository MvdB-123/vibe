import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kaarteditor Reisadviezen",
  description: "Maak en bewerk reisadvieskaarten",
};

export default function MapEditorPage() {
  return <MapEditorLoader />;
}

import dynamic from "next/dynamic";

const MapEditorLoader = dynamic(() => import("@/components/MapEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[80vh]">
      <p className="text-gray-500">Kaarteditor laden...</p>
    </div>
  ),
});
