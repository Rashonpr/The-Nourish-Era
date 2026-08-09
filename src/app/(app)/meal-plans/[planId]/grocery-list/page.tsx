import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GroceryListView } from "@/components/meal-plans/grocery-list-view";
import { getGroceryList } from "@/lib/data/grocery-list";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Grocery List" };

export default async function GroceryListPage({ params }: { params: Promise<{ planId: string }> }) {
  const { planId } = await params;
  const supabase = await createClient();
  const { data: plan } = await supabase.from("meal_plans").select("id, name").eq("id", planId).single();
  if (!plan) notFound();

  const detail = await getGroceryList(planId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <Link href={`/meal-plans/${planId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          {plan.name}
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-foreground">Grocery List</h1>
      </div>
      <GroceryListView planId={planId} groceryListId={detail?.list.id ?? null} initialItems={detail?.items ?? []} />
    </div>
  );
}
