import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SUNCO — Surigao del Norte Consumers Organization, Inc.",
  description: "Protecting the rights and welfare of consumers across Surigao del Norte since 2011.",
  icons: {
    icon: "/images/sunco-logo.png",
    apple: "/images/sunco-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}