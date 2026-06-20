import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ReputationService } from "./reputation.service";

@ApiTags("reputation")
@Controller("reputation")
export class ReputationController {
  constructor(private readonly reputation: ReputationService) {}

  @Get(":wallet")
  @ApiOperation({ summary: "SME cash-flow credit score, tier, and snapshot history" })
  get(@Param("wallet") wallet: string) {
    return this.reputation.get(wallet);
  }
}
