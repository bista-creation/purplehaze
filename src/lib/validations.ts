import { z } from "zod";
import {
  BOOKING_STATUSES,
  EVENT_TYPES,
  MAX_EVENT_GUESTS,
  MAX_PARTY_SIZE,
  ORDER_TYPES,
  PAYMENT_METHODS,
  ROLES,
  TIME_SLOTS,
} from "@/lib/constants";

export const phoneSchema = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number.")
  .max(20, "Phone number is too long.")
  .regex(/^[+0-9()\-\s]+$/, "Enter a valid phone number.")
  .refine(
    (value) => value.replace(/\D/g, "").length >= 7,
    "Enter a valid phone number.",
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Password is too long.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
  remember: z.boolean().optional().default(true),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(80),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Please accept the terms to continue." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: phoneSchema,
  image: z
    .string()
    .trim()
    .max(2048, "That image URL is too long.")
    .refine((value) => {
      if (!value) return true;
      if (value.startsWith("/images/uploads/") && !value.includes("..")) {
        return true;
      }
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    }, "Use an https image URL or an uploaded image path."),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1, "Add a label.").max(30),
  fullName: z.string().trim().min(2, "Enter the recipient's name.").max(80),
  phone: phoneSchema,
  line1: z.string().trim().min(4, "Enter a street address.").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter a city.").max(80),
  state: z.string().trim().min(2, "Enter a province.").max(80),
  postalCode: z.string().trim().max(12).optional().or(z.literal("")),
  country: z.string().trim().min(2).max(80).default("Nepal"),
  isDefault: z.boolean().optional().default(false),
});

export const cartItemSchema = z.object({
  dishId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  addOnIds: z.array(z.string()).max(20).default([]),
  quantity: z.number().int().min(1).max(20),
  instructions: z.string().trim().max(300).optional().or(z.literal("")),
});

export const checkoutDetailsSchema = z
  .object({
    customerName: z.string().trim().min(2, "Enter your name.").max(80),
    customerEmail: emailSchema,
    customerPhone: phoneSchema,
    type: z.enum(ORDER_TYPES),
    line1: z.string().trim().max(160).optional().or(z.literal("")),
    line2: z.string().trim().max(160).optional().or(z.literal("")),
    city: z.string().trim().max(80).optional().or(z.literal("")),
    state: z.string().trim().max(80).optional().or(z.literal("")),
    zoneId: z.string().optional().or(z.literal("")),
    tableNumber: z.string().trim().max(20).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
    paymentMethod: z.enum(PAYMENT_METHODS),
    couponCode: z.string().trim().max(30).optional().or(z.literal("")),
    scheduledFor: z.string().optional().or(z.literal("")),
    saveAddress: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === "DELIVERY") {
      if (!data.line1 || data.line1.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["line1"],
          message: "Enter a delivery address.",
        });
      }
    }
    if (data.type === "DINE_IN" && !data.tableNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tableNumber"],
        message: "Enter your table number, or ask our team.",
      });
    }
  });

export const createOrderSchema = z.object({
  details: checkoutDetailsSchema,
  items: z.array(cartItemSchema).min(1, "Your cart is empty.").max(50),
  idempotencyKey: z.string().trim().min(16).max(100).optional(),
});

export const careerApplicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: emailSchema,
  phone: phoneSchema,
  position: z.string().trim().min(2, "Please select or enter the position.").max(100),
  experience: z.string().trim().min(1, "Please select your experience level.").max(50),
  shiftPreference: z.string().trim().max(50).optional().default("Full-time"),
  message: z.string().trim().min(10, "Tell us briefly about your background.").max(2000),
  resumeUrl: z.string().trim().min(1, "Please upload your CV / resume before submitting.").max(500),
  resumeFileName: z.string().trim().max(160).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Add a subject.").max(120),
  message: z.string().trim().min(10, "Tell us a little more.").max(2000),
});

export const reservationSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  phone: phoneSchema,
  date: z.string().min(1, "Choose a date."),
  time: z.enum(TIME_SLOTS),
  guests: z.coerce
    .number()
    .int()
    .min(1, "At least one guest.")
    .max(MAX_PARTY_SIZE, `For more than ${MAX_PARTY_SIZE} guests, contact us.`),
  occasion: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(600).optional().or(z.literal("")),
});

export const eventBookingSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: emailSchema,
  phone: phoneSchema,
  venueId: z.string().trim().optional().or(z.literal("")),
  eventType: z.enum(EVENT_TYPES),
  eventDate: z.string().min(1, "Choose an event date."),
  guests: z.coerce
    .number()
    .int()
    .min(1, "At least one guest.")
    .max(MAX_EVENT_GUESTS, "Please call us for events of this size."),
  message: z.string().trim().max(1500).optional().or(z.literal("")),
});

