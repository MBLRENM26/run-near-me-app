# RENM event-page information-depth QL1 preview and production acceptance — 15 August 2026

Status: **PRODUCTION ACCEPTED — 15 AUGUST 2026**

Authority basis:

- `RENM-CURRENT.md`;
- `RENM-event-page-information-depth-gap-map-2026-08-15.md`;
- D71, D74 and D76;
- gap-map/control-plane basis commit `8daa9e410d995579de8d761b739af40cf9a2d936`;
- review task `01a0002c-eba7-7ac3-be4e-98fcb320ff1b`.

## Bounded outcome

QL1 separates the public association/governance label from the canonical licence state already held in `events.licensed`.

- Only a trimmed, case-insensitive exact `licensed='true'` may produce a green `... permitted` badge.
- Null, `false`, malformed and legacy free-text licence values fail closed to a neutral body label; raw values are never rendered.
- FNUL therefore becomes neutral `England Athletics`, while supported Sedgefield and Rubber Ducky states remain `England Athletics permitted` and `TRA permitted`.
- Discovery/indexability trust gates are deliberately unchanged in QL1.
- Private `source` and `source_url` remain stripped from the public event payload.

Application preview baseline: `5de1e45449d4ac7dce1419f8c48ba1d9f2336cc8`.

Code-only licence-semantics commit: `6b4b645b3b7f460e445a8839b31fc49aeb99af7e`.

Cumulative application production head: `4cb0f2280a3b8a8e5a904b2a2056ae72dc037ed9`, a direct transition-safe descendant of `67205aa8b93947639df047a7686deaf9df361203`.

The cumulative head includes one exact Sedgefield manifest transition guard. It accepts only the current identity pair (`null`, `governing_body`) or the proposed pair (`Sedgefield Harriers`, `club`) so that deploy-before-data-write cannot remove the reviewed five-link panel. Cross-pairs and spelling variants fail closed.

Verification: 30/30 focused manifest tests and 201/201 full tests pass; typecheck, scoped lint/format checks and production build pass.

## Production acceptance and recovery record

Mike explicitly approved QL1 production execution on 15 August 2026.

- The first publish (`385b68ab-04b1-4f21-80ee-367319ef42e1`) exposed the QL1 licence semantics but was built from stale deployment metadata and did not contain the Sedgefield transition guard. The approved mutation was applied once, the missing five-link panel was detected immediately, and the exact rollback transaction restored the reviewed before-state.
- The private audit chain retains that recovery history: forward `0df1398e-0f30-4509-9f9c-69d907f03a1b`, rollback `666a873e-25c3-4e23-9642-8667e74edeca`.
- GitHub `main` and Lovable were advanced to `4cb0f2280a3b8a8e5a904b2a2056ae72dc037ed9` with a non-runtime deployment anchor; the transition safeguard and its tests remained unchanged. Replacement production deployment: `f792f012-96d9-481a-8e62-55845076d5e1`.
- The replacement pre-write smoke test showed Sedgefield in the reviewed `NULL` / `governing_body` state with all five exits. The exact approved transaction was then re-applied and created forward audit `3f62c978-485d-42b7-ab33-4a725f6f3eb5`.
- Final canonical state: `organiser='Sedgefield Harriers'`, `organiser_type='club'`, `organiser_club_id=NULL`, `governance='england_athletics'`, `licensed='true'`.
- Live acceptance passed: Sedgefield shows `England Athletics permitted`, `Club-organised`, the organiser line and five reviewed exits; Saturn shows two exits and `TRA permitted`; FNUL shows neutral `England Athletics` and two exits; Rubber Ducky shows `TRA permitted` and three exits; Hertfordshire shows two exits and retains the on-page `Course and elevation` module. No browser console errors were observed.

No schema, club entity, provenance exposure, outreach, filter, bulk enrichment or unrelated data change was made. The transition alternative remains temporary and requires a separately verified cleanup after the production state has remained stable.

## Exact event-row preview

Only one public event row changes.

| Field | Before | After |
| --- | --- | --- |
| `events.id` | `c8eea9cc-0d2a-4db4-8bac-a7040b43dd59` | unchanged |
| `organiser` | `NULL` | `Sedgefield Harriers` |
| `organiser_type` | `governing_body` | `club` |
| `organiser_club_id` | `NULL` | unchanged; club-entity coverage is QL3 |
| `governance` | `england_athletics` | unchanged |
| `licensed` | `true` | unchanged |

Evidence:

- `https://sedgefieldharriers.co.uk/sedgefield-serpentine/`
- `https://www.englandathletics.org/runevents/search/?query=Sedgefield%20Serpentine%202026`

No club row is created. No FK is invented. Registration provider, licensing body/state and organiser identity remain separate.

## Exact forward transaction preview

The transaction is preconditioned on the reviewed before-state and aborts unless exactly one event row is changed. The second row is the private, service-role-only audit record.

