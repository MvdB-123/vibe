import type { Metadata } from "next";
import { MapEditorLoader } from "@/components/MapEditorLoader";

export const metadata: Metadata = {
  title: "Kaarteditor Reisadviezen",
  description: "Maak en bewerk reisadvieskaarten",
};

export default function MapEditorPage() {
  return <MapEditorLoader />;
}
