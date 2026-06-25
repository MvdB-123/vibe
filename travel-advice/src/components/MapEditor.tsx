"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toPng } from "html-to-image";

type RiskLevel = "green" | "yellow" | "orange" | "red" | "none";

const RISK_COLORS: Record<RiskLevel, string> = {
  green: "#2ca02c",
  yellow: "#f5c542",
  orange: "#e67e22",
  red: "#d32f2f",
  none: "transparent",
};

const RISK_LABELS: Record<Exclude<RiskLevel, "none">, string> = {
  green: "U kunt erheen reizen",
  yellow: "Let op, er zijn risico's",
  orange: "Alleen noodzakelijke reizen",
  red: "Niet reizen",
};

interface RegionStyle {
  level: RiskLevel;
}

interface CityMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  level: RiskLevel;
}

interface BorderZone {
  id: string;
  name: string;
  geojson: GeoJSON.GeoJsonObject | null;
  level: RiskLevel;
  widthKm: number;
}

interface CountryOption {
  name: string;
  iso: string;
  center: [number, number];
  zoom: number;
}

const POPULAR_COUNTRIES: CountryOption[] = [
  { name: "Colombia", iso: "COL", center: [4.5, -74.0], zoom: 6 },
  { name: "Thailand", iso: "THA", center: [13.7, 100.5], zoom: 6 },
  { name: "Egypte", iso: "EGY", center: [26.8, 30.8], zoom: 6 },
  { name: "Turkije", iso: "TUR", center: [39.9, 32.9], zoom: 6 },
  { name: "Marokko", iso: "MAR", center: [32.0, -5.0], zoom: 6 },
  { name: "Indonesië", iso: "IDN", center: [-2.5, 118.0], zoom: 5 },
  { name: "Oekraïne", iso: "UKR", center: [48.4, 31.2], zoom: 6 },
  { name: "Kenia", iso: "KEN", center: [0.0, 38.0], zoom: 6 },
  { name: "Pakistan", iso: "PAK", center: [30.4, 69.3], zoom: 6 },
  { name: "Irak", iso: "IRQ", center: [33.2, 43.7], zoom: 6 },
  { name: "Afghanistan", iso: "AFG", center: [33.9, 67.7], zoom: 6 },
  { name: "Syrië", iso: "SYR", center: [35.0, 38.5], zoom: 7 },
  { name: "Libanon", iso: "LBN", center: [33.9, 35.9], zoom: 8 },
  { name: "Israël", iso: "ISR", center: [31.0, 34.8], zoom: 8 },
  { name: "Mexico", iso: "MEX", center: [23.6, -102.5], zoom: 5 },
  { name: "Zuid-Afrika", iso: "ZAF", center: [-30.6, 22.9], zoom: 6 },
  { name: "India", iso: "IND", center: [20.6, 79.0], zoom: 5 },
  { name: "Brazilië", iso: "BRA", center: [-14.2, -51.9], zoom: 4 },
  { name: "Filipijnen", iso: "PHL", center: [12.9, 121.8], zoom: 6 },
  { name: "Nigeria", iso: "NIG", center: [9.1, 8.7], zoom: 6 },
  { name: "Venezuela", iso: "VEN", center: [6.4, -66.6], zoom: 6 },
  { name: "Somalië", iso: "SOM", center: [5.2, 46.2], zoom: 6 },
  { name: "Mali", iso: "MLI", center: [17.6, -4.0], zoom: 6 },
  { name: "Ethiopië", iso: "ETH", center: [9.1, 40.5], zoom: 6 },
];

function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [map, center, zoom]);
  return null;
}

