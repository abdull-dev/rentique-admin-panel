"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TaxonomyItem {
  id: string;
  slug: string;
  name: string;
  /* extras depending on taxonomy */
  gender?: string;
  hex?: string;
  country?: string;
}

interface TaxonomySection {
  key: string;
  label: string;
  endpoint: string;
  items: TaxonomyItem[];
  loading: boolean;
  error: string | null;
}

const SECTIONS_CONFIG: { key: string; label: string; endpoint: string }[] = [
  { key: "categories", label: "Categories", endpoint: "/taxonomy/categories" },
  {
    key: "dress-types",
    label: "Dress Types",
    endpoint: "/taxonomy/dress-types",
  },
  { key: "brands", label: "Brands", endpoint: "/taxonomy/brands" },
  { key: "sizes", label: "Sizes", endpoint: "/taxonomy/sizes" },
  { key: "cities", label: "Cities", endpoint: "/taxonomy/cities" },
  { key: "occasions", label: "Occasions", endpoint: "/taxonomy/occasions" },
  { key: "colors", label: "Colors", endpoint: "/taxonomy/colors" },
  { key: "fabrics", label: "Fabrics", endpoint: "/taxonomy/fabrics" },
  { key: "work-types", label: "Work Types", endpoint: "/taxonomy/work-types" },
];

/* ------------------------------------------------------------------ */
/*  Gender filter options (for dress types)                            */
/* ------------------------------------------------------------------ */

const GENDER_OPTIONS = ["ALL", "MALE", "FEMALE", "UNISEX"] as const;

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function TaxonomyPage() {
  const [sections, setSections] = useState<TaxonomySection[]>(
    SECTIONS_CONFIG.map((cfg) => ({
      ...cfg,
      items: [],
      loading: false,
      error: null,
    })),
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [genderFilter, setGenderFilter] = useState<string>("ALL");

  /* Fetch all taxonomy data on mount */
  useEffect(() => {
    SECTIONS_CONFIG.forEach((cfg, idx) => {
      /* Mark loading */
      setSections((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], loading: true, error: null };
        return next;
      });

      api
        .get<TaxonomyItem[]>(cfg.endpoint)
        .then(({ data }) => {
          setSections((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], items: data, loading: false };
            return next;
          });
        })
        .catch(() => {
          setSections((prev) => {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              loading: false,
              error: "Failed to load.",
            };
            return next;
          });
        });
    });
  }, []);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#FFFCF6] p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold text-[#1C1424] font-[family-name:var(--font-headline)]">Taxonomy Browser</h1>
        <p className="text-sm text-[#5B4F62]">
          Read-only view of all taxonomy tables. Click a section to expand.
        </p>

        {sections.map((section) => {
          const isOpen = expanded.has(section.key);
          const isDressTypes = section.key === "dress-types";
          const isColors = section.key === "colors";

          /* Filter dress types by gender */
          const visibleItems =
            isDressTypes && genderFilter !== "ALL"
              ? section.items.filter(
                  (item) =>
                    item.gender?.toUpperCase() ===
                    genderFilter.toUpperCase(),
                )
              : section.items;

          return (
            <div
              key={section.key}
              className="rounded-2xl bg-white border border-[#E8DDE4] shadow-[0_1px_3px_rgba(28,20,36,0.08)]"
            >
              {/* Header (accordion toggle) */}
              <button
                type="button"
                onClick={() => toggle(section.key)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-semibold text-[#1C1424]">
                    {section.label}
                  </span>
                  {!section.loading && (
                    <span className="inline-flex items-center rounded-full bg-[#EAE1EE] px-2.5 py-0.5 text-xs font-medium text-[#4A2E57]">
                      {section.items.length}
                    </span>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-[#5B4F62]/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Body */}
              {isOpen && (
                <div className="border-t border-[#E8DDE4] px-5 pb-5 pt-3">
                  {section.loading && (
                    <p className="text-sm text-[#5B4F62]/60">Loading...</p>
                  )}

                  {section.error && (
                    <p className="text-sm text-red-500">{section.error}</p>
                  )}

                  {!section.loading && !section.error && (
                    <>
                      {/* Gender filter for dress types */}
                      {isDressTypes && (
                        <div className="mb-3 flex gap-2">
                          {GENDER_OPTIONS.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGenderFilter(g)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                genderFilter === g
                                  ? "bg-[#D6336C] text-white"
                                  : "bg-[#EAE1EE] text-[#4A2E57] hover:bg-[#E8DDE4]"
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      )}

                      {visibleItems.length === 0 ? (
                        <p className="text-sm text-[#5B4F62]/60">
                          No items found.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {visibleItems.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DDE4] bg-[#FFFCF6] px-3 py-1.5 text-sm"
                            >
                              {/* Color swatch */}
                              {isColors && item.hex && (
                                <span
                                  className="inline-block h-3.5 w-3.5 rounded-full border border-[#E8DDE4]"
                                  style={{ backgroundColor: item.hex }}
                                />
                              )}

                              <span className="font-medium text-[#1C1424]">
                                {item.name}
                              </span>
                              <span className="text-xs text-[#5B4F62]/60">
                                {item.slug}
                              </span>

                              {/* Dress type gender badge */}
                              {isDressTypes && item.gender && (
                                <span className="ml-0.5 rounded bg-[#EAE1EE] px-1.5 py-0.5 text-[10px] font-medium text-[#4A2E57]">
                                  {item.gender}
                                </span>
                              )}

                              {/* City country */}
                              {section.key === "cities" && item.country && (
                                <span className="ml-0.5 rounded bg-[#FCE3ED] px-1.5 py-0.5 text-[10px] font-medium text-[#B71F56]">
                                  {item.country}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
