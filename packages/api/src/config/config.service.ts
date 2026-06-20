import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "./env";

/** Thin typed wrapper so the rest of the app reads config in a type-safe way. */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }
}
