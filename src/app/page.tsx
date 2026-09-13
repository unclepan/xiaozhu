import Link from "next/link";
import DealCard from "./components/DealCard";
import { getCategories, getList, ALL_KEYS } from "@/lib/deals";
import type { DealCategory, DealCategoryKey } from "@/lib/api/deal.types";

/** URL 上 ?category= 的合法取值，非法一律回落 TOP */
const VALID_KEYS: DealCategoryKey[] = ALL_KEYS;

export const metadata = {
  title: "CQ LOCAL — Chongqing like a local",
};

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function CqHomePage({ searchParams }: PageProps) {
  const { category } = await searchParams;
  const active: DealCategoryKey = VALID_KEYS.includes(category as DealCategoryKey)
    ? (category as DealCategoryKey)
    : "TOP";

  const [categories, deals] = await Promise.all([
    getCategories(),
    getList(active),
  ]);

  const tabs = categories?.length
    ? categories
    : ([
        { key: "TOP", label: "Top Picks" },
        { key: "FOOD", label: "Food" },
        { key: "SPA", label: "Spa" },
        { key: "EXPLORE", label: "Explore" },
      ] as DealCategory[]);

  return (
    <div className="cq-app">
      <div className="cq-hero">
        <div className="cq-brand">CQ LOCAL</div>
        <h1 className="cq-h1">Chongqing like a local.</h1>
        <p className="cq-sub">
          Curated deals for international travelers. Food, spa, nightlife and city
          experiences — simple, local and easy to redeem.
        </p>
      </div>

      <div className="cq-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "TOP" ? "/" : `/?category=${tab.key}`}
            className={`cq-tab${tab.key === active ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {deals && deals.length > 0 ? (
        <div className="cq-grid">
          {deals.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      ) : (
        <div className="cq-empty">
          No deals in this category yet.
          <br />
          {!deals && "(Backend not connected: please make sure the deal service is running)"}
        </div>
      )}
    </div>
  );
}
