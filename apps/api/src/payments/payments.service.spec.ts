import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(() => {
    service = new PaymentsService();
  });

  it('creates a payment as pending', () => {
    const payment = service.create({ userId: 'u1', amount: 500, currency: 'INR' });
    expect(payment.status).toBe('pending');
    expect(payment.userId).toBe('u1');
  });

  it('finds a payment by id', () => {
    const created = service.create({ userId: 'u1', amount: 500, currency: 'INR' });
    expect(service.findOne(created.id)).toEqual(created);
  });

  it('throws for an unknown payment id', () => {
    expect(() => service.findOne('does-not-exist')).toThrow();
  });

  it('lists only payments for the given user', () => {
    service.create({ userId: 'u1', amount: 100, currency: 'INR' });
    service.create({ userId: 'u2', amount: 200, currency: 'INR' });
    const results = service.findAllForUser('u1');
    expect(results).toHaveLength(1);
    expect(results[0].userId).toBe('u1');
  });

  it('marks a payment as succeeded on confirm', () => {
    const created = service.create({ userId: 'u1', amount: 500, currency: 'INR' });
    const confirmed = service.confirmPayment(created.id);
    expect(confirmed.status).toBe('succeeded');
  });
});
