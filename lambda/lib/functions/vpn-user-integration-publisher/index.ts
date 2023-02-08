import {Handler} from '@aws-cdk/aws-lambda';
import {DynamoDB, SNS, SQS} from 'aws-sdk';
import {randomUUID} from "crypto";
import {User} from "./models/user";

const dynamo = new DynamoDB.DocumentClient();
const sqs = new SQS({apiVersion: 'latest'});
const TableName: string = process.env.TABLE_NAME ?? 'no_env_users';
const QueueUrl: string = process.env.QUEUE_URL ?? '';

export const handler: Handler = async (event: any) => {
    // get method type from request context
    const method = event.requestContext.http.method;
    const user: User = JSON.parse(event.body);

    // check the method type if it does not match the requested one
    // return status code 400
    if (method == 'POST') {
        // save transaction to dynamo
        let userId = await saveUserToDynamo(user);
        await sendMessageToQueue(userId);

        return {
            statusCode: 200,
            body: 'The Customer Request Has Been Delivered!'
        }
    } else {
        return {
            statusCode: 400,
            body: 'Not a valid operation'
        }
    }
}

async function sendMessageToQueue(id: string) {
    return sqs.sendMessage({
        QueueUrl: QueueUrl,
        MessageBody: JSON.stringify({id: id})
    }).promise();
}

async function saveUserToDynamo(data: User) {

    data.id = randomUUID();
    data.createdDate = new Date();

    const params: DynamoDB.DocumentClient.PutItemInput = {
        TableName: TableName,
        Item: data
    }
    await dynamo.put(params)
        .promise();

    return data.id;
}
