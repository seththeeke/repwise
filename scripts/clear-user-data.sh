#!/usr/bin/env bash
# Clear workout and metric data for a single user (test user reset).
# Does NOT touch: exercise catalog, other users, or user profile.
#
# Usage:
#   USER_ID=<cognito-sub> ./scripts/clear-user-data.sh
#   USER_ID=<cognito-sub> WORKOUTS_TABLE=repwise-workouts METRICS_TABLE=repwise-metrics ./scripts/clear-user-data.sh
#
# Get USER_ID: Cognito sub (UUID) from AWS Console > Cognito > Users, or from your app/JWT.
# Requires: AWS CLI, jq

set -e
USER_ID="${USER_ID:?Set USER_ID (Cognito sub)}"
WORKOUTS_TABLE="${WORKOUTS_TABLE:-repwise-workouts}"
METRICS_TABLE="${METRICS_TABLE:-repwise-metrics}"
REGION="${AWS_REGION:-us-east-1}"
PK="USER#${USER_ID}"

echo "Clearing data for ${PK}"
echo "Tables: ${WORKOUTS_TABLE} ${METRICS_TABLE}"

for TABLE in "$WORKOUTS_TABLE" "$METRICS_TABLE"; do
  COUNT=0
  EXCLUSIVE_START_KEY=""
  while true; do
    # Query one page of items (optionally with pagination)
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
    # Delete in batches of 25 (DynamoDB limit)
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

echo "Done. Exercise catalog and other users were not modified."
