import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { FundersService } from "./funders.service";

@ApiTags("funders")
@Controller()
export class FundersController {
  constructor(private readonly funders: FundersService) {}

  @Get("pool")
  @ApiOperation({ summary: "Financing pool stats (idle, outstanding, principal, losses)" })
  pool() {
    return this.funders.getPoolStats();
  }

  @Get("funders/:wallet")
  @ApiOperation({ summary: "Funder position (principal + claimable/pending fees)" })
  funder(@Param("wallet") wallet: string) {
    return this.funders.getFunder(wallet);
  }
}
