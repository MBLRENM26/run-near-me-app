import { describe, expect, it } from "vitest";
import { classifyDestinationRole } from "./destination-role";

describe("classifyDestinationRole", () => {
  it("classifies event-specific registration-provider URLs as booking_destination", () => {
    expect(
      classifyDestinationRole("https://www.sientries.co.uk/event.php?elid=12345"),
    ).toBe("booking_destination");
    expect(
      classifyDestinationRole("https://scottishathletics.justgo.com/events/abc"),
    ).toBe("booking_destination");
  });

  it("does not claim booking for a bare registration-provider homepage", () => {
    expect(classifyDestinationRole("https://www.sientries.co.uk/")).toBe(
      "official_information",
    );
  });

  it("classifies trusted non-booking destinations as official_information", () => {
    expect(classifyDestinationRole("https://www.londonmarathon.co.uk/")).toBe(
      "official_information",
    );
    expect(
      classifyDestinationRole("https://www.runbournemouth.com/races/10k"),
    ).toBe("official_information");
  });

  it("uses explicit URL evidence for ballot_waitlist", () => {
    expect(
      classifyDestinationRole("https://www.londonmarathon.co.uk/enter/ballot"),
    ).toBe("ballot_waitlist");
    expect(
      classifyDestinationRole("https://entrycentral.com/race?mode=waitlist"),
    ).toBe("ballot_waitlist");
  });

  it("uses explicit CTA evidence for ballot_waitlist", () => {
    expect(
      classifyDestinationRole(
        "https://www.sientries.co.uk/event.php?elid=1",
        "Join the waiting list",
      ),
    ).toBe("ballot_waitlist");
    expect(
      classifyDestinationRole("https://example-race.co.uk/entries", "Enter ballot"),
    ).toBe("ballot_waitlist");
  });

  it("returns unknown for aggregator, missing or unparseable URLs", () => {
    expect(classifyDestinationRole("https://findarace.com/race/x")).toBe("unknown");
    expect(classifyDestinationRole(null)).toBe("unknown");
    expect(classifyDestinationRole("")).toBe("unknown");
    expect(classifyDestinationRole("not a url")).toBe("unknown");
  });

  it("does not infer ballot from unrelated CTA labels", () => {
    expect(
      classifyDestinationRole("https://example-race.co.uk/entries", "Enter now"),
    ).toBe("official_information");
  });
});
