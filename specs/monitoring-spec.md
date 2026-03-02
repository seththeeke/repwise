# Fitness App — Monitoring & Observability Spec
> Optimized for execution in Cursor. All monitoring infrastructure lives in `packages/cdk/lib/monitoring.ts` and is instantiated from the main CDK stack. Follow phases in order.

---

## Philosophy

This stack is designed around three principles:

1. **Free tier first.** Every metric listed below is emitted by AWS automatically at no cost. No custom metrics are created unless they are zero-cost (CloudWatch free tier includes 10 custom metrics, used sparingly here).
2. **Signal over noise.** Every alarm has a clear owner (the single-developer context) and a clear remediation path. No alarm is created just because it can be.
3. **One dashboard, full picture.** A single CloudWatch dashboard shows the health of every layer — API Gateway, Lambda, DynamoDB, Cognito — without switching screens.

---

## What AWS Emits For Free (Zero Configuration Required)

These metrics are published automatically to CloudWatch by each service. No agents, no SDKs, no custom instrumentation needed.

### API Gateway (HTTP API)
| Metric | Namespace | Description |
|---|---|---|
| `Count` | `AWS/ApiGateway` | Total number of API requests |
| `4XXError` | `AWS/ApiGateway` | Client errors (bad requests, unauthorized, not found) |
| `5XXError` | `AWS/ApiGateway` | Server errors (Lambda failures, timeouts) |
| `Latency` | `AWS/ApiGateway` | End-to-end request latency in ms |
| `IntegrationLatency` | `AWS/ApiGateway` | Lambda execution time only (excludes API GW overhead) |

### Lambda (per function)
| Metric | Namespace | Description |
|---|---|---|
| `Invocations` | `AWS/Lambda` | Total invocation count |
| `Errors` | `AWS/Lambda` | Invocations that resulted in an error |
| `Throttles` | `AWS/Lambda` | Invocations rejected due to concurrency limits |
| `Duration` | `AWS/Lambda` | Execution time in ms (avg, p50, p99) |
| `ConcurrentExecutions` | `AWS/Lambda` | Simultaneous running executions |
| `IteratorAge` | `AWS/Lambda` | Age of last record processed (Streams trigger only — metrics-processor Lambda) |

### DynamoDB (per table)
| Metric | Namespace | Description |
|---|---|---|
| `ConsumedReadCapacityUnits` | `AWS/DynamoDB` | RCUs consumed (on-demand — tracks usage) |
| `ConsumedWriteCapacityUnits` | `AWS/DynamoDB` | WCUs consumed |
| `SuccessfulRequestLatency` | `AWS/DynamoDB` | Latency of successful operations |
| `SystemErrors` | `AWS/DynamoDB` | DynamoDB internal errors (5xx from DDB side) |
| `UserErrors` | `AWS/DynamoDB` | Client errors (bad requests to DDB) |
| `ThrottledRequests` | `AWS/DynamoDB` | Requests rejected due to throttling |

### Cognito User Pool
| Metric | Namespace | Description |
|---|---|---|
| `SignUpSuccesses` | `AWS/Cognito` | Successful user registrations |
| `SignInSuccesses` | `AWS/Cognito` | Successful logins |
| `SignInThrottles` | `AWS/Cognito` | Login attempts throttled |
| `TokenRefreshSuccesses` | `AWS/Cognito` | Successful token refreshes |

### DynamoDB Streams (metrics-processor Lambda only)
| Metric | Namespace | Description |
|---|---|---|
| `IteratorAge` | `AWS/Lambda` | Age of last record processed from stream. High age = processor falling behind |

---

## CDK Monitoring Construct

**Location:** `packages/cdk/lib/monitoring.ts`

This is a single CDK `Construct` class that accepts references to all other resources and wires up all alarms, log groups, and the dashboard. It is instantiated once in `packages/cdk/lib/fitness-stack.ts`.

### Constructor Interface

```typescript
// packages/cdk/lib/monitoring.ts

import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sns_subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface MonitoringProps {
  // Lambdas
  userLambda: lambda.Function;
  exerciseLambda: lambda.Function;
  workoutLambda: lambda.Function;
  metricsLambda: lambda.Function;
  goalsLambda: lambda.Function;
  feedLambda: lambda.Function;
  aiLambda: lambda.Function;
  metricsProcessorLambda: lambda.Function;
  cognitoPostConfirmLambda: lambda.Function;

  // DynamoDB Tables
  usersTable: dynamodb.Table;
  workoutsTable: dynamodb.Table;
  metricsTable: dynamodb.Table;

  // API Gateway
  httpApi: apigatewayv2.HttpApi;

  // Cognito
  userPool: cognito.UserPool;

  // Alert email — set via CDK context or environment variable
  alertEmail: string;
}

export class MonitoringConstruct extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: MonitoringProps) {
    super(scope, id);
    // See phases below for full implementation
  }
}
```

