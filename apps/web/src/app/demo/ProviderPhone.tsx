"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { LiveMap, LatLng } from "./LiveMap";
import { Phone, PrimaryButton, Pill } from "./Phone";
import { useScenario } from "./scenario";
import { DEMO_PICKUP, ISSUES, money, prettyStatus, TERMINAL_STATUSES, WS_BASE } from "./lib";

/** Where the demo provider starts: roughly 1.7 km from the customer's pickup point. */
const PROVIDER_START: LatLng = { latitude: DEMO_PICKUP.latitude + 0.012, longitude: DEMO_PICKUP.longitude + 0.01 };
const DRIVE_STEPS = 9;
const DRIVE_INTERVAL_MS = 3300; // the gateway throttles location updates to one per ~3 s

interface JobRow {
  id: string;
  status: string;
  distanceMeters: number | null;
  serviceRequest: { id: string; issueType: string; status: string };
}

interface JobDetails {
  issueType: string;
  description: string | null;
  vehicleSnapshotMake: string;
  vehicleSnapshotModel: string;
}

interface Profile {
  businessName: string;
  verificationStatus: string;
  ratingAverage: string;
  completedJobCount: number;
}

const NEXT_STATUS: Record<string, { next: string; label: string }> = {
  PROVIDER_ACCEPTED: { next: "PROVIDER_EN_ROUTE", label: "Start heading to the customer" },
  PROVIDER_EN_ROUTE: { next: "ARRIVED", label: "Mark as arrived" },
  ARRIVED: { next: "SERVICE_IN_PROGRESS", label: "Start the job" },
  SERVICE_IN_PROGRESS: { next: "COMPLETED", label: "Mark job complete" },
};

