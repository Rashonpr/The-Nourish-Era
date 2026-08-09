"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  requestPasswordResetSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

export type AuthActionState = {
  error?: string;
  success?: boolean;
};

function firstFieldError(flat: Record<string, string[] | undefined>): string | undefined {
  for (const key in flat) {
    const messages = flat[key];
    if (messages && messages.length > 0) return messages[0];
  }
  return undefined;
}

export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    clinicName: formData.get("clinicName"),
  });

  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (parsed.data.clinicName) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase
        .from("practitioners")
        .update({ clinic_name: parsed.data.clinicName })
        .eq("id", userData.user.id);
    }
  }

  redirect("/dashboard");
}

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Incorrect email or password." };
  }

  const redirectTo = formData.get("redirectTo");
  redirect(typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = requestPasswordResetSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/callback?next=/update-password`,
  });

  // Always report success to avoid leaking which emails have accounts.
  if (error) {
    return { success: true };
  }

  return { success: true };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: firstFieldError(parsed.error.flatten().fieldErrors) ?? "Please check your entries." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