### Instantiation in Main Stack

```typescript
// packages/cdk/lib/fitness-stack.ts (addition to existing stack)

const monitoring = new MonitoringConstruct(this, 'Monitoring', {
  userLambda: lambdas.user,
  exerciseLambda: lambdas.exercise,
  workoutLambda: lambdas.workout,
  metricsLambda: lambdas.metrics,
  goalsLambda: lambdas.goals,
  feedLambda: lambdas.feed,
  aiLambda: lambdas.ai,
  metricsProcessorLambda: lambdas.metricsProcessor,
  cognitoPostConfirmLambda: lambdas.cognitoPostConfirm,
  usersTable: tables.usersTable,
  workoutsTable: tables.workoutsTable,
  metricsTable: tables.metricsTable,
  httpApi: api.api,
  userPool: auth.userPool,
  alertEmail: this.node.tryGetContext('alertEmail') ?? process.env.ALERT_EMAIL!,
});
```

---

## Phase 1 — SNS Alert Topic

All alarms route to a single SNS topic which emails the developer. One topic, one subscriber.

```typescript
// Inside MonitoringConstruct constructor

// ── Alert Topic ──────────────────────────────────────────────────────────────
this.alertTopic = new sns.Topic(this, 'AlertTopic', {
  topicName: 'fitness-app-alerts',
  displayName: 'Fitness App Alerts',
});

this.alertTopic.addSubscription(
  new sns_subscriptions.EmailSubscription(props.alertEmail)
);

// Helper used by all alarm definitions below
const alarmAction = new cloudwatch_actions.SnsAction(this.alertTopic);
```

---

## Phase 2 — Lambda Log Groups

Explicit log groups let you control retention. Without this, CloudWatch keeps logs forever (and charges for storage after the free tier). Set 30 days — enough for debugging without accumulating cost.

```typescript
// ── Lambda Log Groups (30 day retention) ─────────────────────────────────────

const lambdas = [
  props.userLambda,
  props.exerciseLambda,
  props.workoutLambda,
  props.metricsLambda,
  props.goalsLambda,
  props.feedLambda,
  props.aiLambda,
  props.metricsProcessorLambda,
  props.cognitoPostConfirmLambda,
];

lambdas.forEach((fn) => {
  new logs.LogGroup(this, `${fn.node.id}LogGroup`, {
    logGroupName: `/aws/lambda/${fn.functionName}`,
    retention: logs.RetentionDays.ONE_MONTH,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
  });
});
```

---

## Phase 3 — Alarms

Alarms are grouped by severity. **P1 (Critical)** alarms indicate the app is broken for users right now. **P2 (Warning)** alarms indicate degradation or anomalies worth investigating but not immediately breaking.

All alarms use `TreatMissingData.NOT_BREACHING` unless noted — missing data on a quiet app should not page the developer.

### 3a — API Gateway Alarms

```typescript
// ── API Gateway: High 5XX Error Rate ─────────────────────────────────────────
// P1. Server errors affecting users. Threshold: >5 errors in a 5-minute window.
const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
  alarmName: 'fitness-api-5xx-errors',
  alarmDescription: 'API Gateway is returning 5XX errors. Lambda failures or timeouts.',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApiGateway',
    metricName: '5XXError',
    dimensionsMap: { ApiId: props.httpApi.apiId },
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
api5xxAlarm.addAlarmAction(alarmAction);
api5xxAlarm.addOkAction(alarmAction); // Notify when it recovers too

// ── API Gateway: High 4XX Error Rate ─────────────────────────────────────────
// P2. Elevated client errors may indicate a frontend bug or auth issue.
// Threshold: >20 errors in a 5-minute window (some 4xx is normal — search 404s etc).
const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxAlarm', {
  alarmName: 'fitness-api-4xx-elevated',
  alarmDescription: 'Elevated 4XX error rate. Possible auth issue or frontend bug.',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApiGateway',
    metricName: '4XXError',
    dimensionsMap: { ApiId: props.httpApi.apiId },
    statistic: 'Sum',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 20,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
api4xxAlarm.addAlarmAction(alarmAction);

// ── API Gateway: High P99 Latency ─────────────────────────────────────────────
// P2. p99 latency over 5 seconds is a bad user experience.
const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
  alarmName: 'fitness-api-high-latency',
  alarmDescription: 'API p99 latency is above 5 seconds.',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/ApiGateway',
    metricName: 'Latency',
    dimensionsMap: { ApiId: props.httpApi.apiId },
    statistic: 'p99',
    period: cdk.Duration.minutes(5),
  }),
  threshold: 5000,
  evaluationPeriods: 3,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
apiLatencyAlarm.addAlarmAction(alarmAction);
```

