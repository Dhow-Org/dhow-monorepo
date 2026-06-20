import { Global, Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { OpsGuard } from "./ops.guard";

@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, OpsGuard],
  exports: [JwtAuthGuard, OpsGuard],
})
export class AuthModule {}
