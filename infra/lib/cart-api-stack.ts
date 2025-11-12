import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { aws_apigateway as apigateway } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as dotenv from 'dotenv';

dotenv.config();

export class CartApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'CartApiVpc', {
      maxAzs: 2,
    });

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Allow Lambda access to RDS PostgreSQL',
      allowAllOutbound: true,
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'LambdaSecurityGroup',
      {
        vpc,
        description: 'Lambda security group',
        allowAllOutbound: true,
      },
    );

    rdsSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda security group access to PostgreSQL',
    );

    const dbInstance = new rds.DatabaseInstance(this, 'CartApiPostgres', {
      databaseName: 'cartdb',
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14,
      }),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      credentials: rds.Credentials.fromGeneratedSecret('postgres'),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      securityGroups: [rdsSecurityGroup],
      publiclyAccessible: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deleteAutomatedBackups: true,
    });

    const lambdaFunction = new NodejsFunction(this, 'LambdaFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../..', 'dist', 'main.js'),
      projectRoot: path.join(__dirname, '../..'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      vpc,
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DB_HOST: process.env.DB_HOST || dbInstance.dbInstanceEndpointAddress,
        DB_PORT: String(
          process.env.DB_PORT || dbInstance.dbInstanceEndpointPort,
        ),
        DB_NAME: process.env.DB_NAME || 'cartdb',
        DB_USERNAME: process.env.DB_USERNAME || 'postgres',
        DB_PASSWORD: String(process.env.DB_PASSWORD || ''),
        DB_SSL: process.env.DB_SSL || 'false',
        DB_SECRET_ARN: dbInstance.secret?.secretArn || '',
        LAST_DEPLOY: new Date().toISOString(),
      },
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

    dbInstance.secret?.grantRead(lambdaFunction);

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
