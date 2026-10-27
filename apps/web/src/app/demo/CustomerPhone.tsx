"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { LiveMap, LatLng } from "./LiveMap";
import { Phone, PrimaryButton, Pill } from "./Phone";
import { useScenario } from "./scenario";
import { DEMO_PICKUP, ISSUES, money, prettyStatus, TERMINAL_STATUSES, WS_BASE } from "./lib";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface PaymentView {
  status: string;
  totalAmount: string;
  commissionAmount: string;
  providerPayoutAmount: string;
  gatewayReference: string | null;
  razorpayKeyId: string | null;
}

interface ProviderCard {
  businessName: string;
  ratingAverage: string;
  verificationStatus: string;
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay (check internet)."));
    document.body.appendChild(script);
  });
}

/** The Customer mobile app (Member A's part), rendered live against the real API. */
export function CustomerPhone() {
  const { customer, requestId, setRequestId, requestStatus, setRequestStatus, log } = useScenario();
  const [name, setName] = useState("Customer");
  const [vehicle, setVehicle] = useState<{ id: string; label: string } | null>(null);
  const [issue, setIssue] = useState("TOW");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerPos, setProviderPos] = useState<LatLng | null>(null);
  const [eta, setEta] = useState<{ minMinutes: number; maxMinutes: number } | null>(null);
  const [providerCard, setProviderCard] = useState<ProviderCard | null>(null);
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [stage, setStage] = useState<"pay" | "rate" | "done">("pay");
  const [stars, setStars] = useState(5);
  const socketRef = useRef<Socket | null>(null);
  const lastStatus = useRef<string | null>(null);
  const providerFetched = useRef<string | null>(null);

  // Sign in (demo login), then load the customer's name and first saved vehicle.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await customer.call<{ displayName: string }>("/customers/me");
        const vehicles = await customer.call<{ data: { id: string; make: string; model: string }[] }>("/vehicles");
        if (cancelled) return;
        setName(profile.displayName);
        const first = vehicles.data[0];
        if (first) setVehicle({ id: first.id, label: `${first.make} ${first.model}` });
        log("Customer", `Signed in as ${profile.displayName} (demo login — no OTP needed).`);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customer, log]);

  // Poll the request's state machine while a request exists.
  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const request = await customer.call<{ status: string }>(`/requests/${requestId}`);
        if (cancelled) return;
        setRequestStatus(request.status);
        if (lastStatus.current !== request.status) {
          lastStatus.current = request.status;
          log("Server", `Service request → ${request.status} (guarded state machine).`);
        }
      } catch {
        /* transient — the next tick retries */
      }
    };
    void tick();
    const timer = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [customer, requestId, setRequestStatus, log]);

  // Live provider location over the WebSocket gateway, scoped to this request's room.
  const socketActive = requestId !== null && !(requestStatus && TERMINAL_STATUSES.has(requestStatus));
  useEffect(() => {
    if (!requestId || !socketActive) return;
    const socket = io(`${WS_BASE}/tracking`, {
      auth: (cb) => cb({ token: customer.token() }),
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("subscribe:request", { serviceRequestId: requestId }));
    socket.on("request:matched", () => log("Server", "WebSocket → request:matched (provider assigned)."));
    socket.on("location:update", (event: { providerProfileId: string; latitude: number; longitude: number; eta: any }) => {
      setProviderPos({ latitude: event.latitude, longitude: event.longitude });
      if (event.eta) setEta({ minMinutes: event.eta.minMinutes, maxMinutes: event.eta.maxMinutes });
      if (providerFetched.current !== event.providerProfileId) {
        providerFetched.current = event.providerProfileId;
        customer
          .call<ProviderCard>(`/providers/${event.providerProfileId}/public`)
          .then(setProviderCard)
          .catch(() => undefined);
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [customer, requestId, socketActive, log]);

  // After completion the payment is settled asynchronously — poll until it exists.
  useEffect(() => {
    if (requestStatus !== "COMPLETED" || !requestId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await customer.call<PaymentView | null>(`/requests/${requestId}/payment`);
        if (!cancelled && result) {
          setPayment(result);
        }
      } catch {
        /* retry */
      }
    };
    void tick();
    const timer = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [customer, requestId, requestStatus]);

  const suggestWithAi = useCallback(async () => {
    if (description.trim().length < 3) return;
    setBusy(true);
    try {
      const result = await customer.call<{ issueType: string; confidence: number }>("/ai/classify-issue", {
        method: "POST",
        body: { description: description.trim() },
      });
      log("AI", `Classifier suggests ${result.issueType} (confidence ${(result.confidence * 100).toFixed(0)}%) — a suggestion only; the customer still confirms.`);
      if (result.confidence >= 0.5) setIssue(result.issueType);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [customer, description, log]);

  const submitRequest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await customer.call("/consent/location-tracking", { method: "POST" });
      log("Customer", "Location-tracking consent recorded (required before any request).");
      const created = await customer.call<{ id: string; status: string }>("/requests", {
        method: "POST",
        body: {
          issueType: issue,
          pickupLocation: DEMO_PICKUP,
          description: description.trim() || undefined,
          vehicleId: vehicle?.id,
        },
      });
      lastStatus.current = null;
      providerFetched.current = null;
      setProviderPos(null);
      setEta(null);
      setProviderCard(null);
      setPayment(null);
      setStage("pay");
      setRequestStatus(created.status);
      setRequestId(created.id);
      log("Customer", `Requested ${issue.replace("_", " ").toLowerCase()} assistance → matching starts.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [customer, issue, description, vehicle, setRequestId, setRequestStatus, log]);

  const cancelRequest = useCallback(async () => {
    if (!requestId) return;
    try {
      await customer.call(`/requests/${requestId}/cancel`, { method: "PATCH" });
      log("Customer", "Cancelled the request.");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [customer, requestId, log]);

  const backToHome = useCallback(() => {
    setRequestId(null);
    setRequestStatus(null);
    lastStatus.current = null;
    setError(null);
  }, [setRequestId, setRequestStatus]);

  const triggerSos = useCallback(async () => {
    try {
      await customer.call("/sos/trigger", {
        method: "POST",
        body: { latitude: DEMO_PICKUP.latitude, longitude: DEMO_PICKUP.longitude, serviceRequestId: requestId ?? undefined },
      });
      log("Customer", "SOS sent — safety alert filed (bypasses AI entirely). See the admin console's SOS page.");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [customer, requestId, log]);

  const payNow = useCallback(async () => {
    if (!payment || !requestId || !payment.razorpayKeyId || !payment.gatewayReference) return;
    setBusy(true);
    setError(null);
    try {
      await loadRazorpay();
      const checkout = new window.Razorpay!({
        key: payment.razorpayKeyId,
        amount: Math.round(Number(payment.totalAmount) * 100),
        currency: "INR",
        name: "MOTIQ",
        description: "Roadside assistance",
        order_id: payment.gatewayReference,
        theme: { color: "#22E58B" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await customer.call(`/requests/${requestId}/payment/confirm`, {
              method: "POST",
              body: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            log("Payment", "Razorpay payment verified server-side (signature check) → CAPTURED.");
            setPayment({ ...payment, status: "CAPTURED", razorpayKeyId: null });
            setStage("rate");
          } catch (e) {
            setError((e as Error).message);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      checkout.on("payment.failed", (r: { error?: { description?: string } }) => setError(r.error?.description ?? "Payment failed."));
      checkout.open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [customer, payment, requestId, log]);

  const payDemo = useCallback(async () => {
    if (!requestId) return;
    setBusy(true);
    setError(null);
    try {
      await customer.call(`/requests/${requestId}/payment/demo-capture`, { method: "POST" });
      log("Payment", "Demo payment captured (no live gateway) — the provider's payout moves from pending to earned.");
      setPayment((current) => (current ? { ...current, status: "CAPTURED" } : current));
      setStage("rate");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [customer, requestId, log]);

  const submitRating = useCallback(async (value?: number) => {
    if (!requestId) return;
    const given = typeof value === "number" ? value : stars;
    setBusy(true);
    try {
      await customer.call(`/requests/${requestId}/ratings`, { method: "POST", body: { stars: given } });
      log("Customer", `Rated the provider ${given}/5 — feeds the provider's rating and trust score.`);
      setStage("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [customer, requestId, stars, log]);

  const active = requestId !== null;
  const status = requestStatus ?? "REQUESTED";
  const matching = active && ["REQUESTED", "MATCHING", "ASSIGNED"].includes(status);
  const noMatch = active && ["EXPIRED", "FAILED", "CANCELLED_BY_CUSTOMER", "CANCELLED_BY_PROVIDER"].includes(status);
  const tracking = active && ["PROVIDER_ACCEPTED", "PROVIDER_EN_ROUTE", "ARRIVED", "SERVICE_IN_PROGRESS"].includes(status);
  const completed = active && status === "COMPLETED";


  return (
    <Phone title="Customer app" accent="#22E58B">
      {!active ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <LiveMap pickup={DEMO_PICKUP} className="h-[230px] shrink-0" />
          <div className="absolute right-3 top-3">
            <button onClick={triggerSos} className="rounded-full bg-[#FF4D4D] px-3 py-2 text-xs font-extrabold">
              🚨 SOS
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-t-3xl border-t border-[#2A2B33] bg-[#17171C] p-4">
            <div>
              <div className="text-lg font-bold">Hi, {name}</div>
              <div className="text-xs text-[#A1A3AD]">📍 Using your current location · Perungudi, Chennai</div>
            </div>
            <div className="text-base font-bold">What&apos;s wrong?</div>
            <div className="grid grid-cols-3 gap-2">
              {ISSUES.map((item) => (
                <button
                  key={item.type}
                  onClick={() => setIssue(item.type)}
                  className={`rounded-2xl border px-1 py-3 text-center text-xs font-bold ${
                    issue === item.type ? "border-[#22E58B] bg-[#22E58B]/15 text-[#22E58B]" : "border-[#2A2B33] bg-[#1F2026]"
                  }`}
                >
                  <div className="text-xl">{item.emoji}</div>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe it (e.g. my car won't start)"
                className="h-10 min-w-0 flex-1 rounded-xl border border-[#2A2B33] bg-[#1F2026] px-3 text-xs outline-none placeholder:text-[#6B6E7A]"
              />
              <button
                onClick={suggestWithAi}
                disabled={busy || description.trim().length < 3}
                className="rounded-xl border border-[#2A2B33] bg-[#1F2026] px-3 text-xs font-bold text-[#22E58B] disabled:opacity-40"
              >
                ✨ AI suggest
              </button>
            </div>
            {vehicle ? <Pill tone="good">🚗 {vehicle.label}</Pill> : null}
            <PrimaryButton onClick={submitRequest} disabled={busy}>
              {busy ? "Requesting…" : "Confirm & find provider"}
            </PrimaryButton>
            <div className="text-[11px] text-[#6B6E7A]">Final fare is calculated when the job completes.</div>
            {error ? <div className="text-xs text-[#FFB84D]">{error}</div> : null}
          </div>
        </div>
      ) : null}

      {matching ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="absolute h-40 w-40 animate-ping rounded-full border-2 border-[#22E58B]/50" />
            <span className="absolute h-24 w-24 animate-ping rounded-full border-2 border-[#22E58B]/60 [animation-delay:400ms]" />
            <span className="h-4 w-4 rounded-full bg-[#22E58B]" />
          </div>
          <div className="text-xl font-bold">{status === "ASSIGNED" ? "Provider found" : "Finding the nearest provider…"}</div>
          <div className="text-sm text-[#A1A3AD]">
            {status === "ASSIGNED" ? "Waiting for the provider to accept the offer." : "PostGIS looks up verified, online providers nearby."}
          </div>
          <div className="w-full">
            <PrimaryButton tone="ghost" onClick={cancelRequest}>
              Cancel request
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {noMatch ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">📭</div>
          <div className="text-xl font-bold">
            {status === "EXPIRED" || status === "FAILED" ? "No provider available right now" : "Request cancelled"}
          </div>
          <div className="text-sm text-[#A1A3AD]">
            {status === "EXPIRED" || status === "FAILED"
              ? "Nobody nearby could take this request. In production an admin can dispatch manually."
              : "You can start a new request any time."}
          </div>
          <div className="w-full">
            <PrimaryButton onClick={backToHome}>Try again</PrimaryButton>
          </div>
        </div>
      ) : null}

      {tracking ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <LiveMap pickup={DEMO_PICKUP} provider={providerPos} className="min-h-0 flex-1" />
          <div className="absolute right-3 top-3">
            <button onClick={triggerSos} className="rounded-full bg-[#FF4D4D] px-3 py-2 text-xs font-extrabold">
              🚨 SOS
            </button>
          </div>
          <div className="flex shrink-0 flex-col gap-3 rounded-t-3xl border-t border-[#2A2B33] bg-[#17171C] p-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-[#A1A3AD]">{status === "ARRIVED" || status === "SERVICE_IN_PROGRESS" ? "Status" : "Arriving in"}</div>
                <div className="text-3xl font-extrabold leading-none text-[#22E58B]">
                  {status === "ARRIVED" ? "Arrived" : status === "SERVICE_IN_PROGRESS" ? "In service" : eta ? `${eta.minMinutes}–${eta.maxMinutes} min` : "—"}
                </div>
              </div>
              <Pill tone="good">● Live</Pill>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[#1F2026] p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#22E58B] font-extrabold text-[#04210F]">
                {(providerCard?.businessName ?? "P").charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{providerCard?.businessName ?? "Your provider"}</div>
                <div className="text-xs text-[#A1A3AD]">
                  ★ {providerCard ? Number(providerCard.ratingAverage).toFixed(1) : "–"} · {providerCard ? prettyStatus(providerCard.verificationStatus) : "verifying"}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5">
              {["Accepted", "On the way", "Arrived", "Service"].map((label, i) => {
                const reached = ["PROVIDER_ACCEPTED", "PROVIDER_EN_ROUTE", "ARRIVED", "SERVICE_IN_PROGRESS"].indexOf(status) >= i;
                return (
                  <div key={label} className="flex-1">
                    <div className={`h-1 rounded ${reached ? "bg-[#22E58B]" : "bg-[#2A2B33]"}`} />
                    <div className="mt-1 text-[10px] text-[#A1A3AD]">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {completed ? (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          {stage === "pay" ? (
            <>
              <div className="text-sm text-[#A1A3AD]">Job complete</div>
              {payment ? (
                <>
                  <div className="text-5xl font-extrabold text-[#22E58B]">{money(payment.totalAmount)}</div>
                  <div className="rounded-2xl border border-[#2A2B33] bg-[#17171C] p-3 text-xs">
                    <div className="mb-1 font-bold text-[#A1A3AD]">Stored as three separate columns</div>
                    <Row label="Total paid by customer" value={money(payment.totalAmount)} />
                    <Row label="Platform commission (versioned rate)" value={money(payment.commissionAmount)} />
                    <Row label="Provider payout" value={money(payment.providerPayoutAmount)} />
                  </div>
                  {payment.status === "AUTHORIZED" && payment.razorpayKeyId ? (
                    <>
                      <PrimaryButton onClick={payNow} disabled={busy}>
                        Pay {money(payment.totalAmount)} with Razorpay
                      </PrimaryButton>
                      <div className="text-[11px] text-[#6B6E7A]">Test mode — card 4111 1111 1111 1111, any future expiry and CVV.</div>
                    </>
                  ) : payment.status === "CAPTURED" ? (
                    <PrimaryButton onClick={() => setStage("rate")}>Paid ✓ — continue</PrimaryButton>
                  ) : (
                    <>
                      <Pill tone="warn">Demo payment — no live gateway order</Pill>
                      <PrimaryButton onClick={payDemo} disabled={busy}>
                        Pay {money(payment.totalAmount)} (demo)
                      </PrimaryButton>
                    </>
                  )}
                </>
              ) : (
                <div className="text-sm text-[#A1A3AD]">Calculating the fare and settling payment…</div>
              )}
            </>
          ) : null}
          {stage === "rate" ? (
            <>
              <div className="text-2xl font-bold">How was your service?</div>
              <div className="flex justify-center gap-2 text-4xl">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setStars(n)} className={n <= stars ? "text-[#22E58B]" : "text-[#2A2B33]"}>
                    ★
                  </button>
                ))}
              </div>
              <PrimaryButton onClick={() => void submitRating()} disabled={busy}>
                Submit rating
              </PrimaryButton>
            </>
          ) : null}
          {stage === "done" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <div className="text-5xl">✅</div>
              <div className="text-xl font-bold">Thanks! Help was delivered.</div>
              <div className="w-full">
                <PrimaryButton onClick={backToHome}>Start a new request</PrimaryButton>
              </div>
            </div>
          ) : null}
          {error ? <div className="text-xs text-[#FFB84D]">{error}</div> : null}
        </div>
      ) : null}
    </Phone>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[#A1A3AD]">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
