import { Banknote } from "lucide-react";

export function PaymentPartners() {
  return (
    <div className="flex flex-col gap-2.5 lg:items-end">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold/80">
        Payment Partners &amp; Methods We Accept
      </span>

      <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 lg:justify-end">
        {/* Visa */}
        <div
          title="Visa cards accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 48 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="Visa"
          >
            <text
              x="0"
              y="15"
              fill="#FFFFFF"
              fontSize="16"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="sans-serif"
            >
              VISA
            </text>
            <path d="M0 4.5 L6 4.5 L4.5 7 L1 7 Z" fill="#F7B600" />
          </svg>
        </div>

        {/* Mastercard */}
        <div
          title="Mastercard accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 34 22"
            className="h-4.5 w-auto"
            fill="none"
            aria-label="Mastercard"
          >
            <circle cx="11" cy="11" r="8" fill="#EB001B" />
            <circle cx="23" cy="11" r="8" fill="#F79E1B" fillOpacity="0.95" />
            <path
              d="M17 5.8 A8 8 0 0 0 17 16.2 A8 8 0 0 0 17 5.8"
              fill="#FF5F00"
            />
          </svg>
        </div>

        {/* American Express */}
        <div
          title="American Express (Amex) accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 50 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="American Express"
          >
            <rect width="50" height="18" rx="3" fill="#006FCF" />
            <text
              x="25"
              y="12.5"
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="900"
              textAnchor="middle"
              letterSpacing="0.6"
              fontFamily="sans-serif"
            >
              AMEX
            </text>
          </svg>
        </div>

        {/* UnionPay */}
        <div
          title="UnionPay cards accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 54 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="UnionPay"
          >
            <rect width="54" height="18" rx="3" fill="#00457C" />
            <path d="M5 2.5 L15 2.5 L12 16 L2 16 Z" fill="#E21836" />
            <path d="M14 2.5 L24 2.5 L21 16 L11 16 Z" fill="#00457C" />
            <path d="M23 2.5 L33 2.5 L30 16 L20 16 Z" fill="#007B84" />
            <text
              x="28"
              y="12"
              fill="#FFFFFF"
              fontSize="7.5"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              UnionPay
            </text>
          </svg>
        </div>

        {/* UPI */}
        <div
          title="UPI (India & Cross-border QR) accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 44 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="UPI"
          >
            <path d="M8 3 L17 9 L8 15 Z" fill="#0F8642" />
            <path d="M3 3 L12 9 L3 15 Z" fill="#F47920" />
            <text
              x="20"
              y="13"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="sans-serif"
            >
              UPI
            </text>
          </svg>
        </div>

        {/* eSewa */}
        <div
          title="eSewa Digital Wallet & QR accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 56 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="eSewa"
          >
            <circle cx="9" cy="9" r="8" fill="#60BB46" />
            <text
              x="9"
              y="12.5"
              fill="#FFFFFF"
              fontSize="9.5"
              fontWeight="900"
              textAnchor="middle"
              fontFamily="sans-serif"
            >
              e
            </text>
            <text
              x="20"
              y="13"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              Sewa
            </text>
          </svg>
        </div>

        {/* Khalti */}
        <div
          title="Khalti Digital Wallet & QR accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 52 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="Khalti"
          >
            <rect width="52" height="18" rx="3.5" fill="#5D2E8E" />
            <text
              x="26"
              y="12.5"
              fill="#FFFFFF"
              fontSize="9.5"
              fontWeight="bold"
              textAnchor="middle"
              letterSpacing="0.4"
              fontFamily="sans-serif"
            >
              khalti
            </text>
          </svg>
        </div>

        {/* Fonepay */}
        <div
          title="Fonepay QR & Interbank Payments accepted"
          className="inline-flex items-center opacity-85 transition hover:opacity-100 hover:scale-105"
        >
          <svg
            viewBox="0 0 60 18"
            className="h-4 w-auto"
            fill="none"
            aria-label="Fonepay"
          >
            <rect width="60" height="18" rx="3.5" fill="#ED1C24" />
            <circle
              cx="9"
              cy="9"
              r="4.5"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              fill="none"
              strokeDasharray="12 4"
            />
            <circle cx="9" cy="9" r="2" fill="#FFFFFF" />
            <text
              x="18"
              y="12.5"
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              fonepay
            </text>
          </svg>
        </div>

        {/* Cash */}
        <div
          title="Cash at restaurant counter & Cash on delivery accepted"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/75 transition hover:text-white hover:scale-105"
        >
          <Banknote className="size-3.5 text-gold" />
          <span>Cash</span>
        </div>
      </div>
    </div>
  );
}