### 3b — Lambda Alarms

```typescript
// ── Lambda Error Rate: Any Lambda ────────────────────────────────────────────
// P1. Create individual error alarms for the most critical Lambdas.
// workout and metricsProcessor are highest priority — failures lose user data.

const criticalLambdas = [
  { fn: props.workoutLambda,           name: 'workout' },
  { fn: props.metricsProcessorLambda,  name: 'metrics-processor' },
  { fn: props.aiLambda,                name: 'ai' },
];

criticalLambdas.forEach(({ fn, name }) => {
  const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
    alarmName: `fitness-lambda-${name}-errors`,
    alarmDescription: `${name} Lambda is throwing errors.`,
    metric: fn.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    }),
    threshold: 3,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });
  errorAlarm.addAlarmAction(alarmAction);
  errorAlarm.addOkAction(alarmAction);
});

// ── Lambda Throttles ──────────────────────────────────────────────────────────
// P2. Any throttling means users are getting errors. Lambda free tier is 1M
// invocations/month and 400,000 GB-seconds. Throttles indicate concurrency limits hit.
const throttleAlarm = new cloudwatch.Alarm(this, 'LambdaThrottleAlarm', {
  alarmName: 'fitness-lambda-throttles',
  alarmDescription: 'Lambda functions are being throttled. Concurrency limit may be hit.',
  metric: new cloudwatch.MathExpression({
    expression: 'SUM(METRICS())',
    usingMetrics: Object.fromEntries(
      [props.workoutLambda, props.userLambda, props.aiLambda].map((fn, i) => [
        `m${i}`,
        fn.metricThrottles({ period: cdk.Duration.minutes(5), statistic: 'Sum' }),
      ])
    ),
    period: cdk.Duration.minutes(5),
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
throttleAlarm.addAlarmAction(alarmAction);

// ── Metrics Processor: Stream Iterator Age ────────────────────────────────────
// P1. If IteratorAge is high, the metrics processor is falling behind the stream.
// User metrics will be stale. Threshold: 5 minutes old.
const iteratorAgeAlarm = new cloudwatch.Alarm(this, 'IteratorAgeAlarm', {
  alarmName: 'fitness-metrics-processor-iterator-age',
  alarmDescription: 'Metrics processor is falling behind the DynamoDB stream. User metrics may be stale.',
  metric: props.metricsProcessorLambda.metricIteratorAge({
    period: cdk.Duration.minutes(5),
    statistic: 'Maximum',
  }),
  threshold: 300_000, // 5 minutes in milliseconds
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
iteratorAgeAlarm.addAlarmAction(alarmAction);
iteratorAgeAlarm.addOkAction(alarmAction);

// ── AI Lambda: High Duration ──────────────────────────────────────────────────
// P2. AI Lambda is SSE-based and expected to run longer than others.
// Alert if it exceeds 20 seconds (approaching the 29s API GW timeout).
const aiDurationAlarm = new cloudwatch.Alarm(this, 'AiDurationAlarm', {
  alarmName: 'fitness-ai-lambda-duration',
  alarmDescription: 'AI Lambda p99 duration is approaching the API Gateway 29s timeout.',
  metric: props.aiLambda.metricDuration({
    period: cdk.Duration.minutes(5),
    statistic: 'p99',
  }),
  threshold: 20_000, // 20 seconds
  evaluationPeriods: 3,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
aiDurationAlarm.addAlarmAction(alarmAction);
```

### 3c — DynamoDB Alarms

