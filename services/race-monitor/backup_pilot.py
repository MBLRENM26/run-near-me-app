"""Optional verified off-host recovery archive; never includes the signing secret."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import tarfile


def backup(root, report):
    config_path = root/'backup.json'
    if not config_path.exists():
        return None
    config = json.loads(config_path.read_text())
    host, directory = config['ssh_host'], config['remote_directory']
    if not re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,100}', host):
        raise ValueError('invalid_backup_host')
    if not re.fullmatch(r'\.local/share/renm-pilot-backups/[a-zA-Z0-9_-]+', directory):
        raise ValueError('invalid_backup_directory')
    name = report['backup']
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}\.sqlite', name):
        raise ValueError('invalid_backup_filename')
    snapshot = root/'state/backups'/name
    with sqlite3.connect('file:'+str(snapshot)+'?mode=ro',uri=True) as db:
        if db.execute('pragma quick_check').fetchone()[0] != 'ok':
            raise ValueError('backup_integrity_failed')
    archive = root/'state/recovery-transfer.tar.gz'
    tmp = archive.with_suffix('.tmp')
    files = [snapshot, root/'sources.json', root/'pilot.json', root/'deployment.json']
    files += sorted((root/'state/runs').glob('*.json'))
    # Explicit allowlist: no private/ directory, keys, SSH config, raw database journals or shell environment.
    with tarfile.open(tmp,'w:gz') as bundle:
        for path in files:
            bundle.add(path,arcname=str(path.relative_to(root)),recursive=False)
    tmp.replace(archive)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    target = directory+'/'+name.removesuffix('.sqlite')+'.tar.gz'
    options = ['-o','BatchMode=yes','-o','IdentityAgent=none','-o','ConnectTimeout=10',
               '-o','ServerAliveInterval=10','-o','ServerAliveCountMax=2','-o','StrictHostKeyChecking=yes']
    def command(args):
        return subprocess.run(args,check=True,capture_output=True,text=True,timeout=60).stdout
    status = {'at':datetime.now(timezone.utc).isoformat(),'host':host,'target':target,'sha256':digest}
    try:
        # Both path and hostname are restricted above; no shell interpolation from source pages.
        command(['ssh',*options,host,'umask 077; mkdir -p '+directory])
        command(['scp',*options,str(archive),host+':'+target+'.tmp'])
        remote_hash = command(['ssh',*options,host,'sha256sum '+target+'.tmp']).split()[0]
        if remote_hash != digest:
            raise ValueError('remote_backup_hash_mismatch')
        command(['ssh',*options,host,'chmod 600 '+target+'.tmp && mv '+target+'.tmp '+target])
        status['status'] = 'ok'
        return status
    except Exception as exc:
        status['status'] = 'attention';status['error'] = type(exc).__name__
        raise
    finally:
        dest = root/'state/offhost-backup-status.json'
        temp = dest.with_suffix('.tmp');temp.write_text(json.dumps(status,indent=2)+'\n');temp.replace(dest)
