import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class CartApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaFunction = new NodejsFunction(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../..', 'dist', 'src', 'main.js'),
      projectRoot: path.join(__dirname, '../..'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      bundling: {
        forceDockerBundling: false,
        externalModules: [
          '@nestjs/microservices',
          '@nestjs/websockets',
          'cache-manager',
          'class-transformer',
          'class-validator',
        ],
      },
    });

    const api = new apigateway.RestApi(this, 'NestApi', {
      restApiName: 'Nest Service',
      description: 'This service serves a Nest.js application.',
      deploy: true,
    });

    const integration = new apigateway.LambdaIntegration(lambdaFunction);

    api.root.addProxy({
      defaultIntegration: integration,
      anyMethod: true,
    });
  }
}
