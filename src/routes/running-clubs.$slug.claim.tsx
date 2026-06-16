import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getClubPageData, submitClubClaim } from "@/lib/clubs.functions";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { track } from "@/lib/analytics";

const ROLES = [
  { value: "chair", label: "Chair" },
  { value: "secretary", label: "Secretary" },
  { value: "treasurer", label: "Treasurer" },
  { value: "membership", label: "Membership secretary" },
  { value: "coach", label: "Coach" },
  { value: "captain", label: "Club captain" },
  { value: "committee", label: "Committee member" },
  { value: "other", label: "Other" },
];

export const Route = createFileRoute("/running-clubs/$slug/claim")({
  loader: ({ params }) => getClubPageData({ data: { slug: params.slug } }),
  head: ({ params, loaderData }) => {
    const c = loaderData?.club;
    const canonical = `${SITE_URL}/running-clubs/${params.slug}/claim`;
    return {
      meta: [
        {
          title: c
            ? `Claim ${c.name} — ${SITE_NAME}`
            : `Claim club — ${SITE_NAME}`,
        },
        { name: "robots", content: "noindex, nofollow" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  errorComponent: () => (
    <FullShell>
      <p className="text-sm text-muted-foreground">Couldn't load that club.</p>
    </FullShell>
  ),
  notFoundComponent: () => (
    <FullShell>
      <p className="text-sm text-muted-foreground">Club not found.</p>
    </FullShell>
  ),
  component: ClaimPage,
});

function FullShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function ClaimPage() {
  const { club: c } = Route.useLoaderData();
  const submit = useServerFn(submitClubClaim);
  const [state, setState] = useState<"idle" | "submitting" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("submitting");
    setError(null);
    try {
      await submit({
        data: {
          club_slug: c.slug,
          claimant_name: String(fd.get("claimant_name") ?? ""),
          claimant_email: String(fd.get("claimant_email") ?? ""),
          role_at_club: String(fd.get("role_at_club") ?? "other") as never,
          verification_method:
            String(fd.get("verification_method") ?? "") || undefined,
          verification_hint:
            String(fd.get("verification_hint") ?? "") || undefined,
          message: String(fd.get("message") ?? "") || undefined,
        },
      });
      track("Form: Submission", { form: "club_claim", slug: c.slug });
      setState("done");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Submission failed");
      setState("error");
    }
  };

  return (
    <FullShell>
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/running-clubs">Running Clubs</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/running-clubs/$slug" params={{ slug: c.slug }}>
                {c.name}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Claim</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl font-bold text-foreground">Claim {c.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Submit a short request and we'll verify your role at the club before
        approving the claim. Usually takes 1–2 working days.
      </p>

      {state === "done" ? (
        <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
          <h2 className="font-semibold text-foreground">Thanks — request received.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We've logged your claim and will be in touch at the email you
            provided. You can close this tab.
          </p>
          <Link
            to="/running-clubs/$slug"
            params={{ slug: c.slug }}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to {c.name} →
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Your name" name="claimant_name" required maxLength={200} />
          <Field
            label="Your email"
            name="claimant_email"
            required
            type="email"
            maxLength={255}
          />
          <div className="space-y-1.5">
            <Label htmlFor="role_at_club">Your role at the club</Label>
            <select
              id="role_at_club"
              name="role_at_club"
              required
              defaultValue="committee"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <Field
            label="How can we verify you? (optional)"
            name="verification_hint"
            maxLength={500}
            placeholder="e.g. ‘email me at chair@clubdomain.org’ or club Facebook page name"
          />
          <div className="space-y-1.5">
            <Label htmlFor="message">Anything else? (optional)</Label>
            <Textarea
              id="message"
              name="message"
              maxLength={2000}
              rows={4}
              placeholder="Corrections to the listing, things to add, etc."
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            disabled={state === "submitting"}
            className="w-full sm:w-auto"
          >
            {state === "submitting" ? "Submitting…" : "Submit claim"}
          </Button>
        </form>
      )}
    </FullShell>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
      />
    </div>
  );
}
