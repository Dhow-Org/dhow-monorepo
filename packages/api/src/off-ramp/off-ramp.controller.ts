import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OffRampService } from "./off-ramp.service";

@ApiTags("settlement")
@Controller("settlement")
export class OffRampController {
  constructor(private readonly offRamp: OffRampService) {}

  @Get("quote")
  @ApiOperation({ summary: "Quote a USDC -> AED settlement to a supplier" })
  quote(@Query("amount") amount: string) {
    const usdc = Number(amount);
    if (!Number.isFinite(usdc) || usdc <= 0) throw new BadRequestException("amount must be a positive number");
    return this.offRamp.quote(usdc);
  }
}
