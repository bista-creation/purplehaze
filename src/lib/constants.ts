import { normalizeAppUrl } from "@/lib/app-url";

export const SITE = {
  name: "Purple Haze Restro & Garden",
  shortName: "Purple Haze",
  tagline: "Good food. Golden evenings. Garden memories.",
  description:
    "A garden restaurant, banquet venue and meeting space on Airport Road, Biratnagar. Nepali, Indian, Asian and continental favourites, served in a warm, leafy setting.",
  url: normalizeAppUrl(process.env.NEXT_PUBLIC_APP_URL),
  phone: "+977 9851150987",
  phoneRaw: "+9779851150987",
  // Display-only number for the header top bar. Calls and WhatsApp continue
  // to use the established `phoneRaw` and `whatsapp` connections.
  topbarPhone: "+977 9852022202",
  landline: "+977 21 464193",
  landlineRaw: "+97721464193",
  whatsapp: "9779851150987",
  email: "purplehaze_biratnagar@gmail.com",
  address: {
    line1: "Airport Road",
    line2: "Biratnagar 56613",
    city: "Biratnagar",
    state: "Koshi Province",
    country: "Nepal",
  },
  coordinates: { lat: 26.4856751, lng: 87.2707362 },
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=26.4856751%2C87.2707362",
  mapEmbedUrl:
    "https://www.google.com/maps?q=26.4856751,87.2707362&z=16&output=embed",
  facebook: "https://www.facebook.com/purplehaze.biratnagar",
  instagram: null as string | null,
  hours: "9:00 AM – 10:00 PM, daily",
  timezone: "Asia/Kathmandu",
  currency: "NPR",
} as const;

export type NavItem = {
  href: string;
  label: string;
  children?: Array<{
    href: string;
    label: string;
  }>;
};

export const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/menu",
    label: "Menu",
    children: [
      {
        href: "/menu",
        label: "Food & Drinks Menu",
      },
      {
        href: "/events/menu",
        label: "Event & Banquet Menus",
      },
    ],
  },
  { href: "/events", label: "Events" },
  { href: "/career", label: "Career" },
  { href: "/contact", label: "Contact" },
  {
    href: "/about",
    label: "Our Story",
    children: [
      {
        href: "/about",
        label: "Our Story",
      },
      {
        href: "/gallery",
        label: "Photo Gallery",
      },
    ],
  },
];

export const ACCOUNT_NAV = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "My orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/favorites", label: "Favourites" },
  { href: "/account/bookings", label: "Bookings" },
  { href: "/account/settings", label: "Settings" },
] as const;

export const ADMIN_NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
      { href: "/admin/notifications", label: "Notifications", icon: "bell" },
      { href: "/admin/reports", label: "Reports", icon: "chart" },
    ],
  },
  {
    label: "Service",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "receipt" },
      {
        href: "/admin/reservations",
        label: "Reservations",
        icon: "calendarCheck",
      },
      {
        href: "/admin/event-bookings",
        label: "Event bookings",
        icon: "calendar",
      },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/menu", label: "Menu", icon: "utensils" },
      { href: "/admin/event-menus", label: "Event menus", icon: "sparkles" },
      { href: "/admin/venues", label: "Venues", icon: "building" },
      { href: "/admin/coupons", label: "Coupons", icon: "ticket" },
    ],
  },
  {
    label: "Audience",
    items: [
      { href: "/admin/customers", label: "Customers", icon: "users" },
      { href: "/admin/reviews", label: "Reviews", icon: "star" },
      { href: "/admin/messages", label: "Messages", icon: "mail" },
    ],
  },
  {
    label: "Website",
    items: [
      { href: "/admin/career", label: "Career", icon: "briefcase" },
      { href: "/admin/content", label: "Content", icon: "layout" },
      { href: "/admin/settings", label: "Settings", icon: "settings" },
      { href: "/admin/staff", label: "Staff & roles", icon: "shield" },
    ],
  },
  {
    label: "System",
    items: [{ href: "/admin/audit", label: "Audit log", icon: "history" }],
  },
] as const;

export const ROLES = ["CUSTOMER", "STAFF", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED"];

export const STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    description: string;
    tone: "amber" | "violet" | "blue" | "gold" | "green" | "red";
  }
