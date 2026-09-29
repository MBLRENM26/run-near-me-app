"""Explicit installation of the approved pilot as a lingering systemd user service."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess


def quoted(value):
    # systemd quoting, not shell quoting. Escape specifiers and command variables too.
    return '"'+str(value).replace('\\','\\\\').replace('"','\\"').replace('%','%%').replace('$','$$')+'"'


def units(root):
    runner = quoted(root/'bin'/'run-pilot.py')
    runtime = quoted(root)
    return {
      'renm-research-pilot.service': f'''[Unit]
Description=RENM bounded race-source research pilot
StartLimitIntervalSec=0

[Service]
Type=oneshot
ExecCondition=/usr/bin/python3 {runner} --runtime {runtime} --check-active
ExecStart=/usr/bin/python3 {runner} --runtime {runtime}
TimeoutStartSec=16min
TimeoutStopSec=45s
Restart=on-failure
RestartSec=5min
UMask=0077
NoNewPrivileges=true
Environment=PYTHONUNBUFFERED=1
StandardOutput=journal
StandardError=journal
''',
      'renm-research-pilot.timer': '''[Unit]
Description=Run the RENM pilot after boot and every six hours

[Timer]
OnStartupSec=2min
OnCalendar=*-*-* 00,06,12,18:00:00 UTC
Persistent=true
AccuracySec=1min
Unit=renm-research-pilot.service

[Install]
WantedBy=timers.target
'''}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--runtime', required=True)
    parser.add_argument('--install', action='store_true')
    args = parser.parse_args()
    os.umask(0o077)
    root = Path(args.runtime).resolve()
    files = units(root)
    staging = root/'systemd';staging.mkdir(parents=True, exist_ok=True)
    for name, content in files.items():
        (staging/name).write_text(content)
    subprocess.run(['systemd-analyze','--user','verify', *map(str, staging.glob('*.service')), *map(str, staging.glob('*.timer'))], check=True)
    if not args.install:
        print('Units prepared and verified; pass --install to enable boot scheduling.')
        return
    linger = subprocess.check_output(['loginctl','show-user',str(os.getuid()),'-p','Linger','--value'],text=True).strip()
    if linger != 'yes':
        raise SystemExit('Enable user lingering before installation: loginctl enable-linger USER')
    subprocess.run(['systemctl','--user','stop','renm-research-pilot.timer'],check=False,stderr=subprocess.DEVNULL)
    subprocess.run(['systemctl','--user','stop','renm-research-pilot.service'],check=False,stderr=subprocess.DEVNULL)
    (root/'bin').mkdir(exist_ok=True)
    for name in ['run-pilot.py','backup_pilot.py']:
        shutil.copy2(Path(__file__).with_name(name),root/'bin'/name)
    destination = Path.home()/'.config/systemd/user';destination.mkdir(parents=True,exist_ok=True)
    for name, content in files.items():
        (destination/name).write_text(content)
    subprocess.run(['systemctl','--user','daemon-reload'],check=True)
    subprocess.run(['systemctl','--user','enable','--now','renm-research-pilot.timer'],check=True)
    print('RENM timer enabled; user lingering starts it at boot without desktop login.')


if __name__ == '__main__':
    main()
