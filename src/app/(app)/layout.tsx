import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { getCurrentPractitioner } from "@/lib/data/practitioner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const practitioner = await getCurrentPractitioner();

  if (!practitioner) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar practitionerName={practitioner.full_name} credentials={practitioner.credentials} />
        <main className="flex-1 overflow-x-hidden bg-background p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
