#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { MessageBrokerStack } from '../lib/message-broker-stack';

const app = new cdk.App();
new MessageBrokerStack(app, 'LambdaStack');
