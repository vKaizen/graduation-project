/* eslint-disable prettier/prettier */
import { config } from 'dotenv';
config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';



console.log('JWT_SECRET:', process.env.JWT_SECRET);


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
  
}
bootstrap();
