"use client";

import { useEffect, useState } from "react";
import { PiPanel, type InfraView } from "./agency/PiPanel";

/** Panneau Raspberry en 2D (page Infrastructure) : même instantané que l'agence, relu toutes les 15 s. */
export function LiveInfra({ initial }: { initial: InfraView }) {
  const [infra, setInfra] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const any = Object.values(initial.configured).some(Boolean);

  useEffect(() => {
    if (!any) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      setRefreshing(true);
      const r = await fetch("/api/admin/v1/infra/snapshot").catch(() => null);
      if (r?.ok) setInfra((await r.json()) as InfraView);
      setRefreshing(false);
    };
    const id = window.setInterval(() => void tick(), 15_000);
    return () => window.clearInterval(id);
  }, [any]);

  return <PiPanel infra={infra} refreshing={refreshing} />;
}