export default function MapEditor() {
  const [countryGeoJson, setCountryGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [regionsGeoJson, setRegionsGeoJson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [countryLevel, setCountryLevel] = useState<RiskLevel>("green");
  const [regionStyles, setRegionStyles] = useState<Record<string, RegionStyle>>({});
  const [cities, setCities] = useState<CityMarker[]>([]);
  const [borderZones, setBorderZones] = useState<BorderZone[]>([]);
  const [activeTab, setActiveTab] = useState<"country" | "regions" | "cities" | "borders">("country");
  const [activePaint, setActivePaint] = useState<RiskLevel>("green");
  const [borderWidth, setBorderWidth] = useState(20);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState(3);
  const [loading, setLoading] = useState(false);
  const [customCountryIso, setCustomCountryIso] = useState("");
  const [newCityName, setNewCityName] = useState("");
  const [newCityLat, setNewCityLat] = useState("");
  const [newCityLng, setNewCityLng] = useState("");
  const [showLegend, setShowLegend] = useState(true);
  const [showSource, setShowSource] = useState(true);
  const [borderNeighborCountries, setBorderNeighborCountries] = useState<GeoJSON.FeatureCollection | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [geoJsonKey, setGeoJsonKey] = useState(0);

  const fetchCountryData = useCallback(async (iso: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson`
      );
      const data = await res.json();
      const feature = data.features.find(
        (f: GeoJSON.Feature) =>
          f.properties?.ISO_A3 === iso || f.properties?.ADMIN === iso
      );
      if (feature) {
        setCountryGeoJson({
          type: "FeatureCollection",
          features: [feature],
        });
      }
    } catch (e) {
      console.error("Failed to fetch country data:", e);
    }
    setLoading(false);
  }, []);

  const fetchRegions = useCallback(async (iso: string) => {
    setLoading(true);
    try {
      const url = `https://raw.githubusercontent.com/piwodlaiwo/topojson/master/world-countries/${iso}.json`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.type === "Topology") {
          const topoKey = Object.keys(data.objects)[0];
          const geojson = topojsonToGeojson(data, topoKey);
          setRegionsGeoJson(geojson);
        } else {
          setRegionsGeoJson(data);
        }
      } else {
        const altUrl = `https://raw.githubusercontent.com/deldersveld/topojson/master/countries/${mapIsoToContinent(iso)}/${iso}-regions.json`;
        const altRes = await fetch(altUrl);
        if (altRes.ok) {
          const data = await altRes.json();
          if (data.type === "Topology") {
            const topoKey = Object.keys(data.objects)[0];
            const geojson = topojsonToGeojson(data, topoKey);
            setRegionsGeoJson(geojson);
          } else {
            setRegionsGeoJson(data);
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch regions:", e);
    }
    setLoading(false);
  }, []);

  const selectCountry = useCallback(
    async (country: CountryOption) => {
      setSelectedCountry(country);
      setMapCenter(country.center);
      setMapZoom(country.zoom);
      setRegionStyles({});
      setCities([]);
      setBorderZones([]);
      setCountryLevel("green");
      setGeoJsonKey((k) => k + 1);
      await fetchCountryData(country.iso);
      await fetchRegions(country.iso.toLowerCase());
    },
    [fetchCountryData, fetchRegions]
  );

  const handleRegionClick = useCallback(
    (regionName: string) => {
      setRegionStyles((prev) => ({
        ...prev,
        [regionName]: { level: activePaint },
      }));
      setGeoJsonKey((k) => k + 1);
    },
    [activePaint]
  );

  const addCity = useCallback(() => {
    if (!newCityName || !newCityLat || !newCityLng) return;
    const city: CityMarker = {
      id: Date.now().toString(),
      name: newCityName,
      lat: parseFloat(newCityLat),
      lng: parseFloat(newCityLng),
      level: activePaint,
    };
    setCities((prev) => [...prev, city]);
    setNewCityName("");
    setNewCityLat("");
    setNewCityLng("");
  }, [newCityName, newCityLat, newCityLng, activePaint]);

  const removeCity = useCallback((id: string) => {
    setCities((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCityLevel = useCallback((id: string, level: RiskLevel) => {
    setCities((prev) =>
      prev.map((c) => (c.id === id ? { ...c, level } : c))
    );
  }, []);

  const exportMap = useCallback(async () => {
    if (!mapRef.current) return;
    try {
      const dataUrl = await toPng(mapRef.current, {
        width: 2400,
        height: 1800,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `reisadvies-${selectedCountry?.name || "kaart"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Export failed:", e);
    }
  }, [selectedCountry]);

  const regionStyle = useCallback(
    (feature: GeoJSON.Feature | undefined) => {
      if (!feature) return {};
      const name =
        feature.properties?.NAME_1 ||
        feature.properties?.name ||
        feature.properties?.NAME ||
        feature.properties?.VARNAME_1 ||
        feature.properties?.admin1Name ||
        "";
      const regionData = regionStyles[name];
      const level = regionData?.level || "none";
      return {
        fillColor: level === "none" ? RISK_COLORS[countryLevel] : RISK_COLORS[level],
        fillOpacity: 0.7,
        color: "#333",
        weight: 1,
        opacity: 0.9,
      };
    },
    [regionStyles, countryLevel]
  );

  const countryStyle = useCallback(() => {
    return {
      fillColor: RISK_COLORS[countryLevel],
      fillOpacity: 0.7,
      color: "#333",
      weight: 2,
      opacity: 0.9,
    };
  }, [countryLevel]);

  const borderStyle = useCallback(
    (_level: RiskLevel) => ({
      fillColor: RISK_COLORS[_level],
      fillOpacity: 0.5,
      color: RISK_COLORS[_level],
      weight: 3,
      opacity: 0.8,
    }),
    []
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Sidebar */}
      <div className="lg:w-80 xl:w-96 bg-white border-r border-gray-200 p-4 overflow-y-auto lg:h-[calc(100vh-3.5rem)] shrink-0">
        <h2 className="text-xl font-bold mb-4">Kaarteditor Reisadviezen</h2>

        {/* Country selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Selecteer land
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={selectedCountry?.iso || ""}
            onChange={(e) => {
              const c = POPULAR_COUNTRIES.find((c) => c.iso === e.target.value);
              if (c) selectCountry(c);
            }}
          >
            <option value="">-- Kies een land --</option>
            {POPULAR_COUNTRIES.sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Of voer ISO-3 code in (bijv. COL)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={customCountryIso}
              onChange={(e) => setCustomCountryIso(e.target.value.toUpperCase())}
            />
            <button
              onClick={() => {
                if (customCountryIso.length === 3) {
                  selectCountry({
                    name: customCountryIso,
                    iso: customCountryIso,
                    center: [0, 0],
                    zoom: 5,
                  });
                }
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Laden
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center py-4 text-gray-500">Laden...</div>
        )}

        {selectedCountry && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-4">
              {(["country", "regions", "cities", "borders"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "country" ? "Land" : tab === "regions" ? "Regio's" : tab === "cities" ? "Steden" : "Grenzen"}
                </button>
              ))}
            </div>

            {/* Paint selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kleur om mee te schilderen
              </label>
              <div className="flex gap-2">
                {(Object.keys(RISK_LABELS) as Array<Exclude<RiskLevel, "none">>).map((level) => (
                  <button
                    key={level}
                    onClick={() => setActivePaint(level)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border-2 transition-all ${
                      activePaint === level
                        ? "border-gray-900 shadow-md scale-105"
                        : "border-gray-200"
                    }`}
                    style={{ backgroundColor: RISK_COLORS[level], color: level === "yellow" ? "#333" : "#fff" }}
                  >
                    {level === "green" ? "Groen" : level === "yellow" ? "Geel" : level === "orange" ? "Oranje" : "Rood"}
                  </button>
                ))}
              </div>
            </div>

            {/* Country tab */}
            {activeTab === "country" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Kleur het hele land in met het geselecteerde risiconiveau.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(RISK_LABELS) as Array<Exclude<RiskLevel, "none">>).map((level) => (
                    <button
                      key={level}
                      onClick={() => { setCountryLevel(level); setGeoJsonKey((k) => k + 1); }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border-2 ${
                        countryLevel === level ? "border-gray-900" : "border-gray-200"
                      }`}
                      style={{
                        backgroundColor: RISK_COLORS[level],
                        color: level === "yellow" ? "#333" : "#fff",
                      }}
                    >
                      {level === "green" ? "Groen" : level === "yellow" ? "Geel" : level === "orange" ? "Oranje" : "Rood"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Regions tab */}
            {activeTab === "regions" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Klik op een regio in de kaart om deze te kleuren met de actieve kleur. Of selecteer hieronder:
                </p>
                {regionsGeoJson && (
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {regionsGeoJson.features.map((f, i) => {
                      const name =
                        f.properties?.NAME_1 ||
                        f.properties?.name ||
                        f.properties?.NAME ||
                        f.properties?.VARNAME_1 ||
                        f.properties?.admin1Name ||
                        `Regio ${i + 1}`;
                      const style = regionStyles[name];
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border border-gray-300 shrink-0"
                            style={{
                              backgroundColor:
                                style?.level && style.level !== "none"
                                  ? RISK_COLORS[style.level]
                                  : RISK_COLORS[countryLevel],
                            }}
                          />
                          <span className="text-sm flex-1 truncate">{name}</span>
                          <select
                            className="text-xs border border-gray-200 rounded px-1 py-0.5"
                            value={style?.level || "none"}
                            onChange={(e) => {
                              handleRegionClick(name);
                              setRegionStyles((prev) => ({
                                ...prev,
                                [name]: { level: e.target.value as RiskLevel },
                              }));
                              setGeoJsonKey((k) => k + 1);
                            }}
                          >
                            <option value="none">Land kleur</option>
                            <option value="green">Groen</option>
                            <option value="yellow">Geel</option>
                            <option value="orange">Oranje</option>
                            <option value="red">Rood</option>
                          </select>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!regionsGeoJson && !loading && (
                  <p className="text-sm text-amber-600">
                    Geen regio-data gevonden voor dit land. Probeer een ander land.
                  </p>
                )}
              </div>
            )}

            {/* Cities tab */}
            {activeTab === "cities" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Voeg steden toe aan de kaart met een risicokleur.
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Stadsnaam"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={newCityName}
                    onChange={(e) => setNewCityName(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Breedtegraad"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={newCityLat}
                      onChange={(e) => setNewCityLat(e.target.value)}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Lengtegraad"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={newCityLng}
                      onChange={(e) => setNewCityLng(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={addCity}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    + Stad toevoegen ({activePaint === "green" ? "Groen" : activePaint === "yellow" ? "Geel" : activePaint === "orange" ? "Oranje" : "Rood"})
                  </button>
                </div>

                {/* Preset cities for known countries */}
                {selectedCountry && (
                  <div>
                    <button
                      onClick={() => {
                        const presets = getPresetCities(selectedCountry.iso);
                        if (presets.length) {
                          setCities((prev) => [
                            ...prev,
                            ...presets.map((p) => ({
                              ...p,
                              id: Date.now().toString() + Math.random(),
                              level: activePaint,
                            })),
                          ]);
                        }
                      }}
                      className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                    >
                      Hoofdstad & grote steden toevoegen
                    </button>
                  </div>
                )}

                {cities.length > 0 && (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {cities.map((c) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: RISK_COLORS[c.level] }}
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        <select
                          className="text-xs border border-gray-200 rounded px-1 py-0.5"
                          value={c.level}
                          onChange={(e) => updateCityLevel(c.id, e.target.value as RiskLevel)}
                        >
                          <option value="green">Groen</option>
                          <option value="yellow">Geel</option>
                          <option value="orange">Oranje</option>
                          <option value="red">Rood</option>
                        </select>
                        <button
                          onClick={() => removeCity(c.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Borders tab */}
            {activeTab === "borders" && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Markeer grensgebieden. De breedte bepaalt hoe ver het gekleurde gebied de grens in reikt.
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grensbreedte: {borderWidth} km
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={borderWidth}
                    onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>5 km</span>
                    <span>100 km</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Grensgebieden worden als semi-transparante stroken rond de landgrens weergegeven. Klik op de knop hieronder om grensgebieden toe te voegen.
                </p>
                <button
                  onClick={() => {
                    setBorderZones((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        name: `Grensgebied ${prev.length + 1}`,
                        geojson: null,
                        level: activePaint,
                        widthKm: borderWidth,
                      },
                    ]);
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  + Grensgebied toevoegen ({activePaint === "green" ? "Groen" : activePaint === "yellow" ? "Geel" : activePaint === "orange" ? "Oranje" : "Rood"})
                </button>
                {borderZones.length > 0 && (
                  <div className="space-y-2">
                    {borderZones.map((bz) => (
                      <div key={bz.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                        <div
                          className="w-3 h-3 rounded shrink-0"
                          style={{ backgroundColor: RISK_COLORS[bz.level] }}
                        />
                        <input
                          className="flex-1 text-sm border border-gray-200 rounded px-2 py-1"
                          value={bz.name}
                          onChange={(e) =>
                            setBorderZones((prev) =>
                              prev.map((b) =>
                                b.id === bz.id ? { ...b, name: e.target.value } : b
                              )
                            )
                          }
                        />
                        <select
                          className="text-xs border border-gray-200 rounded px-1 py-0.5"
                          value={bz.level}
                          onChange={(e) =>
                            setBorderZones((prev) =>
                              prev.map((b) =>
                                b.id === bz.id ? { ...b, level: e.target.value as RiskLevel } : b
                              )
                            )
                          }
                        >
                          <option value="green">Groen</option>
                          <option value="yellow">Geel</option>
                          <option value="orange">Oranje</option>
                          <option value="red">Rood</option>
                        </select>
                        <button
                          onClick={() =>
                            setBorderZones((prev) => prev.filter((b) => b.id !== bz.id))
                          }
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Legend & Export */}
            <div className="mt-6 pt-4 border-t border-gray-200 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLegend"
                  checked={showLegend}
                  onChange={(e) => setShowLegend(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showLegend" className="text-sm">Legenda tonen</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showSource"
                  checked={showSource}
                  onChange={(e) => setShowSource(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="showSource" className="text-sm">Bronvermelding tonen</label>
              </div>
              <button
                onClick={exportMap}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                📥 Download als PNG
              </button>
            </div>
          </>
        )}
      </div>

      {/* Map area */}
      <div className="flex-1 relative" ref={mapRef}>
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "calc(100vh - 3.5rem)", width: "100%" }}
          zoomControl={true}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
          />
          <MapFlyTo center={mapCenter} zoom={mapZoom} />

          {/* Country outline */}
          {countryGeoJson && !regionsGeoJson && (
            <GeoJSON
              key={`country-${geoJsonKey}`}
              data={countryGeoJson}
              style={countryStyle}
            />
          )}

          {/* Regions */}
          {regionsGeoJson && (
            <GeoJSON
              key={`regions-${geoJsonKey}`}
              data={regionsGeoJson}
              style={regionStyle}
              onEachFeature={(feature, layer) => {
                const name =
                  feature.properties?.NAME_1 ||
                  feature.properties?.name ||
                  feature.properties?.NAME ||
                  feature.properties?.VARNAME_1 ||
                  feature.properties?.admin1Name ||
                  "";
                layer.on("click", () => handleRegionClick(name));
                layer.bindTooltip(name, { sticky: true });
              }}
            />
          )}

          {/* Country outline when regions are shown */}
          {countryGeoJson && regionsGeoJson && (
            <GeoJSON
              key={`outline-${geoJsonKey}`}
              data={countryGeoJson}
              style={() => ({
                fillColor: "transparent",
                fillOpacity: 0,
                color: "#222",
                weight: 3,
                opacity: 1,
              })}
            />
          )}

          {/* Border zones as buffer around country outline */}
          {countryGeoJson && borderZones.length > 0 &&
            borderZones.map((bz) => (
              <GeoJSON
                key={`border-${bz.id}-${geoJsonKey}`}
                data={countryGeoJson}
                style={() => ({
                  fillColor: "transparent",
                  fillOpacity: 0,
                  color: RISK_COLORS[bz.level],
                  weight: Math.max(3, bz.widthKm / 2),
                  opacity: 0.7,
                  dashArray: "8 4",
                })}
              />
            ))}

          {/* Cities */}
          {cities.map((city) => (
            <CircleMarker
              key={city.id}
              center={[city.lat, city.lng]}
              radius={8}
              pathOptions={{
                fillColor: RISK_COLORS[city.level],
                fillOpacity: 0.9,
                color: "#333",
                weight: 2,
              }}
            >
              <Tooltip permanent direction="top" offset={[0, -10]}>
                <span className="font-semibold text-xs">{city.name}</span>
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Legend overlay */}
        {showLegend && (
          <div className="absolute bottom-20 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000] border border-gray-200">
            <h3 className="text-sm font-bold mb-2 text-gray-800">Reisadvies</h3>
            {(Object.entries(RISK_LABELS) as Array<[Exclude<RiskLevel, "none">, string]>).map(
              ([level, label]) => (
                <div key={level} className="flex items-center gap-2 mb-1">
                  <div
                    className="w-5 h-4 rounded-sm"
                    style={{ backgroundColor: RISK_COLORS[level] }}
                  />
                  <span className="text-xs text-gray-700">{label}</span>
                </div>
              )
            )}
          </div>
        )}

        {/* Source attribution */}
        {showSource && (
          <div className="absolute bottom-4 left-4 bg-white/90 rounded px-3 py-1.5 z-[1000] text-[10px] text-gray-500 max-w-md">
            Bron: Natural Earth en OpenStreetMap. Bij het maken van de kaart is zoveel
            mogelijk informatie van de Cartografische afdeling van de Verenigde Naties
            gebruikt.
          </div>
        )}
      </div>
    </div>
  );
}

function getPresetCities(iso: string): Omit<CityMarker, "id" | "level">[] {
  const presets: Record<string, Omit<CityMarker, "id" | "level">[]> = {
    COL: [
      { name: "Bogotá", lat: 4.711, lng: -74.0721 },
      { name: "Medellín", lat: 6.2518, lng: -75.5636 },
      { name: "Cali", lat: 3.4516, lng: -76.532 },
      { name: "Barranquilla", lat: 10.9685, lng: -74.7813 },
      { name: "Cartagena", lat: 10.391, lng: -75.5144 },
    ],
    THA: [
      { name: "Bangkok", lat: 13.7563, lng: 100.5018 },
      { name: "Chiang Mai", lat: 18.7883, lng: 98.9853 },
      { name: "Phuket", lat: 7.8804, lng: 98.3923 },
      { name: "Pattaya", lat: 12.9236, lng: 100.8825 },
    ],
    EGY: [
      { name: "Caïro", lat: 30.0444, lng: 31.2357 },
      { name: "Alexandrië", lat: 31.2001, lng: 29.9187 },
      { name: "Luxor", lat: 25.6872, lng: 32.6396 },
      { name: "Sharm el-Sheikh", lat: 27.9158, lng: 34.33 },
    ],
    TUR: [
      { name: "Istanbul", lat: 41.0082, lng: 28.9784 },
      { name: "Ankara", lat: 39.9334, lng: 32.8597 },
      { name: "Antalya", lat: 36.8969, lng: 30.7133 },
      { name: "Izmir", lat: 38.4237, lng: 27.1428 },
    ],
    MAR: [
      { name: "Rabat", lat: 34.0209, lng: -6.8416 },
      { name: "Casablanca", lat: 33.5731, lng: -7.5898 },
      { name: "Marrakech", lat: 31.6295, lng: -7.9811 },
      { name: "Fez", lat: 34.0181, lng: -5.0078 },
    ],
    IDN: [
      { name: "Jakarta", lat: -6.2088, lng: 106.8456 },
      { name: "Bali (Denpasar)", lat: -8.6705, lng: 115.2126 },
      { name: "Surabaya", lat: -7.2575, lng: 112.7521 },
      { name: "Yogyakarta", lat: -7.7956, lng: 110.3695 },
    ],
    UKR: [
      { name: "Kyiv", lat: 50.4501, lng: 30.5234 },
      { name: "Lviv", lat: 49.8397, lng: 24.0297 },
      { name: "Odesa", lat: 46.4825, lng: 30.7233 },
      { name: "Charkiv", lat: 49.9935, lng: 36.2304 },
    ],
    KEN: [
      { name: "Nairobi", lat: -1.2921, lng: 36.8219 },
      { name: "Mombasa", lat: -4.0435, lng: 39.6682 },
    ],
    MEX: [
      { name: "Mexico-Stad", lat: 19.4326, lng: -99.1332 },
      { name: "Cancún", lat: 21.1619, lng: -86.8515 },
      { name: "Guadalajara", lat: 20.6597, lng: -103.3496 },
      { name: "Monterrey", lat: 25.6866, lng: -100.3161 },
    ],
    ZAF: [
      { name: "Kaapstad", lat: -33.9249, lng: 18.4241 },
      { name: "Johannesburg", lat: -26.2041, lng: 28.0473 },
      { name: "Pretoria", lat: -25.7479, lng: 28.2293 },
      { name: "Durban", lat: -29.8587, lng: 31.0218 },
    ],
    IND: [
      { name: "New Delhi", lat: 28.6139, lng: 77.209 },
      { name: "Mumbai", lat: 19.076, lng: 72.8777 },
      { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639 },
    ],
    BRA: [
      { name: "Brasília", lat: -15.7975, lng: -47.8919 },
      { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
      { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 },
      { name: "Salvador", lat: -12.9714, lng: -38.5124 },
    ],
    PAK: [
      { name: "Islamabad", lat: 33.6844, lng: 73.0479 },
      { name: "Karachi", lat: 24.8607, lng: 67.0011 },
      { name: "Lahore", lat: 31.5204, lng: 74.3587 },
    ],
    IRQ: [
      { name: "Bagdad", lat: 33.3152, lng: 44.3661 },
      { name: "Erbil", lat: 36.191, lng: 44.0119 },
      { name: "Basra", lat: 30.5085, lng: 47.7834 },
    ],
    AFG: [
      { name: "Kabul", lat: 34.5553, lng: 69.2075 },
      { name: "Herat", lat: 34.3529, lng: 62.2043 },
      { name: "Mazar-i-Sharif", lat: 36.7069, lng: 67.1106 },
    ],
    SYR: [
      { name: "Damascus", lat: 33.5138, lng: 36.2765 },
      { name: "Aleppo", lat: 36.2021, lng: 37.1343 },
    ],
    LBN: [
      { name: "Beiroet", lat: 33.8938, lng: 35.5018 },
      { name: "Tripoli", lat: 34.4367, lng: 35.8497 },
    ],
    ISR: [
      { name: "Jeruzalem", lat: 31.7683, lng: 35.2137 },
      { name: "Tel Aviv", lat: 32.0853, lng: 34.7818 },
    ],
    PHL: [
      { name: "Manilla", lat: 14.5995, lng: 120.9842 },
      { name: "Cebu", lat: 10.3157, lng: 123.8854 },
      { name: "Davao", lat: 7.1907, lng: 125.4553 },
    ],
    NIG: [
      { name: "Abuja", lat: 9.0579, lng: 7.4951 },
      { name: "Lagos", lat: 6.5244, lng: 3.3792 },
    ],
    VEN: [
      { name: "Caracas", lat: 10.4806, lng: -66.9036 },
      { name: "Maracaibo", lat: 10.6544, lng: -71.6406 },
    ],
    SOM: [
      { name: "Mogadishu", lat: 2.0469, lng: 45.3182 },
      { name: "Hargeisa", lat: 9.56, lng: 44.065 },
    ],
    MLI: [
      { name: "Bamako", lat: 12.6392, lng: -8.0029 },
    ],
    ETH: [
      { name: "Addis Abeba", lat: 9.0054, lng: 38.7636 },
      { name: "Dire Dawa", lat: 9.6009, lng: 41.8508 },
    ],
  };
  return presets[iso] || [];
}

function topojsonToGeojson(
  topology: { objects: Record<string, { type: string; geometries: Array<{ type: string; arcs: number[][]; properties?: Record<string, unknown> }> }>; arcs: number[][][]; transform?: { scale: [number, number]; translate: [number, number] } },
  objectName: string
): GeoJSON.FeatureCollection {
  const obj = topology.objects[objectName];
  if (!obj) return { type: "FeatureCollection", features: [] };

  const transform = topology.transform;
  const arcs = topology.arcs.map((arc) => {
    let x = 0,
      y = 0;
    return arc.map((point) => {
      x += point[0];
      y += point[1];
      if (transform) {
        return [
          x * transform.scale[0] + transform.translate[0],
          y * transform.scale[1] + transform.translate[1],
        ];
      }
      return [x, y];
    });
  });

  function decodeArc(index: number): number[][] {
    if (index >= 0) return arcs[index];
    return [...arcs[~index]].reverse();
  }

  function decodeRing(indices: number[]): number[][] {
    const coords: number[][] = [];
    for (const index of indices) {
      const arc = decodeArc(index);
      for (let i = 0; i < arc.length; i++) {
        if (i === 0 && coords.length > 0) continue;
        coords.push(arc[i]);
      }
    }
    return coords;
  }

  const features = obj.geometries.map((geom) => {
    let coordinates: unknown;

    if (geom.type === "Polygon") {
      coordinates = (geom.arcs as number[][]).map(decodeRing);
    } else if (geom.type === "MultiPolygon") {
      coordinates = (geom.arcs as unknown as number[][][]).map((polygon) =>
        polygon.map(decodeRing)
      );
    } else {
      coordinates = [];
    }

    return {
      type: "Feature" as const,
      properties: geom.properties || {},
      geometry: {
        type: geom.type,
        coordinates,
      },
    };
  });

  return { type: "FeatureCollection", features: features as GeoJSON.Feature[] };
}

function mapIsoToContinent(iso: string): string {
  const map: Record<string, string> = {
    col: "south-america", tha: "asia", egy: "africa", tur: "europe",
    mar: "africa", idn: "asia", ukr: "europe", ken: "africa",
    pak: "asia", irq: "asia", afg: "asia", syr: "asia",
    lbn: "asia", isr: "asia", mex: "north-america", zaf: "africa",
    ind: "asia", bra: "south-america", phl: "asia", nig: "africa",
    ven: "south-america", som: "africa", mli: "africa", eth: "africa",
  };
  return map[iso] || "asia";
}
