/**
 * Ch73 — shared accessibility constants so screens don't hand-roll magic
 * numbers. Minimum touch target follows the larger of iOS HIG (44x44) and
 * Android's own guidance (48x48dp) — used everywhere here, since Ch2 names
 * hands-busy, high-stress breakdown moments as the primary use context this
 * app is designed around, not just a generic mobile-accessibility checklist.
 */
export const MIN_TOUCH_TARGET_SIZE = 48;

export const A11Y_LABELS = {
  createRequestButton: "Request roadside assistance",
  cancelRequestButton: "Cancel this request",
  goOnlineToggle: "Go online to receive job offers",
  acceptOfferButton: "Accept this job offer",
  rejectOfferButton: "Decline this job offer",
  submitRatingButton: "Submit rating",
  logoutButton: "Log out",
  saveProfileButton: "Save profile",
  uploadDocumentButton: "Upload verification document",
  addVehicleButton: "Add a vehicle",
  saveVehicleButton: "Save vehicle",
  deleteVehicleButton: "Delete this vehicle",
  skipVehicleOnboardingButton: "Skip adding a vehicle for now",
  addFleetVehicleButton: "Add a fleet vehicle",
  saveFleetVehicleButton: "Save fleet vehicle",
  deleteFleetVehicleButton: "Delete this fleet vehicle",
  viewEarningsButton: "View earnings",
  viewRatingsButton: "View your ratings",
  viewVehicleHealthButton: "View vehicle health",
  editVehicleButton: "Edit vehicle details",
  addMaintenanceRecordButton: "Add a service record",
  saveMaintenanceRecordButton: "Save service record",
} as const;
