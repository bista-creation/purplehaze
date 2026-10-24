"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useCartStore } from "@/lib/cart-store";
import { Check, Sparkles } from "lucide-react";

const sparklePositions: Array<{
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  delay: number;
}> = [
  { left: "0.1rem", top: "0.1rem", delay: 0.2 },
  { right: "0", top: "0.35rem", delay: 0.3 },
  { left: "0.35rem", bottom: "0", delay: 0.35 },
  { right: "0.1rem", bottom: "0.25rem", delay: 0.4 },
];

export function OrderSuccess({
  orderNumber,
  mode,
  total,
  scheduledFor,
}: {
  orderNumber: string;
  mode: "placed" | "paid";
  total?: string;
  scheduledFor?: string | null;
}) {
  const reduce = useReducedMotion();
  useEffect(() => {
    useCartStore.getState().clearCart();
  }, []);
  const title =
    mode === "paid" ? "Payment received." : "Your order is confirmed.";
  const copy =
    mode === "paid"
      ? "Your payment was verified and your order is with our team."
      : "We have sent your order to the kitchen and will keep you updated.";

  return (
    <motion.section
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
      className="relative mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-950 shadow-[0_24px_60px_-50px_rgba(5,150,105,0.65)] sm:p-5 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative grid size-14 shrink-0 place-items-center">
          <motion.span
            initial={{ scale: 0.4, rotate: -18, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 15,
              delay: reduce ? 0 : 0.08,
            }}
            className="grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
          >
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 18,
                delay: reduce ? 0 : 0.24,
              }}
            >
              <Check className="size-7" strokeWidth={3} />
            </motion.span>
          </motion.span>
          {!reduce
            ? sparklePositions.map((spark, index) => (
                <motion.span
                  key={index}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: spark.delay, type: "spring" }}
                  className="absolute text-gold"
                  style={{
                    left: spark.left,
                    right: spark.right,
                    top: spark.top,
                    bottom: spark.bottom,
                  }}
                  aria-hidden
                >
                  <Sparkles className="size-3" />
                </motion.span>
              ))
            : null}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
            Order {orderNumber}
          </p>
          <h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 opacity-80">{copy}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
            {total ? <span>Total {total}</span> : null}
            {scheduledFor ? <span>Scheduled for {scheduledFor}</span> : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
              </span>
              Live order updates
            </span>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: reduce ? 0 : 0.7, delay: 0.3 }}
        className="absolute inset-x-0 bottom-0 h-1 origin-left bg-gradient-to-r from-emerald-500 via-gold to-primary"
        aria-hidden
      />
    </motion.section>
  );
}
