"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Trash2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { addNoteAction, deleteNoteAction } from "@/lib/actions/notes";
import type { Database } from "@/types/database";

type Note = Database["public"]["Tables"]["practitioner_notes"]["Row"];

export function NotesPanel({ patientId, initialNotes }: { patientId: string; initialNotes: Note[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAdd() {
    if (!draft.trim()) return;
    const content = draft.trim();
    startTransition(async () => {
      const result = await addNoteAction(patientId, content);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setNotes((prev) => [
        { id: crypto.randomUUID(), patient_id: patientId, practitioner_id: "", note: content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ...prev,
      ]);
      setDraft("");
    });
  }

  function handleDelete(noteId: string) {
    setDeletingId(noteId);
    startTransition(async () => {
      const result = await deleteNoteAction(patientId, noteId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a note about this patient's visit, progress, or plan…"
            rows={3}
          />
          <div className="flex justify-end">
            <Button onClick={handleAdd} disabled={isPending || !draft.trim()}>
              {isPending && !deletingId && <Loader2 className="animate-spin" />}
              Add note
            </Button>
          </div>
        </CardContent>
      </Card>

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" description="Notes you add here are only visible to you." />
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card>
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div>
                    <p className="text-sm whitespace-pre-wrap text-foreground">{note.note}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(note.id)}
                    disabled={isPending && deletingId === note.id}
                    aria-label="Delete note"
                  >
                    {isPending && deletingId === note.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
