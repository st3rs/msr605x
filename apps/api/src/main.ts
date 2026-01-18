import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for the frontend
  app.enableCors({
    origin: 'http://localhost:3000', // Web App
    credentials: true,
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  Logger.log(`🚀 API running on http://localhost:${port}`);
}
bootstrap();
