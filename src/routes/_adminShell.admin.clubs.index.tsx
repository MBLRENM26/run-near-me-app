import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { adminCheckSession } from "@/lib/admin.functions";
import { listAdminClubs } from "@/lib/admin-clubs.functions";
import { REGIONS } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GOVERNING_BODIES = [
  "england-athletics",
  "scottish-athletics",
  "welsh-athletics",
  "athletics-ni",
] as const;
const STATUSES = ["ACTIVE", "HIDDEN", "DELETED"] as const;
const CLAIMED = ["yes", "no"] as const;

const searchSchema = z.object({
  q: z.string().optional(),
  governing_body: z.enum(GOVERNING_BODIES).optional(),
  region: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  claimed: z.enum(CLAIMED).optional(),
  page: z.number().int().min(0).optional(),
});

const PAGE_SIZE = 50;

export const Route = createFileRoute("/_adminShell/admin/clubs/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Clubs — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminClubsPage,
});

function AdminClubsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/clubs/" });
  const fetchList = useServerFn(listAdminClubs);
  const checkSession = useServerFn(adminCheckSession);

  const [authed, setAuthed] = useState(false);
  const [qInput, setQInput] = useState(search.q ?? "");

  useEffect(() => {
    checkSession()
      .then((r) => (r.authenticated ? setAuthed(true) : navigate({ to: "/admin/login" })))
      .catch(() => navigate({ to: "/admin/login" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setQInput(search.q ?? "");
  }, [search.q]);

  const page = search.page ?? 0;
  const offset = page * PAGE_SIZE;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-clubs", search, offset],
    queryFn: () =>
      fetchList({
        data: {
          q: search.q,
          governing_body: search.governing_body,
          region: search.region,
          status: search.status,
          claimed: search.claimed,
          limit: PAGE_SIZE,
          offset,
        },
      }),
    enabled: authed,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const applySearch = (next: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ to: ".", search: { ...search, ...next, page: 0 } });

  if (!authed) return <p className="text-sm text-muted-foreground">Checking session…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clubs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString()} club{total === 1 ? "" : "s"}
            {isFetching && " · refreshing…"}
          </p>
        </div>
        <Link to="/admin/clubs/new">
          <Button size="sm">New club</Button>
        </Link>
      </div>

      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch({ q: qInput.trim() || undefined });
        }}
      >
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Name, town or slug…"
          className="lg:col-span-2"
        />
        <select
          value={search.governing_body ?? ""}
          onChange={(e) =>
            applySearch({
              governing_body:
                (e.target.value as (typeof GOVERNING_BODIES)[number]) || undefined,
            })
          }
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All bodies</option>
          {GOVERNING_BODIES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={search.region ?? ""}
          onChange={(e) => applySearch({ region: e.target.value || undefined })}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">All regions</option>
          {REGIONS.map((r) => (
            <option key={r.slug} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={search.status ?? ""}
            onChange={(e) =>
              applySearch({
                status: (e.target.value as (typeof STATUSES)[number]) || undefined,
              })
            }
            className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={search.claimed ?? ""}
            onChange={(e) =>
              applySearch({
                claimed: (e.target.value as "yes" | "no") || undefined,
              })
            }
            className="h-9 flex-1 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Any claim</option>
            <option value="yes">Claimed</option>
            <option value="no">Unclaimed</option>
          </select>
        </div>
        <div className="flex gap-2 lg:col-span-5">
          <Button type="submit" size="sm">
            Search
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setQInput("");
              navigate({ to: ".", search: {} });
            }}
          >
            Reset
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">No clubs match those filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">Body</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Claimed</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link
                      to="/admin/clubs/$id"
                      params={{ id: c.id }}
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">/{c.slug}</div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {[c.town, c.county].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{c.region ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.governing_body}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        c.status === "ACTIVE"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{c.is_claimed ? "Yes" : "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to="/admin/clubs/$id"
                      params={{ id: c.id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() =>
                navigate({ search: { ...search, page: Math.max(0, page - 1) } })
              }
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page + 1 >= totalPages}
              onClick={() => navigate({ search: { ...search, page: page + 1 } })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