```typescript
// ── DynamoDB: System Errors ───────────────────────────────────────────────────
// P1. DynamoDB internal errors are rare and indicate an AWS-side issue.
const tables = [
  { table: props.usersTable,    name: 'users' },
  { table: props.workoutsTable, name: 'workouts' },
  { table: props.metricsTable,  name: 'metrics' },
];

tables.forEach(({ table, name }) => {
  const systemErrorAlarm = new cloudwatch.Alarm(this, `${name}DdbSystemErrorAlarm`, {
    alarmName: `fitness-ddb-${name}-system-errors`,
    alarmDescription: `DynamoDB ${name} table has system errors. AWS-side issue.`,
    metric: new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'SystemErrors',
      dimensionsMap: { TableName: table.tableName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    }),
    threshold: 1,
    evaluationPeriods: 1,
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  });
  systemErrorAlarm.addAlarmAction(alarmAction);
});

// ── DynamoDB: Throttled Requests ─────────────────────────────────────────────
// P2. On-demand tables rarely throttle but it can happen under a burst.
// PAY_PER_REQUEST tables have a burst capacity bucket — if exhausted, requests throttle.
const ddbThrottleAlarm = new cloudwatch.Alarm(this, 'DdbThrottleAlarm', {
  alarmName: 'fitness-ddb-throttled-requests',
  alarmDescription: 'DynamoDB is throttling requests. Burst capacity exhausted.',
  metric: new cloudwatch.MathExpression({
    expression: 'SUM(METRICS())',
    usingMetrics: Object.fromEntries(
      tables.map(({ table }, i) => [
        `m${i}`,
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ThrottledRequests',
          dimensionsMap: { TableName: table.tableName },
          statistic: 'Sum',
          period: cdk.Duration.minutes(5),
        }),
      ])
    ),
    period: cdk.Duration.minutes(5),
  }),
  threshold: 5,
  evaluationPeriods: 2,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
ddbThrottleAlarm.addAlarmAction(alarmAction);
```

### 3d — Cognito Post-Confirm Lambda Alarm

```typescript
// ── Cognito Post-Confirm: Errors ──────────────────────────────────────────────
// P1. If the post-confirmation Lambda fails, new user signup is broken.
// Users will be in Cognito but have no DynamoDB profile — auth will succeed
// but every subsequent API call will fail with 404 or permissions errors.
const postConfirmErrorAlarm = new cloudwatch.Alarm(this, 'PostConfirmErrorAlarm', {
  alarmName: 'fitness-cognito-post-confirm-errors',
  alarmDescription: 'Cognito post-confirmation Lambda is failing. New user signups are broken.',
  metric: props.cognitoPostConfirmLambda.metricErrors({
    period: cdk.Duration.minutes(5),
    statistic: 'Sum',
  }),
  threshold: 1,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
});
postConfirmErrorAlarm.addAlarmAction(alarmAction);
postConfirmErrorAlarm.addOkAction(alarmAction);
```

---

## Phase 4 — CloudWatch Dashboard

The dashboard has **6 sections** arranged vertically. Each section is a row of related widgets. All widgets use a 1-hour default time window with 1-minute granularity unless noted.

```typescript
this.dashboard = new cloudwatch.Dashboard(this, 'AppDashboard', {
  dashboardName: 'FitnessApp',
  defaultInterval: cdk.Duration.hours(3),
});
```

### Section 1 — API Health (Row 1)

Four widgets side by side: request rate, error rates, latency, and a combined alarm status.

```typescript
// ── Row 1: API Gateway ────────────────────────────────────────────────────────

const apiRequestRateWidget = new cloudwatch.GraphWidget({
  title: 'API — Request Rate',
  width: 6, height: 6,
  left: [
    new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: { ApiId: props.httpApi.apiId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label: 'Requests/min',
      color: '#7C3AED',
    }),
  ],
});

const apiErrorRateWidget = new cloudwatch.GraphWidget({
  title: 'API — Error Rates',
  width: 6, height: 6,
  left: [
    new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: { ApiId: props.httpApi.apiId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label: '5XX Errors',
      color: '#EF4444',
    }),
    new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: { ApiId: props.httpApi.apiId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label: '4XX Errors',
      color: '#F97316',
    }),
  ],
});

const apiLatencyWidget = new cloudwatch.GraphWidget({
  title: 'API — Latency (ms)',
  width: 6, height: 6,
  left: [
    new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: { ApiId: props.httpApi.apiId },
      statistic: 'p50',
      period: cdk.Duration.minutes(1),
      label: 'p50',
      color: '#22C55E',
    }),
    new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: { ApiId: props.httpApi.apiId },
      statistic: 'p99',
      period: cdk.Duration.minutes(1),
      label: 'p99',
      color: '#F97316',
    }),
    new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'IntegrationLatency',
      dimensionsMap: { ApiId: props.httpApi.apiId },
      statistic: 'p99',
      period: cdk.Duration.minutes(1),
      label: 'Integration p99',
      color: '#EF4444',
    }),
  ],
});

// Alarm status widget — single pane showing green/red for all critical alarms
const alarmStatusWidget = new cloudwatch.AlarmStatusWidget({
  title: 'Active Alarms',
  width: 6, height: 6,
  alarms: [
    api5xxAlarm,
    iteratorAgeAlarm,
    postConfirmErrorAlarm,
    // Add all P1 alarms here — this widget is the first thing you look at
  ],
});

this.dashboard.addWidgets(
  apiRequestRateWidget,
  apiErrorRateWidget,
  apiLatencyWidget,
  alarmStatusWidget,
);
```

