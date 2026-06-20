import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { siweVerifySchema, type SiweVerifyInput } from "@dhow/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get("nonce")
  @ApiOperation({ summary: "Get a single-use SIWE nonce" })
  nonce() {
    return this.auth.createNonce();
  }

  @Post("verify")
  @ApiOperation({ summary: "Verify a signed SIWE message and receive a JWT" })
  verify(@Body(new ZodValidationPipe(siweVerifySchema)) body: SiweVerifyInput) {
    return this.auth.verify(body.message, body.signature);
  }
}
