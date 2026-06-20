import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { registerInvoiceSchema, type RegisterInvoiceInput } from "@dhow/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
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
  @ApiOperation({ summary: "Verify an invoice so it becomes financeable" })
  verify(@Param("id") id: string) {
    return this.invoices.verify(id);
  }
}
