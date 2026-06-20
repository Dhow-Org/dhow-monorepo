import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { FinancingService } from "./financing.service";
import { disburseBodySchema, repayBodySchema, type DisburseBody, type RepayBody } from "./financing.dto";

@ApiTags("financing")
@Controller()
export class FinancingController {
  constructor(private readonly financing: FinancingService) {}

  @Post("invoices/:id/disburse")
  @ApiOperation({ summary: "Disburse a receivable advance against a verified invoice" })
  disburse(@Param("id") id: string, @Body(new ZodValidationPipe(disburseBodySchema)) body: DisburseBody) {
    return this.financing.disburse(id, body);
  }

  @Post("advances/:id/repay")
  @ApiOperation({ summary: "Record a repayment against an advance" })
  repay(@Param("id") id: string, @Body(new ZodValidationPipe(repayBodySchema)) body: RepayBody) {
    return this.financing.repay(id, body.amount);
  }

  @Post("advances/:id/default")
  @ApiOperation({ summary: "Mark an advance as defaulted" })
  recordDefault(@Param("id") id: string) {
    return this.financing.recordDefault(id);
  }

  @Get("advances/:id")
  @ApiOperation({ summary: "Get an advance by id" })
  get(@Param("id") id: string) {
    return this.financing.get(id);
  }
}
