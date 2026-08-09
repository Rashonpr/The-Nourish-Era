import type { Metadata } from "next";
import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Set new password" };

export default function UpdatePasswordPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-foreground">Set a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Choose a new password for your account.</p>

      <div className="mt-8">
        <UpdatePasswordForm />
      </div>
    </div>
  );
}
