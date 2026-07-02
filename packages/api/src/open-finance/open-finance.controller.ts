import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard, type AuthUser } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { OpenFinanceService } from "./open-finance.service";
import { connectSchema, type ConnectBody } from "./open-finance.dto";

@ApiTags("open-finance")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("open-finance")
export class OpenFinanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openFinance: OpenFinanceService,
  ) {}

  @Get("status")
  @ApiOperation({ summary: "Whether open finance is available and linked for this SME" })
  async status(@CurrentUser() user: AuthUser | undefined) {
    const sme = user ? await this.prisma.sme.findUnique({ where: { wallet: user.address.toLowerCase() } }) : null;
    return { available: this.openFinance.available, linked: Boolean(sme?.leanEntityId) };
  }

  @Post("connect")
  @ApiOperation({ summary: "Link a bank (store the Lean entity id) so underwriting can use cash flow" })
  async connect(
    @CurrentUser() user: AuthUser | undefined,
    @Body(new ZodValidationPipe(connectSchema)) body: ConnectBody,
  ) {
    if (!user) return { connected: false };
    const wallet = user.address.toLowerCase();
    await this.prisma.sme.upsert({
      where: { wallet },
      update: { leanEntityId: body.entityId },
      create: { wallet, leanEntityId: body.entityId },
    });
    return { connected: true };
  }
}
