/**
 * /login lives OUTSIDE the (ops) route group, so this layout intentionally
 * renders no chrome — the root app/layout.tsx already provides the bare
 * <html><body> shell. This file exists so the login screen bypasses the
 * global <SideNav /> + <TopBar /> that ship with the rest of the ops app.
 */
export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
