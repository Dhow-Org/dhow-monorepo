import { Module } from "@nestjs/common";
import { FinancingController } from "./financing.controller";
import { FinancingService } from "./financing.service";
import { SignalsService } from "./signals.service";

@Module({
  controllers: [FinancingController],
  providers: [FinancingService, SignalsService],
})
export class FinancingModule {}
