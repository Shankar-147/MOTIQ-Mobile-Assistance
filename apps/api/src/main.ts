import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { RfcHttpExceptionFilter } from "./common/filters/rfc-http-exception.filter";

async function bootstrap() {
  // rawBody: true attaches req.rawBody (Buffer) alongside the normally
  // parsed req.body — needed for Razorpay's webhook signature verification
  // (Ch57, binding), which must run against the exact bytes Razorpay signed,
  // not a re-serialized copy. See PaymentController's webhook route.
  const app = await NestFactory.create(AppModule, { rawBody: true });

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
