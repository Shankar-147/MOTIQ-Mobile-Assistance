import { UserRole } from "@motiq/types";

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { intendedRole: UserRole.CUSTOMER | UserRole.PROVIDER };
  OtpVerify: { phone: string; intendedRole: UserRole.CUSTOMER | UserRole.PROVIDER };
};

export type CustomerStackParamList = {
  CreateRequest: undefined;
  TrackRequest: { serviceRequestId: string };
  RateProvider: { serviceRequestId: string };
};

export type ProviderStackParamList = {
  GoOnline: undefined;
  JobOffer: { assignmentId: string; serviceRequestId: string };
  ActiveJob: { assignmentId: string; serviceRequestId: string };
};
