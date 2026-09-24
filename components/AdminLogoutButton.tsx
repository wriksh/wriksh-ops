"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Small "Sign out" affordance for the ops console.
 *
 * POSTs to /api/auth/logout (clears the `wriksh_ops_admin` cookie) and
 * routes the user back to /login. A short busy state prevents double-tap
 * from racing the navigation.
 */
export default function AdminLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/auth/logout", { method: "POST" });
        } finally {
          setBusy(false);
          router.push("/login");
          router.refresh();
        }
      }}
      className="font-body text-xs uppercase tracking-[0.24em] text-umber hover:text-gold disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
