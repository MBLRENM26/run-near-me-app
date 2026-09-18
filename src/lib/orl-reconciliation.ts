/**
 * Read-only ORL (Organiser Review Layer) reconciliation.
 *
 * This module answers one question per future occurrence: how do the clues we
 * already hold connect — or fail to connect — to the existing private ORL
 * evidence graph (organisations, aliases, platform accounts, identity
 * evidence, typed organisation_event_links, reviews, seed quarantine)?
 *
 * Doctrine (D74/D75):
 * - ORL is the evidence-resolution authority. This module NEVER writes, never
 *   stages, and never reduces evidence to a flat organiser name.
 * - Channel and role are separate. A Facebook endpoint may support identity or
 *   official-information authority; an SI Entries / Eventrac / EntryCentral
 *   record may support occurrence identity and the runner's action
 *   destination. Neither host alone makes anyone the organiser.
 * - Host-only agreement on a multi-tenant, social or entry platform is never
 *   sufficient: full endpoint URL, path, tenant slug or platform identifier is
 *   required, otherwise the clue is retained as candidate evidence only.
 * - Several possible organisations means `ambiguous`. Never silently pick one.
 * - Demand signals (search clicks, reminder requests) order review only. They
 *   are never identity or trust evidence and carry no runner PII.
 */

import { classifyEventLink, isEntryPlatformHost, normalizeUrl } from "@/lib/link-trust";

/** Social / community endpoints: identity or official-information channels. */
const SOCIAL_HOSTS = [
  "facebook.com",
  "fb.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "tiktok.com",
  "strava.com",
];

export function isSocialHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const h = host.replace(/^www\./, "").toLowerCase();
  return SOCIAL_HOSTS.some((s) => h === s || h.endsWith(`.${s}`));
}

/** Hosts where many unrelated organisations live behind one domain. */
export function isSharedPlatformHost(host: string | null | undefined): boolean {
  return isEntryPlatformHost(host) || isSocialHost(host);
}

// ---------------------------------------------------------------------------
// Clue bundle
// ---------------------------------------------------------------------------

export type ClueRole =
  | "identity" // may support who the organisation is
  | "official_information" // may support the authoritative information source
  | "action_destination" // where a runner acts (entry / booking)
  | "occurrence" // supports that this occurrence exists as dated
  | "provisional"; // unreviewed intake clue only

export type ClueKind =
  | "organiser_website"
  | "entry_platform_record"
  | "social_endpoint"
  | "governing_body_source"
  | "current_organiser_text"
  | "club_link";

export type EventClue = {
  kind: ClueKind;
  role: ClueRole;
  label: string;
  /** Full endpoint retained — never reduced to a host. */
  url: string | null;
  host: string | null;
  /** Tenant sub-domain label on a multi-tenant platform, when derivable. */
  tenant: string | null;
  /** Full path, retained because event-specific paths carry the evidence. */
  path: string | null;
  /** True when the clue sits on a shared/multi-tenant/social host. */
  shared_host: boolean;
};

export type ReconciliationEventInput = {
  id: string;
  slug: string | null;
  name: string;
  sort_date: string | null;
  town: string | null;
  county: string | null;
  source: string | null;
  organiser: string | null;
  organiser_type: string | null;
  organiser_club_id: string | null;
  organiser_url: string | null;
  entry_url: string | null;
};

