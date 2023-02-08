import {aws_iam, CfnOutput, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {FunctionUrlAuthType} from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {AttributeType, Table} from 'aws-cdk-lib/aws-dynamodb';
import {Construct} from 'constructs';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {Effect} from "aws-cdk-lib/aws-iam";

export class VpnUserStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const queue = new sqs.Queue(this, 'VpnUserIntegrationQueue', {
            queueName: 'lambda-vpn-user-queue'
        });

        /* const lambdaVpn = new lambda.Function(this, 'LambdaVpnConsumer', {
             code: lambda.Code.fromAsset('./lib/vpn-user-integration-publisher'),
             handler: 'index.handler',
             functionName: 'LambdaVpnConsumerHandler',
             runtime: lambda.Runtime.NODEJS_18_X,
         });

         const eventSource = new lambdaEventSources.SqsEventSource(lambdaVpnQueue);

         lambdaVpn.addEventSource(eventSource);*/

        const table = new Table(this, 'VpnUserIntegrationTable', {
            tableName: 'users',
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'createdDate',
                type: AttributeType.STRING
            },
            removalPolicy: RemovalPolicy.DESTROY
        });

        const dynamoLambda = new NodejsFunction(this, 'VpnUserIntegrationDynamo', {
            functionName: 'VpnUserIntegrationPublisher',
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: './lib/functions/vpn-user-integration-publisher/index.ts',
            handler: 'handler',
            environment: {
                TABLE_NAME: table.tableName,
                QUEUE_URL: queue.queueUrl
            },
            logRetention: RetentionDays.ONE_DAY
        });

        table.grantReadWriteData(dynamoLambda);

        dynamoLambda.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: Effect.ALLOW,
            resources: [queue.queueArn],
            actions: ['*']
        }));

        const dynamoFunctionUrl = dynamoLambda.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ['*'],
            }
        });

        new CfnOutput(this, 'VpnUserIntegrationDynamoUrl', {
            value: dynamoFunctionUrl.url
        });
    }
}
