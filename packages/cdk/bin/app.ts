#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RepwiseStack } from '../lib/repwise-stack';

const app = new cdk.App();

new RepwiseStack(app, 'RepwiseStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
