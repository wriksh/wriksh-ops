import type { Metadata } from "next";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";

/**
 * Operations-console chrome (Dhoomkethu).
 *
 * Wraps every page under the (ops) route group — currently the entire app
 * except /login, which deliberately sits outside this layout so the login
 * screen renders with no nav.
 *
 * `force-dynamic` mirrors wriksh-dev's admin layout: ops pages read live
 * data on every request and must never be statically cached.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wriksh Ops · Dhoomkethu",
  description:
    "Operations console for Wriksh — state catalogues, marketing calendar, finance, and discover-artist ops.",
};

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SideNav />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
