import { describe, expect, it } from "vitest";
import { hasCurrentOrganiserReview } from "./event-organiser-review";

const event = { organiser: "Wells City Harriers", date_from: "2026-10-14", date_to: null, sort_date: "2026-10-14" };
const occurrence = { date_from: event.date_from, date_to: event.date_to, sort_date: event.sort_date };

describe("public organiser confirmation", () => {
  it("confirms an exact reviewed name for the current occurrence", () => {
    expect(hasCurrentOrganiserReview(event, { value: event.organiser, occurrence })).toBe(true);
  });
  it("does not carry confirmation into the next edition or across a changed end date", () => {
    expect(hasCurrentOrganiserReview({ ...event, date_from: "2027-10-13", sort_date: "2027-10-13" }, { value: event.organiser, occurrence })).toBe(false);
    expect(hasCurrentOrganiserReview({ ...event, date_to: "2026-10-15" }, { value: event.organiser, occurrence })).toBe(false);
  });
  it("qualifies changed, missing and unavailable evidence", () => {
    expect(hasCurrentOrganiserReview({ ...event, organiser: "Another organiser" }, { value: event.organiser, occurrence })).toBe(false);
    expect(hasCurrentOrganiserReview(event, null)).toBe(false);
    expect(hasCurrentOrganiserReview(event, { value: event.organiser, occurrence: null })).toBe(false);
  });
});
