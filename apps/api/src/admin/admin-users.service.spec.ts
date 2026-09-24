import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;

  beforeEach(() => {
    service = new AdminUsersService();
  });

  it('lists seeded users', () => {
    expect(service.findAll()).toHaveLength(2);
  });

  it('finds a user by id', () => {
    expect(service.findOne('u1').id).toBe('u1');
  });

  it('throws for an unknown user id', () => {
    expect(() => service.findOne('does-not-exist')).toThrow();
  });

  it('updates a user status', () => {
    const updated = service.updateStatus('u1', 'suspended');
    expect(updated.status).toBe('suspended');
    expect(service.findOne('u1').status).toBe('suspended');
  });
});
