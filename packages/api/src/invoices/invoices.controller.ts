import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { registerInvoiceSchema, type RegisterInvoiceInput } from "@dhow/shared";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { JwtAuthGuard, type AuthUser } from "../auth/jwt-auth.guard";
import { OpsGuard } from "../auth/ops.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @ApiOperation({ summary: "Register a receivable (DB + on-chain) for the signed-in wallet" })
  create(@CurrentUser() user: AuthUser, @Body(new ZodValidationPipe(registerInvoiceSchema)) body: RegisterInvoiceInput) {
    return this.invoices.create(user.address, body);
  }

  @Get()
  @ApiOperation({ summary: "List the signed-in wallet's own invoices" })
  list(@CurrentUser() user: AuthUser) {
    return this.invoices.listForWallet(user.address);
  }

  // NB: must be declared before the ":id" route so "bills" isn't treated as an id.
  @Get("bills")
  @ApiOperation({ summary: "Invoices the signed-in wallet OWES (as buyer) and can pay now" })
  bills(@CurrentUser() user: AuthUser) {
    return this.invoices.billsForWallet(user.address);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get one of the signed-in wallet's invoices" })
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.invoices.getForWallet(user.address, id);
  }

  @Post(":id/verify")
  @UseGuards(OpsGuard)
  @ApiOperation({ summary: "Verify an invoice so it becomes financeable (ops only)" })
  verify(@Param("id") id: string) {
    return this.invoices.verify(id);
  }
}