/** The Provider mobile app (Member B's part), rendered live against the real API. */
export function ProviderPhone() {
  const { provider, log } = useScenario();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<JobRow | null>(null);
  const [details, setDetails] = useState<JobDetails | null>(null);
  const [position, setPosition] = useState<LatLng>(PROVIDER_START);
  const [driving, setDriving] = useState(false);
  const [earnings, setEarnings] = useState<{ totalEarnings: string; pendingAmount: string } | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const driveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenJob = useRef<string | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const me = await provider.call<Profile>("/providers/me");
      setProfile(me);
      log("Provider", `Signed in as ${me.businessName} — ${prettyStatus(me.verificationStatus)} (demo login).`);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [provider, log]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const ensureSocket = useCallback((): Socket => {
    if (socketRef.current) return socketRef.current;
    const socket = io(`${WS_BASE}/tracking`, {
      auth: (cb) => cb({ token: provider.token() }),
      transports: ["websocket"],
    });
    socketRef.current = socket;
    return socket;
  }, [provider]);

  // Heartbeat keeps the server-side presence ONLINE while this phone is open.
  useEffect(() => {
    if (!online) return;
    const timer = setInterval(() => socketRef.current?.emit("presence:heartbeat"), 20_000);
    return () => clearInterval(timer);
  }, [online]);

  // No push in the demo: poll for new offers / the active job.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await provider.call<{ data: JobRow[] }>("/providers/me/jobs?limit=5");
        if (cancelled) return;
        const open = result.data.find(
          (row) =>
            (row.status === "OFFERED" || row.status === "ACCEPTED") && !TERMINAL_STATUSES.has(row.serviceRequest.status),
        );
        setJob(open ?? null);
        if (open && seenJob.current !== open.id) {
          seenJob.current = open.id;
          log("Provider", `New ${prettyStatus(open.status)} job — ${open.serviceRequest.issueType.replace("_", " ").toLowerCase()}, ${open.distanceMeters ? (open.distanceMeters / 1000).toFixed(1) + " km away" : "nearby"}.`);
          const request = await provider.call<JobDetails>(`/requests/${open.serviceRequest.id}`);
          if (!cancelled) setDetails(request);
        }
        if (!open) {
          seenJob.current = null;
          setDetails(null);
        }
      } catch {
        /* retry on next tick */
      }
    };
    void tick();
    const timer = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [provider, log]);

  useEffect(
    () => () => {
      if (driveTimer.current) clearInterval(driveTimer.current);
      socketRef.current?.disconnect();
    },
    [],
  );

  const goOnline = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await provider.call("/consent/location-tracking", { method: "POST" });
      await provider.call("/providers/me/presence", {
        method: "PATCH",
        body: { presenceStatus: "ONLINE", location: PROVIDER_START },
      });
      ensureSocket();
      setPosition(PROVIDER_START);
      setOnline(true);
      log("Provider", "Went online — presence + PostGIS location stored; WebSocket connected.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [provider, ensureSocket, log]);

  const goOffline = useCallback(async () => {
    setBusy(true);
    try {
      await provider.call("/providers/me/presence", { method: "PATCH", body: { presenceStatus: "OFFLINE" } });
      socketRef.current?.disconnect();
      socketRef.current = null;
      setOnline(false);
      log("Provider", "Went offline.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [provider, log]);

  const respond = useCallback(
    async (accept: boolean) => {
      if (!job) return;
      setBusy(true);
      setError(null);
      try {
        await provider.call(`/assignments/${job.id}/${accept ? "accept" : "reject"}`, { method: "POST" });
        log("Provider", accept ? "Accepted the offer → request becomes PROVIDER_ACCEPTED." : "Declined the offer → matching moves on.");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [provider, job, log],
  );

  const advance = useCallback(async () => {
    if (!job) return;
    const step = NEXT_STATUS[job.serviceRequest.status];
    if (!step) return;
    setBusy(true);
    setError(null);
    try {
      await provider.call(`/assignments/${job.id}/job-status`, { method: "PATCH", body: { status: step.next } });
      log("Provider", `Advanced the job → ${step.next}.`);
      if (step.next === "COMPLETED") {
        if (driveTimer.current) clearInterval(driveTimer.current);
        setDriving(false);
        setTimeout(() => {
          provider.call<{ totalEarnings: string; pendingAmount: string }>("/providers/me/earnings").then(setEarnings).catch(() => undefined);
          void loadProfile();
        }, 2500);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [provider, job, log, loadProfile]);

  const startDrive = useCallback(() => {
    if (!job) return;
    const socket = ensureSocket();
    setDriving(true);
    let step = 0;
    log("Provider", "Driving to the customer — GPS pings stream over the WebSocket every ~3 s.");
    driveTimer.current = setInterval(() => {
      step += 1;
      const t = Math.min(step / DRIVE_STEPS, 1);
      const next = {
        latitude: PROVIDER_START.latitude + (DEMO_PICKUP.latitude - PROVIDER_START.latitude) * t,
        longitude: PROVIDER_START.longitude + (DEMO_PICKUP.longitude - PROVIDER_START.longitude) * t,
      };
      setPosition(next);
      socket.emit("location:update", next);
      if (t >= 1 && driveTimer.current) {
        clearInterval(driveTimer.current);
        setDriving(false);
        log("Provider", "Reached the pickup point.");
      }
    }, DRIVE_INTERVAL_MS);
  }, [job, ensureSocket, log]);

  const status = job?.serviceRequest.status ?? null;
  const offered = job?.status === "OFFERED";
  const working = job?.status === "ACCEPTED";
  const issueMeta = ISSUES.find((i) => i.type === (details?.issueType ?? job?.serviceRequest.issueType));
  const nextStep = status ? NEXT_STATUS[status] : undefined;


  return (
    <Phone title="Provider app" accent="#FFB84D">
      <div className="flex min-h-0 flex-1 flex-col">
        <LiveMap pickup={DEMO_PICKUP} provider={online || working ? position : null} className="h-[250px] shrink-0" />
        <div className="absolute left-3 top-3 rounded-xl bg-[#0B0B0F]/80 px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#A1A3AD]">MOTIQ Provider</div>
          <div className="text-sm font-bold">{profile?.businessName ?? "Loading…"}</div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-t-3xl border-t border-[#2A2B33] bg-[#17171C] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? "animate-pulse bg-[#22E58B]" : "bg-[#6B6E7A]"}`} />
              {online ? "You're online" : "You're offline"}
            </div>
            {profile ? <Pill tone={profile.verificationStatus === "UNVERIFIED" ? "warn" : "good"}>{prettyStatus(profile.verificationStatus)}</Pill> : null}
          </div>

          {!job ? (
            <>
              <div className="text-xs text-[#A1A3AD]">
                {online ? "Waiting for nearby jobs. Offers appear here automatically." : "Go online to start receiving job offers."}
              </div>
              {online ? (
                <PrimaryButton tone="danger" onClick={goOffline} disabled={busy}>
                  Go offline
                </PrimaryButton>
              ) : (
                <PrimaryButton onClick={goOnline} disabled={busy}>
                  {busy ? "Connecting…" : "Go online"}
                </PrimaryButton>
              )}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Stat label="Rating" value={profile ? Number(profile.ratingAverage).toFixed(1) : "–"} />
                <Stat label="Jobs done" value={String(profile?.completedJobCount ?? 0)} />
                <Stat label="Earned" value={earnings ? money(earnings.totalEarnings) : "–"} />
              </div>
              {earnings ? <div className="text-[11px] text-[#A1A3AD]">{money(earnings.pendingAmount)} pending payout</div> : null}
            </>
          ) : null}

          {offered ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#22E58B] bg-[#22E58B]/10 p-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#22E58B] text-2xl">{issueMeta?.emoji ?? "🛠"}</div>
                <div>
                  <div className="text-[11px] font-bold tracking-widest text-[#22E58B]">NEW JOB OFFER</div>
                  <div className="text-lg font-bold">{issueMeta?.label ?? "Roadside job"}</div>
                </div>
              </div>
              <div className="text-xs text-[#A1A3AD]">
                {job?.distanceMeters ? `${(job.distanceMeters / 1000).toFixed(1)} km away · ` : ""}
                {details ? `${details.vehicleSnapshotMake} ${details.vehicleSnapshotModel}` : ""}
                {details?.description ? ` · “${details.description}”` : ""}
              </div>
              <div className="text-[11px] text-[#6B6E7A]">Respond soon — offers expire.</div>
              <PrimaryButton onClick={() => respond(true)} disabled={busy}>
                Accept job
              </PrimaryButton>
              <PrimaryButton tone="ghost" onClick={() => respond(false)} disabled={busy}>
                Decline
              </PrimaryButton>
            </div>
          ) : null}

          {working && status ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold capitalize">{prettyStatus(status)}</div>
                <Pill tone="good">Job in progress</Pill>
              </div>
              <div className="flex gap-1.5">
                {["Accepted", "On the way", "Arrived", "Done"].map((label, i) => {
                  const idx = ["PROVIDER_ACCEPTED", "PROVIDER_EN_ROUTE", "ARRIVED", "SERVICE_IN_PROGRESS"].indexOf(status);
                  return (
                    <div key={label} className="flex-1">
                      <div className={`h-1 rounded ${idx >= i ? "bg-[#FFB84D]" : "bg-[#2A2B33]"}`} />
                      <div className="mt-1 text-[10px] text-[#A1A3AD]">{label}</div>
                    </div>
                  );
                })}
              </div>
              {status === "PROVIDER_EN_ROUTE" ? (
                <PrimaryButton tone="ghost" onClick={startDrive} disabled={driving}>
                  {driving ? "🚛 Driving… live location streaming" : "🚛 Simulate the drive to the customer"}
                </PrimaryButton>
              ) : null}
              {nextStep ? (
                <PrimaryButton onClick={advance} disabled={busy}>
                  {nextStep.label}
                </PrimaryButton>
              ) : null}
            </div>
          ) : null}

          {error ? <div className="text-xs text-[#FFB84D]">{error}</div> : null}
        </div>
      </div>
    </Phone>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#1F2026] p-2">
      <div className="text-[10px] text-[#A1A3AD]">{label}</div>
      <div className="text-base font-extrabold">{value}</div>
    </div>
  );
}
