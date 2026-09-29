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
