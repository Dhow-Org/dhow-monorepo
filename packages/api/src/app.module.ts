import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ChainModule } from "./chain/chain.module";
import { HealthModule } from "./health/health.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { FinancingModule } from "./financing/financing.module";

@Module({
  imports: [AppConfigModule, PrismaModule, ChainModule, HealthModule, InvoicesModule, FinancingModule],
})
export class AppModule {}
