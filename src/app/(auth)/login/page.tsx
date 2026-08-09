import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Log in to manage your patients and meal plans.</p>

      {params.error === "auth_callback_failed" && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          That link has expired or already been used. Please try again.
        </p>
      )}

      <div className="mt-8">
        <LoginForm redirectTo={params.redirectTo} />
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
