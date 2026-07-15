"use client";

import { useRouter } from "next/navigation";
import { PaymentSuccessCard } from "@/components/ui/payment-success-card";

export function PaymentSuccessScreen(props: {
  sessionId: string;
  planName: string;
  paymentMethod: string;
  dateTime: string;
  amountPaid: string;
}) {
  const router = useRouter();

  return (
    <PaymentSuccessCard
      {...props}
      onGoToDashboard={() => router.push("/")}
    />
  );
}
