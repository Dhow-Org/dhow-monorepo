import { Global, Module } from "@nestjs/common";
import { LeanProvider } from "./lean.provider";
import { OpenFinanceService } from "./open-finance.service";
import { OpenFinanceController } from "./open-finance.controller";

@Global()
@Module({
  controllers: [OpenFinanceController],
  providers: [LeanProvider, OpenFinanceService],
  exports: [OpenFinanceService],
})
export class OpenFinanceModule {}
