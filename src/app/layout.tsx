import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UNISSACO  University Student Savings & Investment Cooperative",
  description:
    "UNISSACO is a digital savings and investment cooperative empowering university students to save, buy shares, invest, and grow wealth together.",
  keywords: ["UNISSACO", "SACCO", "student cooperative", "savings", "investments", "shares", "Malawi"],
  authors: [{ name: "UNISSACO" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "UNISSACO  Student Savings & Investment Cooperative",
    description: "Save. Invest. Grow. A digital cooperative built for university students.",
    siteName: "UNISSACO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
