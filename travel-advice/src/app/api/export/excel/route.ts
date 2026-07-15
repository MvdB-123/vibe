import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import { formatDateNl } from "@/lib/format";
import { LEVEL_LABELS_NL, normalizeLevel } from "@/lib/normalize-risk";
import { getMultiLevelDisplay } from "@/lib/multi-level";
import summariesJson from "../../../../../data/summaries.json";
import type { NormalizedLevel } from "@/types";

const LEVEL_COLORS: Record<NormalizedLevel, string> = {
  green: "D1FAE5",
  yellow: "FEF9C3",
  orange: "FFEDD5",
  red: "FEE2E2",
  unknown: "F3F4F6",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const iso = searchParams.get("iso");
  const whereClause = iso ? { destIso2: iso.toUpperCase() } : {};

  const advisories = await prisma.advisory.findMany({
    where: whereClause,
    include: { source: true, destination: true },
    orderBy: [{ destination: { nameNl: "asc" } }, { source: { priority: "asc" } }],
  });

  const aiSummaries: Record<string, Record<string, string>> = summariesJson;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Travel Advice Comparator";
  wb.created = new Date();

  const ws = wb.addWorksheet("Reisadviezen");
  ws.columns = [
    { header: "Land", key: "land", width: 25 },
    { header: "ISO", key: "iso", width: 6 },
    { header: "Regio", key: "regio", width: 15 },
    { header: "Overheid", key: "overheid", width: 22 },
    { header: "Officiële classificatie", key: "classificatie", width: 35 },
    { header: "Kleurcode", key: "kleurcode", width: 28 },
    { header: "Samenvatting", key: "samenvatting", width: 60 },
    { header: "Laatste wijziging", key: "wijziging", width: 18 },
    { header: "Opgehaald op", key: "opgehaald", width: 18 },
    { header: "Bron URL", key: "url", width: 50 },
  ];

  // Header styling
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "E2E8F0" },
  };
  ws.autoFilter = { from: "A1", to: "J1" };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const a of advisories) {
    const storedLevel = a.normalizedLevel as NormalizedLevel;
    const normalizedLevel: NormalizedLevel =
      !storedLevel || storedLevel === "unknown"
        ? normalizeLevel(a.sourceId, a.rawLevel)
        : storedLevel;

    const zones = getMultiLevelDisplay(a.sourceId, a.rawLevel, normalizedLevel, a.summary);

    // Build kleurcode label: "Oranje (Algemeen) + Rood (Grensgebieden)" for compound
    const kleurcodeLabel = zones
      .map((z) => `${LEVEL_LABELS_NL[z.level] ?? z.level} (${z.area})`)
      .join(" + ");

    // Dutch AI summary if available, else raw English
    const dutchSummary = aiSummaries[a.destIso2]?.[a.sourceId] ?? a.summary ?? "";

    const row = ws.addRow({
      land: a.destination.nameNl,
      iso: a.destIso2,
      regio: a.destination.regionNl,
      overheid: `${a.source.flagEmoji} ${a.source.nameNl}`,
      classificatie: a.rawLevel,
      kleurcode: kleurcodeLabel,
      samenvatting: dutchSummary,
      wijziging: formatDateNl(a.officialUpdatedAt),
      opgehaald: formatDateNl(a.scrapedAt),
      url: a.sourceUrl,
    });

    // Color the kleurcode cell based on the strictest zone
    const strictestZone = zones.reduce((a, b) => {
      const order: NormalizedLevel[] = ["green", "yellow", "orange", "red"];
      return order.indexOf(b.level) > order.indexOf(a.level) ? b : a;
    }, zones[0]);
    const levelCell = row.getCell("kleurcode");
    levelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: LEVEL_COLORS[strictestZone.level] ?? "FFFFFF" },
    };

    // Wrap samenvatting text
    row.getCell("samenvatting").alignment = { wrapText: true, vertical: "top" };
    row.height = Math.min(200, Math.max(20, Math.ceil(dutchSummary.length / 80) * 15));
  }

  // Legend sheet
  const legend = wb.addWorksheet("Legenda");
  legend.addRow(["Kleurcode", "Betekenis"]);
  legend.getRow(1).font = { bold: true };
  [
    ["Groen", "D1FAE5", "Normale voorzichtigheid"],
    ["Geel", "FEF9C3", "Verhoogde waakzaamheid"],
    ["Oranje", "FFEDD5", "Niet-essentiële reizen afraden"],
    ["Rood", "FEE2E2", "Reis niet"],
  ].forEach(([label, color, meaning]) => {
    const row = legend.addRow([label, meaning]);
    row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  });
  legend.addRow([]);
  legend.addRow([`Gegenereerd op ${formatDateNl(new Date())} door Travel Advice Comparator`]);
  legend.columns = [{ width: 12 }, { width: 40 }];

  const buffer = await wb.xlsx.writeBuffer();
  const filename = iso
    ? `reisadvies-${iso.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.xlsx`
    : `reisadviezen-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
