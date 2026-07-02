import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ChainModule } from "./chain/chain.module";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { FinancingModule } from "./financing/financing.module";
import { FundersModule } from "./funders/funders.module";
import { ReputationModule } from "./reputation/reputation.module";
import { IndexerModule } from "./indexer/indexer.module";
import { OpenFinanceModule } from "./open-finance/open-finance.module";
import { OffRampModule } from "./off-ramp/off-ramp.module";

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ChainModule,
    AuthModule,
    HealthModule,
    InvoicesModule,
    FinancingModule,
    FundersModule,
    ReputationModule,
    IndexerModule,
    OpenFinanceModule,
    OffRampModule,
  ],
})
export class AppModule {}
