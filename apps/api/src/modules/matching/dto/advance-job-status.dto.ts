import { IsIn } from "class-validator";
import { RequestStatus } from "@motiq/types";

/** The subset of Ch19's state machine a provider is allowed to drive directly. */
const PROVIDER_ADVANCEABLE_STATUSES = [
  RequestStatus.PROVIDER_EN_ROUTE,
  RequestStatus.ARRIVED,
  RequestStatus.SERVICE_IN_PROGRESS,
  RequestStatus.COMPLETED,
  RequestStatus.CANCELLED_BY_PROVIDER,
] as const;

export class AdvanceJobStatusDto {
  @IsIn(PROVIDER_ADVANCEABLE_STATUSES)
  status!: (typeof PROVIDER_ADVANCEABLE_STATUSES)[number];
}
