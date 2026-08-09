import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentPractitioner } from "@/lib/data/practitioner";
import { ProfileForm } from "./profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { LoadSampleDataButton } from "./load-sample-data-button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const practitioner = await getCurrentPractitioner();
  if (!practitioner) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your practitioner profile and account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This information may appear on exported patient-facing plans.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm practitioner={practitioner} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>{practitioner.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              <LogOut />
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sample data</CardTitle>
          <CardDescription>For exploring the app during development — never real patient data.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadSampleDataButton />
        </CardContent>
      </Card>
    </div>
  );
}
