import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { adminCheckSession } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin — Running Events Near Me" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminIndexPage,
});

function AdminIndexPage() {
  const navigate = useNavigate();
  const checkSession = useServerFn(adminCheckSession);

  useEffect(() => {
    checkSession()
      .then((res) => {
        navigate({ to: res.authenticated ? "/admin/claims" : "/admin/login" });
      })
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
