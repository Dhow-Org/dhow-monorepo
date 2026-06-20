import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  liveness(): { status: string; service: string } {
    return { status: "ok", service: "dhow-api" };
  }

  @Get("ready")
  async readiness(): Promise<{ status: string; db: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", db: "ok" };
  }
}