function urlClue(
  raw: string | null | undefined,
  kind: ClueKind,
  role: ClueRole,
  label: string,
): EventClue | null {
  const u = normalizeUrl(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const labels = host.split(".");
  const shared = isSharedPlatformHost(host);
  const tenant = shared && labels.length > 2 ? labels[0] : null;
  const path = u.pathname === "/" ? null : u.pathname + (u.search || "");
  return { kind, role, label, url: u.href, host, tenant, path, shared_host: shared };
}

/**
 * Build the typed clue bundle for one occurrence from stored fields only.
 * No network, no writes, no inference of a relationship from a host.
 */
export function buildClueBundle(event: ReconciliationEventInput): EventClue[] {
  const clues: EventClue[] = [];

  const organiserLink = classifyEventLink(event.organiser_url);
  if (organiserLink.host) {
    const shared = isSharedPlatformHost(organiserLink.host);
    const social = isSocialHost(organiserLink.host);
    const clue = urlClue(
      event.organiser_url,
      social ? "social_endpoint" : shared ? "entry_platform_record" : "organiser_website",
      social ? "identity" : shared ? "official_information" : "identity",
      social
        ? "Social endpoint held as organiser link"
        : shared
          ? "Organiser link sits on a shared platform"
          : "Organiser-owned website",
    );
    if (clue) clues.push(clue);
  }

  const entryLink = classifyEventLink(event.entry_url);
  if (entryLink.host) {
    const social = isSocialHost(entryLink.host);
    const clue = urlClue(
      event.entry_url,
      social ? "social_endpoint" : "entry_platform_record",
      social ? "official_information" : "action_destination",
      social ? "Social endpoint held as entry link" : "Event-specific entry / booking record",
    );
    if (clue) clues.push(clue);
  }

  if (event.source) {
    clues.push({
      kind: "governing_body_source",
      role: "occurrence",
      label: `Source / governing-body observation: ${event.source}`,
      url: null,
      host: null,
      tenant: null,
      path: null,
      shared_host: false,
    });
  }

  if (event.organiser && event.organiser.trim()) {
    clues.push({
      kind: "current_organiser_text",
      role: "provisional",
      label: `Current flat organiser text: ${event.organiser.trim()}`,
      url: null,
      host: null,
      tenant: null,
      path: null,
      shared_host: false,
    });
  }

  if (event.organiser_club_id) {
    clues.push({
      kind: "club_link",
      role: "identity",
      label: "Existing organiser_club_id on the public projection",
      url: null,
      host: null,
      tenant: null,
      path: null,
      shared_host: false,
    });
  }

  return clues;
}

// ---------------------------------------------------------------------------
// ORL graph (read-only snapshot)
// ---------------------------------------------------------------------------

export type OrlOrganisation = {
  id: string;
  canonical_name: string;
  website_domain: string | null;
  status: string;
};
export type OrlAlias = { organisation_id: string; alias_name: string; alias_type: string };
export type OrlPlatformAccount = {
  organisation_id: string;
  platform: string;
  account_url: string | null;
  tenant_slug: string | null;
  platform_identifier: string | null;
  confidence: string;
};
export type OrlEvidence = {
  id: string;
  source_url: string;
  evidence_type: string;
  supporting_fact: string | null;
};
export type OrlLink = {
  id: string;
  event_id: string;
  organisation_id: string;
  relationship: string;
  confidence: string;
  review_status: string;
};
export type OrlUnresolved = {
  reason: string;
  csv_row_number: number;
  candidate_event_ids: string[];
};

export type OrlGraph = {
  organisations: OrlOrganisation[];
  aliases: OrlAlias[];
  platform_accounts: OrlPlatformAccount[];
  /** Evidence attributed to an organisation via alias / platform-account rows. */
  evidence_by_organisation: Array<{ organisation_id: string; evidence: OrlEvidence }>;
  links: OrlLink[];
  /** Evidence row counts per link id. */
  link_evidence_counts: Record<string, number>;
  /** Append-only review row counts per link id. */
  link_review_counts: Record<string, number>;
  unresolved: OrlUnresolved[];
};

export type DemandSignals = { search_clicks: number; reminder_requests: number };

export type ReconciliationState =
  | "linked_in_orl"
  | "candidate_match"
  | "ambiguous"
  | "unmatched"
  | "unresolved_seed";

/** The kind of exact, explainable clue that produced a candidate. */
export type CandidateBasisKind =
  | "organiser_owned_domain"
  | "canonical_name"
  | "alias_name"
  | "platform_account_endpoint"
  | "platform_tenant"
  | "evidence_url"
  | "existing_link";

/**
 * A single explainable basis for a candidate. Retained structurally (not just
 * as prose) so Step 2 staging can decide, deterministically, which typed
 * relationship and which evidence provenance a proposal may carry.
 */
export type CandidateBasis = {
  kind: CandidateBasisKind;
  /** Full endpoint the basis rests on, when the basis is URL-bearing. */
  url: string | null;
  /** Existing identity_evidence id when the basis is an exact ORL evidence row. */
  evidence_id: string | null;
  /** True when the URL sits on a shared / multi-tenant / social host. */
  shared_host: boolean;
  detail: string;
};

export type CandidateMatch = {
  organisation_id: string;
  organisation_name: string;
  organisation_status: string;
  /** Typed relationship the clue could support — never assumed to be `organises`. */
  suggested_relationship: "organises" | "entry_platform_hosts" | "source_suggests";
  reasons: string[];
  bases: CandidateBasis[];
};

export type LinkedDetail = {
  link_id: string;
  organisation_id: string;
  organisation_name: string;
  relationship: string;
  confidence: string;
  review_status: string;
  evidence_count: number;
  review_count: number;
  aliases: string[];
  platform_accounts: Array<{ platform: string; account_url: string | null; tenant: string | null }>;
};

export type ReconciliationRow = {
  event: ReconciliationEventInput;
  state: ReconciliationState;
  clues: EventClue[];
  candidates: CandidateMatch[];
  linked: LinkedDetail[];
  unresolved_reasons: string[];
  demand: DemandSignals;
  demand_total: number;
};

function normName(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normDomain(v: string | null | undefined): string | null {
  if (!v) return null;
  const host = normalizeUrl(v)?.hostname ?? v;
  const h = host
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
  return h.includes(".") ? h : null;
}

function normFullUrl(v: string | null | undefined): string | null {
  const u = normalizeUrl(v);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname.replace(/\/+$/, "");
  return `${host}${path}${u.search}`.toLowerCase();
}

function addCandidate(
  map: Map<string, CandidateMatch>,
  org: OrlOrganisation,
  relationship: CandidateMatch["suggested_relationship"],
  reason: string,
  basis: CandidateBasis,
) {
  const existing = map.get(org.id);
  if (existing) {
    if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
    existing.bases.push(basis);
    // A stronger identity claim upgrades the suggested relationship.
    if (relationship === "organises") existing.suggested_relationship = "organises";
    return;
  }
  map.set(org.id, {
    organisation_id: org.id,
    organisation_name: org.canonical_name,
    organisation_status: org.status,
    suggested_relationship: relationship,
    reasons: [reason],
    bases: [basis],
  });
}

/**
 * Classify one occurrence against the ORL graph. Pure and read-only.
 */
export function reconcileEvent(
  event: ReconciliationEventInput,
  graph: OrlGraph,
  demand: DemandSignals = { search_clicks: 0, reminder_requests: 0 },
): ReconciliationRow {
  const clues = buildClueBundle(event);
  const orgById = new Map(graph.organisations.map((o) => [o.id, o]));

  // --- Direct ORL links --------------------------------------------------
  const linkRows = graph.links.filter((l) => l.event_id === event.id);
  const linked: LinkedDetail[] = linkRows.map((l) => {
    const org = orgById.get(l.organisation_id);
    return {
      link_id: l.id,
      organisation_id: l.organisation_id,
      organisation_name: org?.canonical_name ?? "(unknown organisation)",
      relationship: l.relationship,
      confidence: l.confidence,
      review_status: l.review_status,
      evidence_count: graph.link_evidence_counts[l.id] ?? 0,
      review_count: graph.link_review_counts[l.id] ?? 0,
      aliases: graph.aliases
        .filter((a) => a.organisation_id === l.organisation_id)
        .map((a) => `${a.alias_name} (${a.alias_type})`),
      platform_accounts: graph.platform_accounts
        .filter((p) => p.organisation_id === l.organisation_id)
        .map((p) => ({
          platform: p.platform,
          account_url: p.account_url,
          tenant: p.tenant_slug ?? p.platform_identifier ?? null,
        })),
    };
  });

  // --- Candidate clues ---------------------------------------------------
  const candidates = new Map<string, CandidateMatch>();
  const urlClues = clues.filter((c) => c.url);
  const fullUrls = new Set(urlClues.map((c) => normFullUrl(c.url)).filter(Boolean) as string[]);

  for (const org of graph.organisations) {
    const domain = normDomain(org.website_domain);
    if (!domain || isSharedPlatformHost(domain)) continue;
    for (const clue of urlClues) {
      if (clue.host !== domain) continue;
      if (clue.shared_host) continue; // host-only on a shared host is never enough
      addCandidate(
        candidates,
        org,
        clue.kind === "organiser_website" ? "organises" : "source_suggests",
        `organiser-owned host ${clue.host} equals canonical organisation domain (${clue.url})`,
        {
          kind: "organiser_owned_domain",
          url: clue.url,
          evidence_id: null,
          shared_host: false,
          detail: `organiser-owned host ${clue.host} equals canonical organisation domain; role ${clue.role}${clue.path ? `, path ${clue.path}` : ""}`,
        },
      );
    }
  }

  const organiserText = normName(event.organiser);
  if (organiserText) {
    for (const org of graph.organisations) {
      if (normName(org.canonical_name) === organiserText) {
        addCandidate(
          candidates,
          org,
          "organises",
          `current organiser text exactly matches canonical name "${org.canonical_name}"`,
          {
            kind: "canonical_name",
            url: null,
            evidence_id: null,
            shared_host: false,
            detail: `current organiser text exactly matches canonical name "${org.canonical_name}"`,
          },
        );
      }
    }
    for (const alias of graph.aliases) {
      if (normName(alias.alias_name) !== organiserText) continue;
      const org = orgById.get(alias.organisation_id);
      if (!org) continue;
      addCandidate(
        candidates,
        org,
        "organises",
        `current organiser text exactly matches ${alias.alias_type} alias "${alias.alias_name}"`,
        {
          kind: "alias_name",
          url: null,
          evidence_id: null,
          shared_host: false,
          detail: `current organiser text exactly matches ${alias.alias_type} alias "${alias.alias_name}"`,
        },
      );
    }
  }

  for (const acct of graph.platform_accounts) {
    const org = orgById.get(acct.organisation_id);
    if (!org) continue;
    const acctUrl = normFullUrl(acct.account_url);
    const isEntryPlatform = isEntryPlatformHost(normDomain(acct.account_url));
    if (acctUrl && fullUrls.has(acctUrl)) {
      const clue = urlClues.find((c) => normFullUrl(c.url) === acctUrl);
      addCandidate(
        candidates,
        org,
        // Account ownership proves identity only. An exact endpoint match on a
        // non-entry platform (e.g. a Facebook/social account) identifies the
        // candidate organisation but never collapses channel evidence into an
        // event role, so it stays `source_suggests` unless an explicit typed
        // event-role fact exists.
        isEntryPlatform ? "entry_platform_hosts" : "source_suggests",
        `exact ${acct.platform} account endpoint match (${acct.account_url})`,
        {
          kind: "platform_account_endpoint",
          url: clue?.url ?? acct.account_url ?? null,
          evidence_id: null,
          shared_host: clue?.shared_host ?? true,
          detail: `exact ${acct.platform} account endpoint match (${acct.account_url})${clue?.tenant ? `, tenant ${clue.tenant}` : ""}${clue?.path ? `, path ${clue.path}` : ""}`,
        },
      );
      continue;
    }
    const identifier = acct.tenant_slug ?? acct.platform_identifier;
    if (!identifier) continue;
    const needle = identifier.trim().toLowerCase();
    if (!needle) continue;
    for (const clue of urlClues) {
      const tenantHit = clue.tenant?.toLowerCase() === needle;
      const pathHit = (clue.path ?? "")
        .toLowerCase()
        .split(/[/?&=]/)
        .filter(Boolean)
        .includes(needle);
      if (!tenantHit && !pathHit) continue;
      addCandidate(
        candidates,
        org,
        clue.kind === "entry_platform_record" ? "entry_platform_hosts" : "source_suggests",
        `${acct.platform} ${acct.tenant_slug ? "tenant" : "platform identifier"} "${identifier}" present in ${clue.url}`,
        {
          kind: "platform_tenant",
          url: clue.url,
          evidence_id: null,
          shared_host: clue.shared_host,
          detail: `${acct.platform} ${acct.tenant_slug ? "tenant" : "platform identifier"} "${identifier}" present in ${clue.url}${clue.path ? ` (path ${clue.path})` : ""}`,
        },
      );
    }
  }

  for (const { organisation_id, evidence } of graph.evidence_by_organisation) {
    const org = orgById.get(organisation_id);
    if (!org) continue;
    const evUrl = normFullUrl(evidence.source_url);
    if (!evUrl || !fullUrls.has(evUrl)) continue;
    addCandidate(
      candidates,
      org,
      "source_suggests",
      `exact evidence URL match (${evidence.evidence_type}: ${evidence.source_url})`,
      {
        kind: "evidence_url",
        url: evidence.source_url,
        evidence_id: evidence.id,
        shared_host: urlClues.find((c) => normFullUrl(c.url) === evUrl)?.shared_host ?? false,
        detail: `exact existing identity_evidence URL match (${evidence.evidence_type}: ${evidence.source_url})`,
      },
    );
  }

  // --- Seed quarantine ---------------------------------------------------
  const unresolved_reasons = graph.unresolved
    .filter((u) => u.candidate_event_ids.includes(event.id))
    .map((u) => `${u.reason} (seed row ${u.csv_row_number})`);

  // Only an ACCEPTED link is a confirmed ORL relationship. A link still in the
  // append-only review state machine (proposed / reopened / anything not yet
  // accepted) is reconciliation work, so it surfaces as a candidate instead;
  // a rejected link is neither confirmed nor a candidate.
  const acceptedLinks = linked.filter((l) => l.review_status === "accepted");
  for (const l of linked) {
    if (l.review_status === "accepted" || l.review_status === "rejected") continue;
    const org = orgById.get(l.organisation_id);
    if (!org) continue;
    addCandidate(
      candidates,
      org,
      l.relationship === "organises" ||
        l.relationship === "entry_platform_hosts" ||
        l.relationship === "source_suggests"
        ? l.relationship
        : "source_suggests",
      `existing ORL link awaiting review (${l.relationship}, status ${l.review_status})`,
    );
  }

  const candidateList = [...candidates.values()].sort((a, b) =>
    a.organisation_name.localeCompare(b.organisation_name),
  );

  let state: ReconciliationState;
  if (acceptedLinks.length > 0) state = "linked_in_orl";
  else if (unresolved_reasons.length > 0) state = "unresolved_seed";
  else if (candidateList.length > 1) state = "ambiguous";
  else if (candidateList.length === 1) state = "candidate_match";
  else state = "unmatched";

  return {
    event,
    state,
    clues,
    candidates: candidateList,
    linked,
    unresolved_reasons,
    demand,
    demand_total: demand.search_clicks + demand.reminder_requests,
  };
}

/** Demand orders review only — it never changes `state`. */
export function sortByReviewPriority(rows: ReconciliationRow[]): ReconciliationRow[] {
  return [...rows].sort(
    (a, b) =>
      b.demand_total - a.demand_total ||
      (a.event.sort_date ?? "").localeCompare(b.event.sort_date ?? "") ||
      a.event.name.localeCompare(b.event.name),
  );
}

export type ReconciliationTotals = {
  future_events: number;
  linked_in_orl: number;
  candidate_match: number;
  ambiguous: number;
  unmatched: number;
  unresolved_seed: number;
  /** Events whose only identity-bearing clue sits on a shared/social host. */
  shared_host_only: number;
  orl_coverage_pct: number;
};

/** Totals are computed over every row, before any display slicing. */
export function summariseReconciliation(rows: ReconciliationRow[]): ReconciliationTotals {
  const counts: Record<ReconciliationState, number> = {
    linked_in_orl: 0,
    candidate_match: 0,
    ambiguous: 0,
    unmatched: 0,
    unresolved_seed: 0,
  };
  let sharedHostOnly = 0;
  for (const row of rows) {
    counts[row.state] += 1;
    const identityClues = row.clues.filter((c) => c.url);
    if (identityClues.length > 0 && identityClues.every((c) => c.shared_host)) sharedHostOnly += 1;
  }
  return {
    future_events: rows.length,
    ...counts,
    shared_host_only: sharedHostOnly,
    orl_coverage_pct:
      rows.length === 0 ? 0 : Math.round((counts.linked_in_orl / rows.length) * 100),
  };
}