> = {
  PENDING: {
    label: "Pending",
    description: "We have received your order and will confirm it shortly.",
    tone: "amber",
  },
  CONFIRMED: {
    label: "Confirmed",
    description: "The kitchen has accepted your order.",
    tone: "violet",
  },
  PREPARING: {
    label: "Preparing",
    description: "Your food is being freshly prepared.",
    tone: "gold",
  },
  READY: {
    label: "Ready",
    description: "Your order is ready and waiting for the next step.",
    tone: "blue",
  },
  OUT_FOR_DELIVERY: {
    label: "On the way",
    description: "Your order has left the restaurant.",
    tone: "blue",
  },
  COMPLETED: {
    label: "Completed",
    description: "Your order has been completed. We hope you enjoyed it!",
    tone: "green",
  },
  CANCELLED: {
    label: "Cancelled",
    description: "This order has been cancelled.",
    tone: "red",
  },
};

export const ORDER_TYPES = ["DELIVERY", "PICKUP", "DINE_IN"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];
export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DELIVERY: "Delivery",
  PICKUP: "Pickup",
  DINE_IN: "Dine-in",
};

export const PAYMENT_METHODS = ["COD", "ESEWA", "KHALTI"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: "Cash on delivery",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

export const PAYMENT_STATUSES = [
  "UNPAID",
  "INITIATED",
  "PAID",
  "FAILED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
] as const;

export const EVENT_TYPES = [
  "Wedding",
  "Reception",
  "Birthday",
  "Anniversary",
  "Corporate meeting",
  "Conference / seminar",
  "Private party",
  "Other",
] as const;

export const TIME_SLOTS = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
] as const;

export const DEFAULT_SETTINGS: Record<string, string> = {
  "restaurant.name": "Purple Haze Restro & Garden",
  "restaurant.tagline": "Good food. Golden evenings. Garden memories.",
  "restaurant.email": "purplehaze_biratnagar@gmail.com",
  "restaurant.phone": "+977 9851150987",
  "restaurant.landline": "+977 21 464193",
  "restaurant.address": "Airport Road, Biratnagar 56613, Nepal",
  "restaurant.hours": "9:00 AM – 10:00 PM, daily",
  "restaurant.facebook": "https://www.facebook.com/purplehaze.biratnagar",
  "order.taxRate": "13",
  "order.serviceChargeRate": "0",
  "order.minDeliveryOrder": "0",
  "order.acceptingOrders": "true",
  "order.prepTimeMinutes": "25",
  "order.cancellationWindowMinutes": "10",
  "payment.codEnabled": "true",
  "payment.esewaEnabled": "true",
  "payment.khaltiEnabled": "true",
  "content.heroEyebrow": "Biratnagar's garden table",
  "content.heroTitle":
    "Dinner under the stars. Memories made around the table.",
  "content.heroSubtitle":
    "Nepali comfort food, Indian classics, Asian favourites and continental plates — served in a leafy garden on Airport Road.",
  "content.aboutTitle": "A little purple, a lot of heart.",
  "content.aboutBody":
    "Purple Haze Restro & Garden brings together the flavours people in Biratnagar grew up with and the occasions worth dressing up for. From quick momos to wedding receptions, our garden and banquet spaces are made for gathering.",
  "seo.title": "Purple Haze Restro & Garden | Biratnagar",
  "seo.description":
    "Order Nepali, Indian, Asian and continental food online from Purple Haze Restro & Garden, Airport Road, Biratnagar. Book venues and reserve your table.",
};

export const MENU_CATEGORY_IMAGES: Record<string, string> = {
  nepali: "/images/menu/nepali.jpg",
  indian: "/images/menu/indian.jpg",
  asian: "/images/menu/asian.jpg",
  continental: "/images/menu/continental.jpg",
  pizza: "/images/menu/pizza.jpg",
  default: "/images/placeholders/dish.jpg",
};

export const FALLBACK_DISH_IMAGE = "/images/placeholders/dish.jpg";
export const FALLBACK_VENUE_IMAGE = "/images/venues/garden.jpg";

export const MAX_PARTY_SIZE = 20;
export const MAX_EVENT_GUESTS = 500;
