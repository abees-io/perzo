import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perzo — Your little everyday companion",
  description: "A cozy place to think, create, and chat with your personal AI pet, Perzo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
