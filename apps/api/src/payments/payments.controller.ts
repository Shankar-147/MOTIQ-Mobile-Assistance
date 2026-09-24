import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get()
  findAllForUser(@Query('userId') userId: string) {
    return this.paymentsService.findAllForUser(userId);
  }

  // TODO: this should be called by the gateway webhook, not the client.
  // Leaving as a plain endpoint until we settle on a provider and can
  // verify webhook signatures.
  @Post(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }
}
