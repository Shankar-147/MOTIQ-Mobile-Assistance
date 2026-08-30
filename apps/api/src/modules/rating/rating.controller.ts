import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { RatingService } from "./rating.service";
import { CreateRatingDto } from "./dto/create-rating.dto";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post("requests/:requestId/ratings")
  @Roles(UserRole.CUSTOMER)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId") requestId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingService.submitForRequest(requestId, user.profileId, dto.stars, dto.comment);
  }

  // Ch72's mobile Provider app rating-history screen — lives here since
  // RatingModule owns Rating; see RatingService.listForProvider()'s comment.
  @Get("providers/me/ratings")
  @Roles(UserRole.PROVIDER)
  listMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.ratingService.listForProvider(user.profileId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
