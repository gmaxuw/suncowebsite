import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUNCO — Surigao del Norte Consumers Organization, Inc.",
  description: "Protecting the rights and welfare of consumers across Surigao del Norte since 2011. SEC Registered, DTI Accredited Partner.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}