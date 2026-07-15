import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stripe Checkout Demo",
  description: "A simple Stripe + Next.js payment demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="m-0 bg-background text-foreground">{children}</body>
    </html>
  );
}
