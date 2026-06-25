import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminCheckSession } from "@/lib/admin.functions";
import {
  getAdminClub,
  updateAdminClub,
  deleteAdminClub,
} from "@/lib/admin-clubs.functions";
import {
  ClubForm,
  type ClubFormValues,
  type ClubSubmitPayload,
} from "@/components/admin/ClubForm";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_adminShell/admin/clubs/$id")({
  head: () => ({
    meta: [
      { title: "Edit club — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EditClubPage,
});

function EditClubPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);
  const fetchOne = useServerFn(getAdminClub);
  const update = useServerFn(updateAdminClub);
  const remove = useServerFn(deleteAdminClub);
  const [authed, setAuthed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkSession()
      .then((r) => (r.authenticated ? setAuthed(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-club", id],
    queryFn: () => fetchOne({ data: { id } }),
    enabled: authed,
  });

  if (!authed) return <p className="text-sm text-muted-foreground">Checking session…</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Could not load club.</p>
        <Link to="/admin/clubs" className="text-sm text-primary hover:underline">
          ← Back to clubs
        </Link>
      </div>
    );
  }

  const initial: ClubFormValues = {
    name: data.name,
    slug: data.slug,
    governing_body: data.governing_body as ClubFormValues["governing_body"],
    affiliation_number: data.affiliation_number ?? "",
    town: data.town ?? "",
    county: data.county ?? "",
    region: data.region ?? "",
    country: data.country ?? "",
    postcode: data.postcode ?? "",
    lat: data.lat != null ? String(data.lat) : "",
    lng: data.lng != null ? String(data.lng) : "",
    website_url: data.website_url ?? "",
    contact_email: data.contact_email ?? "",
    contact_phone: data.contact_phone ?? "",
    disciplines: (data.disciplines ?? []).join(", "),
    status: data.status as ClubFormValues["status"],
    is_claimed: data.is_claimed,
  };

  const onSubmit = async (payload: ClubSubmitPayload) => {
    setSubmitting(true);
    try {
      await update({ data: { id, patch: payload } });
      toast.success("Club saved");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!confirm(`Mark "${data.name}" as DELETED? It will be hidden from the public site.`))
      return;
    try {
      await remove({ data: { id } });
      toast.success("Club deleted");
      navigate({ to: "/admin/clubs" });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{data.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            /{data.slug} · norm_id <code className="text-xs">{data.norm_id}</code>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/running-clubs/$slug"
            params={{ slug: data.slug }}
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View on site ↗
          </Link>
          <Link to="/admin/clubs" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </Link>
        </div>
      </div>

      <ClubForm
        initial={initial}
        submitLabel="Save changes"
        onSubmit={onSubmit}
        submitting={submitting}
      />

      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Soft-deletes the club (sets status to DELETED). It stays in the database
          so re-imports don't resurrect it.
        </p>
        <div className="mt-3">
          <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
            Delete club
          </Button>
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
}
