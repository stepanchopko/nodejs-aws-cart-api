import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverless from 'serverless-http';

async function bootstrapServer() {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  app.get(ConfigService);

  app.enableCors({ origin: (_, cb) => cb(null, true) });
  app.use(helmet());

  await app.init();

  return serverless(expressApp);
}

let server: any;

export const handler = async (event: any, context: any) => {
  if (!server) {
    server = await bootstrapServer();
  }
  return server(event, context);
};
