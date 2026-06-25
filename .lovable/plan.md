## Plan: Hide 21 events

All 21 IDs in `ALL-hidden-sql.sql` matched live rows (all currently `ACTIVE`). `HIDDEN` is already a valid `status` value, so this is a pure data update — no schema migration, no enrichment pipeline needed.

### Heads-up on naming
You mentioned East Finchley HM, Titan Ultra Fest, and Regent's Park Sep. The file resolves to:
- ✅ Regent's Park 5K & 10K September
- ❌ No East Finchley HM in the 21
- ❌ No Titan Ultra Fest in the 21

The 21 rows that WILL be hidden:
Finsbury Park HM & 10K Oct, Great Newham London Run, Halesowen Triathlon, Hampton Court Palace 10K Dec, Hampton Court Palace 10K Nov, Hereford Couriers 5K Race 5, Hyde Park 5K & 10K Dec, Ironbridge HM Autumn, Pedal Paddle Peak (Jurassic Coast), Regent's Park 5K & 10K Sep, Richmond Park Marathon & HM Nov, Severn Bridge Half, St. Cassian's Challenge, Stafford HM, Tempo Summer 5K Race 5, The Herefordshire Hobbler, The One In The Park Richmond Sep, Wimbledon HM & 10K Oct, Wimbledon Trail Race 4, Worcestershire Midweek Kidderminster 10K, Worcestershire Midweek Race 5.

Confirm you're happy with this list (or send a revised SQL including East Finchley HM / Titan Ultra Fest) and I'll run a single `UPDATE events SET status='HIDDEN' WHERE id IN (...)` via the insert tool. Expected: 21 rows updated.
