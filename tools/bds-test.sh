#!/usr/bin/env bash
# Smoke test: load the packs into a Bedrock Dedicated Server (Docker), summon every
# rocket, run the script selftest (real flights) and fail if the content log has errors.
# Usage: tools/bds-test.sh   (run `npm run build` first)
set -euo pipefail

cd "$(dirname "$0")/.."
NAME=rockets-bds-test
DATA="$PWD/build/bds"
LEVEL=rockets_test
IMAGE=${BDS_IMAGE:-itzg/minecraft-bedrock-server:latest}
TIMEOUT=${BDS_TIMEOUT:-600}

uuid() { node -e "console.log(require('./build/$1/manifest.json').header.uuid)"; }
version() { node -e "console.log(JSON.stringify(require('./build/$1/manifest.json').header.version))"; }

docker rm -f "$NAME" >/dev/null 2>&1 || true
rm -rf "$DATA"
mkdir -p "$DATA/behavior_packs" "$DATA/resource_packs" "$DATA/worlds/$LEVEL"
cp -R build/behavior_pack "$DATA/behavior_packs/rockets_bp"
cp -R build/resource_pack "$DATA/resource_packs/rockets_rp"
echo "[{\"pack_id\":\"$(uuid behavior_pack)\",\"version\":$(version behavior_pack)}]" > "$DATA/worlds/$LEVEL/world_behavior_packs.json"
echo "[{\"pack_id\":\"$(uuid resource_pack)\",\"version\":$(version resource_pack)}]" > "$DATA/worlds/$LEVEL/world_resource_packs.json"

docker run -d --name "$NAME" --cap-add SYS_PTRACE \
  -e EULA=TRUE \
  -e LEVEL_NAME="$LEVEL" \
  -e LEVEL_TYPE=FLAT \
  -e GAMEMODE=creative \
  -e CONTENT_LOG_FILE_ENABLED=true \
  -e CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true \
  -e CONTENT_LOG_LEVEL=info \
  -v "$DATA:/data" \
  "$IMAGE" >/dev/null

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Waiting for server (timeout ${TIMEOUT}s)..."
start=$(date +%s)
until docker logs "$NAME" 2>&1 | grep -q "Server started"; do
  if ! docker ps -q -f name="$NAME" | grep -q .; then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Server container exited early"; exit 1
  fi
  if (( $(date +%s) - start > TIMEOUT )); then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Timed out waiting for server"; exit 1
  fi
  sleep 5
done

send() { docker exec -u 0 "$NAME" send-command "$@"; }
send tickingarea add circle 0 0 0 4 rockets_test true
send time set noon
send gamerule dodaylightcycle false
sleep 5
# Summon every rocket in a row that stays inside the ticking area, plus the blocks.
n=0
ids=""
for f in build/behavior_pack/entities/*.json; do
  id=$(basename "$f" .json)
  [ "$id" = parachute ] && continue
  ids="$ids $id"
  send summon "rockets:$id" $((n * 6 + 1)) -60 10
  n=$((n + 1))
done
send setblock 30 -60 30 rockets:launch_pad
send setblock 32 -60 30 rockets:mission_control
sleep 10
send scriptevent rockets:selftest "$ids"
# The selftest flies real rockets: give it about 40 seconds.
for i in $(seq 1 30); do
  sleep 3
  if docker logs "$NAME" 2>&1 | grep -qE "selftest (PASS|FAIL)"; then break; fi
done

LOG=$(docker logs "$NAME" 2>&1)
echo "$LOG" | grep -iE "rockets|error|warn|\[Scripting\]" | grep -vE "send-command|^\s*$" | tail -100 || true

if ! echo "$LOG" | grep -q "\[Rockets\] loaded"; then
  echo "FAIL: add-on script did not report loading"; exit 1
fi
if echo "$LOG" | grep -qiE "Unknown block|is not a valid block|Cannot place block"; then
  echo "FAIL: a block could not be placed"; exit 1
fi
if ! echo "$LOG" | grep -q "selftest PASS"; then
  echo "FAIL: the selftest did not pass"; exit 1
fi
if echo "$LOG" | grep -E "ERROR|\[error\]|Error\]" | grep -viE "Failed to connect|network|telemetry" | grep -q .; then
  echo "FAIL: content log has errors"; exit 1
fi
echo "PASS: Bedrock Dedicated Server loaded the packs and flew the rockets without errors"
