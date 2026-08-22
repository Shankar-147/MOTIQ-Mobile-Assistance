import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { RfcHttpExceptionFilter } from "./common/filters/rfc-http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new RfcHttpExceptionFilter());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(","),
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`MOTIQ API listening on http://localhost:${port}/api/v1`);
}

bootstrap();
