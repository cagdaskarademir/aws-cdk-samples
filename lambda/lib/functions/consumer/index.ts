import {DynamoDB} from "aws-sdk";
import {Handler} from "@aws-cdk/aws-lambda";
import {Message} from "./models/message";

const dynamo = new DynamoDB.DocumentClient();
const TableName: string = process.env.TABLE_NAME ?? 'no_env_users';

export const handler: Handler = async (event: SQSEvent) => {
    for (const record of event.Records) {
        try {

            let message: Message = JSON.parse(record?.body);
            console.log('Message Body -->  ', JSON.stringify(message));

            let user = await getDataFromDynamo(message.id);
            console.log(JSON.stringify(user));
        } catch (error) {
            throw error;
        }
    }
}

async function getDataFromDynamo(id: string) {
    const param: DynamoDB.DocumentClient.GetItemInput = {
        Key: {
            'id': id
        },
        TableName: TableName,
    };

    return dynamo.get(param)
        .promise()
        .then(value => {
            console.log(value)
            return value.Item
        });
}