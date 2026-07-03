import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppConfigService } from "../config/config.service";
import { ChainService } from "../chain/chain.service";

/** Public chain config the web needs for client-side transactions. */
@ApiTags("config")
@Controller("config")
export class MetaController {
  constructor(
    private readonly config: AppConfigService,
    private readonly chain: ChainService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Chain id + contract addresses for the client" })
  get() {
    return {
      chainId: this.config.get("CHAIN_ID"),
      usdc: this.chain.addresses.usdc,
      financingPool: this.chain.addresses.financingPool,
    };
  }
}