```sql
begin;

do $ql1$
declare
  v_organiser text;
  v_organiser_type public.event_organiser_type;
  v_changed integer;
begin
  select organiser, organiser_type
    into v_organiser, v_organiser_type
  from public.events
  where id = 'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59'
  for update;

  if not found
     or v_organiser is not null
     or v_organiser_type is distinct from 'governing_body'::public.event_organiser_type then
    raise exception 'QL1 Sedgefield precondition failed: organiser=%, organiser_type=%',
      v_organiser, v_organiser_type;
  end if;

  update public.events
  set organiser = 'Sedgefield Harriers',
      organiser_type = 'club'::public.event_organiser_type
  where id = 'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59';

  get diagnostics v_changed = row_count;
  if v_changed <> 1 then
    raise exception 'QL1 Sedgefield update changed % rows, expected 1', v_changed;
  end if;

  insert into public.event_edits (event_id, changes, note)
  values (
    'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59',
    jsonb_build_object(
      'action', 'renm_event_page_information_depth_ql1',
      'package', 'renm-event-page-information-depth-ql1-2026-08-15',
      'control_plane_basis_commit', '8daa9e410d995579de8d761b739af40cf9a2d936',
      'approval_thread_id', '01a0002c-eba7-7ac3-be4e-98fcb320ff1b',
      'decisions', jsonb_build_array('D71', 'D74', 'D76'),
      'diff', jsonb_build_object(
        'organiser', jsonb_build_object('before', null, 'after', 'Sedgefield Harriers'),
        'organiser_type', jsonb_build_object('before', 'governing_body', 'after', 'club')
      ),
      'evidence_urls', jsonb_build_array(
        'https://sedgefieldharriers.co.uk/sedgefield-serpentine/',
        'https://www.englandathletics.org/runevents/search/?query=Sedgefield%20Serpentine%202026'
      ),
      'retained', jsonb_build_object(
        'governance', 'england_athletics',
        'licensed', 'true',
        'organiser_club_id', null
      ),
      'deferred', jsonb_build_array('club entity creation', 'organiser_club_id linkage', 'national organiser graph')
    ),
    'Approved bounded QL1 organiser identity correction; existing schema; reversible; no club entity or outreach.'
  );
end
$ql1$;

commit;
```

## Exact rollback preview

Rollback restores the reviewed before-state and appends a second private audit record; it does not delete history.

```sql
begin;

do $ql1_rollback$
declare
  v_organiser text;
  v_organiser_type public.event_organiser_type;
  v_forward_edit_id uuid;
  v_changed integer;
begin
  select organiser, organiser_type
    into v_organiser, v_organiser_type
  from public.events
  where id = 'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59'
  for update;

  if not found
     or v_organiser is distinct from 'Sedgefield Harriers'
     or v_organiser_type is distinct from 'club'::public.event_organiser_type then
    raise exception 'QL1 rollback precondition failed: organiser=%, organiser_type=%',
      v_organiser, v_organiser_type;
  end if;

  select id
    into v_forward_edit_id
  from public.event_edits
  where event_id = 'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59'
    and changes->>'action' = 'renm_event_page_information_depth_ql1'
  order by edited_at desc
  limit 1;

  if v_forward_edit_id is null then
    raise exception 'QL1 rollback audit precondition failed: forward audit not found';
  end if;

  update public.events
  set organiser = null,
      organiser_type = 'governing_body'::public.event_organiser_type
  where id = 'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59';

  get diagnostics v_changed = row_count;
  if v_changed <> 1 then
    raise exception 'QL1 rollback changed % rows, expected 1', v_changed;
  end if;

  insert into public.event_edits (event_id, changes, note)
  values (
    'c8eea9cc-0d2a-4db4-8bac-a7040b43dd59',
    jsonb_build_object(
      'action', 'renm_event_page_information_depth_ql1_rollback',
      'package', 'renm-event-page-information-depth-ql1-2026-08-15',
      'reverses_event_edit_id', v_forward_edit_id,
      'diff', jsonb_build_object(
        'organiser', jsonb_build_object('before', 'Sedgefield Harriers', 'after', null),
        'organiser_type', jsonb_build_object('before', 'club', 'after', 'governing_body')
      )
    ),
    'Rollback of bounded QL1 Sedgefield organiser correction; forward audit retained.'
  );
end
$ql1_rollback$;

commit;
```

## Review-time page states

| Page | Code-only preview against current production rows | Final state after separately approved write |
| --- | --- | --- |
| FNUL | neutral `England Athletics`; no permit claim | same |
| Rubber Ducky | green `TRA permitted`; trail badge and three signposts unchanged | same |
| Sedgefield | green `England Athletics permitted`; temporary old `Governing body`; five signposts retained | `Club-organised`; `Organised by: Sedgefield Harriers`; five signposts retained |
| Hertfordshire | no governance badge; `Commercial event`; two signposts and embedded course selector unchanged | same |

## Safe execution sequence after explicit preview approval

1. Re-read application head and the exact Sedgefield before-state.
2. Publish the cumulative code head with the exact two-state manifest guard.
3. Smoke-test all four pages; Sedgefield must still have five destinations.
4. Execute the preconditioned two-row transaction (one event row plus one private audit row).
5. Re-read the event row and audit row; verify Sedgefield SSR/live wording and all four page regressions.
6. Roll back only if an acceptance check fails.
7. Remove the old Sedgefield manifest state in a separately verified cleanup after stability is confirmed.

No production write or deployment occurs until Mike approves this cumulative preview.
