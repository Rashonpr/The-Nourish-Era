import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { foodSearchQuerySchema } from "@/lib/validation/nutrition";
import { getNutritionProvider } from "@/lib/services/nutrition/provider";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const rate = checkRateLimit(`nutrition-search:${auth.user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const parsed = foodSearchQuerySchema.safeParse({ q: request.nextUrl.searchParams.get("q") });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid query" }, { status: 400 });
  }

  try {
    const results = await getNutritionProvider().searchFoods(parsed.data.q);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("USDA food search failed", error);
    return NextResponse.json(
      { error: "The nutrition database is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
