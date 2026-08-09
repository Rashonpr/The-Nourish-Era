"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Search, Plus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ErrorState } from "@/components/shared/error-state";
import { addMealItemFromFoodAction, addCustomMealItemAction } from "@/lib/actions/meal-items";
import type { FoodSearchResult } from "@/lib/services/nutrition/types";

export function AddIngredientDialog({ mealId, trigger }: { mealId: string; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[] | null>(null);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("g");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualQuantity, setManualQuantity] = useState("1");
  const [manualUnit, setManualUnit] = useState("serving");
  const [manualNutrition, setManualNutrition] = useState({
    calories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
    fiberG: "",
    sodiumMg: "",
  });

  function reset() {
    setQuery("");
    setResults(null);
    setSearchState("idle");
    setSelected(null);
    setQuantity("1");
    setUnit("g");
    setManualName("");
    setManualQuantity("1");
    setManualUnit("serving");
    setManualNutrition({ calories: "", proteinG: "", carbsG: "", fatG: "", fiberG: "", sodiumMg: "" });
  }

  async function runSearch(q: string) {
    if (q.trim().length < 2) {
      setResults(null);
      setSearchState("idle");
      return;
    }
    setSearchState("loading");
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Search failed");
      setResults(body.results);
      setSearchState("idle");
    } catch {
      setSearchState("error");
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleAddFromSearch() {
    if (!selected) return;
    startTransition(async () => {
      const result = await addMealItemFromFoodAction({
        mealId,
        externalId: selected.externalId,
        description: selected.description,
        quantity: Number(quantity),
        unit,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ingredient added");
        setOpen(false);
        reset();
      }
    });
  }

  function handleAddManual() {
    startTransition(async () => {
      const result = await addCustomMealItemAction({
        mealId,
        customFoodName: manualName,
        quantity: Number(manualQuantity),
        unit: manualUnit,
        calories: manualNutrition.calories ? Number(manualNutrition.calories) : undefined,
        proteinG: manualNutrition.proteinG ? Number(manualNutrition.proteinG) : undefined,
        carbsG: manualNutrition.carbsG ? Number(manualNutrition.carbsG) : undefined,
        fatG: manualNutrition.fatG ? Number(manualNutrition.fatG) : undefined,
        fiberG: manualNutrition.fiberG ? Number(manualNutrition.fiberG) : undefined,
        sodiumMg: manualNutrition.sodiumMg ? Number(manualNutrition.sodiumMg) : undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Ingredient added");
        setOpen(false);
        reset();
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add ingredient</DialogTitle>
          <DialogDescription>
            Nutrition values are calculated from USDA FoodData Central — never estimated by AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="search">
          <TabsList className="w-full">
            <TabsTrigger value="search" className="flex-1">
              Search database
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex-1">
              Enter manually
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                placeholder="Search foods, e.g. chicken breast"
                className="pl-9"
              />
            </div>

            {searchState === "loading" && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {searchState === "error" && (
              <ErrorState
                description="Couldn't reach the nutrition database."
                onRetry={() => runSearch(query)}
              />
            )}

            {searchState === "idle" && results && results.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No foods matched your search.</p>
            )}

            {searchState === "idle" && results && results.length > 0 && !selected && (
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {results.map((food) => (
                  <li key={food.externalId}>
                    <button
                      type="button"
                      onClick={() => setSelected(food)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="block font-medium text-foreground">{food.description}</span>
                      <span className="text-xs text-muted-foreground">
                        {[food.brandOwner, food.dataType].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selected && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <p className="text-sm font-medium text-foreground">{selected.description}</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label>Quantity</Label>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label>Unit</Label>
                    <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g, oz, cup…" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                    Back
                  </Button>
                  <Button size="sm" onClick={handleAddFromSearch} disabled={isPending}>
                    {isPending && <Loader2 className="animate-spin" />}
                    Add ingredient
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <div className="space-y-1.5">
              <Label>Food name</Label>
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="e.g. Homemade lentil soup" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" value={manualQuantity} onChange={(e) => setManualQuantity(e.target.value)} />
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Unit</Label>
                <Input value={manualUnit} onChange={(e) => setManualUnit(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Optional — nutrition values you enter here are marked as manually entered, not database-verified.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["calories", "Calories"],
                  ["proteinG", "Protein (g)"],
                  ["carbsG", "Carbs (g)"],
                  ["fatG", "Fat (g)"],
                  ["fiberG", "Fiber (g)"],
                  ["sodiumMg", "Sodium (mg)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type="number"
                    value={manualNutrition[key]}
                    onChange={(e) => setManualNutrition((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleAddManual} disabled={isPending || !manualName.trim()}>
                {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                Add ingredient
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
