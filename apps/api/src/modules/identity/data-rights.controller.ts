import { Controller, Delete, Get, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "@motiq/types";
import { CurrentUser } from "./auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "./auth/guards/jwt-auth.guard";
import { DataRightsService } from "./data-rights.service";

/** Ch126's real, callable Data Principal rights endpoints — every role. */
@Controller("users/me")
@UseGuards(JwtAuthGuard)
export class DataRightsController {
  constructor(private readonly dataRightsService: DataRightsService) {}

  @Get("data-export")
  exportOwnData(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRightsService.exportOwnData(user.userId);
  }

  @Delete()
  eraseOwnAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.dataRightsService.eraseOwnAccount(user.userId);
  }
}
