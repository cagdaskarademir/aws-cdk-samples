import {aws_iam, CfnOutput, Duration, RemovalPolicy, Stack, StackProps} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as dynamo from 'aws-cdk-lib/aws-dynamodb';
import {Queue} from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import {Construct} from 'constructs';
import {RetentionDays} from "aws-cdk-lib/aws-logs";
import {FunctionUrlAuthType, Runtime} from "@aws-cdk/aws-lambda";
import {Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';


export class VpnUserIntegrationStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, 'VpnUserIntegrationVpc', {maxAzs: 2});
        const instance = new ec2.Instance(this, 'VpnUserIntegrationInstance', {
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
            machineImage: ec2.MachineImage.latestAmazonLinux({
                generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2
            }),
            vpc: vpc
        });

        const queue = new Queue(this, 'VpnUserIntegrationQueue', {
            queueName: 'lambda-vpn-user-queue',
            deadLetterQueue: {
                queue: new Queue(this, 'VpnUserIntegrationQueueDlq', {
                    queueName: 'lambda-vpn-user-queue-dlq'
                }),
                maxReceiveCount: 3,
            },
            removalPolicy: RemovalPolicy.DESTROY,
            retentionPeriod: Duration.days(1),
            maxMessageSizeBytes: 100 * 1024
        });

        const table = new dynamo.Table(this, 'VpnUserIntegrationTable', {
            tableName: 'users',
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: 'createdDate',
                type: dynamo.AttributeType.NUMBER
            },
            removalPolicy: RemovalPolicy.DESTROY
        });

        const publisher = new lambda.NodejsFunction(this, 'VpnUserPublisher', {
            functionName: 'VpnUserPublisher',
            runtime: Runtime.NODEJS_16_X,
            entry: './lib/functions/publisher/index.ts',
            handler: 'handler',
            environment: {
                TABLE_NAME: table.tableName,
                QUEUE_URL: queue.queueUrl
            },
            logRetention: RetentionDays.ONE_DAY
        });

        table.grantReadWriteData(publisher);

        publisher.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: Effect.ALLOW,
            resources: [queue.queueArn],
            actions: ['*']
        }));

        publisher.addToRolePolicy(new aws_iam.PolicyStatement({
            effect: Effect.ALLOW,
            resources: [queue.queueArn],
            actions: ['*']
        }));

        const publisherUrl = publisher.addFunctionUrl({
            authType: FunctionUrlAuthType.NONE,
            cors: {
                allowedOrigins: ['*'],
            }
        });

        new CfnOutput(this, 'VpnUserIntegrationDynamoUrl', {
            value: publisherUrl.url
        });

        const consumer = new lambda.NodejsFunction(this, 'VpnUserConsumer', {
            functionName: 'VpnUserConsumer',
            runtime: Runtime.NODEJS_16_X,
            entry: './lib/functions/consumer/index.ts',
            handler: 'handler',
            timeout: Duration.seconds(30),
            environment: {
                TABLE_NAME: table.tableName,
                QUEUE_URL: queue.queueUrl
            },
            logRetention: RetentionDays.ONE_DAY
        });

        consumer.addEventSource(
            new SqsEventSource(queue, {
                batchSize: 10,
            }),
        );

        table.grantReadWriteData(consumer);

        // Add IAM role to Lambda function to allow it to run commands on EC2 instance
        const role = new Role(this, 'VpnUserIntegrationRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com')
        });

        role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

        role.addToPolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ["*"],
            actions: ['ec2:RunCommand']
        }));

        consumer.addToRolePolicy(new PolicyStatement({
            effect: Effect.ALLOW,
            resources: ['*'],
            actions: ['ssm:SendCommand']
        }));

        // Grant permissions to Lambda function to execute on EC2 instance
        instance.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM'));

    }
}
