import { prisma } from "@/lib/db";
import { formatDateNl } from "@/lib/format";
import { clsx } from "clsx";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  success: "✅ OK",
  partial: "⚠ Gedeeltelijk",
  failed: "❌ Mislukt",
  running: "⏳ Bezig",
};

const METHOD_LABELS: Record<string, string> = {
  json_api: "JSON API",
  xml_feed: "XML/RSS feed",
  html: "HTML scraping",
};

export default async function StatusPage() {
  const sources = await prisma.source.findMany({
    where: { active: true },
    orderBy: { priority: "asc" },
    include: {
      scrapeLogs: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
      _count: { select: { advisories: true } },
    },
  });

  const lastSuccess = sources
    .flatMap((s) => s.scrapeLogs.filter((l) => l.status === "success"))
    .sort((a, b) => (b.finishedAt?.getTime() ?? 0) - (a.finishedAt?.getTime() ?? 0))[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Databron status</h1>
        {lastSuccess?.finishedAt && (
          <p className="text-gray-500 mt-1">
            Laatste volledige update: {new Date(lastSuccess.finishedAt).toLocaleString("nl-NL")}
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-3 font-semibold text-gray-600">Bron</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Methode</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Adviezen</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Laatste run</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 font-semibold text-gray-600">Duur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sources.map((s) => {
              const lastLog = s.scrapeLogs[0];
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {s.flagEmoji} {s.nameNl}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {METHOD_LABELS[s.fetchMethod] ?? s.fetchMethod}
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-mono">{s._count.advisories}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {lastLog?.startedAt
                      ? new Date(lastLog.startedAt).toLocaleString("nl-NL")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {lastLog ? (
                      <span
                        className={clsx(
                          "font-medium",
                          lastLog.status === "success" && "text-emerald-600",
                          lastLog.status === "partial" && "text-amber-600",
                          lastLog.status === "failed" && "text-red-600",
                          lastLog.status === "running" && "text-blue-600"
                        )}
                      >
                        {STATUS_LABELS[lastLog.status] ?? lastLog.status}
                      </span>
                    ) : (
                      <span className="text-gray-400">Nog niet uitgevoerd</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono">
                    {lastLog?.durationMs != null
                      ? `${(lastLog.durationMs / 1000).toFixed(1)}s`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Manual overrides section — only shown when active overrides exist */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-amber-800">⚠ Actieve handmatige overrides</h2>
        <p className="text-xs text-amber-700">
          De onderstaande bronnen tonen voor één of meer landen een vaste (handmatige) samenvatting
          in plaats van de live scrape. De data beweegt <strong>niet automatisch mee</strong> met
          wijzigingen op de bronsites. Verwijder de override zodra Bug 0/2 (Mistral
          compound-extractie) is opgelost.
        </p>
        <table className="w-full text-xs mt-1">
          <thead>
            <tr className="text-left text-amber-700">
              <th className="py-1 pr-4 font-semibold">Bron</th>
              <th className="py-1 pr-4 font-semibold">Land</th>
              <th className="py-1 font-semibold">Reden</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-100 text-amber-900">
            {[
              { source: "🇬🇧 Verenigd Koninkrijk", country: "Jordanië (JO)", reason: "Compound-zones niet betrouwbaar geëxtraheerd door scraper" },
              { source: "🇫🇷 Frankrijk", country: "Jordanië (JO)", reason: "Compound-zones niet betrouwbaar geëxtraheerd door scraper" },
              { source: "🇩🇰 Denemarken", country: "Jordanië (JO)", reason: "Compound-zones niet betrouwbaar geëxtraheerd door scraper" },
              { source: "🇨🇦 Canada", country: "Jordanië (JO)", reason: "Compound-zones niet betrouwbaar geëxtraheerd door scraper" },
            ].map((row) => (
              <tr key={row.source + row.country}>
                <td className="py-1 pr-4">{row.source}</td>
                <td className="py-1 pr-4">{row.country}</td>
                <td className="py-1">{row.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-500 space-y-1">
        <p>Update-interval: elke 6 uur via cron-job</p>
        <p>Scrapers worden geleidelijk toegevoegd naarmate het project vordert</p>
      </div>
    </div>
  );
}
