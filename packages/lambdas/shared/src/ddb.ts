import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

export const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const USERS_TABLE = process.env.USERS_TABLE!;
export const WORKOUTS_TABLE = process.env.WORKOUTS_TABLE!;
export const METRICS_TABLE = process.env.METRICS_TABLE!;
export const BUILDER_SESSIONS_TABLE =
  process.env.BUILDER_SESSIONS_TABLE!;
export const BUILDER_AI_CONFIG_TABLE =
  process.env.BUILDER_AI_CONFIG_TABLE!;
