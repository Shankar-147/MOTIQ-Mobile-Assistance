import { Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePaymentDto } from './dto/create-payment.dto';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: number;
}

/**
 * In-memory store for now. Swap for a real table + gateway webhook once
 * we pick a provider (Razorpay vs Stripe still under discussion).
 */
@Injectable()
export class PaymentsService {
  private readonly payments = new Map<string, Payment>();

  create(dto: CreatePaymentDto): Payment {
    const payment: Payment = {
      id: randomUUID(),
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      // No gateway wired up yet, so every payment is created "pending"
      // until confirmPayment() is called (usually from a webhook).
      status: 'pending',
      createdAt: Date.now(),
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  findOne(id: string): Payment {
    const payment = this.payments.get(id);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }
    return payment;
  }

  findAllForUser(userId: string): Payment[] {
    return [...this.payments.values()].filter((p) => p.userId === userId);
  }

  confirmPayment(id: string): Payment {
    const payment = this.findOne(id);
    payment.status = 'succeeded';
    return payment;
  }

  // TODO: implement once the gateway refund API is decided on.
  refund(_id: string): never {
    throw new NotImplementedException('Refunds are not implemented yet');
  }
}
