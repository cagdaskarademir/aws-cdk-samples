import {DynamoDB} from "aws-sdk";
import {Handler} from "@aws-cdk/aws-lambda";
import {SQSEvent, SQSMessageAttributes} from "aws-lambda";
import {Message} from "./models/user";

const dynamo = new DynamoDB.DocumentClient();

export const handler: Handler = async (event: SQSEvent) => {
    try {
        for (const record of event.Records) {
            const messageAttributes: SQSMessageAttributes = record.messageAttributes;
            console.log('Message Attributtes -->  ', messageAttributes.AttributeNameHere.stringValue);
            console.log('Message Body -->  ', record.body);

            let userId: Message = JSON.parse(record.body);
            console.log(userId);

            let user = await getUser(userId)
            console.log(JSON.stringify(user));
        }
    } catch (error) {
        console.log(error);
    }
}

async function getUser(event: any) {
    const id = event.queryStringParameters.id;
    const param: DynamoDB.DocumentClient.GetItemInput = {
        Key: {
            name: id
        },
        TableName: 'TableName'
    };

    return dynamo.get(param)
        .promise()
        .then(value => {
            console.log(value)
            return value.Item
        });
}