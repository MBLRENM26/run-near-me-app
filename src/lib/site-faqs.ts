// Site-level FAQ content (single source of truth).
//
// These Q&As are about Running Events Near Me as a site — NOT about any
// specific race. The full set lives on /about and feeds its FAQPage
// JSON-LD. The event page surfaces a small "About this listing" subset
// (no JSON-LD there — the content is site-level, not event-specific).

export type SiteFaq = { id: string; q: string; a: string };

export const SITE_FAQS: SiteFaq[] = [
  {
    id: "what-is-renm",
    q: "What is Running Events Near Me?",
    a: "Running Events Near Me is an independent race discovery website that helps runners find running events by location, distance and event type. We want our users to find a variety of interesting and local events to enter as well as the larger events. Planning a trip away? Use Running Events Near Me to plan and find your next race!",
  },
  {
    id: "organiser",
    q: "Is Running Events Near Me the organiser of these races?",
    a: "No. Running Events Near Me is not the organiser of the races listed unless clearly stated. We provide race listings and link to official event or entry pages where available.",
  },
  {
    id: "enter",
    // Event-page wording (singular). The /about page uses the same Q text;
    // the answer applies in both contexts.
    q: "Can I enter races through Running Events Near Me?",
    a: "No. We do not currently process race entries or payments. If an entry link is available, we send you to the relevant event or entry page.",
  },
  {
    id: "where-from",
    q: "Where does the race information come from?",
    a: "Race listings are created from structured event data and checked where possible. We avoid adding unverified claims such as pricing, organiser details or entry status unless we have a trusted source.",
  },
  {
    id: "missing",
    q: "Why is some race information missing?",
    a: "Some races publish limited information or use entry pages that are hard to verify. We only publish trusted verified information for our users. When we are uncertain of data, we prefer to leave it out than publish it incorrectly.",
  },
  {
    id: "update",
    q: "How can I update or correct a race listing?",
    a: "If you organise a race or spot incorrect information, you can submit an update using the listing or event submission options on the site. We review updates before applying them. Updates are typically confirmed and published within 48 hours.",
  },
  {
    id: "list",
    q: "How can I list my race on Running Events Near Me?",
    a: "Race organisers can submit events through the \u201CList your event\u201D option. We use submitted details to improve coverage and help runners find accurate event information.",
  },
  {
    id: "link-choice",
    q: "How do you choose which event website to link to?",
    a: "Where possible, we link to the official event website, organiser page or recognised entry page. If we cannot verify a suitable link, we may show the listing without an entry link until better information is available.",
  },
];

const byId = (id: string): SiteFaq => {
  const f = SITE_FAQS.find((x) => x.id === id);
  if (!f) throw new Error(`SITE_FAQS missing id: ${id}`);
  return f;
};

/** Fixed 3 Qs shown on every event page's "About this listing" module. */
export const EVENT_PAGE_FAQ_IDS = ["organiser", "enter", "update"] as const;

/** Conditional 4th Q — only when the listing has no trusted link at all. */
export const EVENT_PAGE_WEAK_FAQ_ID = "missing";

export function eventPageFaqs(weak: boolean): SiteFaq[] {
  const base = EVENT_PAGE_FAQ_IDS.map(byId);
  return weak ? [...base, byId(EVENT_PAGE_WEAK_FAQ_ID)] : base;
}
