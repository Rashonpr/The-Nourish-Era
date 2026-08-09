"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, RefreshCw, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import {
  generateGroceryListAction,
  addManualGroceryItemAction,
  toggleGroceryItemCheckedAction,
  deleteGroceryItemAction,
} from "@/lib/actions/grocery-list";
import type { GroceryListItemRow } from "@/lib/data/grocery-list";
import type { GroceryCategory } from "@/types/database";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: "Produce",
  meat_seafood: "Meat & Seafood",
  dairy: "Dairy",
  grains: "Grains",
  pantry: "Pantry",
  frozen: "Frozen",
  spices_seasonings: "Spices & Seasonings",
  other: "Other",
};
const CATEGORY_ORDER: GroceryCategory[] = [
  "produce",
  "meat_seafood",
  "dairy",
  "grains",
  "pantry",
  "frozen",
  "spices_seasonings",
  "other",
];

export function GroceryListView({
  planId,
  groceryListId,
  initialItems,
}: {
  planId: string;
  groceryListId: string | null;
  initialItems: GroceryListItemRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ category: "other" as GroceryCategory, name: "", quantity: "", unit: "" });

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateGroceryListAction(planId);
      if (result.error) toast.error(result.error);
      else window.location.reload();
    });
  }

  function handleToggle(item: GroceryListItemRow) {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: !i.is_checked } : i)));
    startTransition(async () => {
      const result = await toggleGroceryItemCheckedAction(item.id, !item.is_checked);
      if (result.error) toast.error(result.error);
    });
  }

  function handleDelete(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    startTransition(async () => {
      const result = await deleteGroceryItemAction(itemId);
      if (result.error) toast.error(result.error);
    });
  }

  function handleAddManual() {
    if (!groceryListId || !newItem.name.trim()) return;
    startTransition(async () => {
      const result = await addManualGroceryItemAction(groceryListId, {
        category: newItem.category,
        name: newItem.name.trim(),
        quantity: newItem.quantity ? Number(newItem.quantity) : undefined,
        unit: newItem.unit || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title="No grocery list yet"
        description="Generate a grocery list from this plan's approved meals — duplicate ingredients are combined automatically."
        action={
          <Button onClick={handleGenerate} disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
            Generate grocery list
          </Button>
        }
      />
    );
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowAddForm((v) => !v)}>
          <Plus />
          Add item
        </Button>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Regenerate from plan
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 pt-6">
            <div className="min-w-40 flex-1 space-y-1.5">
              <Input placeholder="Item name" value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="w-24 space-y-1.5">
              <Input placeholder="Qty" type="number" value={newItem.quantity} onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div className="w-24 space-y-1.5">
              <Input placeholder="Unit" value={newItem.unit} onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} />
            </div>
            <div className="w-44 space-y-1.5">
              <Select
                value={newItem.category}
                onValueChange={(v) => v && setNewItem((p) => ({ ...p, category: v as GroceryCategory }))}
                items={CATEGORY_LABELS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={handleAddManual} disabled={isPending || !newItem.name.trim()}>
              Add
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {grouped.map((group) => (
          <Card key={group.category}>
            <CardHeader>
              <CardTitle className="text-sm">{CATEGORY_LABELS[group.category]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {group.items.map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 py-1">
                  <Checkbox checked={item.is_checked} onCheckedChange={() => handleToggle(item)} />
                  <span className={cn("flex-1 text-sm text-foreground", item.is_checked && "text-muted-foreground line-through")}>
                    {item.name}
                    {item.quantity ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : ""}
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item.id)} aria-label="Remove item">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
