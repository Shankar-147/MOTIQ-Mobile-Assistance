import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { RatingService } from "./rating.service";
import { CreateRatingDto } from "./dto/create-rating.dto";

@Controller("requests/:requestId/ratings")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param("requestId") requestId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingService.submitForRequest(requestId, user.profileId, dto.stars, dto.comment);
  }
}
