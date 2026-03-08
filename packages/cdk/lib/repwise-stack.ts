import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Repwise stack. Tables, auth, API, and Lambdas will be added in later phases.
 */
export class RepwiseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Placeholder: infrastructure constructs will be added per specs/backend-spec.md
  }
}
