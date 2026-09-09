# Bekende openstaande problemen

## Bug 0/2 — Mistral compound-zone extractie (structureel)

**Status:** Open — tijdelijk opgelost via handmatige JSON-overrides  
**Prioriteit:** Hoog — overrides bewegen niet automatisch mee met bronsites

### Beschrijving

De Playwright-scraper (playwright-full-scrape.ts) gebruikt Mistral om samenvattingen te
extraheren uit reisadvies-HTML. Voor landen met samengestelde advieszones (een basisniveau voor
het hele land + hogere waarschuwingen voor grensgebieden) extraheert Mistral de compound-keywords
niet betrouwbaar. Hierdoor worden de kleurcodes voor deelgebieden incorrect weergegeven — of
helemaal niet.

### Getroffen bronnen + landen (per september 2026)

| Bron | Land | Override-bestand |
|------|------|-----------------|
| Verenigd Koninkrijk | Jordanië (JO) | `travel-advice/data/uk-advisories.json` |
| Frankrijk | Jordanië (JO) | `travel-advice/data/france-advisories.json` |
| Denemarken | Jordanië (JO) | `travel-advice/data/denmark-advisories.json` |
| Canada | Jordanië (JO) | `travel-advice/data/canada-advisories.json` |

Elke override-entry heeft `"isManualOverride": true` en een `overrideNote`.  
De HTTP-scrapers loggen `[MANUAL-OVERRIDE]` in de GitHub Actions-logs wanneer ze een override
verwerken.

### Tijdelijke mitigatie

- Handmatige JSON-entries met samengestelde compound-keywords in de summary
- Playwright safety guard (`isSuspiciousDowngrade`) voorkomt dat een slechte Mistral-extractie de
  goede override overschrijft — guard logt `[GUARD-BLOCKED]` bij blokkade

### Structurele oplossing (te implementeren)

1. **Verificatie-stap na Mistral-extractie**: controleer of de geëxtraheerde samenvatting
   compound-zone-keywords bevat die overeenkomen met de bronpagina. Zo niet, herprobeer met een
   specifiekere prompt of val terug op de HTTP-scraper-output.
2. **Betere prompt engineering**: instrueer Mistral expliciet om grensgebied-waarschuwingen te
   citeren, inclusief de exacte drempeltekst ("avoid all travel to X", "formellement déconseillé").
3. **Verwijder overrides** in de JSON-bestanden zodra de structurele fix is geverifieerd voor alle
   vier bronnen op Jordanië. De `isManualOverride: true` velden markeren precies welke entries
   verwijderd kunnen worden.

### Verificatie

Test na implementatie van de structurele fix ten minste:
- Jordanië (JO): alle 4 bronnen tonen compound-zones (UK: Groen+Rood, FR: Geel+Oranje+Rood,
  DK: Geel+Oranje+Rood, CA: Oranje+Rood)
- Israël (IL): compound-zones correct voor alle bronnen
- Thailand (TH), Egypte (EG), Turkije (TR): compound-zones correct

---

*Aangemaakt: september 2026. Bijwerken zodra de structurele fix is geïmplementeerd.*
