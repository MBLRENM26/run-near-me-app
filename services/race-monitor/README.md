# RENM race-page pilot worker

Python 3.12 standard library only; no package installation or local model is required. The Docker base is pinned to a digest. The worker uses public HTTPS sources from an explicit private configuration, checks robots for every page/redirect, resolves and validates all DNS answers, pins the connected IP with hostname TLS verification, and bounds requests and bodies. It does not execute page scripts or follow entry/registration forms.

The worker records **page changes**, not extracted race facts. Evidence from HTML is untrusted text. An administrator reviews facts and prepares a typed correction or discovery separately. Dynamic pages can be noisy; measure this before expanding. JavaScript-only sources become explicit failures rather than inferred cancellations.

## Private configuration and state

Keep runtime files outside the public checkout. `sources.json` is `{ "version": 1, "sources": [...] }` using the registry objects described in `docs/renm/RENM-source-research-contract-v1.md`. Maximum 30 pages, minimum 24 hours per source. Paused sources are skipped. Replacing the URL under an existing source ID is refused. Runtime identity must have write access to its private state directory.

```sh
python monitor.py run --config /private/renm/sources.json --state /private/renm/monitor.sqlite
python monitor.py status --state /private/renm/monitor.sqlite
python monitor.py export --state /private/renm/monitor.sqlite --output /private/renm/evidence.json
python monitor.py backup --state /private/renm/monitor.sqlite --output /private/renm/backup.sqlite
```

Import the exported envelope in the admin research screen. Re-import is safe because observation IDs remain stable. File import does not acknowledge the local outbox; successful signed delivery does. The pilot stops collecting at 1,000 pending observations, requiring backlog review. Delivered evidence is retained locally; agree retention before sustained production use. The initial 14-day/30-source maximum stays comfortably below that bound with daily checks, but monitor actual disk usage and page noise.

For signed delivery, configure the same `RESEARCH_FEED_SECRET` on the application and provide a private `RESEARCH_FEED_SECRET_FILE` to the worker. Never place it in the image, repository or research output. Delivery uses the exact canonical JSON bytes and acknowledges only a successful response. Retry after network failure is safe. The endpoint does not accept corrections automatically.

```sh
python monitor.py deliver --state /private/renm/monitor.sqlite --endpoint https://runningeventsnearme.com/api/public/ingest/research
```

## Container and operating procedure

Set `RENM_SOURCE_CONFIG` and `RENM_STATE_DIR` to private absolute paths, and `RENM_WORKER_UID`/`RENM_WORKER_GID` to the owner of those files. `docker compose run --rm research` performs one due-source pass and exits; no scheduler is installed by the image. The service is capped at one CPU and 1 GiB RAM, has no writable root filesystem and drops capabilities. Existing host services are independent.

Pause by disabling the source in both registry and local config, or stop invoking the worker. A failed fetch retains the last successful hash and backs off from 15 minutes to 24 hours. Failure is never evidence of cancellation. Restore by stopping worker invocations, copying a consistent SQLite backup to a new private state path, and running status first. A restored outbox can be replayed; server-side IDs prevent duplicates. Use the original source configuration/IDs alongside the backup.

Tests: `python -m unittest -v test_monitor.py`. Do not run SQL bootstrap fixtures against an existing database.

## Scheduled six-source operating pilot

`pilot.py` performs one controlled cycle: verify the fixed configuration and 14-day window, fetch signed source controls, deliver the existing outbox, collect due sources, deliver new observations, write a report and verify a consistent daily SQLite backup. An admin pause takes effect at the next cycle; missing/mismatched controls fail closed. It stops new collection at 30 pending/held review items or 50 locally undelivered observations. Runtime storage is limited to 5 GB with at least 2 GB free; the latest 14 dated backups are retained. A `PAUSED` file in the state directory pauses collection and delivery. An expired pilot performs no network work.

