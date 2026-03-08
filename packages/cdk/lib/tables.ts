import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class TablesConstruct extends Construct {
  public readonly usersTable: dynamodb.Table;
  public readonly workoutsTable: dynamodb.Table;
  public readonly metricsTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'repwise-users',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'username-index',
      partitionKey: { name: 'username', type: dynamodb.AttributeType.STRING },
    });

    this.workoutsTable = new dynamodb.Table(this, 'WorkoutsTable', {
      tableName: 'repwise-workouts',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.workoutsTable.addGlobalSecondaryIndex({
      indexName: 'muscleGroup-index',
      partitionKey: { name: 'muscleGroup', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    });
    this.workoutsTable.addGlobalSecondaryIndex({
      indexName: 'equipment-index',
      partitionKey: { name: 'equipmentPrimary', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
    });
    this.workoutsTable.addGlobalSecondaryIndex({
      indexName: 'userId-completedAt-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'completedAt', type: dynamodb.AttributeType.STRING },
    });

    this.metricsTable = new dynamodb.Table(this, 'MetricsTable', {
      tableName: 'repwise-metrics',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
