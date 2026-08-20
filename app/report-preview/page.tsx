import { VariantEditorial } from "@/components/landing/report-variants/variant-editorial";
import { VariantRadar } from "@/components/landing/report-variants/variant-radar";
import { VariantScoreboard } from "@/components/landing/report-variants/variant-scoreboard";

/**
 * Throwaway comparison page for choosing an AI-report format. Not linked from
 * anywhere — visit /report-preview directly. Delete once a format is picked.
 */
export default function ReportPreview() {
  const variants = [
    { id: "A", name: "Scoreboard", note: "White card · dark hero · 3 scores · measurements · last 6 · one fix", node: <VariantScoreboard /> },
    { id: "B", name: "Radar", note: "Dark · repeatability across the session at a glance", node: <VariantRadar /> },
    { id: "C", name: "Editorial", note: "Light · printed-report measurement rows", node: <VariantEditorial /> },
  ];

  return (
    <main className="min-h-dvh bg-pitch-950 px-6 py-14 sm:px-12">
      <div className="mx-auto max-w-[1360px]">
        <h1 className="font-display text-display font-bold tracking-[.02em] text-cream-50 uppercase">
          AI report — format options
        </h1>
        <p className="mt-2 text-caption text-cream-200/70">Same demo data · pick one</p>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-3">
          {variants.map((v) => (
            <section key={v.id}>
              <div className="mb-4">
                <div className="font-display text-body font-semibold tracking-[.08em] text-cream-100 uppercase">
                  {v.id} · {v.name}
                </div>
                <div className="mt-1 text-caption text-cream-200/70">{v.note}</div>
              </div>
              {v.node}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
