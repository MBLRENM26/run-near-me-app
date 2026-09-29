"""Host launcher for the fixed pilot image; secrets enter only via a read-only file mount."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess

ap=argparse.ArgumentParser();ap.add_argument('--runtime',required=True);args=ap.parse_args()
root=Path(args.runtime).resolve();os.umask(0o077)
deploy=json.loads((root/'deployment.json').read_text());image=deploy['image_id']
if not re.fullmatch(r'sha256:[a-f0-9]{64}',image):raise ValueError('immutable_local_image_required')
mounts=[(root/'sources.json','/config/sources.json',True),(root/'pilot.json','/config/pilot.json',True),(root/'private/research-feed-secret','/private/research-feed-secret',True),(root/'state','/state',False)]
cmd=['docker','run','--rm','--pull=never','--name','renm-research-pilot','--label','renm.purpose=bounded-research-pilot','--read-only','--user',f'{os.getuid()}:{os.getgid()}','--cpus','1','--memory','1g','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=16m','--log-driver','json-file','--log-opt','max-size=5m','--log-opt','max-file=2','--entrypoint','python']
for src,dst,ro in mounts:
    if not src.exists():raise ValueError('missing_pilot_runtime_file:'+src.name)
    cmd+=['--mount',f'type=bind,src={src},dst={dst}'+(',readonly' if ro else '')]
cmd += [image,'/app/pilot.py','--config','/config/sources.json','--policy','/config/pilot.json','--state','/state','--secret-file','/private/research-feed-secret']
try:
    result=subprocess.run(cmd,timeout=900)
    raise SystemExit(result.returncode)
except subprocess.TimeoutExpired:
    subprocess.run(['docker','stop','--time','10','renm-research-pilot'],timeout=30,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    print(json.dumps({'status':'attention','error':'pilot_cycle_timeout'}))
    raise SystemExit(1)
