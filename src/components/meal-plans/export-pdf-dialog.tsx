"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, FileDown } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ExportPdfDialog({ planId, planName, isApproved }: { planId: string; planName: string; isApproved: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const res = await fetch(`/api/pdf/${planId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageToPatient: message }),
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${planName.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setOpen(false);
    } catch {
      toast.error("Couldn't export the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <FileDown />
        Export PDF
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export patient-facing plan</DialogTitle>
          <DialogDescription>
            Produces a clean PDF with meals, portions, prep instructions, targets, and the grocery list — no
            internal notes or AI metadata.
          </DialogDescription>
        </DialogHeader>

        {!isApproved && (
          <p className="rounded-md bg-warning/15 px-3 py-2 text-xs text-warning-foreground">
            This plan hasn&apos;t been marked Approved yet. Consider reviewing and approving it before sharing
            with the patient.
          </p>
        )}

        <div className="space-y-1.5">
          <Label>Message to patient (optional)</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="A short note to include at the top of the plan…" />
        </div>

        <DialogFooter>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="animate-spin" /> : <FileDown />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
