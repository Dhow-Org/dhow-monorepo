import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OpsGuard } from "../auth/ops.guard";
import { IndexerService } from "./indexer.service";

@ApiTags("admin")
@Controller("admin")
@UseGuards(OpsGuard)
export class IndexerController {
  constructor(private readonly indexer: IndexerService) {}

  @Post("reconcile")
  @ApiOperation({ summary: "Force an immediate chain -> DB reconciliation (ops only)" })
  reconcile() {
    return this.indexer.reconcile();
  }
}
