import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SubmissionRow as Row } from "@/lib/admin.functions";

const STATUS_LABELS: Record<Row["status"], string> = {
  new: "New",
  in_review: "In review",
  actioned: "Actioned",
  rejected: "Rejected",
  spam: "Spam",
};

interface Props {
  row: Row;
  selected: boolean;
  onSelectChange: (id: string, selected: boolean) => void;
  onSave: (id: string, patch: { status?: Row["status"]; admin_note?: string | null }) => Promise<void>;
}

export function SubmissionRowCard({ row, selected, onSelectChange, onSave }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Row["status"]>(row.status);
  const [note, setNote] = useState(row.admin_note ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = status !== row.status || (note || "") !== (row.admin_note ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(row.id, {
        status: status !== row.status ? status : undefined,
        admin_note: (note || "") !== (row.admin_note ?? "") ? note || null : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const submittedDate = new Date(row.submitted_at).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const kindClass =
    row.kind === "claim"
      ? "bg-primary/10 text-primary"
      : "bg-muted text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="pt-1">
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectChange(row.id, Boolean(v))}
            aria-label="Select submission"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium uppercase ${kindClass}`}>
              {row.kind}
            </span>
            <span className="font-medium text-foreground truncate">{row.email}</span>
            {row.claim_slug && (
              <a
                href={`/events/${row.claim_slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {row.claim_slug}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{submittedDate}</span>
          </div>

          <div className="mt-2">
            <p className={`text-sm text-foreground whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>
              {row.event_details}
            </p>
            {row.event_details.length > 200 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <Select value={status} onValueChange={(v) => setStatus(v as Row["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as Row["status"][]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              placeholder="Internal note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
            />
            <Button onClick={handleSave} disabled={!dirty || saving} size="sm">
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
