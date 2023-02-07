import {aws_iam, CfnOutput, Duration, Stack, StackProps} from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {FunctionUrlAuthType} from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {Table} from 'aws-cdk-lib/aws-dynamodb';
import {Construct} from 'constructs';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {Effect} from "aws-cdk-lib/aws-iam";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";

export class VpnUserStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const queue = new sqs.Queue(this, 'LambdaVpnSqs', {
            queueName: 'lambda-vpn-queue.fifo',
            fifo: true,
            deadLetterQueue: {
                maxReceiveCount: 3,
                queue: new sqs.Queue(this, 'LambdaVpnDlqSqs', {
                    queueName: 'lambda-vpn-queue-dlq.fifo',
                    fifo: true
                })
            },
            visibilityTimeout: Duration.seconds(300)
        });

        const topic = new sns.Topic(this, 'LambdaVpnTopic', {
            topicName: 'lambda-vpn-queue-topic',
            displayName: 'Lambda VPN Topic',
            fifo: true,
            contentBasedDeduplication: true
        });

        topic.addSubscription(new subs.SqsSubscription(queue));

        new CfnOutput(this, 'vpnUserSnsTopicArn',{
            value: topic.topicArn,
            description: 'The Vpn User Arn of the Sns'
        })

        /* const lambdaVpn = new lambda.Function(this, 'LambdaVpnConsumer', {
             code: lambda.Code.fromAsset('./lib/vpn-lambda'),
             handler: 'index.handler',
             functionName: 'LambdaVpnConsumerHandler',
             runtime: lambda.Runtime.NODEJS_18_X,
         });

         const eventSource = new lambdaEventSources.SqsEventSource(lambdaVpnQueue);

         lambdaVpn.addEventSource(eventSource);*/

        const table = new Table(this, 'LambdaVpnTable', {
            tableName: 'users',
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING
            }
        });

        const dynamoLambda = new NodejsFunction(this, 'DynamoLambda', {
            functionName: 'VpnUserProducer',
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: './lib/functions/vpn-lambda/index.ts',
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

        new CfnOutput(this, 'DynamoLambdaUrl', {
            value: dynamoFunctionUrl.url
        });
    }
}
