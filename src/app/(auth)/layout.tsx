import Link from "next/link";
import { branding } from "@/config/branding";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              {branding.logoInitials}
            </span>
            <span className="font-heading text-lg font-semibold text-foreground">{branding.appName}</span>
          </Link>
          {children}
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, oklch(0.48 0.09 155) 0%, transparent 45%), radial-gradient(circle at 85% 80%, oklch(0.55 0.11 60) 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <p className="font-heading text-3xl leading-snug font-medium text-primary-foreground">
            {branding.tagline}
          </p>
        </div>
        <div className="relative space-y-3 text-primary-foreground/90">
          <p className="text-sm leading-relaxed">
            Build, review, and export personalized nutrition plans — with every recommendation grounded in
            verified nutrition data and reviewed by you before it reaches a patient.
          </p>
          <p className="text-xs text-primary-foreground/60">
            {branding.legal.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