The GET control request uses the same endpoint and secret as POST intake, signing `${timestamp}.sources`. The server returns only source IDs/URLs, enabled flags, intervals and the outstanding review count, with `Cache-Control: no-store`. The local allowlist cannot expand through this response, remotely disabled sources stay paused, and remote intervals cannot accelerate local policy. Failure is not evidence of race cancellation.

`run-pilot.py --runtime /absolute/private/runtime` launches an immutable local Docker image with the existing limits. The private directory contains `sources.json`, `pilot.json`, `deployment.json` (an image ID), `private/research-feed-secret` and `state/`. The secret is mounted read-only, never embedded in command arguments or the image. The wrapper stops only its named pilot container after a 15-minute timeout.

For an explicitly approved unattended host deployment, run `python3 install-service.py --runtime /absolute/private/runtime --install`. This requires existing user lingering (`loginctl show-user USER -p Linger`) and Docker access for that user. It copies the host launcher into the private runtime and installs `renm-research-pilot.service` and `.timer` in the user systemd manager. With lingering enabled and the runtime on a boot-mounted disk, collection starts without a desktop login or Codex. No sudo or new package is required on the current Ubuntu host.

The persistent timer runs at 00:00, 06:00, 12:00 and 18:00 UTC and two minutes after the user manager starts. Missed calendar triggers catch up once; daily/weekly due dates prevent catch-up bursts. A failed service retries after five minutes, including when Docker/network is not ready at boot. The pilot policy still stops all collection after fourteen days. A successful completion records the exact completed policy, and later timer firings skip it.

The launcher takes a host lock and reconciles an orphan container only when its name, purpose label, image and state mount identify this runtime. It records launch failures in `state/launcher-status.json`, handles service termination and leaves SQLite work replayable. Other containers are untouched. Backups remain separate from container storage. Monitor both the launch status and worker report timestamps, since a failed launch may leave an older successful worker report.

Use `systemctl --user status renm-research-pilot.timer`, `systemctl --user start renm-research-pilot.service`, and `journalctl --user -u renm-research-pilot.service`. Stop unattended execution with `systemctl --user disable --now renm-research-pilot.timer` followed by `systemctl --user stop renm-research-pilot.service`. The state/PAUSED marker also pauses network work. Codex's scheduled follow-up only reviews reports and findings; it must not run a competing collection loop. Host recovery tests use isolated state and timer fixtures; they do not require rebooting a shared machine.

Example policy (generate actual dates and the canonical source-config SHA locally):

```json
{"start_at":"2026-09-29T19:00:00+00:00","end_at":"2026-10-13T19:00:00+00:00","endpoint":"https://runningeventsnearme.com/api/public/ingest/research","source_config_sha256":"64 hex characters"}
```

Run the worker, operating and recovery tests: `python -m unittest -v test_monitor.py test_pilot.py test_service.py`.

## Off-host backup

An optional private `backup.json` selects an existing SSH alias and a bounded destination, for example `{"ssh_host":"m5","remote_directory":".local/share/renm-pilot-backups/2026-09-29"}`. The launcher uploads a daily recovery archive after a fresh worker report, including a checked SQLite backup, source configuration, pilot policy, image reference and run reports. It excludes the signing secret and SSH credentials. SSH uses strict host-key checking and no desktop agent; configure an already-trusted key before enabling this option.

The upload is verified by SHA-256 before replacing that day's remote archive. Transfer errors fail the service and trigger its retry. Data already collected stays in SQLite; unchanged/due-source checks prevent repeated fetching merely because a backup failed. Archives have private permissions; SSH encrypts transport. At-rest protection depends on the destination host's disk configuration. This bounded pilot creates at most one final archive per calendar day; agree retention before extending it.

For recovery, first stop this pilot's timer and service. Download a verified archive, restore its snapshot to a separate runtime and check SQLite integrity/outbox counts. Restore source IDs and the original policy, rebuild the pinned worker from the recorded repository revision if its local image was lost, and re-provision the signing secret securely. Validate the image and configuration before switching the service to recovered state. Never overwrite the active database during a restore drill. An expired pilot remains expired after restoration.
