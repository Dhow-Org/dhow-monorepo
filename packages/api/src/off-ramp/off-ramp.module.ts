import { Global, Module } from "@nestjs/common";
import { FuzeProvider } from "./fuze.provider";
import { OffRampService } from "./off-ramp.service";
import { OffRampController } from "./off-ramp.controller";

@Global()
@Module({
  controllers: [OffRampController],
  providers: [FuzeProvider, OffRampService],
  exports: [OffRampService],
})
export class OffRampModule {}
