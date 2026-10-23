# Stage pass 5 race facts (223 races, 1,012 facts)

## What came back
- 223 races, all with a final outcome: 149 with facts, 47 old edition only, 14 nothing published, 12 couldn't confirm, 1 dead site.
- 1,012 facts, each with quote, source link, check time and a "provisional" flag.

## What I'll do
1. Run the files through the same private import used for passes 1–4 (same checks, safe to re-run).
2. Let the automatic rules approve clean facts. Only provisional wording, entry status, course maps, wrong editions and clashes with earlier research wait for you.
3. Approved facts then show in the race details box on those race pages, no extra publish step for data.
4. Report back: races covered, facts auto-approved, how many need you.
5. Note the 47 "old edition only" races and the dead site as a follow-up list (date checks, not facts).

## Technical details
- Use `importRichRaceResearch` validation path with race_facts_3.csv + race_fact_evidence.csv; map the `provisional` column into caveats so `triageFact` holds them.
- Verify counts with read queries; no schema change.
