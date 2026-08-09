"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateProfileAction, type ProfileActionState } from "@/lib/actions/practitioner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSubmitButton } from "@/components/auth/form-submit-button";
import type { Practitioner } from "@/lib/data/practitioner";

const initialState: ProfileActionState = {};

export function ProfileForm({ practitioner }: { practitioner: Practitioner }) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  useEffect(() => {
    if (state.success) toast.success("Profile updated");
  }, [state.success]);

  return (
    <form key={practitioner.updated_at} action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" defaultValue={practitioner.full_name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="credentials">Credentials</Label>
          <Input id="credentials" name="credentials" defaultValue={practitioner.credentials ?? ""} placeholder="RD, LDN" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clinicName">Clinic / practice name</Label>
          <Input id="clinicName" name="clinicName" defaultValue={practitioner.clinic_name ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={practitioner.phone ?? ""} />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div>
        <FormSubmitButton>Save changes</FormSubmitButton>
      </div>
    </form>
  );
}
