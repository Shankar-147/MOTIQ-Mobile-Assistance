import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  /** Admin-triggered account suspend/reactivate (Ch61, Ch137 Admin Console).
   * Enforced on every subsequent request by JwtStrategy, and on every
   * token-issuing login path in AuthService — not just advisory metadata. */
  async updateUserStatus(id: string, isActive: boolean) {
    await this.findUserById(id);
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }
}
