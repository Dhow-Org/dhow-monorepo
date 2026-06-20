import { Module } from "@nestjs/common";
import { FundersController } from "./funders.controller";
import { FundersService } from "./funders.service";

@Module({
  controllers: [FundersController],
  providers: [FundersService],
})
export class FundersModule {}
