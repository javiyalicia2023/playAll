import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import * as cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { json } from 'express';
import pinoHttp from 'pino-http';
import { PinoLoggerService } from './common/pino-logger.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const loggerService = new PinoLoggerService();
  app.useLogger(loggerService);
  app.use(pinoHttp({ logger: loggerService.pino }));
  app.use(cookieParser(process.env.SESSION_SECRET));
  app.use(json({ limit: '1mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe({ createValidationException: (error) => error }));

  const port = process.env.PORT ? Number(process.env.PORT) : 3333;
  await app.listen(port);
  loggerService.log('API listening', { port });
}

bootstrap();
