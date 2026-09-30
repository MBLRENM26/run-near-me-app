import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResearchEventFacts } from "./ResearchEventFacts";

describe("race fact review card", () => {
  it("shows field evidence and missing values without matching or applying automatically", () => {
    const html = renderToStaticMarkup(
      <ResearchEventFacts
        extraction={{
          version: 1,
          facts: [
            {
              field: "date_from",
              value: "2027-02-07",
              quote: "7 February 2027",
              locator: "text:heading",
            },
          ],
          missing_fields: ["entry_url"],
          issues: [],
        }}
        candidates={[
          { id: "existing-id", name: "Half Marathon", date_from: "2026-02-08", status: "ACTIVE" },
        ]}
      />,
    );
    expect(html).toContain("Database field");
    expect(html).toContain("7 February 2027");
    expect(html).toContain("Choose a record after checking its identity");
    expect(html).toContain("Existing values are preserved");
    expect(html).not.toContain("Apply reviewed correction");
    expect(html).not.toContain("Comparing record existing-id");
  });
  it("renders untrusted evidence as text", () => {
    const html = renderToStaticMarkup(
      <ResearchEventFacts
        extraction={{
          version: 1,
          facts: [
            {
              field: "name",
              value: "<script>bad()</script>",
              quote: "<img src=x onerror=bad()>",
              locator: "text:heading",
            },
          ],
          missing_fields: [],
          issues: [],
        }}
      />,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=");
    expect(html).toContain("No exact source URL match found");
  });
});
