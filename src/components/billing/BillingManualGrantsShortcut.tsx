"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppRole } from "@/modules/billing/domain/types";
import { canManageManualGrants } from "@/modules/billing/manual-grants";

type BillingAccessResponse = {
  roles?: AppRole[];
};

export function BillingManualGrantsShortcut() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAccess() {
      try {
        const response = await fetch("/api/billing/access", {
          credentials: "same-origin",
        });
        const data = (await response.json().catch(() => null)) as
          | BillingAccessResponse
          | null;

        if (cancelled || !data?.roles) {
          return;
        }

        setVisible(canManageManualGrants(data.roles));
      } catch (error) {
        console.error("Failed to load billing access for grants shortcut", error);
      }
    }

    void loadAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Link href="/billing/grants" className="nav-pill">
      Gratuidades
    </Link>
  );
}
