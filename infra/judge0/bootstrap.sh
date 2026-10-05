#!/usr/bin/env bash
# Ubuntu 22.04 EC2 user data. Run only on a dedicated Judge0 host.
set -euo pipefail
umask 077
export DEBIAN_FRONTEND=noninteractive

if [[ $(id -u) -ne 0 ]]; then echo 'Run as root.' >&2; exit 1; fi
install -d -m 700 /opt/vantory-judge0
if [[ $(readlink -f "$0") != /opt/vantory-judge0/bootstrap.sh ]]; then
  cp "$0" /opt/vantory-judge0/bootstrap.sh
fi
chmod 700 /opt/vantory-judge0/bootstrap.sh

# Judge0 1.13.1 requires cgroup v1. Resume installation after the reboot.
cat >/etc/systemd/system/vantory-judge0-install.service <<'UNIT'
[Unit]
Description=Install Vantory Judge0
Wants=network-online.target
After=network-online.target
ConditionPathExists=!/opt/vantory-judge0/installed
[Service]
Type=oneshot
ExecStart=/opt/vantory-judge0/bootstrap.sh
TimeoutStartSec=1800
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable vantory-judge0-install.service
if [[ $(stat -fc %T /sys/fs/cgroup) == cgroup2fs ]]; then
  cat >/etc/default/grub.d/99-judge0.cfg <<'GRUB'
GRUB_CMDLINE_LINUX="$GRUB_CMDLINE_LINUX systemd.unified_cgroup_hierarchy=0"
GRUB
  update-grub
  shutdown -r +1
  exit 0
fi

apt-get update
apt-get install -y docker.io docker-compose curl unzip openssl python3 ec2-instance-connect
systemctl enable --now docker
if [[ ! -e /swapfile ]]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

cd /opt/vantory-judge0
if [[ ! -d judge0-v1.13.1 ]]; then
  curl --fail --location --retry 3 https://github.com/judge0/judge0/releases/download/v1.13.1/judge0-v1.13.1.zip -o release.zip
  unzip -q release.zip
  rm release.zip
fi
cd judge0-v1.13.1
python3 - <<'PY'
from pathlib import Path
import re, secrets
config = Path('judge0.conf')
text = config.read_text()
settings = {
    'JUDGE0_TELEMETRY_ENABLE': 'false',
    'AUTHN_HEADER': 'X-Auth-Token', 'AUTHN_TOKEN': secrets.token_hex(32),
    'AUTHZ_TOKEN': secrets.token_hex(32),
    'REDIS_PASSWORD': secrets.token_hex(32), 'POSTGRES_PASSWORD': secrets.token_hex(32),
    'ENABLE_WAIT_RESULT': 'true', 'ENABLE_CALLBACKS': 'false',
    'ENABLE_ADDITIONAL_FILES': 'false', 'ENABLE_BATCHED_SUBMISSIONS': 'false',
    'ENABLE_COMPILER_OPTIONS': 'false', 'ENABLE_COMMAND_LINE_ARGUMENTS': 'false',
    'ENABLE_SUBMISSION_DELETE': 'false', 'ALLOW_ENABLE_NETWORK': 'false', 'ENABLE_NETWORK': 'false',
    'COUNT': '1', 'MAX_QUEUE_SIZE': '20',
    'CPU_TIME_LIMIT': '2', 'MAX_CPU_TIME_LIMIT': '2',
    'WALL_TIME_LIMIT': '5', 'MAX_WALL_TIME_LIMIT': '5',
    'MEMORY_LIMIT': '128000', 'MAX_MEMORY_LIMIT': '128000',
    'MAX_PROCESSES_AND_OR_THREADS': '8', 'MAX_MAX_PROCESSES_AND_OR_THREADS': '8',
    'MAX_FILE_SIZE': '1024', 'MAX_MAX_FILE_SIZE': '1024',
    'NUMBER_OF_RUNS': '1', 'MAX_NUMBER_OF_RUNS': '1',
    'RAILS_MAX_THREADS': '2', 'RAILS_SERVER_PROCESSES': '1',
}
for key, value in settings.items():
    # Preserve initialized secrets if installation is retried after a failure.
    if key in {'AUTHN_TOKEN', 'AUTHZ_TOKEN', 'REDIS_PASSWORD', 'POSTGRES_PASSWORD'}:
        existing = re.search(rf'^{key}=([a-f0-9]{{64}})$', text, re.M)
        if existing:
            value = existing.group(1)
    pattern = rf'^{key}=.*$'
    if re.search(pattern, text, re.M):
        text = re.sub(pattern, f'{key}={value}', text, flags=re.M)
    else:
        text += f'\n{key}={value}\n'
config.write_text(text)
config.chmod(0o600)
compose = Path('docker-compose.yml')
text = compose.read_text().replace('judge0/judge0:latest', 'judge0/judge0:1.13.1')
text = text.replace('"2358:2358"', '"127.0.0.1:2358:2358"')
text = text.replace('max-size: 100M', 'max-size: 10M\n      max-file: "3"')
if not re.search(r'^version:', text, re.M):
    text = "version: '3.8'\n" + text
compose.write_text(text)
PY
# The official image runs as UID 1000. Keep host directory access root-only,
# while allowing that container user to read its single mounted configuration.
chown 1000:1000 judge0.conf

# Obtain only the public address through IMDSv2; no IAM role is attached.
metadata_token=$(curl --fail --silent --show-error -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' http://169.254.169.254/latest/api/token)
public_ip=$(curl --fail --silent --show-error -H "X-aws-ec2-metadata-token: $metadata_token" http://169.254.169.254/latest/meta-data/public-ipv4)
[[ $public_ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
hostname="judge0.${public_ip}.sslip.io"
printf 'JUDGE0_URL=https://%s\n' "$hostname" >../endpoint.env

cat >Caddyfile <<CADDY
$hostname {
  request_body {
    max_size 64KB
  }
  @allowed {
    path /submissions /languages /about
  }
  handle @allowed {
    reverse_proxy 127.0.0.1:2358
  }
  handle {
    respond "Not found" 404
  }
}
CADDY
cat >docker-compose.override.yml <<'COMPOSE'
version: '3.8'
services:
  proxy:
    image: caddy:2
    network_mode: host
    restart: always
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    logging:
      driver: json-file
      options:
        max-size: '10M'
        max-file: '3'
volumes:
  caddy_data:
  caddy_config:
COMPOSE
docker-compose pull
docker-compose up -d db redis
sleep 10
docker-compose up -d

# Bound this first trial to 30 days, before the verified free-plan expiry.
# EBS storage still consumes credits after a stop; remove it when retiring the host.
stop_at=$(date -u -d '+30 days' '+%Y-%m-%d %H:%M:%S UTC')
cat >/etc/systemd/system/vantory-judge0-stop.service <<'UNIT'
[Unit]
Description=Stop the initial 30-day Judge0 trial
[Service]
Type=oneshot
ExecStart=/sbin/shutdown -h now
UNIT
cat >/etc/systemd/system/vantory-judge0-stop.timer <<UNIT
[Unit]
Description=Limit the initial Judge0 trial to 30 days
[Timer]
OnCalendar=$stop_at
Persistent=true
[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now vantory-judge0-stop.timer
touch /opt/vantory-judge0/installed
echo "Installation complete: https://$hostname. Verify authenticated execution before using it."
