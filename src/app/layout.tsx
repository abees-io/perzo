import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perzo — Your little everyday companion",
  description: "A little presence. Endless possibility. Think, create, and chat with Perzo, your personal AI companion.",
  icons: { icon: "/perzo-logo.png", apple: "/perzo-logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#120c13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
