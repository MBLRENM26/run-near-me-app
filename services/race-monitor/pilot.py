"""One bounded pilot cycle. Invoked by the approved scheduled chat task."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import time

import monitor

ENDPOINT = 'https://runningeventsnearme.com/api/public/ingest/research'


def stamp(now):
    return datetime.fromtimestamp(now,timezone.utc).isoformat()


def config_hash(config):
    return hashlib.sha256(json.dumps(config,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def validate(config, policy, now):
    start=datetime.fromisoformat(policy['start_at']).timestamp()
    end=datetime.fromisoformat(policy['end_at']).timestamp()
    if not 0 < end-start <= 14*86400 or policy['endpoint'] != ENDPOINT:
        raise ValueError('invalid_pilot_bounds')
    if config.get('version') != 1 or not 1 <= len(config['sources']) <= 6:
        raise ValueError('pilot_source_limit')
    if len({s['id'] for s in config['sources']}) != len(config['sources']):
        raise ValueError('duplicate_pilot_source')
    if config_hash(config) != policy['source_config_sha256']:
        raise ValueError('source_configuration_changed_requires_review')
    for s in config['sources']:
        monitor.validate_url(s['url'])
        if type(s['enabled']) is not bool or type(s['interval_hours']) is not int or not 24 <= s['interval_hours'] <= 2160:
            raise ValueError('invalid_local_source_controls')
    return 'not_started' if now < start else 'complete' if now >= end else 'active'


def inventory(db):
    db.row_factory=sqlite3.Row
    return {
      'sources':[dict(r) for r in db.execute('select id,url,last_attempt,last_success,next_due,failures,error from sources order by id')],
      'pending_observations':db.execute('select count(*) from outbox where delivered=0').fetchone()[0],
      'delivered_observations':db.execute('select count(*) from outbox where delivered=1').fetchone()[0],
      'oldest_pending_capture':db.execute("select min(json_extract(payload,'$.evidence.captured_at')) from outbox where delivered=0").fetchone()[0],
    }


def backup(db, state, now):
    directory=state/'backups';directory.mkdir(exist_ok=True)
    target=directory/(datetime.fromtimestamp(now,timezone.utc).strftime('%Y-%m-%d')+'.sqlite')
    tmp=target.with_suffix('.tmp')
    with sqlite3.connect(tmp) as dest:
        db.backup(dest)
        if dest.execute('pragma quick_check').fetchone()[0] != 'ok':
            raise ValueError('backup_integrity_failed')
    tmp.replace(target)
    # Only rotate this worker's dated backup files; retain the latest 14.
    for old in sorted(directory.glob('????-??-??.sqlite'))[:-14]: old.unlink()
    return target.name


def run(config, policy, state, secret_path, now=None):
    now=time.time() if now is None else now
    state=Path(state);state.mkdir(parents=True,exist_ok=True)
    report={'started_at':stamp(now),'fetch':{},'delivered':0,'errors':[]}
    with (state/'pilot.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return {'status':'already_running'}
        phase=validate(config,policy,now)
        report['status']=phase
        if phase == 'active' and (state/'PAUSED').exists():report['status']='paused'
        db=monitor.connect(str(state/'monitor.sqlite'))
        try:
            if report['status']=='active':
                total=sum(p.stat().st_size for p in state.rglob('*') if p.is_file())
                if total > 5_000_000_000 or shutil.disk_usage(state).free < 2_000_000_000:
                    raise ValueError('storage_budget_or_free_space_limit')
                secret=Path(secret_path).read_text().strip()
                if len(secret)<32:raise ValueError('missing_or_short_signing_secret')
                sources,queue=monitor.source_controls(policy['endpoint'],secret,config)
                report['pending_review']=queue
                # Always attempt existing evidence delivery first; no new collection during backlog pressure.
                report['delivered']=monitor.deliver(db,policy['endpoint'],secret)
                if queue >= 30 or inventory(db)['pending_observations'] >= 50:
                    report['status']='review_backlog_paused'
                else:
                    counts=Counter()
                    for source in sources:
                        if time.time() >= datetime.fromisoformat(policy['end_at']).timestamp():break
                        counts[monitor.observe(db,source)] += 1
                        time.sleep(1)
                    report['fetch']=dict(counts)
                    report['delivered']+=monitor.deliver(db,policy['endpoint'],secret)
                    report['status']='attention' if counts['failed'] else 'ok'
        except Exception as exc:
            # Do not log raw HTTP payloads, credentials or arbitrary exception content.
            report['status']='attention'
            report['errors'].append(type(exc).__name__+':'+str(exc)[:160] if isinstance(exc,ValueError) else type(exc).__name__)
        finally:
            report.update(inventory(db))
            try:report['backup']=backup(db,state,now)
            except Exception as exc:report['errors'].append('backup:'+type(exc).__name__);report['status']='attention'
            db.close()
        report['finished_at']=stamp(time.time())
        runs=state/'runs';runs.mkdir(exist_ok=True)
        (runs/(datetime.fromtimestamp(now,timezone.utc).strftime('%Y%m%dT%H%M%S')+'.json')).write_text(json.dumps(report,indent=2)+'\n')
        tmp=state/'latest.tmp';tmp.write_text(json.dumps(report,indent=2)+'\n');tmp.replace(state/'latest.json')
        return report


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--config',required=True);ap.add_argument('--policy',required=True)
    ap.add_argument('--state',required=True);ap.add_argument('--secret-file',required=True)
    args=ap.parse_args();os.umask(0o077)
    result=run(json.loads(Path(args.config).read_text()),json.loads(Path(args.policy).read_text()),args.state,args.secret_file)
    print(json.dumps(result))
    raise SystemExit(1 if result.get('status')=='attention' else 0)


if __name__=='__main__':main()