### Section 2 — Lambda Health (Row 2)

Two widgets: invocations+errors combined, and duration per Lambda.

```typescript
// ── Row 2: Lambda ─────────────────────────────────────────────────────────────

const allLambdaFunctions = [
  { fn: props.workoutLambda,          label: 'workout',           color: '#7C3AED' },
  { fn: props.userLambda,             label: 'user',              color: '#8B5CF6' },
  { fn: props.metricsProcessorLambda, label: 'metrics-processor', color: '#EF4444' },
  { fn: props.aiLambda,               label: 'ai',                color: '#F97316' },
  { fn: props.goalsLambda,            label: 'goals',             color: '#22C55E' },
  { fn: props.feedLambda,             label: 'feed',              color: '#06B6D4' },
  { fn: props.metricsLambda,          label: 'metrics',           color: '#A78BFA' },
  { fn: props.exerciseLambda,         label: 'exercise',          color: '#34D399' },
];

const lambdaInvocationsWidget = new cloudwatch.GraphWidget({
  title: 'Lambda — Invocations & Errors',
  width: 12, height: 6,
  left: allLambdaFunctions.map(({ fn, label, color }) =>
    fn.metricInvocations({ period: cdk.Duration.minutes(1), label, color })
  ),
  right: allLambdaFunctions.map(({ fn, label }) =>
    fn.metricErrors({ period: cdk.Duration.minutes(1), label: `${label} errors` })
  ),
  rightYAxis: { label: 'Errors', showUnits: false },
});

const lambdaDurationWidget = new cloudwatch.GraphWidget({
  title: 'Lambda — p99 Duration (ms)',
  width: 12, height: 6,
  left: allLambdaFunctions.map(({ fn, label, color }) =>
    fn.metricDuration({ period: cdk.Duration.minutes(1), statistic: 'p99', label, color })
  ),
});

this.dashboard.addWidgets(lambdaInvocationsWidget, lambdaDurationWidget);
```

### Section 3 — Metrics Processor Health (Row 3)

The metrics processor is the most operationally important Lambda — it drives all user-facing metrics and goal evaluation. It gets its own dedicated row.

```typescript
// ── Row 3: Metrics Processor (DDB Stream) ────────────────────────────────────

const iteratorAgeWidget = new cloudwatch.GraphWidget({
  title: 'Metrics Processor — Stream Iterator Age (ms)',
  width: 8, height: 6,
  left: [
    props.metricsProcessorLambda.metricIteratorAge({
      period: cdk.Duration.minutes(1),
      statistic: 'Maximum',
      label: 'Iterator Age (max)',
      color: '#EF4444',
    }),
    props.metricsProcessorLambda.metricIteratorAge({
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
      label: 'Iterator Age (avg)',
      color: '#F97316',
    }),
  ],
  leftAnnotations: [
    {
      value: 300_000,
      label: 'P1 Threshold (5 min)',
      color: '#EF4444',
      fill: cloudwatch.Shading.ABOVE,
    },
  ],
});

const processorInvocationsWidget = new cloudwatch.GraphWidget({
  title: 'Metrics Processor — Invocations & Errors',
  width: 8, height: 6,
  left: [
    props.metricsProcessorLambda.metricInvocations({
      period: cdk.Duration.minutes(1),
      label: 'Invocations',
      color: '#7C3AED',
    }),
    props.metricsProcessorLambda.metricErrors({
      period: cdk.Duration.minutes(1),
      label: 'Errors',
      color: '#EF4444',
    }),
  ],
});

const processorDurationWidget = new cloudwatch.GraphWidget({
  title: 'Metrics Processor — Duration (ms)',
  width: 8, height: 6,
  left: [
    props.metricsProcessorLambda.metricDuration({
      period: cdk.Duration.minutes(1),
      statistic: 'Average',
      label: 'avg',
      color: '#22C55E',
    }),
    props.metricsProcessorLambda.metricDuration({
      period: cdk.Duration.minutes(1),
      statistic: 'p99',
      label: 'p99',
      color: '#F97316',
    }),
  ],
});

this.dashboard.addWidgets(iteratorAgeWidget, processorInvocationsWidget, processorDurationWidget);
```

