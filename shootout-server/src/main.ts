import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * @async
 * @returns {*}
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:4200', 'https://penalty-shoots-ashy.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
