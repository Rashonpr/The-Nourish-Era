"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { loadSampleDataAction } from "@/lib/actions/seed-data";

export function LoadSampleDataButton() {
  const [isPending, startTransition] = useTransition();

  function handleLoad() {
    startTransition(async () => {
      const result = await loadSampleDataAction();
      if (result.error) toast.error(result.error);
      else toast.success("Sample data loaded — check Patients and Meal Plans.");
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" disabled={isPending} />}>
        {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        Load sample data
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Load fictional sample data?</AlertDialogTitle>
          <AlertDialogDescription>
            Adds three clearly-labeled fictional patients (with allergies, goals, and nutrition targets) and
            two sample meal plans to your account, for exploring the app. You can delete them anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleLoad}>Load sample data</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
