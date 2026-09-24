import type { Metadata } from "next";
import "./globals.css";

/**
 * Root layout — bare <html><body> shell only.
 *
 * The actual chrome (SideNav + TopBar) lives in `app/(ops)/layout.tsx`,
 * which wraps every ops page EXCEPT /login. /login renders inside this
 * bare shell so its UI isn't competing with the dashboard nav.
 *
 * The Spectral + Inter font links stay here so both the login screen and
 * the ops chrome inherit them.
 */
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
        {children}
      </body>
    </html>
  );
}
