import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";

/** Ch71's mobile Customer app Profile screen — the first read/write path
 * onto CustomerProfile outside of RequestService's create-time snapshot. */
@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const profile = await this.prisma.customerProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`CustomerProfile ${id} not found`);
    }
    return profile;
  }

  async updateOwnProfile(id: string, dto: UpdateCustomerProfileDto) {
    await this.findById(id);
    return this.prisma.customerProfile.update({
      where: { id },
      data: dto,
    });
  }
}
