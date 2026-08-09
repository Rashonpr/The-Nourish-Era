"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { setPatientStatusAction } from "@/lib/actions/patients";
import type { PatientStatus } from "@/types/database";

export function PatientStatusButton({ patientId, status }: { patientId: string; status: PatientStatus }) {
  const [isPending, startTransition] = useTransition();
  const isActive = status === "active";

  function toggle() {
    startTransition(async () => {
      const result = await setPatientStatusAction(patientId, isActive ? "archived" : "active");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isActive ? "Patient archived" : "Patient restored");
      }
    });
  }

  if (!isActive) {
    return (
      <Button variant="outline" onClick={toggle} disabled={isPending}>
        {isPending ? <Loader2 className="animate-spin" /> : <ArchiveRestore />}
        Restore
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Archive />
        Archive
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this patient?</AlertDialogTitle>
          <AlertDialogDescription>
            The patient will be hidden from your active roster but all history is kept — you can restore them
            anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={toggle}>Archive patient</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
