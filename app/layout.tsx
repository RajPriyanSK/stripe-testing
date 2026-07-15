import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Stripe Checkout Demo",
  description: "A simple Stripe + Next.js payment demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f7f8fa", color: "#111827" }}>{children}</body>
    </html>
  );
}
