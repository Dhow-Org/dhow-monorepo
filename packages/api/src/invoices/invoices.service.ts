import { BadRequestException, Injectable } from "@nestjs/common";
import { keccak256, toHex, zeroAddress, type Address } from "viem";
import type { RegisterInvoiceInput } from "@dhow/shared";
import { PrismaService } from "../prisma/prisma.service";
import { ChainService } from "../chain/chain.service";

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainService,
  ) {}

  /** Persist the receivable, then register it on-chain (externalRef hashed for anti-double-financing). */
  async create(input: RegisterInvoiceInput) {
    const sme = await this.prisma.sme.upsert({
      where: { wallet: input.supplier },
      update: {},
      create: { wallet: input.supplier },
    });

    const externalRefHash = keccak256(toHex(input.externalRef));
    const { txHash, onChainId } = await this.chain.registerInvoice({
      supplier: input.supplier,
      debtor: (input.debtor ?? zeroAddress) as Address,
      asset: input.asset,
      amount: BigInt(input.amount),
      dueDate: BigInt(input.dueDate),
      externalRef: externalRefHash,
      docHash: input.docHash,
    });

    return this.prisma.invoice.create({
      data: {
        onChainId,
        smeId: sme.id,
        debtor: input.debtor ?? null,
        asset: input.asset,
        amount: input.amount,
        dueDate: new Date(input.dueDate * 1000),
        externalRef: input.externalRef,
        docHash: input.docHash,
        registerTx: txHash,
        status: "REGISTERED",
      },
    });
  }

  /** Verify the invoice on-chain (ops/KYB attestation) so it becomes financeable. */
  async verify(id: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id } });
    if (invoice.onChainId == null) throw new BadRequestException("invoice is not on-chain");
    if (invoice.status !== "REGISTERED") throw new BadRequestException(`cannot verify invoice in status ${invoice.status}`);
    await this.chain.verifyInvoice(invoice.onChainId);
    return this.prisma.invoice.update({ where: { id }, data: { status: "VERIFIED" } });
  }

  list() {
    return this.prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, include: { advance: true } });
  }

  get(id: string) {
    return this.prisma.invoice.findUniqueOrThrow({ where: { id }, include: { advance: true } });
  }
}
