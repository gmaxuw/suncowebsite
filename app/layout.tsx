import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "SUNCO – Surigao del Norte Consumers Organization, Inc.",
    template: "%s | SUNCO",
  },
  description: "SUNCO is the voice of consumers in Surigao del Norte – advocating for your rights, safeguarding your welfare since 2011.",
  keywords: ["SUNCO", "Surigao del Norte", "consumers organization", "DTI", "consumer rights", "Philippines"],
  authors: [{ name: "SUNCO Inc." }],
  creator: "SUNCO Inc.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_PH",
    siteName: "SUNCO",
    images: [{ url: "/images/sunco-logo.png" }],
  },
  icons: {
    icon: "/images/sunco-logo.png",
    apple: "/images/sunco-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-PH">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}  