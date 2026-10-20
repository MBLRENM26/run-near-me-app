# Stage the 81-race retry results privately

The targeted retry came back small: 16 of the 81 races gained facts (44 evidence rows). Of the rest, 35 pages are still unavailable, 5 only show another year's edition, and 25 don't state the facts we look for. The agent's request log covers the run the facts came from, with no requests under one second apart, but one earlier attempt left no log.

## What happens

1. Load the retry as a third private batch through the existing "Stage race facts" import. Nothing is overwritten. The checks are the same as before, and facts that clash with earlier passes are flagged.
2. Record the agent's logging limitation on the batch, so it shows on the review screen.
3. Keep the request log with the research notes as an audit file. It is not imported as facts.
4. Read back the review screen: 16 races and 44 facts, with any flags listed. The race records must stay unchanged.

## Advice on further passes

Another full retry is not worth it. What remains is mostly blocked sites or races that haven't published details yet. A better option is one small pass about four weeks before each race date, when organisers post race-day information.

## Not included

Publishing facts, or showing them on race pages. That remains a separate approval.
