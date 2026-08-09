"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyTemplateToPatientAction } from "@/lib/actions/templates";

export function ApplyTemplateDialog({
  templateId,
  patients,
}: {
  templateId: string;
  patients: { id: string; first_name: string; last_name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    startTransition(async () => {
      const result = await applyTemplateToPatientAction(templateId, patientId);
      if (result?.error) toast.error(result.error);
      // On success the action redirects server-side.
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <PlayCircle />
        Apply to patient
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply template</DialogTitle>
          <DialogDescription>Creates a new draft plan for the patient, which you can then adjust.</DialogDescription>
        </DialogHeader>
        <Select value={patientId} onValueChange={(v) => v && setPatientId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a patient…" />
          </SelectTrigger>
          <SelectContent>
            {patients.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button onClick={handleApply} disabled={isPending || !patientId}>
            {isPending && <Loader2 className="animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
