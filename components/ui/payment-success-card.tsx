"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaymentSuccessCardProps {
  sessionId: string;
  planName: string;
  paymentMethod: string;
  dateTime: string;
  amountPaid: string;
  onGoToDashboard: () => void;
  title?: string;
  buttonText?: string;
  icon?: React.ReactNode;
  className?: string;
}

export const PaymentSuccessCard: React.FC<PaymentSuccessCardProps> = ({
  sessionId,
  planName,
  paymentMethod,
  dateTime,
  amountPaid,
  onGoToDashboard,
  title = "Payment successful",
  buttonText = "Go to dashboard",
  icon = <CheckCircle2 className="h-12 w-12 text-emerald-500" strokeWidth={1.5} />,
  className,
}) => {
  const details = [
    { label: "Plan", value: planName },
    { label: "Payment method", value: paymentMethod },
    { label: "Date & time", value: dateTime },
    { label: "Amount paid", value: amountPaid, isBold: true },
  ];

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } },
  };

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        aria-live="polite"
        className={cn(
          "w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg sm:p-8",
          className,
        )}
      >
        <div className="flex flex-col items-center space-y-6 text-center">
          <motion.div variants={itemVariants}>{icon}</motion.div>

          <motion.div variants={itemVariants} className="space-y-1">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              A receipt has been sent to your email.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full space-y-4 pt-2">
            {details.map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center justify-between border-b pb-4 text-sm text-muted-foreground",
                  {
                    "border-none pb-0": index === details.length - 1,
                    "font-bold text-card-foreground": item.isBold,
                  },
                )}
              >
                <span>{item.label}</span>
                <span className={cn({ "text-lg": item.isBold })}>{item.value}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={itemVariants} className="w-full space-y-2 pt-4">
            <Button onClick={onGoToDashboard} className="h-12 w-full text-md" size="lg">
              {buttonText}
            </Button>
            <p className="text-xs text-muted-foreground">Order ref: {sessionId}</p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
