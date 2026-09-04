import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { join } from "path";
import express from "express";
import { existsSync, mkdirSync } from "fs";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadDir=join(process.cwd(),"uploads");
  if(!existsSync(uploadDir)) mkdirSync(uploadDir,{recursive:true});
  app.getHttpAdapter().getInstance().use("/uploads", express.static(uploadDir));
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix("api");
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
  console.log("ChatApp API listening on http://localhost:4000");
}
bootstrap();
