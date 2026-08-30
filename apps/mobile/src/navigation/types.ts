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
  CreateRequest: { vehicleId?: string } | undefined;
  Matching: { serviceRequestId: string };
  TrackRequest: { serviceRequestId: string };
  RequestDetail: { serviceRequestId: string };
  MakePayment: { serviceRequestId: string };
  RateProvider: { serviceRequestId: string };
  AddVehicle: { vehicleId?: string } | undefined;
  VehicleHealth: { vehicleId: string };
  AddMaintenanceRecord: { vehicleId: string };
  ReminderSettings: undefined;
  // Deliberately a separate route from AddVehicle, not the same route with an
  // "onboarding" param: this one is reached only as the stack's
  // initialRouteName (see CustomerNavigator.tsx), and React Navigation never
  // attaches navigate()-style params to an initial route — a shared route
  // would silently see onboarding as undefined there, and Skip's "just go
  // back" would fail with no history to return to.
  VehicleOnboarding: undefined;
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
  AddFleetVehicle: { vehicleId?: string } | undefined;
  Earnings: undefined;
  MyRatings: undefined;
};
