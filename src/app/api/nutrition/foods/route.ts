import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/api/require-user";
import { checkRateLimit } from "@/lib/utils/rate-limit";
import { cacheFoodSchema } from "@/lib/validation/nutrition";
import { getOrCacheFood } from "@/lib/services/nutrition/food-cache";

/** Fetches (and caches) full nutrient details for a specific food. */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("errorResponse" in auth) return auth.errorResponse;

  const rate = checkRateLimit(`nutrition-food:${auth.user.id}`, { limit: 60, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = cacheFoodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  try {
    const food = await getOrCacheFood(parsed.data.externalId);
    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }
    return NextResponse.json({ food });
  } catch (error) {
    console.error("Food lookup/cache failed", error);
    return NextResponse.json(
      { error: "The nutrition database is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
