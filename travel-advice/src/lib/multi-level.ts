import type { NormalizedLevel } from "@/types";

export function getMultiLevelDisplay(
  sourceId: string,
  rawLevel: string,
  normalizedLevel: NormalizedLevel,
  summary: string | null | undefined,
): Array<{ level: NormalizedLevel; area: string }> {
  const key = rawLevel.toLowerCase().trim();

  if (sourceId === "australia") {
    const sum = (summary || "").toLowerCase();
    const hasRed = /do not travel/i.test(sum);
    const hasOrange = /reconsider your need to travel/i.test(sum);
    if (hasRed && hasOrange) {
      const rows: Array<{ level: NormalizedLevel; area: string }> = [
        { level: normalizedLevel, area: "Algemeen" },
      ];
      if (normalizedLevel !== "red") rows.push({ level: "orange", area: "Deelgebieden" });
      rows.push({ level: "red", area: normalizedLevel !== "red" ? "Grensgebieden" : "Deelgebieden" });
      return rows.filter((r, i, arr) => i === 0 || r.level !== arr[0].level);
    }
    if (hasRed && normalizedLevel !== "red") {
      return [
        { level: normalizedLevel, area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
    if (hasOrange && normalizedLevel !== "orange" && normalizedLevel !== "red") {
      return [
        { level: normalizedLevel, area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
    return [{ level: normalizedLevel, area: "Algemeen" }];
  }

  if (sourceId === "us") {
    const sum = (summary || "").toLowerCase();
    const hasRed = /do not travel|level 4/i.test(sum);
    const hasOrange = /reconsider travel|level 3/i.test(sum);
    if ((key === "level 2: exercise increased caution" || key === "level 1: exercise normal precautions") && hasRed) {
      return [
        { level: normalizedLevel, area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
    if (key === "level 2: exercise increased caution" && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
  }

  if (sourceId === "canada") {
    const sum = (summary || "").toLowerCase();
    const hasRed = /avoid all travel|vermijd alle reizen/i.test(sum);
    const hasOrange = /avoid non-essential travel|niet.?noodzakelijk.*afgeraden|afgeraden.*niet.?noodzakelijk/i.test(sum);
    if (key === "exercise a high degree of caution" && hasRed && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "exercise a high degree of caution" && hasRed) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
    if (key === "exercise a high degree of caution" && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
    if (key === "avoid non-essential travel" && hasRed) {
      return [
        { level: "orange", area: "Algemeen" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
  }

  if (sourceId === "germany") {
    const sum = (summary || "");
    const hasRed = /reisewarnung/i.test(sum);
    const hasOrange = /von nicht notwendigen reisen|nicht notwendige reisen/i.test(sum);
    if (key === "teilreisewarnung") {
      return [
        { level: "green", area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
    if ((key === "erhöhte vorsicht" || key === "besondere vorsicht") && hasRed && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if ((key === "erhöhte vorsicht" || key === "besondere vorsicht") && hasRed) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
    if ((key === "erhöhte vorsicht" || key === "besondere vorsicht") && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
    if (key === "von nicht notwendigen reisen abraten" && hasRed) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "reisewarnung" && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "reisewarnung" && /teilreise|part|gebiet|provinz|region/i.test(sum)) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
  }

  if (sourceId === "uk") {
    const sum = (summary || "").toLowerCase();
    const hasUkBothParts = /all but essential travel to|advise against all but essential/i.test(sum);
    if (key.includes("advise against all travel to parts") || key === "advise against all travel to parts") {
      if (hasUkBothParts) {
        return [
          { level: "green", area: "Algemeen" },
          { level: "orange", area: "Deelgebieden" },
          { level: "red", area: "Grensgebieden" },
        ];
      }
      return [
        { level: "green", area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
    if (key.includes("advise against all but essential travel to parts") || key === "advise against all but essential travel to parts") {
      return [
        { level: "green", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
  }

  if (sourceId === "denmark") {
    const sum = (summary || "").toLowerCase();
    const hasRed = /rejse frarådes|undgå alle rejser|fraråder?\s+alle\s+rejser\b/i.test(sum);
    const hasOrange = /fraråder?\s+(?:alle\s+)?ikke.nødvendige|undgå(?:\s+alle)?\s+ikke.nødvendige/i.test(sum);
    const hasYellow = /vær ekstra opmærksom|vær forsigtig/i.test(sum);
    const baseLevel = (normalizedLevel === "green" || normalizedLevel === "unknown") ? "green" : normalizedLevel;
    if (hasRed && hasOrange && hasYellow) {
      return [
        { level: baseLevel, area: "Algemeen" },
        { level: "yellow", area: "Toeristische gebieden" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (hasRed && hasOrange) {
      return [
        { level: baseLevel, area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (hasRed && baseLevel !== "red") {
      return [{ level: baseLevel, area: "Algemeen" }, { level: "red", area: "Deelgebieden" }];
    }
    if (hasOrange && baseLevel !== "orange" && baseLevel !== "red") {
      return [{ level: baseLevel, area: "Algemeen" }, { level: "orange", area: "Deelgebieden" }];
    }
  }

  if (sourceId === "sweden") {
    const sum = (summary || "").toLowerCase();
    const hasRed = /avråd(?:er|an)?\s+från\s+(?:alla\s+)?resor\b|vermijd alle reizen/i.test(sum);
    const hasOrange = /avråd(?:er|an)?\s+från\s+icke\s+nödvändiga|niet.?noodzakelijk.*afgeraden/i.test(sum);
    const baseLevel = (normalizedLevel === "red" && hasOrange) ? "yellow" : normalizedLevel;
    if (hasRed && hasOrange) {
      const rows: Array<{ level: NormalizedLevel; area: string }> = [{ level: baseLevel, area: "Algemeen" }];
      if (baseLevel !== "orange" && baseLevel !== "red") rows.push({ level: "orange", area: "Deelgebieden" });
      rows.push({ level: "red", area: "Grensgebieden" });
      return rows;
    }
    if (hasRed && baseLevel !== "red") {
      return [{ level: baseLevel, area: "Algemeen" }, { level: "red", area: "Grensgebieden" }];
    }
    if (hasOrange && baseLevel !== "orange" && baseLevel !== "red") {
      return [{ level: baseLevel, area: "Algemeen" }, { level: "orange", area: "Deelgebieden" }];
    }
  }

  if (sourceId === "france") {
    const sum = (summary || "").toLowerCase();
    const hasRed = /formellement d.conseill/i.test(sum);
    const hasOrange = /d.conseill.{0,3} sauf raison imp.rativ|zones? d.conseill|éviter sauf raison imp.rativ/i.test(sum);
    if (key === "vigilance renforcée" && hasRed && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "vigilance renforcée" && hasRed) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "vigilance renforcée" && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
    if (key === "déconseillé sauf raison impérative" && hasRed) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "déconseillé sauf raison impérative" && /province[s]?|région[s]?|zone[s]?|territoire[s]?|île[s]?|certaines? partie[s]?/i.test(sum)) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
      ];
    }
    if (key === "formellement déconseillé" && hasOrange) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "orange", area: "Deelgebieden" },
        { level: "red", area: "Grensgebieden" },
      ];
    }
    if (key === "formellement déconseillé" && /autre|partie|zone|région/i.test(sum)) {
      return [
        { level: "yellow", area: "Algemeen" },
        { level: "red", area: "Deelgebieden" },
      ];
    }
  }

  return [{ level: normalizedLevel, area: "Algemeen" }];
}
