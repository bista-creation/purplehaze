import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { slugify } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export type EventMenuCourse = {
  category: string;
  items: string[];
};

export type EventMenuPackage = {
  id: string;
  name: string;
  slug: string;
  eventType: string; // "Wedding" | "Birthday" | "Corporate" | "Anniversary" | "Garden Party" | "Cocktail & BBQ" | "Buffet"
  tagline: string;
  description: string;
  pricePerPerson: number; // in NPR
  minGuests: number;
  image: string;
  isPopular: boolean;
  isVegetarian: boolean;
  isActive: boolean;
  sortOrder: number;
  badges: string[];
  courses: EventMenuCourse[];
  createdAt: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const MENUS_FILE = path.join(DATA_DIR, "event-menus.json");

const SEED_EVENT_MENUS: EventMenuPackage[] = [
  {
    id: "em-royal-wedding-01",
    name: "Royal Garden Wedding Banquet",
    slug: "royal-garden-wedding-banquet",
    eventType: "Wedding",
    tagline: "Our premier grand celebration menu with live counters, rich curries and royal dessert buffet.",
    description: "Designed for grand wedding receptions and anniversary celebrations. Includes multi-cuisine appetizers, aromatic biryani, live tandoor and a lavish dessert counter set under the Purple Haze garden canopy.",
    pricePerPerson: 1850,
    minGuests: 50,
    image: "/images/venues/banquet-hall-setup.jpg",
    isPopular: true,
    isVegetarian: false,
    isActive: true,
    sortOrder: 1,
    badges: ["Full Buffet", "Live Tandoor", "Wedding Special", "Unlimited Soft Drinks"],
    courses: [
      {
        category: "Welcome Drinks & Mocktails",
        items: ["Fresh Mint Mojito", "Virgin Pina Colada", "Spiced Mango Lassi", "Fresh Lemonade"],
      },
      {
        category: "Appetizers & Starters",
        items: [
          "Chicken Sekuwa with Timur Chutney",
          "Mutton Choila (Tender Boneless)",
          "Paneer Tikka Shashlik",
          "Crispy Corn Salt & Pepper",
          "Crispy Veg Spring Rolls",
        ],
      },
      {
        category: "Main Course Gravies & Curries",
        items: [
          "Royal Butter Chicken Masala",
          "Mutton Rogan Josh (Slow Cooked)",
          "Paneer Butter Masala",
          "Seasonal Garden Vegetable Korma",
          "Yellow Dal Tadka with Desi Ghee",
        ],
      },
      {
        category: "Rice & Tandoori Breads",
        items: [
          "Khas Dum Biryani (Chicken/Mutton)",
          "Steamed Basmati Rice with Fried Onions",
          "Butter Naan & Garlic Naan",
          "Tandoori Roti with Butter",
        ],
      },
      {
        category: "Salads & Accompaniments",
        items: ["Green Garden Salad", "Boondi Raita", "Nepali Tomato Chutney", "Assorted Papad & Pickles"],
      },
      {
        category: "Dessert Counter",
        items: [
          "Hot Gulab Jamun with Rabdi",
          "Creamy Vanilla Ice Cream with Chocolate Drizzle",
          "Seasonal Fresh Fruit Platter",
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "em-bbq-lawn-02",
    name: "Biratnagar Barbeque & Lawn Party",
    slug: "biratnagar-barbeque-lawn-party",
    eventType: "Garden Party",
    tagline: "Live charcoal grills, sizzling platters and golden garden evening vibes.",
    description: "Perfect for reunion nights, casual gatherings and cocktail evenings. Features live charcoal barbecue stations, spicy skewers, smoky gravies and warm garden seating.",
    pricePerPerson: 1550,
    minGuests: 30,
    image: "/images/venues/garden-lawn-night.jpg",
    isPopular: true,
    isVegetarian: false,
    isActive: true,
    sortOrder: 2,
    badges: ["Live Charcoal BBQ", "Garden Lawn", "Evening Special", "Cocktail Friendly"],
    courses: [
      {
        category: "Welcome Beverages",
        items: ["Watermelon Mint Cooler", "Iced Peach Tea", "Assorted Soft Drinks"],
      },
      {
        category: "Live Grill & Sizzler Starters",
        items: [
          "Charcoal Grilled Chicken BBQ Wings",
          "Authentic Pork Sekuwa / Mutton Sekuwa",
          "Fish Fingers with House Tartar Sauce",
          "Tandoori Spiced Aloo",
          "Grilled Soya Chaap Tikka",
        ],
      },
      {
        category: "Main Course",
        items: [
          "Smoky Highway Chicken Curry",
          "Kadai Paneer with Bell Peppers",
          "Creamy Dal Makhani",
          "Jeera Pulao",
          "Rumali Roti & Butter Naan",
        ],
      },
      {
        category: "Desserts",
        items: ["Sizzling Chocolate Brownie with Vanilla Scoop", "Warm Jalebi with Rabdi"],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "em-birthday-feast-03",
    name: "Birthday & Family Celebration Feast",
    slug: "birthday-family-celebration-feast",
    eventType: "Birthday",
    tagline: "Crowd-pleasing Indo-Chinese and Nepali comfort food crafted for all age groups.",
    description: "Designed for birthdays, graduations and family milestones. Kids and adults alike love the momo station, crispy chicken, fried rice and celebratory desserts.",
    pricePerPerson: 1250,
    minGuests: 25,
    image: "/images/venues/restaurant-indoor-seating.jpg",
    isPopular: false,
    isVegetarian: false,
    isActive: true,
    sortOrder: 3,
    badges: ["Family Favorite", "Music System Ready", "Momo Station", "Cake Table Setup"],
    courses: [
      {
        category: "Welcome Drinks",
        items: ["Purple Haze Berry Punch", "Fresh Lime Soda", "Cold Coffee Float"],
      },
      {
        category: "Starters & Live Momos",
        items: [
          "Steam Chicken Momo with Spicy Jhol",
          "Steam Veg Momo with Sesame Tomato Chutney",
          "Kurkure Chicken Strips with Dip",
          "Honey Chilli Crispy Potato",
          "Paneer 65",
        ],
      },
      {
        category: "Mains & Asian Bowls",
        items: [
          "Kukhura ko Local Jhol",
          "Paneer Lababdar",
          "Egg & Chicken Fried Rice",
          "Vegetable Hakka Chowmein",
          "Butter Naan & Roti",
        ],
      },
      {
        category: "Dessert & Treats",
        items: [
          "Chocolate Mousse Cups",
          "Vanilla & Strawberry Ice Cream Duo",
          "Complimentary Cake Cutting Stand",
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "em-pure-veg-04",
    name: "Pure Vegetarian Satvik Banquet",
    slug: "pure-vegetarian-satvik-banquet",
    eventType: "Anniversary",
    tagline: "100% vegetarian royal banquet cooked with pure ghee, fresh paneer and garden herbs.",
    description: "Dedicated kitchen protocol ensuring 100% pure vegetarian preparation. Can be fully customized for onion-garlic free Jain preferences.",
    pricePerPerson: 1350,
    minGuests: 30,
    image: "/images/venues/meeting-room.jpg",
    isPopular: false,
    isVegetarian: true,
    isActive: true,
    sortOrder: 4,
    badges: ["100% Pure Veg", "Jain Friendly Option", "Desi Ghee", "Traditional Buffet"],
    courses: [
      {
        category: "Welcome Drinks",
        items: ["Kesar Badam Thandai", "Fresh Pineapple Juice", "Nimbu Shikanji"],
      },
      {
        category: "Vegetarian Delicacy Starters",
        items: [
          "Malai Paneer Tikka with Mint Dip",
          "Dahi ke Kebab with Pomegranate",
          "Crispy Mushroom Salt & Pepper",
          "Corn & Cheese Croquettes",
          "Hara Bhara Kebab",
        ],
      },
      {
        category: "Rich Vegetarian Mains",
        items: [
          "Shahi Paneer in Cashew Gravy",
          "Amritsari Pindi Chana",
          "Dal Makhani (24-Hour Simmered)",
          "Kashmiri Dum Aloo",
          "Methi Malai Matar",
        ],
      },
      {
        category: "Rice & Specialty Breads",
        items: [
          "Navratan Pulao with Fried Cashews",
          "Butter Naan, Missi Roti & Laccha Paratha",
        ],
      },
      {
        category: "Sweets & Desserts",
        items: ["Moong Dal Halwa with Khoya", "Kesar Rasmalai", "Matka Kulfi"],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "em-corporate-hi-tea-05",
    name: "Corporate Conference & Executive Hi-Tea",
    slug: "corporate-conference-executive-hi-tea",
    eventType: "Corporate",
    tagline: "Efficient, punctual catering for meetings, seminars, training and board luncheons.",
    description: "Designed for business productivity with minimal noise and maximum flavor. Includes morning coffee/tea session, hearty luncheon and evening hi-tea refreshments.",
    pricePerPerson: 950,
    minGuests: 20,
    image: "/images/venues/meeting-room.jpg",
    isPopular: false,
    isVegetarian: false,
    isActive: true,
    sortOrder: 5,
    badges: ["Corporate Setup", "Projector & Mic Support", "Punctual Service", "Light & Energizing"],
    courses: [
      {
        category: "Arrival Refreshment",
        items: ["Freshly Brewed Organic Ilam Tea", "Filter Coffee", "Assorted Butter Cookies"],
      },
      {
        category: "Executive Luncheon",
        items: [
          "Boneless Chicken Curry in Mild Gravy",
          "Paneer Do Pyaza",
          "Steamed Rice & Jeera Rice",
          "Yellow Moong Dal",
          "Steamed Chicken & Veg Momos",
          "Crispy Mixed Salad & Papad",
        ],
      },
      {
        category: "Hi-Tea & Evening Bites",
        items: [
          "Club Sandwiches",
          "Paneer Pakoda",
          "Fresh Fruit Skewers",
          "Traditional Gulab Jamun",
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function parseJsonArray<T>(raw: string | null | undefined, fallback: T[] = []): T[] {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function mapDbPackage(p: {
  id: string;
  name: string;
  slug: string;
  eventType: string;
  tagline: string;
  description: string;
  pricePerPerson: number;
  minGuests: number;
  image: string | null;
  isPopular: boolean;
  isVegetarian: boolean;
  isActive: boolean;
  sortOrder: number;
  badges: string;
  courses: string;
  createdAt: Date;
  updatedAt: Date;
}): EventMenuPackage {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    eventType: p.eventType,
    tagline: p.tagline,
    description: p.description,
    pricePerPerson: p.pricePerPerson,
    minGuests: p.minGuests,
    image: p.image || "/images/venues/banquet-hall-setup.jpg",
    isPopular: p.isPopular,
    isVegetarian: p.isVegetarian,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    badges: parseJsonArray<string>(p.badges),
    courses: parseJsonArray<EventMenuCourse>(p.courses),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function ensureDataFiles() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function getEventMenus(includeInactive = false): Promise<EventMenuPackage[]> {
  try {
    const dbPackages = await prisma.eventMenuPackage.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    if (dbPackages.length > 0) {
      return dbPackages.map(mapDbPackage);
    }
  } catch (error) {
    console.warn("Database lookup for event menus failed, trying local fallback:", error);
  }

  // Fallback to local JSON file
  try {
    await ensureDataFiles();
    let content = "";
    try {
      content = await readFile(MENUS_FILE, "utf-8");
    } catch {
      await writeFile(MENUS_FILE, JSON.stringify(SEED_EVENT_MENUS, null, 2), "utf-8");
      content = JSON.stringify(SEED_EVENT_MENUS, null, 2);
    }

    const data = JSON.parse(content);
    if (!Array.isArray(data)) return [];

    const sorted = data.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return includeInactive ? sorted : sorted.filter((m) => m.isActive);
  } catch (error) {
    console.error("Error loading event menus:", error);
    return SEED_EVENT_MENUS.filter((m) => includeInactive || m.isActive);
  }
}

export async function getEventMenuBySlug(slug: string): Promise<EventMenuPackage | null> {
  try {
    const dbPackage = await prisma.eventMenuPackage.findUnique({
      where: { slug },
    });
    if (dbPackage) {
      return mapDbPackage(dbPackage);
    }
  } catch (error) {
    console.warn("Database lookup for event menu by slug failed, using fallback:", error);
  }

  const menus = await getEventMenus(true);
  return menus.find((m) => m.slug === slug) ?? null;
}

export async function getEventMenuById(id: string): Promise<EventMenuPackage | null> {
  try {
    const dbPackage = await prisma.eventMenuPackage.findUnique({
      where: { id },
    });
    if (dbPackage) {
      return mapDbPackage(dbPackage);
    }
  } catch (error) {
    console.warn("Database lookup for event menu by id failed, using fallback:", error);
  }

  const menus = await getEventMenus(true);
  return menus.find((m) => m.id === id) ?? null;
}

export async function saveEventMenu(
  input: Partial<EventMenuPackage>,
  id?: string,
): Promise<EventMenuPackage> {
  const name = input.name || "Special Event Package";
  const slug = input.slug || slugify(name) || `menu-${Date.now()}`;
  const badgesStr = Array.isArray(input.badges) ? JSON.stringify(input.badges) : undefined;
  const coursesStr = Array.isArray(input.courses) ? JSON.stringify(input.courses) : undefined;

  // Try Prisma first
  try {
    if (id) {
      const updated = await prisma.eventMenuPackage.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug ? slugify(input.slug) : (input.name ? slugify(input.name) : undefined),
          eventType: input.eventType,
          tagline: input.tagline,
          description: input.description,
          pricePerPerson: input.pricePerPerson !== undefined ? Number(input.pricePerPerson) : undefined,
          minGuests: input.minGuests !== undefined ? Number(input.minGuests) : undefined,
          image: input.image,
          isPopular: input.isPopular !== undefined ? Boolean(input.isPopular) : undefined,
          isVegetarian: input.isVegetarian !== undefined ? Boolean(input.isVegetarian) : undefined,
          isActive: input.isActive !== undefined ? Boolean(input.isActive) : undefined,
          sortOrder: input.sortOrder !== undefined ? Number(input.sortOrder) : undefined,
          badges: badgesStr,
          courses: coursesStr,
        },
      });
      return mapDbPackage(updated);
    } else {
      const created = await prisma.eventMenuPackage.create({
        data: {
          name,
          slug,
          eventType: input.eventType || "Wedding",
          tagline: input.tagline || "",
          description: input.description || "",
          pricePerPerson: Number(input.pricePerPerson) || 1200,
          minGuests: Number(input.minGuests) || 20,
          image: input.image || "/images/venues/banquet-hall-setup.jpg",
          isPopular: Boolean(input.isPopular),
          isVegetarian: Boolean(input.isVegetarian),
          isActive: input.isActive ?? true,
          sortOrder: Number(input.sortOrder) || 0,
          badges: badgesStr || "[]",
          courses: coursesStr || "[]",
        },
      });
      return mapDbPackage(created);
    }
  } catch (error) {
    console.warn("Database write for event menu failed, falling back to local file:", error);
  }

  // Local JSON fallback
  await ensureDataFiles();
  const menus = await getEventMenus(true);
  const now = new Date().toISOString();

  if (id) {
    const index = menus.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error("Event menu package not found.");
    }
    const existing = menus[index];
    const updated: EventMenuPackage = {
      ...existing,
      ...input,
      id: existing.id,
      slug: slugify(input.name || existing.name) || existing.slug,
      updatedAt: now,
    };
    menus[index] = updated;
    await writeFile(MENUS_FILE, JSON.stringify(menus, null, 2), "utf-8");
    return updated;
  }

  const newMenu: EventMenuPackage = {
    id: `em-${randomUUID().slice(0, 8)}`,
    name,
    slug: slugify(name) || `menu-${Date.now()}`,
    eventType: input.eventType || "Wedding",
    tagline: input.tagline || "",
    description: input.description || "",
    pricePerPerson: Number(input.pricePerPerson) || 1200,
    minGuests: Number(input.minGuests) || 20,
    image: input.image || "/images/venues/banquet-hall-setup.jpg",
    isPopular: Boolean(input.isPopular),
    isVegetarian: Boolean(input.isVegetarian),
    isActive: input.isActive ?? true,
    sortOrder: Number(input.sortOrder) || menus.length + 1,
    badges: Array.isArray(input.badges) ? input.badges : ["Buffet", "Catering"],
    courses: Array.isArray(input.courses) ? input.courses : [],
    createdAt: now,
    updatedAt: now,
  };

  menus.push(newMenu);
  await writeFile(MENUS_FILE, JSON.stringify(menus, null, 2), "utf-8");
  return newMenu;
}

export async function deleteEventMenu(id: string): Promise<boolean> {
  try {
    await prisma.eventMenuPackage.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    console.warn("Database deletion for event menu failed, trying local file:", error);
  }

  await ensureDataFiles();
  const menus = await getEventMenus(true);
  const filtered = menus.filter((m) => m.id !== id);
  if (filtered.length === menus.length) return false;
  await writeFile(MENUS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  return true;
}