### Section 4 — DynamoDB Health (Row 4)

```typescript
// ── Row 4: DynamoDB ───────────────────────────────────────────────────────────

const ddbTables = [
  { table: props.usersTable,    label: 'users',    color: '#7C3AED' },
  { table: props.workoutsTable, label: 'workouts', color: '#F97316' },
  { table: props.metricsTable,  label: 'metrics',  color: '#22C55E' },
];

const ddbReadWidget = new cloudwatch.GraphWidget({
  title: 'DynamoDB — Consumed RCUs',
  width: 8, height: 6,
  left: ddbTables.map(({ table, label, color }) =>
    new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'ConsumedReadCapacityUnits',
      dimensionsMap: { TableName: table.tableName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label,
      color,
    })
  ),
});

const ddbWriteWidget = new cloudwatch.GraphWidget({
  title: 'DynamoDB — Consumed WCUs',
  width: 8, height: 6,
  left: ddbTables.map(({ table, label, color }) =>
    new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'ConsumedWriteCapacityUnits',
      dimensionsMap: { TableName: table.tableName },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label,
      color,
    })
  ),
});

const ddbLatencyWidget = new cloudwatch.GraphWidget({
  title: 'DynamoDB — Successful Request Latency (ms)',
  width: 8, height: 6,
  left: ddbTables.map(({ table, label, color }) =>
    new cloudwatch.Metric({
      namespace: 'AWS/DynamoDB',
      metricName: 'SuccessfulRequestLatency',
      dimensionsMap: { TableName: table.tableName },
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
      label,
      color,
    })
  ),
});

this.dashboard.addWidgets(ddbReadWidget, ddbWriteWidget, ddbLatencyWidget);
```

### Section 5 — AI Lambda Health (Row 5)

The AI Lambda has unique characteristics — it is the slowest Lambda in the system and drives the most important UX flow. It deserves its own row.

```typescript
// ── Row 5: AI Lambda ──────────────────────────────────────────────────────────

const aiDurationWidget = new cloudwatch.GraphWidget({
  title: 'AI Lambda — Duration (ms) vs API GW Timeout',
  width: 12, height: 6,
  left: [
    props.aiLambda.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
      label: 'avg',
      color: '#22C55E',
    }),
    props.aiLambda.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'p99',
      label: 'p99',
      color: '#F97316',
    }),
    props.aiLambda.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'Maximum',
      label: 'max',
      color: '#EF4444',
    }),
  ],
  leftAnnotations: [
    {
      value: 29_000,
      label: 'API GW Hard Timeout (29s)',
      color: '#EF4444',
      fill: cloudwatch.Shading.ABOVE,
    },
    {
      value: 20_000,
      label: 'P2 Alert Threshold (20s)',
      color: '#F97316',
    },
  ],
});

const aiErrorsWidget = new cloudwatch.GraphWidget({
  title: 'AI Lambda — Invocations & Errors',
  width: 12, height: 6,
  left: [
    props.aiLambda.metricInvocations({
      period: cdk.Duration.minutes(5),
      label: 'Invocations',
      color: '#7C3AED',
    }),
    props.aiLambda.metricErrors({
      period: cdk.Duration.minutes(5),
      label: 'Errors',
      color: '#EF4444',
    }),
    props.aiLambda.metricThrottles({
      period: cdk.Duration.minutes(5),
      label: 'Throttles',
      color: '#F97316',
    }),
  ],
});

this.dashboard.addWidgets(aiDurationWidget, aiErrorsWidget);
```

### Section 6 — Cognito & Auth (Row 6)

