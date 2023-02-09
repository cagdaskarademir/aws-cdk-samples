#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {VpnUserIntegrationStack} from '../lib/vpn-user-integration-stack';

const app = new cdk.App();
new VpnUserIntegrationStack(app, 'VpnUserIntegrationStack');
