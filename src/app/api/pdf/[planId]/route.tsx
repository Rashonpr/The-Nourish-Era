import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/api/require-user";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { sumNutrientTotals } from "@/lib/services/nutrition/calculate";
import { MealPlanPdfDocument, type PdfDay, type PdfGroceryGroup } from "@/lib/services/pdf/meal-plan-document";
import { z } from "zod";

const bodySchema = z.object({ messageToPatient: z.string().trim().max(2000).optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const rate = checkRateLimit(`pdf-export:${auth.user.id}`, { limit: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many export requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const { planId } = await params;
  const body = await request.json().catch(() => ({}));
  const parsedBody = bodySchema.safeParse(body);
  const messageToPatient = parsedBody.success ? parsedBody.data.messageToPatient : undefined;

  const supabase = await createClient();

  const { data: plan } = await supabase.from("meal_plans").select("*").eq("id", planId).single();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const [{ data: patient }, { data: target }, { data: days }, { data: groceryList }] = await Promise.all([
    supabase.from("patients").select("first_name").eq("id", plan.patient_id).single(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("patient_id", plan.patient_id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("meal_plan_days")
      .select("*, meals(*, meal_items(*, foods(description)))")
      .eq("meal_plan_id", planId)
      .order("day_number"),
    supabase.from("grocery_lists").select("id").eq("meal_plan_id", planId).maybeSingle(),
  ]);

  if (!patient || !days) return NextResponse.json({ error: "Plan data not found" }, { status: 404 });

  type RawItem = { custom_food_name: string | null; quantity: number; unit: string; calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null; sodium_mg: number | null; foods: { description: string } | null };
  type RawMeal = { meal_type: string; name: string; prep_instructions: string | null; position: number; meal_items: RawItem[] };
  type RawDay = { day_number: number; meals: RawMeal[] };

  const pdfDays: PdfDay[] = (days as unknown as RawDay[]).map((day) => {
    const meals = [...day.meals].sort((a, b) => a.position - b.position).map((meal) => {
      const nutrientTotals = meal.meal_items.map((item) => ({
        calories: item.calories ?? 0,
        proteinG: item.protein_g ?? 0,
        carbsG: item.carbs_g ?? 0,
        fatG: item.fat_g ?? 0,
        fiberG: item.fiber_g ?? 0,
        sodiumMg: item.sodium_mg ?? 0,
      }));
      const totals = sumNutrientTotals(nutrientTotals);
      return {
        mealType: meal.meal_type,
        name: meal.name,
        prepInstructions: meal.prep_instructions,
        items: meal.meal_items.map((item) => ({
          name: item.foods?.description ?? item.custom_food_name ?? "Ingredient",
          quantity: item.quantity,
          unit: item.unit,
        })),
        totals: { calories: totals.calories, proteinG: totals.proteinG, carbsG: totals.carbsG, fatG: totals.fatG },
      };
    });

    const dayTotals = sumNutrientTotals(
      day.meals.flatMap((meal) =>
        meal.meal_items.map((item) => ({
          calories: item.calories ?? 0,
          proteinG: item.protein_g ?? 0,
          carbsG: item.carbs_g ?? 0,
          fatG: item.fat_g ?? 0,
          fiberG: item.fiber_g ?? 0,
          sodiumMg: item.sodium_mg ?? 0,
        })),
      ),
    );

    return { dayNumber: day.day_number, meals, totals: dayTotals };
  });

  let groceryGroups: PdfGroceryGroup[] = [];
  if (groceryList) {
    const { data: items } = await supabase
      .from("grocery_list_items")
      .select("*")
      .eq("grocery_list_id", groceryList.id)
      .order("category")
      .order("position");

    const byCategory = new Map<string, PdfGroceryGroup>();
    for (const item of items ?? []) {
      if (!byCategory.has(item.category)) byCategory.set(item.category, { category: item.category, items: [] });
      byCategory.get(item.category)!.items.push({ name: item.name, quantity: item.quantity, unit: item.unit });
    }
    groceryGroups = Array.from(byCategory.values());
  }

  const pdfBuffer = await renderToBuffer(
    <MealPlanPdfDocument
      patientFirstName={patient.first_name}
      planName={plan.name}
      startDate={plan.start_date}
      numDays={plan.num_days}
      targets={
        target
          ? {
              calories: target.calories,
              proteinG: target.protein_g,
              carbsG: target.carbs_g,
              fatG: target.fat_g,
              fiberG: target.fiber_g,
              sodiumMg: target.sodium_mg,
            }
          : null
      }
      days={pdfDays}
      groceryGroups={groceryGroups}
      messageToPatient={messageToPatient}
    />,
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${plan.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
