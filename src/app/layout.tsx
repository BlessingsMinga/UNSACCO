import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
        suppressHydrationWarning
        className="antialiased bg-background text-foreground"
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
