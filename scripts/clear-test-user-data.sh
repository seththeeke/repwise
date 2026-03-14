#!/usr/bin/env bash
# Clear workout and metric data for the hardcoded test user only.
# Does NOT touch: exercise catalog, other users, or user profile.
# Requires: AWS CLI, jq

set -e
PK="USER#d4c8d438-10d1-70ae-0170-ba25f7f3dfb3"
WORKOUTS_TABLE="${WORKOUTS_TABLE:-repwise-workouts}"
METRICS_TABLE="${METRICS_TABLE:-repwise-metrics}"
REGION="${AWS_REGION:-us-east-1}"

echo "Clearing data for ${PK}"
echo "Tables: ${WORKOUTS_TABLE} ${METRICS_TABLE}"

for TABLE in "$WORKOUTS_TABLE" "$METRICS_TABLE"; do
  COUNT=0
  EXCLUSIVE_START_KEY=""
  while true; do
    if [ -z "$EXCLUSIVE_START_KEY" ]; then
      QUERY=$(aws dynamodb query \
        --table-name "$TABLE" \
        --key-condition-expression "PK = :pk" \
        --expression-attribute-values "{\":pk\":{\"S\":\"${PK}\"}}" \
        --region "$REGION" \
        --output json)
    else
      QUERY=$(aws dynamodb query \
        --table-name "$TABLE" \
        --key-condition-expression "PK = :pk" \
        --expression-attribute-values "{\":pk\":{\"S\":\"${PK}\"}}" \
        --exclusive-start-key "$EXCLUSIVE_START_KEY" \
        --region "$REGION" \
        --output json)
    fi
    ITEMS=$(echo "$QUERY" | jq -c '.Items')
    N=$(echo "$ITEMS" | jq 'length')
    if [ "$N" -eq 0 ]; then
      break
    fi
    for start in $(seq 0 25 $((N - 1))); do
      end=$((start + 24))
      if [ "$end" -ge "$N" ]; then end=$((N - 1)); fi
      BATCH="{\"${TABLE}\":["
      FIRST=1
      for i in $(seq "$start" "$end"); do
        ITEM=$(echo "$ITEMS" | jq -c ".[$i]")
        PK_VAL=$(echo "$ITEM" | jq -c '.PK')
        SK_VAL=$(echo "$ITEM" | jq -c '.SK')
        if [ "$FIRST" -eq 1 ]; then FIRST=0; else BATCH="${BATCH},"; fi
        BATCH="${BATCH}{\"DeleteRequest\":{\"Key\":{\"PK\":${PK_VAL},\"SK\":${SK_VAL}}}}"
      done
      BATCH="${BATCH}]}"
      aws dynamodb batch-write-item --request-items "$BATCH" --region "$REGION" --output json > /dev/null
    done
    COUNT=$((COUNT + N))
    echo "  Deleted ${N} item(s) from ${TABLE} (total: ${COUNT})"
    LAST_KEY=$(echo "$QUERY" | jq -c 'if .LastEvaluatedKey then .LastEvaluatedKey else empty end')
    if [ -z "$LAST_KEY" ]; then
      break
    fi
    EXCLUSIVE_START_KEY="$LAST_KEY"
  done
done

# Re-create empty GlobalMetrics so the dashboard loads (GET /metrics/me/global expects this)
NOW=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
USER_ID_VALUE="d4c8d438-10d1-70ae-0170-ba25f7f3dfb3"
aws dynamodb put-item \
  --table-name "$METRICS_TABLE" \
  --region "$REGION" \
  --item "{
    \"PK\": {\"S\": \"${PK}\"},
    \"SK\": {\"S\": \"METRIC#GLOBAL\"},
    \"userId\": {\"S\": \"${USER_ID_VALUE}\"},
    \"totalWorkouts\": {\"N\": \"0\"},
    \"currentStreak\": {\"N\": \"0\"},
    \"longestStreak\": {\"N\": \"0\"},
    \"workoutsLast30\": {\"N\": \"0\"},
    \"workoutsLast90\": {\"N\": \"0\"},
    \"workoutsLast180\": {\"N\": \"0\"},
    \"totalVolumeAllTime\": {\"N\": \"0\"},
    \"completedDates\": {\"L\": []},
    \"updatedAt\": {\"S\": \"${NOW}\"}
  }"
echo "Re-created empty METRIC#GLOBAL for test user."

echo "Done. Exercise catalog and other users were not modified."
