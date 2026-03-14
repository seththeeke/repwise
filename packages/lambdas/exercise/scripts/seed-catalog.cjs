/**
 * Run after first deploy. Requires WORKOUTS_TABLE env and AWS credentials.
 * From repo root: node packages/lambdas/exercise/scripts/seed-catalog.cjs
 * From exercise package: node scripts/seed-catalog.cjs
 */
const { readFileSync } = require('fs');
const { join } = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const tableName = process.env.WORKOUTS_TABLE;
if (!tableName) {
  console.error('Set WORKOUTS_TABLE');
  process.exit(1);
}

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' })
);
const catalogPath = join(__dirname, 'catalog-minimal.json');
const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));

async function main() {
  for (const ex of catalog) {
    const item = {
      PK: `EXERCISE#${ex.exerciseId}`,
      SK: 'METADATA',
      ...ex,
    };
    await client.send(new PutCommand({ TableName: tableName, Item: item }));
    console.log('Seeded:', ex.name);
  }
  console.log('Done.');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
