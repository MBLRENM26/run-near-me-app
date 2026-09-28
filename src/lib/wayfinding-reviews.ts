/** Public, occurrence-specific link reviews. No private import provenance.
 * A provider name is not evidence: each admission pins the row and both URLs.
 * Add reviews only after checking the destination's race, date and location.
 */
export type ReviewedDestinationKind =
  | "entry"
  | "official_details"
  | "listing"
  | "governing_listing"
  | "payment_instructions";
export type WayfindingRow = {
  id?: string | null;
  sort_date?: string | null;
  entry_url?: string | null;
  organiser_url?: string | null;
};
export type WayfindingReview = {
  expected: Required<WayfindingRow> & { id: string };
  reviewedOn: string;
  destinations: Array<{
    role: ReviewedDestinationKind;
    provider: string;
    label: string;
    href: string;
    /** Public page that established this destination's role for this occurrence. */
    evidenceUrl: string;
    note?: string;
  }>;
};

export const WAYFINDING_REVIEWS: readonly WayfindingReview[] = [
  {
    expected: {
      id: "4a88168e-5832-484f-837a-e9e8478caa4e",
      sort_date: "2026-10-18",
      entry_url: "https://www.entrycentral.com/event/128400",
      organiser_url: "https://www.entrycentral.com/event/128400",
    },
    reviewedOn: "2026-09-28",
    destinations: [
      {
        role: "entry",
        provider: "EntryCentral",
        label: "Check entry status at EntryCentral",
        href: "https://www.entrycentral.com/event/128400",
        evidenceUrl: "https://www.entrycentral.com/event/128400",
        note: "EntryCentral showed entries closed when reviewed. Check the linked page for changes.",
      },
    ],
  },
  {
    expected: {
      id: "e126736e-e04d-417c-95c4-7f3b53332759",
      sort_date: "2026-10-18",
      entry_url: "https://www.entrycentral.com/wyrewizardautumn",
      organiser_url: "https://www.entrycentral.com/wyrewizardautumn",
    },
    reviewedOn: "2026-09-28",
    destinations: [
      {
        role: "entry",
        provider: "EntryCentral",
        label: "Check entries at EntryCentral",
        href: "https://www.entrycentral.com/wyrewizardautumn",
        evidenceUrl: "https://www.entrycentral.com/wyrewizardautumn",
        note: "This page covers the trail half marathon and Super Seven. Choose your distance and check current availability there.",
      },
    ],
  },
  {
    expected: {
      id: "92a0b167-d208-4721-8c9f-b00a7b522f9c",
      sort_date: "2026-10-02",
      entry_url: "https://findarace.com/events/dartmoor-way-full-circle-100-granite-50",
      organiser_url: "https://outeredge-events.com/",
    },
    reviewedOn: "2026-09-28",
    destinations: [
      {
        role: "listing",
        provider: "Find a Race",
        label: "View listing on Find a Race",
        href: "https://findarace.com/events/dartmoor-way-full-circle-100-granite-50",
        evidenceUrl: "https://findarace.com/events/dartmoor-way-full-circle-100-granite-50",
        note: "The listing covers Full Circle on 2 October and Granite 50 on 3 October. Both entry options showed closed when reviewed; check for updates.",
      },
      {
        role: "official_details",
        provider: "OuterEdge Events",
        label: "Visit OuterEdge Events",
        href: "https://outeredge-events.com/",
        evidenceUrl: "https://findarace.com/events/dartmoor-way-full-circle-100-granite-50",
      },
    ],
  },
  {
    expected: {
      id: "9e477b63-2e3b-493a-a8ec-84363b873b3b",
      sort_date: "2027-02-14",
      entry_url: "https://www.sientries.co.uk/event.php?elid=Y&event_id=17387",
      organiser_url: "https://www.sientries.co.uk/event.php?elid=Y&event_id=17387",
    },
    reviewedOn: "2026-09-28",
    destinations: [
      {
        role: "entry",
        provider: "SI Entries",
        label: "Check entries at SI Entries",
        href: "https://www.sientries.co.uk/event.php?event_id=17387",
        evidenceUrl: "https://www.sientries.co.uk/event.php?event_id=17387",
        note: "Check the provider for opening dates and current availability. The club page has race information for the 14 February 2027 occurrence.",
      },
      {
        role: "official_details",
        provider: "Stamford Striders",
        label: "Read Stamford Striders race information",
        href: "https://www.stamfordstriders.org/Pages/St-Valentines-30k",
        evidenceUrl: "https://www.sientries.co.uk/event.php?event_id=17387",
      },
    ],
  },
];

export function findWayfindingReview(row: WayfindingRow): WayfindingReview | undefined {
  return WAYFINDING_REVIEWS.find(
    ({ expected }) =>
      row.id === expected.id &&
      row.sort_date === expected.sort_date &&
      (row.entry_url ?? null) === expected.entry_url &&
      (row.organiser_url ?? null) === expected.organiser_url,
  );
}
