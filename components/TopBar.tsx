import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";

/**
 * Top bar — wordmark + breadcrumb + project tag + sign-out.
 *
 * Kept server-side except for the logout button (which is a client
 * component because it does a fetch + router navigation).
 *
 * The "wriksh.com" link is the only escape hatch back to the customer-
 * facing site; the "Sign out" button drops the ops session cookie and
 * routes back to /login.
 */
export default function TopBar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone/40 bg-linen/60 px-8 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-body text-[11px] uppercase tracking-[0.32em] text-gold">
          Operations
        </span>
        <span className="text-stone">·</span>
        <span className="font-display text-base text-ink-soft">Dhoomkethu</span>
      </div>
      <div className="flex items-center gap-4 font-body text-sm text-ink-soft">
        <span className="hidden sm:inline">
          <span className="text-umber">env:</span>{" "}
          <span className="font-mono text-xs text-gold">wriksh-ops</span>
        </span>
        <Link
          href="https://wriksh.com"
          className="rounded-full border border-stone px-3 py-1 text-xs hover:bg-parchment"
        >
          wriksh.com ↗
        </Link>
        <span className="hidden h-4 w-px bg-stone/60 sm:inline-block" />
        <AdminLogoutButton />
      </div>
    </header>
  );
}
