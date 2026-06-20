import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { registerInvoiceSchema, type RegisterInvoiceInput } from "@dhow/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OpsGuard } from "../auth/ops.guard";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: "Register a receivable (DB + on-chain)" })
  create(@Body(new ZodValidationPipe(registerInvoiceSchema)) body: RegisterInvoiceInput) {
    return this.invoices.create(body);
  }

  @Get()
  @ApiOperation({ summary: "List invoices" })
  list() {
    return this.invoices.list();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an invoice by id" })
  get(@Param("id") id: string) {
    return this.invoices.get(id);
  }

  @Post(":id/verify")
  @UseGuards(OpsGuard)
  @ApiOperation({ summary: "Verify an invoice so it becomes financeable (ops only)" })
  verify(@Param("id") id: string) {
    return this.invoices.verify(id);
  }
}
