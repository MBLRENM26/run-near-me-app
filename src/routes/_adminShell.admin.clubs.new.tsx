import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { adminCheckSession } from "@/lib/admin.functions";
import { createAdminClub } from "@/lib/admin-clubs.functions";
import {
  ClubForm,
  emptyClubForm,
  type ClubSubmitPayload,
} from "@/components/admin/ClubForm";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_adminShell/admin/clubs/new")({
  head: () => ({
    meta: [
      { title: "New club — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NewClubPage,
});

function NewClubPage() {
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);
  const create = useServerFn(createAdminClub);
  const [authed, setAuthed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkSession()
      .then((r) => (r.authenticated ? setAuthed(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authed) return <p className="text-sm text-muted-foreground">Checking session…</p>;

  const onSubmit = async (payload: ClubSubmitPayload) => {
    setSubmitting(true);
    try {
      const res = await create({ data: payload });
      toast.success("Club created");
      navigate({ to: "/admin/clubs/$id", params: { id: res.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New club</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a club manually. Imports use the same table — pick a slug that
            won't collide.
          </p>
        </div>
        <Link to="/admin/clubs" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to clubs
        </Link>
      </div>
      <ClubForm
        initial={emptyClubForm}
        submitLabel="Create club"
        onSubmit={onSubmit}
        submitting={submitting}
      />
      <Toaster position="top-center" />
    </div>
  );
}
