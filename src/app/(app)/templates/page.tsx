import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileStack } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ApplyTemplateDialog } from "@/components/templates/apply-template-dialog";
import { DeleteTemplateButton } from "@/components/templates/delete-template-button";
import { getCurrentPractitioner } from "@/lib/data/practitioner";
import { listTemplates } from "@/lib/data/templates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect("/login");

  const supabase = await createClient();
  const [templates, patientsRes] = await Promise.all([
    listTemplates(practitioner.id),
    supabase
      .from("patients")
      .select("id, first_name, last_name")
      .eq("practitioner_id", practitioner.id)
      .eq("status", "active")
      .order("first_name"),
  ]);
  const patients = patientsRes.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reusable meal plan templates you can apply to any patient and adjust from there. Save one from any
          meal plan&apos;s page.
        </p>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No templates yet"
          description="Open any meal plan and choose &quot;Save as Template&quot; to create one."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <DeleteTemplateButton templateId={template.id} templateName={template.name} />
                </div>
                {template.category && <Badge variant="secondary">{template.category}</Badge>}
                {template.description && <CardDescription>{template.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {template.num_days} day{template.num_days !== 1 ? "s" : ""} · {template.meals_per_day ?? "—"} meals ·{" "}
                  {template.snacks_per_day ?? 0} snacks/day
                </p>
                {patients.length > 0 ? (
                  <ApplyTemplateDialog templateId={template.id} patients={patients} />
                ) : (
                  <p className="text-xs text-muted-foreground">Add a patient to apply this template.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