```typescript
// ── Row 6: Cognito ────────────────────────────────────────────────────────────

const cognitoSigninsWidget = new cloudwatch.GraphWidget({
  title: 'Cognito — Sign-ins & Sign-ups',
  width: 12, height: 6,
  left: [
    new cloudwatch.Metric({
      namespace: 'AWS/Cognito',
      metricName: 'SignInSuccesses',
      dimensionsMap: { UserPoolId: props.userPool.userPoolId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(15),
      label: 'Sign-ins',
      color: '#22C55E',
    }),
    new cloudwatch.Metric({
      namespace: 'AWS/Cognito',
      metricName: 'SignUpSuccesses',
      dimensionsMap: { UserPoolId: props.userPool.userPoolId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(15),
      label: 'Sign-ups',
      color: '#7C3AED',
    }),
  ],
});

const cognitoThrottlesWidget = new cloudwatch.GraphWidget({
  title: 'Cognito — Throttles & Post-Confirm Lambda',
  width: 12, height: 6,
  left: [
    new cloudwatch.Metric({
      namespace: 'AWS/Cognito',
      metricName: 'SignInThrottles',
      dimensionsMap: { UserPoolId: props.userPool.userPoolId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
      label: 'Sign-in Throttles',
      color: '#EF4444',
    }),
    props.cognitoPostConfirmLambda.metricErrors({
      period: cdk.Duration.minutes(5),
      label: 'Post-Confirm Errors',
      color: '#F97316',
    }),
    props.cognitoPostConfirmLambda.metricInvocations({
      period: cdk.Duration.minutes(15),
      label: 'New Signups (invocations)',
      color: '#7C3AED',
    }),
  ],
});

this.dashboard.addWidgets(cognitoSigninsWidget, cognitoThrottlesWidget);
```

---

## Phase 5 — CloudWatch Log Insights Queries (Saved Queries)

These queries are saved in CloudWatch Logs Insights so they are one click away in the console. They do not cost anything to save — you only pay when you run them.

```typescript
// ── Saved Log Insights Queries ────────────────────────────────────────────────

new logs.QueryDefinition(this, 'WorkoutLambdaErrors', {
  queryDefinitionName: 'Fitness/WorkoutLambda-Errors',
  logGroups: [new logs.LogGroup(this, 'WorkoutLogGroupRef', {
    logGroupName: `/aws/lambda/${props.workoutLambda.functionName}`,
  })],
  queryString: new logs.QueryString({
    fields: ['@timestamp', '@message', '@requestId'],
    filter: '@message like /ERROR/',
    sort: '@timestamp desc',
    limit: 50,
  }),
});

new logs.QueryDefinition(this, 'MetricsProcessorErrors', {
  queryDefinitionName: 'Fitness/MetricsProcessor-Errors',
  logGroups: [new logs.LogGroup(this, 'MetricsProcessorLogGroupRef', {
    logGroupName: `/aws/lambda/${props.metricsProcessorLambda.functionName}`,
  })],
  queryString: new logs.QueryString({
    fields: ['@timestamp', '@message', '@requestId'],
    filter: '@message like /ERROR/',
    sort: '@timestamp desc',
    limit: 50,
  }),
});

new logs.QueryDefinition(this, 'SlowApiRequests', {
  queryDefinitionName: 'Fitness/API-SlowRequests',
  logGroups: [new logs.LogGroup(this, 'ApiLogGroupRef', {
    logGroupName: `/aws/lambda/${props.workoutLambda.functionName}`,
  })],
  queryString: new logs.QueryString({
    fields: ['@timestamp', '@message', '@duration'],
    filter: '@duration > 3000',
    sort: '@duration desc',
    limit: 20,
  }),
});

new logs.QueryDefinition(this, 'CognitoPostConfirmErrors', {
  queryDefinitionName: 'Fitness/PostConfirm-Errors',
  logGroups: [new logs.LogGroup(this, 'PostConfirmLogGroupRef', {
    logGroupName: `/aws/lambda/${props.cognitoPostConfirmLambda.functionName}`,
  })],
  queryString: new logs.QueryString({
    fields: ['@timestamp', '@message', '@requestId'],
    filter: '@message like /ERROR/',
    sort: '@timestamp desc',
    limit: 20,
  }),
});
```

---

## Phase 6 — Structured Logging Convention

Lambda functions must emit structured JSON logs for the saved queries and any future alerting to work correctly. Add this helper to `packages/lambdas/shared/src/logger.ts` and use it in every Lambda handler.

```typescript
// packages/lambdas/shared/src/logger.ts

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  message: string;
  lambdaName: string;
  timestamp: string;
  [key: string]: unknown;   // Additional context fields
}

const log = (level: LogLevel, message: string, context: Record<string, unknown> = {}) => {
  const entry: LogEntry = {
    level,
    message,
    lambdaName: process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'unknown',
    timestamp: new Date().toISOString(),
    ...context,
  };
  // CloudWatch parses JSON log lines automatically
  console.log(JSON.stringify(entry));
};

export const logger = {
  info:  (message: string, context?: Record<string, unknown>) => log('INFO',  message, context),
  warn:  (message: string, context?: Record<string, unknown>) => log('WARN',  message, context),
  error: (message: string, context?: Record<string, unknown>) => log('ERROR', message, context),
};

// Usage in any Lambda:
// import { logger } from '../../shared/src/logger';
// logger.info('Workout completed', { workoutId, userId, totalVolume });
// logger.error('DDB write failed', { error: err.message, workoutId });
```

