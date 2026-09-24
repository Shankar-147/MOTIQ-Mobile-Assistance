import { Injectable, NotFoundException } from '@nestjs/common';

export type UserStatus = 'active' | 'suspended';

export interface AdminUserView {
  id: string;
  phoneNumber: string;
  status: UserStatus;
  createdAt: number;
}

/**
 * Seeded with a couple of fake users for now so the admin console has
 * something to list. Replace with a real query against the users table
 * once that model exists.
 */
@Injectable()
export class AdminUsersService {
  private readonly users = new Map<string, AdminUserView>([
    ['u1', { id: 'u1', phoneNumber: '+919999999999', status: 'active', createdAt: Date.now() }],
    ['u2', { id: 'u2', phoneNumber: '+918888888888', status: 'active', createdAt: Date.now() }],
  ]);

  findAll(): AdminUserView[] {
    return [...this.users.values()];
  }

  findOne(id: string): AdminUserView {
    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  updateStatus(id: string, status: UserStatus): AdminUserView {
    const user = this.findOne(id);
    user.status = status;
    return user;
  }

  // TODO: search/filter by phone number once we have more than a
  // handful of seed users to page through.
}
