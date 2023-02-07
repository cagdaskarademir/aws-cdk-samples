#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpnUserStack } from '../lib/vpn-user-stack';

const app = new cdk.App();
new VpnUserStack(app, 'LambdaStack');
