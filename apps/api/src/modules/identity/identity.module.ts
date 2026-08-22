import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { IdentityService } from "./identity.service";
import { AuthService } from "./auth/auth.service";
import { AuthController } from "./auth/auth.controller";
import { JwtStrategy } from "./auth/strategies/jwt.strategy";

/**
 * Owns User, CustomerProfile, ProviderProfile, AdminProfile, and auth
 * (Ch33, Ch50, Ch51 — see docs/decisions/0011-*.md). Marked @Global(),
 * matching PrismaModule's pattern: registering JwtStrategy here makes
 * passport's 'jwt' strategy available to JwtAuthGuard anywhere in the app
 * (AuthGuard('jwt') resolves it from passport's own registry, not Nest's DI
 * graph), so other modules don't need to import IdentityModule just to use
 * @UseGuards(JwtAuthGuard, RolesGuard).
 */
@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_ACCESS_TTL", "15m") },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [IdentityService, AuthService, JwtStrategy],
  exports: [IdentityService, AuthService],
})
export class IdentityModule {}
