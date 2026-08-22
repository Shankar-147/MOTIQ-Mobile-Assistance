import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequestService } from "./request.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Controller("requests")
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post()
  create(@Body() dto: CreateServiceRequestDto) {
    return this.requestService.create(dto);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.requestService.findById(id);
  }
}
