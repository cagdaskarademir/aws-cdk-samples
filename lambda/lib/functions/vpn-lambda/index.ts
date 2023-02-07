import {Handler} from '@aws-cdk/aws-lambda';
import {DynamoDB, SQS} from 'aws-sdk';
import {User} from "./models/user-model";
import {Aws} from "aws-cdk-lib";

const dynamo = new DynamoDB.DocumentClient();
const sqs = new SQS({apiVersion: 'latest'});
const TableName: string = process.env.TABLE_NAME ?? 'no_env_users';
const QueueUrl: string = process.env.QUEUE_URL ?? '';

async function getUser(event: any) {
    const id = event.queryStringParameters.id;
    const param: DynamoDB.DocumentClient.GetItemInput = {
        Key: {
            name: id
        },
        TableName: TableName
    };

    return dynamo.get(param)
        .promise()
        .then(value => {
            console.log(value)
            return value.Item
        })
        .catch(reason => {
            return {
                statusCode: 500,
                body: reason.body
            }
        });
}

async function sendMessageToQueue(event: any) {
    const user: User = JSON.parse(event.body);
    sqs.sendMessage({
        QueueUrl: QueueUrl,
        MessageBody: user.id,
        MessageDeduplicationId: user.id,
        DelaySeconds: 2,
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            console.log("Success " + JSON.stringify(user));
        }
    });
}

async function saveUser(event: any) {
    const user: User = JSON.parse(event.body);

    const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: TableName,
        Item: user
    }
    return dynamo.put(params)
        .promise();
}

export const handler: Handler = async (event: any) => {
    const method = event.requestContext.http.method;

    if (method == 'GET') {
        return await getUser(event);
    } else if (method == 'POST') {
        await saveUser(event)
        await sendMessageToQueue(event);
        return {
            statusCode: 200,
            body: 'The Message is delivered'
        }
    } else {
        return {
            statusCode: 400,
            body: 'Not a valid operation'
        }
    }
}