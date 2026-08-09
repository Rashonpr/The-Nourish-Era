import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AllergyBadges } from "@/components/patients/allergy-badges";
import { getPatientDetail } from "@/lib/data/patients";
import { calculateAge } from "@/lib/utils/date";
import { cmToFeetInches, kgToLbs } from "@/lib/utils/units";

export const metadata: Metadata = { title: "Overview" };

function formatHeightWeight(detail: NonNullable<Awaited<ReturnType<typeof getPatientDetail>>>) {
  const { patient } = detail;
  const parts: string[] = [];
  if (patient.height_cm) {
    if (patient.preferred_units === "imperial") {
      const { feet, inches } = cmToFeetInches(patient.height_cm);
      parts.push(`${feet}'${inches}"`);
    } else {
      parts.push(`${patient.height_cm} cm`);
    }
  }
  if (patient.current_weight_kg) {
    parts.push(
      patient.preferred_units === "imperial"
        ? `${kgToLbs(patient.current_weight_kg)} lb`
        : `${patient.current_weight_kg} kg`,
    );
  }
  return parts.join(" · ") || "Not recorded";
}

export default async function PatientOverviewPage({ params }: { params: Promise<{ patientId: string }> }) {
  const { patientId } = await params;
  const detail = await getPatientDetail(patientId);
  if (!detail) notFound();

  const { patient, allergies, dietaryPreferences, foodPreferences, lifestyle, conditions, medicationsNotes, activeNutritionTarget } =
    detail;

  const favorites = foodPreferences.filter((f) => f.category === "favorite");
  const dislikes = foodPreferences.filter((f) => f.category === "dislike");
  const refused = foodPreferences.filter((f) => f.category === "refuse");
  const age = calculateAge(patient.date_of_birth);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="border-destructive/25">
          <CardHeader>
            <CardTitle className="text-destructive">Allergies</CardTitle>
          </CardHeader>
          <CardContent>
            <AllergyBadges allergens={allergies.map((a) => a.allergen)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dietary restrictions &amp; preferences</CardTitle>
          </CardHeader>
          <CardContent>
            {dietaryPreferences.length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {dietaryPreferences.map((p) => (
                  <Badge key={p.id} variant="secondary">
                    {p.preference}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Food preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Favorites</p>
              <div className="flex flex-wrap gap-1.5">
                {favorites.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  favorites.map((f) => (
                    <Badge key={f.id} variant="outline">
                      {f.food_name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Dislikes</p>
              <div className="flex flex-wrap gap-1.5">
                {dislikes.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  dislikes.map((f) => (
                    <Badge key={f.id} variant="outline">
                      {f.food_name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Refuses to eat</p>
              <div className="flex flex-wrap gap-1.5">
                {refused.length === 0 ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  refused.map((f) => (
                    <Badge key={f.id} variant="outline">
                      {f.food_name}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifestyle</CardTitle>
          </CardHeader>
          <CardContent>
            {!lifestyle ? (
              <p className="text-sm text-muted-foreground">Not recorded</p>
            ) : (
              <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Meals / snacks per day</dt>
                  <dd className="text-foreground">
                    {lifestyle.meals_per_day ?? "—"} meals, {lifestyle.snacks_per_day ?? "—"} snacks
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cooking ability</dt>
                  <dd className="text-foreground capitalize">{lifestyle.cooking_ability ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Prep time available</dt>
                  <dd className="text-foreground">{lifestyle.prep_time_minutes ? `${lifestyle.prep_time_minutes} min` : "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Budget</dt>
                  <dd className="text-foreground capitalize">{lifestyle.budget_level ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Eating out frequency</dt>
                  <dd className="text-foreground">{lifestyle.eating_out_frequency || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Exercise</dt>
                  <dd className="text-foreground">
                    {[lifestyle.exercise_frequency, lifestyle.exercise_type].filter(Boolean).join(" · ") || "—"}
                  </dd>
                </div>
                {lifestyle.work_schedule_notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Work schedule notes</dt>
                    <dd className="text-foreground">{lifestyle.work_schedule_notes}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical considerations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None documented</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c) => (
                  <Badge key={c.id} variant="secondary">
                    {c.condition}
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Clinical nutrition recommendations should be individualized by a qualified healthcare professional.
            </p>
          </CardContent>
        </Card>

        {medicationsNotes && (
          <Card>
            <CardHeader>
              <CardTitle>Medications &amp; supplements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-foreground">{medicationsNotes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Age</dt>
                <dd className="text-foreground">{age ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Height / weight</dt>
                <dd className="text-right text-foreground">{formatHeightWeight(detail)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Goal weight</dt>
                <dd className="text-foreground">
                  {patient.goal_weight_kg
                    ? patient.preferred_units === "imperial"
                      ? `${kgToLbs(patient.goal_weight_kg)} lb`
                      : `${patient.goal_weight_kg} kg`
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Activity level</dt>
                <dd className="text-foreground capitalize">{patient.activity_level?.replace(/_/g, " ") ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Primary goal</dt>
                <dd className="text-right text-foreground">
                  {patient.primary_goal === "Other" ? patient.primary_goal_custom : patient.primary_goal ?? "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nutrition targets</CardTitle>
          </CardHeader>
          <CardContent>
            {!activeNutritionTarget ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No targets set yet.</p>
                <Button size="sm" nativeButton={false} render={<Link href={`/patients/${patientId}/targets`} />}>
                  Set targets
                </Button>
              </div>
            ) : (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Calories</dt>
                  <dd className="font-medium text-foreground">{activeNutritionTarget.calories ?? "—"} kcal</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Protein</dt>
                  <dd className="font-medium text-foreground">{activeNutritionTarget.protein_g ?? "—"} g</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Carbs</dt>
                  <dd className="font-medium text-foreground">{activeNutritionTarget.carbs_g ?? "—"} g</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Fat</dt>
                  <dd className="font-medium text-foreground">{activeNutritionTarget.fat_g ?? "—"} g</dd>
                </div>
                <Button size="sm" variant="outline" className="w-full" nativeButton={false} render={<Link href={`/patients/${patientId}/targets`} />}>
                  Edit targets
                </Button>
              </dl>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
