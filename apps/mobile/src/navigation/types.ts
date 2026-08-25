import { UserRole } from "@motiq/types";

export type AuthStackParamList = {
  Welcome: undefined;
  PhoneEntry: { intendedRole: UserRole.CUSTOMER | UserRole.PROVIDER };
  OtpVerify: { phone: string; intendedRole: UserRole.CUSTOMER | UserRole.PROVIDER };
};

export type CustomerTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  MainTabs: undefined;
  CreateRequest: undefined;
  TrackRequest: { serviceRequestId: string };
  RequestDetail: { serviceRequestId: string };
  RateProvider: { serviceRequestId: string };
};

export type ProviderTabParamList = {
  Home: undefined;
  Jobs: undefined;
  Profile: undefined;
};

export type ProviderStackParamList = {
  MainTabs: undefined;
  JobOffer: { assignmentId: string; serviceRequestId: string };
  ActiveJob: { assignmentId: string; serviceRequestId: string };
  KycUpload: undefined;
};
