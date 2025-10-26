import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CartApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new lambdaNodejs.NodejsFunction(
      this,
      'LambdaFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: path.join(__dirname, '../..dist/main.js'),
        projectRoot: path.join(__dirname, '../..'),
        memorySize: 1024,
        timeout: cdk.Duration.seconds(30),
        environment: {
          NODE_ENV: 'production',
        },
      },
    );

    const api = new apigateway.RestApi(this, 'NestApi', {
      restApiName: 'Nest Service',
      description: 'This service serves a Nest.js application.',
    });

    const integration = new apigateway.LambdaIntegration(lambdaFunction);

    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true,
    });
  }
}
