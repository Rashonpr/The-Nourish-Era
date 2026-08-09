import { LayoutDashboard, Users, UtensilsCrossed, FileStack, Settings } from "lucide-react";

export const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Patients", href: "/patients", icon: Users },
  { label: "Meal Plans", href: "/meal-plans", icon: UtensilsCrossed },
  { label: "Templates", href: "/templates", icon: FileStack },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;
