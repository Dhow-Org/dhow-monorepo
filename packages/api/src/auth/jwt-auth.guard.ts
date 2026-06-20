import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../config/config.service";

export interface AuthUser {
  address: string;
}

export interface AuthedRequest {
  headers: { authorization?: string };
  user?: AuthUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("missing bearer token");
    }
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(header.slice(7), {
        secret: this.config.get("JWT_SECRET"),
      });
      req.user = { address: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