export const reviewSchema = z.object({
  orderNumber: z.string().min(3),
  phone: phoneSchema,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(100).optional().or(z.literal("")),
  comment: z.string().trim().min(5, "Tell us about your meal.").max(1500),
});

export const trackOrderSchema = z.object({
  orderNumber: z.string().trim().min(3, "Enter your order number.").max(40),
  phone: phoneSchema,
});

export const newsletterSchema = z.object({ email: emailSchema });

export const couponAdminSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Code must be at least 3 characters.")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, - or _ only."),
  description: z.string().trim().max(160).optional().or(z.literal("")),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().positive("Enter a value."),
  minOrder: z.coerce.number().min(0).default(0),
  maxDiscount: z.coerce.number().min(0).optional(),
  maxUses: z.coerce.number().int().min(0).optional(),
  startsAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const categoryAdminSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().max(60),
  priceDelta: z.coerce.number().min(0).default(0),
  isDefault: z.boolean().default(false),
});

export const dishAdminSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z.string().trim().max(100).optional().or(z.literal("")),
    categoryId: z.string().min(1, "Choose a category."),
    description: z.string().trim().min(10, "Add a short description.").max(500),
    details: z.string().trim().max(2000).optional().or(z.literal("")),
    price: z.coerce.number().min(0).optional().default(0),
    comparePrice: z.coerce.number().min(0).optional(),
    image: z.string().trim().max(500).optional().or(z.literal("")),
    isVeg: z.boolean().default(false),
    isSpicy: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
    isAvailable: z.boolean().default(true),
    prepTime: z.coerce.number().int().min(1).max(180).default(20),
    calories: z.coerce.number().int().min(0).optional(),
    sortOrder: z.coerce.number().int().min(0).default(0),
    variants: z.array(variantSchema).max(20).default([]),
    addOnIds: z.array(z.string()).max(30).default([]),
  })
  .superRefine((data, ctx) => {
    const activeVariants = data.variants.filter((v) => v.name.trim().length > 0);
    if (activeVariants.length > 0) {
      activeVariants.forEach((v, index) => {
        if (!v.name.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variants", index, "name"],
            message: "Enter variant name.",
          });
        }
        if (v.priceDelta === undefined || v.priceDelta === null || v.priceDelta <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["variants", index, "priceDelta"],
            message: "Variant price must be greater than 0.",
          });
        }
      });
    } else {
      if (!data.price || data.price <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "Enter a main price, or add dish variants with individual prices.",
        });
      }
    }
  });

export const venueAdminSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().min(10).max(500),
  longDescription: z.string().trim().max(3000).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(0).optional(),
  priceFrom: z.coerce.number().min(0).optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const staffSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  role: z.enum(ROLES),
  password: passwordSchema.optional().or(z.literal("")),
});

export const galleryAdminSchema = z.object({
  url: z.string().trim().min(1, "Add an image.").max(500),
  title: z.string().trim().min(2).max(100),
  category: z.string().trim().max(40).default("Restaurant"),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const bannerAdminSchema = z.object({
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(240).optional().or(z.literal("")),
  image: z.string().trim().max(500).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal("")),
  ctaHref: z.string().trim().max(200).optional().or(z.literal("")),
  sortOrder: z.coerce.number().int().min(0).default(0),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const testimonialAdminSchema = z.object({
  name: z.string().trim().min(2).max(80),
  location: z.string().trim().max(80).optional().or(z.literal("")),
  quote: z.string().trim().min(10).max(500),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const bookingStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(BOOKING_STATUSES),
  adminNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const acceptOrderSchema = z.object({
  orderId: z.string().min(1),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CheckoutDetailsInput = z.infer<typeof checkoutDetailsSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type EventBookingInput = z.infer<typeof eventBookingSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type DishAdminInput = z.infer<typeof dishAdminSchema>;
export type VenueAdminInput = z.infer<typeof venueAdminSchema>;
export type CouponAdminInput = z.infer<typeof couponAdminSchema>;
export type CategoryAdminInput = z.infer<typeof categoryAdminSchema>;
export type GalleryAdminInput = z.infer<typeof galleryAdminSchema>;
export type BannerAdminInput = z.infer<typeof bannerAdminSchema>;
export type TestimonialAdminInput = z.infer<typeof testimonialAdminSchema>;
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type CareerApplicationInput = z.infer<typeof careerApplicationSchema>;
