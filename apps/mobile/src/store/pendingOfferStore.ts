import { create } from "zustand";

interface PendingOffer {
  assignmentId: string;
  serviceRequestId: string;
}

interface PendingOfferState {
  pendingOffer: PendingOffer | null;
  setPendingOffer: (offer: PendingOffer | null) => void;
}

/**
 * A tapped "job_offer" push notification (see App.tsx) sets this instead of
 * navigating directly — RootNavigator swaps between independent
 * Auth/Customer/ProviderNavigator instances, so there's no single stable
 * navigation ref to target from outside React's tree. GoOnlineScreen watches
 * this and navigates once ProviderNavigator is actually mounted.
 */
export const usePendingOfferStore = create<PendingOfferState>((set) => ({
  pendingOffer: null,
  setPendingOffer: (pendingOffer) => set({ pendingOffer }),
}));
