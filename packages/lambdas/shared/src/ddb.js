"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.METRICS_TABLE = exports.WORKOUTS_TABLE = exports.USERS_TABLE = exports.ddb = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
exports.ddb = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
});
exports.USERS_TABLE = process.env.USERS_TABLE;
exports.WORKOUTS_TABLE = process.env.WORKOUTS_TABLE;
exports.METRICS_TABLE = process.env.METRICS_TABLE;
