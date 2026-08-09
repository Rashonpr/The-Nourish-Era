import Link from "next/link";
import { SidebarNav } from "./sidebar-nav";
import { branding } from "@/config/branding";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
            {branding.logoInitials}
          </span>
          <span className="font-heading text-base font-semibold text-sidebar-foreground">{branding.appName}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <SidebarNav />
      </div>
    </aside>
  );
}
