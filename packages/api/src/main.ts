import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppConfigService } from "./config/config.service";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();

  const config = app.get(AppConfigService);

  const origins = config.get("CORS_ORIGINS");
  app.enableCors({
    origin: origins === "*" ? true : origins.split(",").map((o) => o.trim()).filter(Boolean),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle("dhow API")
    .setDescription("Stablecoin cross-border payments + cash-flow credit for UAE import/export SMEs.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swaggerConfig));

  // Railway/most PaaS inject PORT; bind 0.0.0.0 so the container is reachable.
  const port = config.get("PORT") ?? config.get("API_PORT");
  await app.listen(port, "0.0.0.0");
  new Logger("bootstrap").log(`dhow-api listening on :${port} (docs at /api/docs)`);
}

void bootstrap();
