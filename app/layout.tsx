import type { Metadata } from "next";
import "./globals.css";
import SideNav from "@/components/SideNav";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Wriksh Ops · Dhoomkethu",
  description:
    "Operations console for Wriksh — state catalogues, marketing calendar, finance, and discover-artist ops.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Spectral serif + Inter sans — same as the catalogue PDF. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-linen text-ink font-body">
        <div className="flex min-h-screen">
          <SideNav />
          <div className="flex flex-1 flex-col">
            <TopBar />
            <main className="flex-1 p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
