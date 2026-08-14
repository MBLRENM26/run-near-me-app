# RENM soft-404 residual acceptance

Date: 14 August 2026

Package: `renm-soft404-residual-2026-08-13`

Status: read-only production acceptance harness

## Purpose

This harness verifies the reviewed soft-404 cohort after the production data
migration. It performs HTTP GET requests only. It does not authenticate, write
database rows, deploy, publish, mutate GSC state or follow entry links.

The cohort is held in
`scripts/soft404-residual-acceptance-manifest.json`:

- 43 canonical event candidates;
- 13 direct duplicate redirects;
- two retired Athens paths.

The canonical facts and reviewed official URLs are derived from the stable-ID
patch payload in
`supabase/migrations/20260813201539_renm_soft404_residual.sql`. This keeps the
acceptance evidence tied to the exact reviewed mutation rather than copying it
into another hand-maintained table.

## Run

```powershell
npm run verify:soft404
```

Useful options:

```powershell
npm run verify:soft404 -- --verbose
npm run verify:soft404 -- --json
npm run verify:soft404 -- --base-url https://runningeventsnearme.com
```

The command exits `0` only when the complete cohort passes. JSON mode is
intended for attaching an exact dated result to a PR or operational record.

## Canonical acceptance

Each canonical candidate must have:

- a direct `200` response;
- an exact self-canonical URL;
- no `noindex` meta or `X-Robots-Tag`;
- a server-rendered title and description;
- valid Event JSON-LD with name, start date and location;
- the Event name, year and location visible in server-rendered HTML;
- reviewed changed identity, location, distance, organiser and date facts
  visible where the migration changed those fields;
- reviewed changed trusted official/entry URLs rendered as links; aggregator
  evidence URLs remain deliberately unrendered under the site-wide trust gate;
- otherwise, an event-specific official/entry destination in the page or
  structured data;
- exactly one sitemap occurrence;
- no links to any retired alias in the checked cohort.

## Redirect and retirement acceptance

Each alias must return a direct `301` to its exact survivor. The target must
return `200` without another redirect, and the alias must be absent from the
sitemap.

Both Athens paths must return `404` or `410` and remain absent from the
sitemap.

The associated repository test also scans rendered route/component source for
hard-coded retired aliases.

The sitemap request uses a unique query string so acceptance sees the current
database state without purging or changing the one-hour public CDN cache.

## Decision rule

A failing canonical is not eligible for GSC validation. Review its exact
failure first and make only evidence-backed, occurrence-specific corrections.
Do not weaken the harness to turn an unsupported or non-indexable page green.

The clean passing URL set is the only set eligible for later GSC validation.
GSC submission itself remains a separate, explicitly approved operation.