**Mandatory log events per Lambda:**

| Lambda | What to log |
|---|---|
| workout | Workout created (INFO), workout completed (INFO) with `workoutId`/`userId`/`totalVolume`, PATCH validation failures (WARN) |
| metrics-processor | Processing started (INFO) with `workoutId`, goals evaluated count (INFO), any DDB write errors (ERROR) |
| ai | Generation started (INFO) with prompt length, SSE complete (INFO) with exercise count, LLM errors (ERROR) |
| goals | Goal created (INFO), goal completed (INFO), goal failed (WARN) |
| cognito-post-confirm | Profile created (INFO) with `userId`, any DDB errors (ERROR) |
| user | Follow/unfollow events (INFO), transaction failures (ERROR) |

---

## Alarm Summary Reference

| Alarm Name | Severity | Metric | Threshold | What It Means |
|---|---|---|---|---|
| `fitness-api-5xx-errors` | P1 | API GW 5XXError | ≥5 in 5min | Lambda failures — users getting errors |
| `fitness-api-4xx-elevated` | P2 | API GW 4XXError | ≥20 in 10min | Auth issue or frontend bug |
| `fitness-api-high-latency` | P2 | API GW Latency p99 | ≥5000ms | Slow response times for users |
| `fitness-lambda-workout-errors` | P1 | Lambda Errors (workout) | ≥3 in 5min | Workout save/complete failing |
| `fitness-lambda-metrics-processor-errors` | P1 | Lambda Errors (processor) | ≥3 in 5min | Metrics/goals not updating |
| `fitness-lambda-ai-errors` | P1 | Lambda Errors (ai) | ≥3 in 5min | AI workout generation failing |
| `fitness-lambda-throttles` | P2 | Lambda Throttles (combined) | ≥1 in 5min | Concurrency limit hit |
| `fitness-metrics-processor-iterator-age` | P1 | IteratorAge Maximum | ≥300,000ms | Metrics processor falling behind stream |
| `fitness-ai-lambda-duration` | P2 | Lambda Duration p99 (ai) | ≥20,000ms | AI approaching API GW timeout |
| `fitness-ddb-users-system-errors` | P1 | DDB SystemErrors (users) | ≥1 in 5min | DynamoDB internal failure |
| `fitness-ddb-workouts-system-errors` | P1 | DDB SystemErrors (workouts) | ≥1 in 5min | DynamoDB internal failure |
| `fitness-ddb-metrics-system-errors` | P1 | DDB SystemErrors (metrics) | ≥1 in 5min | DynamoDB internal failure |
| `fitness-ddb-throttled-requests` | P2 | DDB ThrottledRequests (all) | ≥5 in 10min | Burst capacity exhausted |
| `fitness-cognito-post-confirm-errors` | P1 | Lambda Errors (post-confirm) | ≥1 in 5min | New user signup is broken |

---

## Free Tier Impact Assessment

| Service | Free Tier | Expected Usage | Risk |
|---|---|---|---|
| CloudWatch Metrics | 10 custom metrics, unlimited AWS metrics | 0 custom metrics used | None — all metrics are AWS-native |
| CloudWatch Alarms | 10 alarms free | 14 alarms defined | **4 alarms exceed free tier** — ~$0.10/alarm/month = ~$0.40/month |
| CloudWatch Dashboard | 3 dashboards free | 1 dashboard | None |
| CloudWatch Logs Ingestion | 5 GB/month free | Low traffic — well under | None |
| CloudWatch Logs Storage | 5 GB free | 30-day retention set | None at low volume |
| SNS | 1M publishes free | Minimal alarm triggers | None |

**Total estimated monthly cost for monitoring: ~$0.40/month** (4 alarms over the free 10-alarm tier). All other monitoring is free.

If you want to stay within 10 free alarms, remove the 4 P2 alarms (4xx, latency, throttles, DDB throttles) and keep only the 10 P1 alarms. Add the P2s back when you have paying users.

---

## CDK Context Setup

Pass the alert email at deploy time via CDK context:

```bash
# Deploy with alert email
pnpm --filter cdk run cdk deploy -- -c alertEmail=you@example.com

# Or set in cdk.context.json (do not commit this file if it contains personal info)
{
  "alertEmail": "you@example.com"
}
```

Add `cdk.context.json` to `.gitignore` if it contains the email address.