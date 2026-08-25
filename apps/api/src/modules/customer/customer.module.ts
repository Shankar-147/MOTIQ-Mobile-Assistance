import { Module } from "@nestjs/common";
import { CustomerController } from "./customer.controller";
import { CustomerService } from "./customer.service";

/** Owns CustomerProfile reads/updates (RequestModule still owns request
 * creation's write into it via the snapshot pattern — see RequestService). */
@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
