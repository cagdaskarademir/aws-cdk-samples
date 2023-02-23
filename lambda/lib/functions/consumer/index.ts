import {DynamoDB, EC2, SSM} from "aws-sdk";
import {Handler} from "@aws-cdk/aws-lambda";
import {Message} from "./models/message";
import {SQSEvent} from "aws-lambda";

const dynamo = new DynamoDB.DocumentClient();
const TableName: string = process.env.TABLE_NAME ?? 'no_env_users';
const InstanceId: string = process.env.INSTANCE_ID ?? 'no_env_users';

export const handler: Handler = async (event: SQSEvent) => {
    console.log("Event Started")
    for (const record of event.Records) {

        let message: Message = JSON.parse(record?.body);
        console.log('Message Body -->  ', JSON.stringify(message));

        //let user = await getDataFromDynamo(message.id);
        //console.log(JSON.stringify(user));

        const ssm = new SSM();

        let fileName = "data" + new Date().getUTCDate() + ".txt";
        const instanceId = InstanceId;
        const command1 = "echo 'This is a test' > " + fileName;
        const command2 = "cat " + fileName;

        const params = {
            InstanceIds: [instanceId],
            DocumentName: 'AWS-RunShellScript',
            Parameters: {
                commands: [command1, command2]
            }
        };

        try {
            const response = await ssm.sendCommand(params).promise();
            console.log('Command sent:', response?.Command?.CommandId);
            return 'Command sent' + fileName;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    console.log('Instance Id --> ', InstanceId);

    return "Done";
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