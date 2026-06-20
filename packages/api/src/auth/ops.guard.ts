import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { AppConfigService } from "../config/config.service";
import { JwtAuthGuard, type AuthedRequest } from "./jwt-auth.guard";

/** Requires a valid JWT whose address is in OPS_ADDRESSES (operator/ops actions). */
@Injectable()
export class OpsGuard implements CanActivate {
  constructor(
    private readonly jwtGuard: JwtAuthGuard,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.jwtGuard.canActivate(context);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const ops = this.config
      .get("OPS_ADDRESSES")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const address = req.user?.address?.toLowerCase();
    if (!address || !ops.includes(address)) {
      throw new ForbiddenException("operator access required");
    }
    return true;
  }
}
