"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PatientProfileTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/patients/${patientId}`;
  const tabs = [
    { label: "Overview", href: `${base}/overview` },
    { label: "Nutrition Targets", href: `${base}/targets` },
    { label: "Meal Plans", href: `${base}/plans` },
    { label: "Progress", href: `${base}/progress` },
    { label: "Notes", href: `${base}/notes` },
  ];

  return (
    <div className="border-b border-border">
      <nav className="-mb-px flex gap-5 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "shrink-0 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
