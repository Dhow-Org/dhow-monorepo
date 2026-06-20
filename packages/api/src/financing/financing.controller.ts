import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OpsGuard } from "../auth/ops.guard";
import { FinancingService } from "./financing.service";
import { disburseBodySchema, repayBodySchema, type DisburseBody, type RepayBody } from "./financing.dto";

@ApiTags("financing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class FinancingController {
  constructor(private readonly financing: FinancingService) {}

  @Post("invoices/:id/disburse")
  @UseGuards(OpsGuard)
  @ApiOperation({ summary: "Disburse a receivable advance against a verified invoice (ops only)" })
  disburse(@Param("id") id: string, @Body(new ZodValidationPipe(disburseBodySchema)) body: DisburseBody) {
    return this.financing.disburse(id, body);
  }

  @Post("advances/:id/repay")
  @UseGuards(OpsGuard)
  @ApiOperation({ summary: "Record a repayment against an advance (ops only)" })
  repay(@Param("id") id: string, @Body(new ZodValidationPipe(repayBodySchema)) body: RepayBody) {
    return this.financing.repay(id, body.amount);
  }

  @Post("advances/:id/default")
  @UseGuards(OpsGuard)
  @ApiOperation({ summary: "Mark an advance as defaulted (ops only)" })
  recordDefault(@Param("id") id: string) {
    return this.financing.recordDefault(id);
  }

  @Get("advances/:id")
  @ApiOperation({ summary: "Get an advance by id" })
  get(@Param("id") id: string) {
    return this.financing.get(id);
  }
}
