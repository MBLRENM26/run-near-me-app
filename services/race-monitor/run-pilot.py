"""Host launcher: durable state, bounded container, safe recovery after interruption."""
import argparse
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import re
import signal
import subprocess

from backup_pilot import backup as offhost_backup

NAME = 'renm-research-pilot'
LABEL = 'bounded-research-pilot'


def docker(*args, check=True):
    return subprocess.run(['docker', *args], capture_output=True, text=True, timeout=30, check=check)


def owned_container(info, root, image):
    return (info.get('Config', {}).get('Labels', {}).get('renm.purpose') == LABEL
            and info.get('Config', {}).get('Image') == image
            and any(m.get('Source') == str(root/'state') and m.get('Destination') == '/state'
                    for m in info.get('Mounts', [])))


def reconcile_container(root, image):
    # The host lock prevents reclaiming a container belonging to another live launcher.
    result = docker('container', 'ls', '-aq', '--filter', 'name=^/'+NAME+'$')
    if not result.stdout.strip():
        return
    info = json.loads(docker('inspect', NAME).stdout)[0]
    if not owned_container(info, root, image):
        raise ValueError('container_name_owned_by_another_runtime')
    if info.get('State', {}).get('Running'):
        docker('stop', '--time', '10', NAME)
    # --rm may already have removed it after stop.
    if docker('container', 'ls', '-aq', '--filter', 'name=^/'+NAME+'$').stdout.strip():
        docker('rm', NAME)


def write_status(root, status, error=None):
    result = {'at': datetime.now(timezone.utc).isoformat(), 'status': status}
    if error:
        result['error'] = error
    target = root/'state'/'launcher-status.json'
    tmp = target.with_suffix('.tmp')
    tmp.write_text(json.dumps(result, indent=2)+'\n')
    tmp.replace(target)


def completed(root):
    marker = root/'state'/'completed-policy.json'
    return marker.exists() and json.loads(marker.read_text()) == json.loads((root/'pilot.json').read_text())


def run(root):
    root = Path(root).resolve()
    os.umask(0o077)
    (root/'state').mkdir(parents=True, exist_ok=True)
    with (root/'state'/'launcher.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 0
        if completed(root):
            return 0
        process = None
        image = None
        started = datetime.now(timezone.utc)
        previous = signal.getsignal(signal.SIGTERM)
        def interrupted(signum, frame):
            raise InterruptedError('service_stopped')
        signal.signal(signal.SIGTERM, interrupted)
        try:
            image = json.loads((root/'deployment.json').read_text())['image_id']
            if not re.fullmatch(r'sha256:[a-f0-9]{64}', image):
                raise ValueError('immutable_local_image_required')
            mounts = [(root/'sources.json','/config/sources.json',True),
                      (root/'pilot.json','/config/pilot.json',True),
                      (root/'private/research-feed-secret','/private/research-feed-secret',True),
                      (root/'state','/state',False)]
            for src, _, _ in mounts:
                if not src.exists():
                    raise ValueError('missing_pilot_runtime_file:'+src.name)
            reconcile_container(root, image)
            cmd = ['docker','run','--rm','--pull=never','--name',NAME,'--label','renm.purpose='+LABEL,
                   '--read-only','--user',f'{os.getuid()}:{os.getgid()}','--cpus','1','--memory','1g',
                   '--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges:true',
                   '--tmpfs','/tmp:rw,size=16m','--log-driver','json-file','--log-opt','max-size=5m',
                   '--log-opt','max-file=2','--entrypoint','python']
            for src, dst, ro in mounts:
                cmd += ['--mount', f'type=bind,src={src},dst={dst}'+(',readonly' if ro else '')]
            cmd += [image,'/app/pilot.py','--config','/config/sources.json','--policy','/config/pilot.json',
                    '--state','/state','--secret-file','/private/research-feed-secret']
            write_status(root, 'running')
            process = subprocess.Popen(cmd)
            code = process.wait(timeout=900)
            report = json.loads((root/'state'/'latest.json').read_text())
            if datetime.fromisoformat(report['finished_at']) < started:
                raise ValueError('stale_worker_report')
            offhost_backup(root, report)
            if code:
                raise ValueError('worker_exit_'+str(code))
            if report['status'] == 'complete':
                (root/'state'/'completed-policy.json').write_text((root/'pilot.json').read_text())
            write_status(root, report['status'])
            return 0
        except (Exception, KeyboardInterrupt) as exc:
            # Docker exceptions can contain command arguments; log only a bounded category.
            error = str(exc)[:120] if isinstance(exc, (ValueError, InterruptedError)) else type(exc).__name__
            write_status(root, 'attention', error)
            print(json.dumps({'status':'attention','error':error}), flush=True)
            return 1
        finally:
            signal.signal(signal.SIGTERM, previous)
            if process is not None and image is not None:
                try:
                    reconcile_container(root, image)
                except Exception:
                    pass  # Next launch also reconciles, after acquiring the host lock.
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=15)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--runtime', required=True)
    parser.add_argument('--check-active', action='store_true')
    args = parser.parse_args()
    root = Path(args.runtime).resolve()
    if args.check_active:
        try:
            return 1 if completed(root) else 0
        except Exception:
            # ExecCondition 255 is a failure, unlike 1 (a deliberate completed-policy skip).
            return 255
    return run(root)


if __name__ == '__main__':
    raise SystemExit(main())
