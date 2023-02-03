import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export class MessageBrokerStack extends Stack {
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
  }
}
