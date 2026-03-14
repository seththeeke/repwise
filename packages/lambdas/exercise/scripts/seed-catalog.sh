#!/usr/bin/env bash
# Seed exercise catalog into DynamoDB. Requires AWS CLI and WORKOUTS_TABLE env.
# Usage: WORKOUTS_TABLE=repwise-workouts ./scripts/seed-catalog.sh

set -e
TABLE="${WORKOUTS_TABLE:?Set WORKOUTS_TABLE}"
REGION="${AWS_REGION:-us-east-1}"

put_item() {
  aws dynamodb put-item --table-name "$TABLE" --region "$REGION" --item "$1"
}

# Bench Press
put_item '{
  "PK": {"S": "EXERCISE#bench-press"},
  "SK": {"S": "METADATA"},
  "exerciseId": {"S": "bench-press"},
  "name": {"S": "Bench Press"},
  "muscleGroups": {"L": [{"S": "chest"}, {"S": "triceps"}, {"S": "shoulders"}]},
  "muscleGroup": {"S": "chest"},
  "equipment": {"L": [{"S": "barbell"}, {"S": "bench"}]},
  "equipmentPrimary": {"S": "barbell"},
  "modality": {"S": "sets_reps"},
  "defaultSets": {"N": "4"},
  "defaultReps": {"N": "8"},
  "difficulty": {"S": "intermediate"},
  "instructions": {"S": "Lie on bench, grip bar slightly wider than shoulders. Lower to chest, press up."},
  "isActive": {"BOOL": true}
}'
echo "Seeded: Bench Press"

# Barbell Squat
put_item '{
  "PK": {"S": "EXERCISE#squat"},
  "SK": {"S": "METADATA"},
  "exerciseId": {"S": "squat"},
  "name": {"S": "Barbell Squat"},
  "muscleGroups": {"L": [{"S": "quadriceps"}, {"S": "glutes"}, {"S": "hamstrings"}]},
  "muscleGroup": {"S": "quadriceps"},
  "equipment": {"L": [{"S": "barbell"}, {"S": "rack"}]},
  "equipmentPrimary": {"S": "barbell"},
  "modality": {"S": "sets_reps"},
  "defaultSets": {"N": "4"},
  "defaultReps": {"N": "6"},
  "difficulty": {"S": "intermediate"},
  "instructions": {"S": "Bar on upper back, squat down until thighs parallel, stand."},
  "isActive": {"BOOL": true}
}'
echo "Seeded: Barbell Squat"

echo "Done."
