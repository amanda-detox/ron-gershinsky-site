#!/bin/sh
# Fail if the native schedule math disagrees with clockify-sandbox/alarm-core.js.
set -e
cd "$(dirname "$0")/../.."
ROOT="$(pwd)"
JAR="${TMPDIR:-/tmp}/json-20240303.jar"
if [ ! -f "$JAR" ]; then
  curl -fsSL -o "$JAR" https://repo1.maven.org/maven2/org/json/json/20240303/json-20240303.jar
fi
OUT="${TMPDIR:-/tmp}/clockify-alarm-math"
rm -rf "$OUT"
mkdir -p "$OUT"
javac --release 17 -cp "$JAR" -d "$OUT" \
  clockify-android/schedule/src/site/rongershinsky/clockify/AlarmMath.java \
  clockify-android/schedule/test/site/rongershinsky/clockify/AlarmMathCheck.java
check_tz() {
  tz="$1"
  json="$(mktemp)"
  TZ="$tz" node clockify-android/tools/expected-schedule.js > "$json"
  TZ="$tz" java -cp "$OUT:$JAR" site.rongershinsky.clockify.AlarmMathCheck "$json"
  rm -f "$json"
}
check_tz UTC
check_tz Asia/Jerusalem
check_tz America/New_York
