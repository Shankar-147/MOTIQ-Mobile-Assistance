import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { TokenPairResponse, UserRole } from "@motiq/types";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { parseDurationSeconds } from "../../../common/duration";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { DemoLoginDto } from "./dto/demo-login.dto";
import { JwtPayload } from "./jwt-payload.interface";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "./otp.util";
import { normalizePhone } from "./phone.util";
import { generateOpaqueToken, hashToken } from "./token.util";
import { comparePassword } from "./password.util";
import { NotificationService } from "../../notification/notification.service";
import { generateTotpSecret, generateTotpUri, verifyTotpCode } from "./totp.util";

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Ch33/Ch50/Ch51 — OTP login/registration for Customer/Provider, password
 * login for Admin/Support, JWT access + opaque refresh-token rotation.
 * See docs/decisions/0011-*.md for the reasoning behind each choice here.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<void> {
    const phone = normalizePhone(dto.phone);
    const recentChallenge = await this.prisma.otpChallenge.findFirst({
      where: {
        phone,
        createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recentChallenge) {
      throw new ConflictException(`Please wait before requesting another code for ${phone}.`);
    }

    const code = generateOtpCode();
    await this.prisma.otpChallenge.create({
      data: {
        phone,
        codeHash: hashOtpCode(code),
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
      },
    });

    // Email delivery (not SMS) for now — Twilio's trial account rejects
    // custom SMS templates in this environment (see GmailEmailGatewayAdapter's
    // doc comment). Degrades to a logged fallback when EMAIL_SMTP_* isn't
    // configured, same as every other unconfigured third-party adapter here.
    await this.notifications.sendOtpEmail(dto.email, code, OTP_TTL_SECONDS);
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<TokenPairResponse> {
    const phone = normalizePhone(dto.phone);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });

    if (!challenge) {
      throw new BadRequestException(`No active code for ${phone}. Request a new one.`);
    }
    if (challenge.expiresAt < new Date()) {
      throw new BadRequestException("That code has expired. Request a new one.");
    }
    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException("Too many attempts. Request a new code.");
    }
    if (!verifyOtpCode(dto.code, challenge.codeHash)) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException("Invalid code.");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
      include: { customerProfile: true, providerProfile: true },
    });

    if (existingUser) {
      if (!existingUser.isActive) {
        throw new UnauthorizedException(`Account for ${phone} has been deactivated. Contact support.`);
      }
      const profileId =
        existingUser.role === PrismaUserRole.CUSTOMER
          ? existingUser.customerProfile?.id
          : existingUser.providerProfile?.id;
      if (!profileId) {
        // Should be structurally impossible (every CUSTOMER/PROVIDER User has
        // exactly one matching profile, created together in registerViaOtp) —
        // treated as a data-integrity fault, not a normal auth failure.
        throw new BadRequestException(`Account for ${phone} is missing its profile.`);
      }
      await this.consumeChallenge(challenge.id);
      return this.issueTokenPair(existingUser.id, existingUser.role as unknown as UserRole, profileId);
    }

    // New user: validate the registration fields BEFORE consuming the code.
    // The code and the registration data (businessName, serviceAreaId, ...)
    // are logically separate failure modes — a typo'd/missing registration
    // field shouldn't burn an otherwise-correct, still-fresh OTP and force
    // the user to request an entirely new code just to retry the same code.
    await this.assertRegistrationInputValid(dto);
    await this.consumeChallenge(challenge.id);
    return this.registerViaOtp(dto, phone);
  }

  private async consumeChallenge(challengeId: string): Promise<void> {
    await this.prisma.otpChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
  }

  /** Single source of truth for "is this registration request complete,"
   * called both here (before the OTP is consumed) and again at the top of
   * registerViaOtp (defense-in-depth against calling it directly). Read-only
   * — never a side effect — so calling it twice is harmless. */
  private async assertRegistrationInputValid(dto: VerifyOtpDto): Promise<void> {
    if (!dto.role) {
      throw new BadRequestException(
        `No account exists for ${dto.phone} yet — include "role" (CUSTOMER or PROVIDER) to register.`,
      );
    }

    if (dto.role === UserRole.CUSTOMER) {
      if (!dto.displayName) {
        throw new BadRequestException("displayName is required to register as a customer.");
      }
      return;
    }

    if (!dto.businessName || !dto.serviceAreaId) {
      throw new BadRequestException(
        "businessName and serviceAreaId are required to register as a provider.",
      );
    }
    const serviceArea = await this.prisma.serviceArea.findUnique({
      where: { id: dto.serviceAreaId },
    });
    if (!serviceArea) {
      throw new NotFoundException(`ServiceArea ${dto.serviceAreaId} not found.`);
    }
  }

  /**
   * Demo-only sign-in for the live web demo (apps/web /demo) so a presentation
   * never depends on an OTP email arriving. Hard-gated: it does nothing (404)
   * unless DEMO_MODE=true, and it can only ever sign in as the two accounts
   * named by DEMO_CUSTOMER_PHONE / DEMO_PROVIDER_PHONE — the caller picks a
   * role, never an identity (CLAUDE.md rule 9). Must stay off in any shared or
   * production environment.
   */
  async demoLogin(dto: DemoLoginDto): Promise<TokenPairResponse> {
    if (this.config.get<string>("DEMO_MODE") !== "true") {
      throw new NotFoundException();
    }
    const phoneKey = dto.role === "CUSTOMER" ? "DEMO_CUSTOMER_PHONE" : "DEMO_PROVIDER_PHONE";
    const configuredPhone = this.config.get<string>(phoneKey);
    if (!configuredPhone) {
      throw new BadRequestException(`${phoneKey} is not configured.`);
    }
    const user = await this.prisma.user.findUnique({
      where: { phone: normalizePhone(configuredPhone) },
      include: { customerProfile: true, providerProfile: true },
    });
    const profileId = user?.role === PrismaUserRole.CUSTOMER ? user.customerProfile?.id : user?.providerProfile?.id;
    if (!user || !user.isActive || !profileId || (user.role as unknown as string) !== dto.role) {
      throw new BadRequestException(`No active ${dto.role} account matches ${phoneKey}.`);
    }
    return this.issueTokenPair(user.id, user.role as unknown as UserRole, profileId);
  }

  async adminLogin(dto: AdminLoginDto): Promise<TokenPairResponse> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ phone: dto.identifier }, { email: dto.identifier }],
        role: { in: [PrismaUserRole.ADMIN, PrismaUserRole.SUPPORT] },
      },
      include: { adminProfile: true },
    });

    // Same generic message whether the account doesn't exist or the password
    // is wrong — never let a login endpoint reveal which one it was.
    const invalidCredentials = () => new UnauthorizedException("Invalid credentials.");

    if (!user || !user.passwordHash || !user.adminProfile || !user.isActive) {
      throw invalidCredentials();
    }
    const passwordMatches = await comparePassword(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials();
    }

    if (user.adminProfile.mfaEnabled) {
      if (!dto.totpCode) {
        throw new UnauthorizedException("MFA code required.");
      }
      if (!user.adminProfile.mfaSecret || !verifyTotpCode(dto.totpCode, user.adminProfile.mfaSecret)) {
        throw invalidCredentials();
      }
    }

    return this.issueTokenPair(user.id, user.role as unknown as UserRole, user.adminProfile.id);
  }

  async getMfaStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminProfile: true } });
    if (!user?.adminProfile) {
      throw new NotFoundException(`Admin profile for user ${userId} not found.`);
    }
    return { mfaEnabled: user.adminProfile.mfaEnabled };
  }

  /** Ch93 — step 1 of MFA enrollment: generate a secret, don't enable MFA
   * yet (mfaEnabled flips true only in confirmMfaEnrollment, once the admin
   * proves they can actually generate a valid code from it). */
  async startMfaEnrollment(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminProfile: true } });
    if (!user?.adminProfile) {
      throw new NotFoundException(`Admin profile for user ${userId} not found.`);
    }
    const secret = generateTotpSecret();
    await this.prisma.adminProfile.update({
      where: { id: user.adminProfile.id },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    return { secret, otpauthUri: generateTotpUri(secret, user.phone) };
  }

  async confirmMfaEnrollment(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminProfile: true } });
    if (!user?.adminProfile?.mfaSecret) {
      throw new BadRequestException("No pending MFA enrollment — call startMfaEnrollment first.");
    }
    if (!verifyTotpCode(code, user.adminProfile.mfaSecret)) {
      throw new BadRequestException("Invalid code.");
    }
    await this.prisma.adminProfile.update({
      where: { id: user.adminProfile.id },
      data: { mfaEnabled: true },
    });
    return { mfaEnabled: true };
  }

  async disableMfa(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { adminProfile: true } });
    if (!user?.adminProfile) {
      throw new NotFoundException(`Admin profile for user ${userId} not found.`);
    }
    await this.prisma.adminProfile.update({
      where: { id: user.adminProfile.id },
      data: { mfaEnabled: false, mfaSecret: null },
    });
    return { mfaEnabled: false };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPairResponse> {
    const tokenHash = hashToken(dto.refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { include: { customerProfile: true, providerProfile: true, adminProfile: true } },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid or expired refresh token.");
    }

    // Rotation (Ch33, binding): the presented token is single-use.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { user } = stored;
    if (!user.isActive) {
      throw new UnauthorizedException("This account has been deactivated.");
    }
    const profileId =
      user.customerProfile?.id ?? user.providerProfile?.id ?? user.adminProfile?.id;
    if (!profileId) {
      throw new NotFoundException(`Account for user ${user.id} is missing its profile.`);
    }

    return this.issueTokenPair(user.id, user.role as unknown as UserRole, profileId);
  }

  private async registerViaOtp(dto: VerifyOtpDto, phone: string): Promise<TokenPairResponse> {
    // Defense-in-depth: verifyOtp() already calls this before consuming the
    // challenge, but this method is only ever reached via that path.
    await this.assertRegistrationInputValid(dto);

    if (dto.role === UserRole.CUSTOMER) {
      const { user, profile } = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: { phone, role: PrismaUserRole.CUSTOMER },
        });
        const createdProfile = await tx.customerProfile.create({
          data: { userId: createdUser.id, displayName: dto.displayName! },
        });
        return { user: createdUser, profile: createdProfile };
      });
      return this.issueTokenPair(user.id, UserRole.CUSTOMER, profile.id);
    }

    // PROVIDER registration
    const { user, profile } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { phone, role: PrismaUserRole.PROVIDER },
      });
      const createdProfile = await tx.providerProfile.create({
        data: {
          userId: createdUser.id,
          businessName: dto.businessName!,
          serviceAreaId: dto.serviceAreaId!,
        },
      });
      return { user: createdUser, profile: createdProfile };
    });
    return this.issueTokenPair(user.id, UserRole.PROVIDER, profile.id);
  }

  private async issueTokenPair(
    userId: string,
    role: UserRole,
    profileId: string,
  ): Promise<TokenPairResponse> {
    const payload: JwtPayload = { sub: userId, role, profileId };
    const accessToken = this.jwtService.sign(payload);

    const refreshTokenRaw = generateOpaqueToken();
    const refreshTtlSeconds = parseDurationSeconds(
      this.config.get<string>("JWT_REFRESH_TTL", "30d"),
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshTokenRaw),
        expiresAt: new Date(Date.now() + refreshTtlSeconds * 1000),
      },
    });

    const accessTtlSeconds = parseDurationSeconds(
      this.config.get<string>("JWT_ACCESS_TTL", "15m"),
    );
    return { accessToken, refreshToken: refreshTokenRaw, expiresIn: accessTtlSeconds };
  }
}
