/**
 * Development seed for Purple Haze Restro & Garden.
 *
 * The seed is intentionally repeatable and destructive: it clears the local
 * database before inserting demo data. Never run it against production.
 *
 * Menu prices, delivery fees and event capacities are realistic placeholders
 * for local testing. Replace them from the admin dashboard before launch.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const now = Date.now();
const daysAgo = (days: number, hour = 19, minute = 0) =>
  new Date(now - days * 86_400_000 + (hour - 12) * 3_600_000 + minute * 60_000);

const IMG = {
  momo: "/images/menu/momo.webp",
  sekuwa: "/images/menu/mutton-sekuwa.webp",
  samaya: "/images/menu/samaya-baji.jpg",
  mustang: "/images/menu/mustang-aalu.webp",
  thakali: "/images/menu/my-cuisine-photo.jpg",
  gundruk: "/images/menu/indian.jpg",
  choila: "/images/menu/tandoori-chicken.jpg",
  lajawab: "/images/menu/chicken-lajawab.jpg",
  paneer: "/images/menu/paneer-lababdar.jpg",
  pakku: "/images/menu/mutton-pakku.jpg",
  butter: "/images/menu/indian.jpg",
  biryani: "/images/menu/biryani.jpg",
  dal: "/images/menu/indian.jpg",
  malai: "/images/menu/chicken-malai-tikka.jpg",
  kabab: "/images/menu/dilkhus-kabab.jpg",
  indian: "/images/menu/indian.jpg",
  devil: "/images/menu/devil-chicken.jpg",
  hunan: "/images/menu/Hunan-Chicken.jpg",
  noodles: "/images/menu/szechuan-noodles.jpg",
  seaBass: "/images/menu/crispy-sea-bass.jpg",
  wings: "/images/menu/garlic-parmesan-wings.jpg",
  pizza: "/images/menu/pizza.jpg",
  asian: "/images/menu/asian.jpg",
  continental: "/images/menu/continental.jpg",
  alfredo: "/images/menu/alfredo pasta.jpg",
  steak: "/images/menu/chicken-steak.jpg",
  stroganoff: "/images/menu/food-presentation.jpg",
  presentation: "/images/menu/food-presentation.jpg",
  fallback: "/images/placeholders/dish.jpg",
};

type DishSeed = {
  name: string;
  slug: string;
  category: "nepali" | "indian" | "asian" | "continental";
  description: string;
  details: string;
  price: number;
  comparePrice?: number;
  image: string;
  isVeg?: boolean;
  isSpicy?: boolean;
  isFeatured?: boolean;
  prepTime?: number;
  calories?: number;
  variantSizes?: boolean;
  addOns?: string[];
};

const categories = [
  {
    name: "Nepali",
    slug: "nepali",
    description:
      "Comfort food from the hills and the Terai — momos, sekuwa, thakali sets and familiar home-style plates.",
    image: "/images/menu/nepali.jpg",
    sortOrder: 1,
  },
  {
    name: "Indian",
    slug: "indian",
    description:
      "Slow-simmered curries, tandoor favourites and fragrant rice, made for sharing around the table.",
    image: "/images/menu/indian.jpg",
    sortOrder: 2,
  },
  {
    name: "Asian",
    slug: "asian",
    description:
      "Wok-fired noodles, crisp starters and bold sauces from across East and South-East Asia.",
    image: "/images/menu/asian.jpg",
    sortOrder: 3,
  },
  {
    name: "Continental",
    slug: "continental",
    description:
      "Pizza, pasta, grills and garden salads for an easy lunch or a long evening.",
    image: "/images/menu/continental.jpg",
    sortOrder: 4,
  },
] as const;

const dishes: DishSeed[] = [
  // Nepali — 7
  {
    name: "Steamed Chicken Momo",
    slug: "steamed-chicken-momo",
    category: "nepali",
    description:
      "Ten hand-folded momos filled with chicken, ginger and spring onion, served with tomato achar.",
    details:
      "Our most-ordered plate. The filling is seasoned each morning and folded to order. Ask for the chutney on the side if you prefer a milder dip.",
    price: 28000,
    image: IMG.momo,
    isSpicy: true,
    isFeatured: true,
    prepTime: 18,
    calories: 480,
    variantSizes: true,
    addOns: ["Extra chutney", "Extra raita"],
  },
  {
    name: "Mutton Sekuwa",
    slug: "mutton-sekuwa",
    category: "nepali",
    description:
      "Char-grilled mutton marinated with timur, garlic and mustard oil, with fresh salad.",
    details:
      "A smoky, tender plate from the grill. Served with beaten rice and a house salad; best shared as a starter.",
    price: 52000,
    image: IMG.sekuwa,
    isSpicy: true,
    isFeatured: true,
    prepTime: 24,
    calories: 620,
    addOns: ["Extra chutney", "Extra protein"],
  },
  {
    name: "Samaya Baji",
    slug: "samaya-baji",
    category: "nepali",
    description:
      "A Newari-style sharing platter of beaten rice, spiced chicken, egg, peanuts and achar.",
    details:
      "A little of everything, arranged for the centre of the table. A lovely introduction to Nepali snacking.",
    price: 38000,
    image: IMG.samaya,
    isSpicy: true,
    prepTime: 22,
    calories: 710,
    addOns: ["Extra chutney"],
  },
  {
    name: "Mustang Aloo",
    slug: "mustang-aloo",
    category: "nepali",
    description:
      "Crisp baby potatoes tossed with timur, chilli, garlic and toasted sesame.",
    details:
      "Vegan, punchy and very snackable. One of our favourite vegetarian starters.",
    price: 26000,
    image: IMG.mustang,
    isVeg: true,
    isSpicy: true,
    prepTime: 16,
    calories: 380,
  },
  {
    name: "Chicken Thakali Set",
    slug: "chicken-thakali-set",
    category: "nepali",
    description:
      "Chicken curry, dal, seasonal saag, aloo achar, papad and steamed rice on one generous thali.",
    details:
      "A full, comforting meal with a little of everything. The saag and achar change with the season.",
    price: 45000,
    image: IMG.thakali,
    isSpicy: true,
    isFeatured: true,
    prepTime: 25,
    calories: 940,
    variantSizes: true,
    addOns: ["Extra raita", "Add fried egg"],
  },
  {
    name: "Gundruk Bodi",
    slug: "gundruk-bodi",
    category: "nepali",
    description:
      "Fermented leafy greens and black-eyed beans slow-cooked with tomato and dried chilli.",
    details:
      "A deeply savoury, homestyle vegetarian curry. Serve with rice or roti.",
    price: 24000,
    image: IMG.gundruk,
    isVeg: true,
    isSpicy: true,
    prepTime: 20,
    calories: 320,
    addOns: ["Extra raita"],
  },
  {
    name: "Chicken Choila",
    slug: "chicken-choila",
    category: "nepali",
    description:
      "Warm grilled chicken tossed with mustard oil, timur, lemon and fresh coriander.",
    details:
      "Bright, citrusy and gently numbing. A great companion to momos or a cold drink.",
    price: 39000,
    image: IMG.choila,
    isSpicy: true,
    prepTime: 20,
    calories: 460,
    addOns: ["Extra chutney"],
  },

  // Indian — 7
  {
    name: "Chicken Lajawab",
    slug: "chicken-lajawab",
    category: "indian",
    description:
      "Tandoor-kissed chicken in a silky tomato, cashew and cream gravy.",
    details:
      "Mildly spiced and rich, finished with a little butter. Excellent with garlic naan.",
    price: 48000,
    image: IMG.lajawab,
    isFeatured: true,
    prepTime: 25,
    calories: 680,
    variantSizes: true,
    addOns: ["Extra raita", "Extra chutney"],
  },
  {
    name: "Paneer Lababdar",
    slug: "paneer-lababdar",
    category: "indian",
    description:
      "Soft paneer in a velvety tomato and cashew gravy with fenugreek.",
    details:
      "The vegetarian answer to a special-occasion curry. Creamy, aromatic and not too hot.",
    price: 42000,
    image: IMG.paneer,
    isVeg: true,
    isFeatured: true,
    prepTime: 22,
    calories: 590,
    addOns: ["Extra raita"],
  },
  {
    name: "Mutton Pakku",
    slug: "mutton-pakku",
    category: "indian",
    description:
      "Slow-cooked mutton in a dark, warming masala with whole spices.",
    details:
      "A patient curry, cooked until the meat gives way. Ask for extra chilli if you like it fiery.",
    price: 56000,
    image: IMG.pakku,
    isSpicy: true,
    prepTime: 30,
    calories: 760,
    addOns: ["Extra raita"],
  },
  {
    name: "Butter Chicken",
    slug: "butter-chicken",
    category: "indian",
    description:
      "Charred chicken folded into a smooth tomato-butter gravy with a touch of cream.",
    details: "Comforting and mild. A reliable choice for mixed tables.",
    price: 50000,
    image: IMG.indian,
    prepTime: 24,
    calories: 700,
    addOns: ["Extra raita"],
  },
  {
    name: "Hyderabadi Chicken Biryani",
    slug: "hyderabadi-chicken-biryani",
    category: "indian",
    description:
      "Long-grain basmati layered with chicken, saffron, fried onion and warm spices.",
    details:
      "Served with raita and a little salan. Allow a few extra minutes — it is worth it.",
    price: 46000,
    image: IMG.biryani,
    isSpicy: true,
    isFeatured: true,
    prepTime: 28,
    calories: 850,
    variantSizes: true,
    addOns: ["Extra raita", "Add fried egg"],
  },
  {
    name: "Dal Makhani",
    slug: "dal-makhani",
    category: "indian",
    description:
      "Black lentils simmered overnight with butter, tomato and cream.",
    details:
      "Slow, smoky and deeply comforting. Vegetarian and best with naan or rice.",
    price: 32000,
    image: IMG.dal,
    isVeg: true,
    prepTime: 18,
    calories: 390,
  },
  {
    name: "Garlic Naan",
    slug: "garlic-naan",
    category: "indian",
    description:
      "Tandoor-baked flatbread brushed with garlic butter and coriander.",
    details: "Order one per person; they disappear quickly.",
    price: 9000,
    image: IMG.fallback,
    isVeg: true,
    prepTime: 10,
    calories: 240,
    addOns: ["Extra butter"],
  },

  // Asian — 7
  {
    name: "Chicken Malai Tikka",
    slug: "chicken-malai-tikka",
    category: "asian",
    description:
      "Creamy, mild chicken skewers from the tandoor with mint chutney.",
    details:
      "Marinated in cheese, cream and gentle spices, then charred until juicy.",
    price: 44000,
    image: IMG.malai,
    prepTime: 22,
    calories: 520,
    addOns: ["Extra chutney"],
  },
  {
    name: "Devil Chicken",
    slug: "devil-chicken",
    category: "asian",
    description:
      "Crisp chicken tossed in a sweet-hot chilli glaze with peppers and sesame.",
    details:
      "Sticky, fiery and made for sharing. A house favourite with a cold drink.",
    price: 46000,
    image: IMG.devil,
    isSpicy: true,
    isFeatured: true,
    prepTime: 20,
    calories: 610,
  },
  {
    name: "Hunan Chicken",
    slug: "hunan-chicken",
    category: "asian",
    description:
      "Wok-seared chicken with dried chilli, garlic and a savoury brown sauce.",
    details: "Bold and aromatic rather than sweet. Served with steamed rice.",
    price: 48000,
    image: IMG.hunan,
    isSpicy: true,
    prepTime: 22,
    calories: 590,
    addOns: ["Extra protein"],
  },
  {
    name: "Szechuan Noodles",
    slug: "szechuan-noodles",
    category: "asian",
    description:
      "Wok-tossed noodles with vegetables, chilli oil and toasted sesame.",
    details:
      "Choose vegetables or add chicken. Stir-fried to order for a little char.",
    price: 32000,
    image: IMG.noodles,
    isVeg: true,
    isSpicy: true,
    isFeatured: true,
    prepTime: 18,
    calories: 540,
    variantSizes: true,
    addOns: ["Extra protein", "Add fried egg"],
  },
  {
    name: "Crispy Sea Bass",
    slug: "crispy-sea-bass",
    category: "asian",
    description:
      "Crisp-skinned sea bass with a ginger-soy dressing and greens.",
    details:
      "Light, bright and finished with sesame. Availability depends on the day's fish delivery.",
    price: 78000,
    image: IMG.seaBass,
    prepTime: 26,
    calories: 410,
  },
  {
    name: "Garlic Parmesan Wings",
    slug: "garlic-parmesan-wings",
    category: "asian",
    description:
      "Crisp chicken wings tossed with garlic butter, parmesan and herbs.",
    details:
      "Our gentlest starter, and still a crowd pleaser. Served with a house dip.",
    price: 39000,
    image: IMG.wings,
    prepTime: 18,
    calories: 560,
    addOns: ["Extra chutney"],
  },
  {
    name: "Thai Green Curry",
    slug: "thai-green-curry",
    category: "asian",
    description:
      "Coconut curry with vegetables, Thai basil and fragrant jasmine rice.",
    details:
      "Fresh, herby and gently spicy. Add chicken if you would like extra protein.",
    price: 44000,
    image: IMG.asian,
    isVeg: true,
    isSpicy: true,
    prepTime: 22,
    calories: 620,
    addOns: ["Extra protein"],
  },

  // Continental — 7
  {
    name: "Margherita Pizza",
    slug: "margherita-pizza",
    category: "continental",
    description: "Tomato, mozzarella and basil on a hand-stretched base.",
    details:
      "Baked in a hot oven for a crisp edge and a soft centre. Keep it simple or add toppings.",
    price: 45000,
    image: IMG.pizza,
    isVeg: true,
    isFeatured: true,
    prepTime: 20,
    calories: 760,
    variantSizes: true,
    addOns: ["Extra cheese"],
  },
  {
    name: "Chicken Alfredo Pasta",
    slug: "chicken-alfredo-pasta",
    category: "continental",
    description:
      "Fettuccine in a parmesan cream sauce with grilled chicken and herbs.",
    details:
      "Rich and comforting, finished with cracked pepper. Available without chicken on request.",
    price: 48000,
    image: IMG.alfredo,
    prepTime: 22,
    calories: 820,
    addOns: ["Extra cheese", "Extra protein"],
  },
  {
    name: "Grilled Chicken Steak",
    slug: "grilled-chicken-steak",
    category: "continental",
    description:
      "Grilled chicken breast with sautéed vegetables, potato and pepper sauce.",
    details:
      "A generous plate for a long lunch. Ask for the sauce on the side if you prefer.",
    price: 65000,
    image: IMG.steak,
    isFeatured: true,
    prepTime: 28,
    calories: 690,
  },
  {
    name: "Mushroom Stroganoff",
    slug: "mushroom-stroganoff",
    category: "continental",
    description:
      "Mushrooms in a creamy paprika sauce with buttered rice and herbs.",
    details: "Vegetarian comfort food with a gentle smoky depth.",
    price: 44000,
    image: IMG.fallback,
    isVeg: true,
    prepTime: 22,
    calories: 610,
    addOns: ["Extra cheese"],
  },
  {
    name: "Classic Caesar Salad",
    slug: "classic-caesar-salad",
    category: "continental",
    description:
      "Cos lettuce, parmesan, croutons and a creamy Caesar dressing.",
    details:
      "Fresh and crunchy, with a soft egg and a generous grating of parmesan. Ask for chicken on top.",
    price: 35000,
    image: IMG.fallback,
    isVeg: true,
    prepTime: 12,
    calories: 340,
    addOns: ["Extra protein", "Extra cheese"],
  },
  {
    name: "Crispy Fish & Chips",
    slug: "crispy-fish-and-chips",
    category: "continental",
    description: "Golden battered fish with hand-cut fries, tartare and lemon.",
    details: "A weekend favourite. Fish selection depends on availability.",
    price: 58000,
    image: IMG.seaBass,
    isFeatured: true,
    prepTime: 24,
    calories: 880,
  },
  {
    name: "Chocolate Lava Cake",
    slug: "chocolate-lava-cake",
    category: "continental",
    description:
      "Warm chocolate cake with a molten centre and vanilla ice cream.",
    details: "Please allow ten minutes. Best eaten immediately.",
    price: 25000,
    image: IMG.fallback,
    isVeg: true,
    isFeatured: true,
    prepTime: 14,
    calories: 420,
    addOns: ["Extra ice cream"],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const isLocalSqlite = databaseUrl.startsWith("file:");
  const isLocalSupabasePostgres =
    /^postgres(ql)?:\/\/[^@\s]+@(?:127\.0\.0\.1|localhost|\[::1\]):54322\//i.test(
      databaseUrl,
    );
  const isLocalDatabase = isLocalSqlite || isLocalSupabasePostgres;
  const isProductionSeed =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    !isLocalDatabase;

  // This seed deletes every row. Refuse to run it against any database that is
  // not the local SQLite file or the loopback Supabase PostgreSQL instance.
  if (isProductionSeed) {
    throw new Error(
      "Refusing to run the destructive seed against a non-local database. " +
        "Use the local Supabase PostgreSQL URL on 127.0.0.1:54322. There is " +
        "no override for hosted or production databases.",
    );
  }

  const demoAccountsEnabled = !isProductionSeed;
  console.log(
    isLocalSupabasePostgres
      ? "Resetting local Supabase PostgreSQL database…"
      : "Resetting local database…",
  );

  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.address.deleteMany();
  await prisma.eventBooking.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notificationRead.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dishAddOn.deleteMany();
  await prisma.dishVariant.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.dish.deleteMany();
  await prisma.category.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.setting.deleteMany();

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is missing. Add it to .env before seeding.",
    );
  }
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL?.toLowerCase() ?? "admin@example.com";
  const demoPassword = await bcrypt.hash(
    demoAccountsEnabled ? "Demo@12345" : randomBytes(32).toString("base64url"),
    12,
  );
  const adminHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      name: process.env.SEED_ADMIN_NAME ?? "Purple Haze Admin",
      email: adminEmail,
      phone: process.env.SEED_ADMIN_PHONE ?? "+9779800000000",
      passwordHash: adminHash,
      emailVerified: new Date(),
      role: "ADMIN",
      isTest: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Sample Staff",
      email: "staff.demo@purplehaze.local",
      phone: "+9779800000001",
      passwordHash: demoPassword,
      emailVerified: new Date(),
      isBlocked: !demoAccountsEnabled,
      role: "STAFF",
      isTest: true,
    },
  });

  const customerSeeds = [
    ["Aarati Shrestha", "aarati.demo@example.com", "+9779800000002"],
    ["Rohan Mehta", "rohan.demo@example.com", "+9779800000003"],
    ["Sneha Rai", "sneha.demo@example.com", "+9779800000004"],
    ["Bikash Limbu", "bikash.demo@example.com", "+9779800000005"],
    ["Priya Koirala", "priya.demo@example.com", "+9779800000006"],
    ["Nabin Adhikari", "nabin.demo@example.com", "+9779800000007"],
    ["Maya Tamang", "maya.demo@example.com", "+9779800000008"],
    ["Sagar Gurung", "sagar.demo@example.com", "+9779800000009"],
  ] as const;

  const customers = [];
  for (const [name, email, phone] of customerSeeds) {
    customers.push(
      await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash: demoPassword,
          emailVerified: new Date(),
          isBlocked: !demoAccountsEnabled,
          role: "CUSTOMER",
          isTest: true,
        },
      }),
    );
  }

  const categoryRows = new Map<string, { id: string; name: string }>();
  for (const category of categories) {
    const row = await prisma.category.create({ data: category });
    categoryRows.set(category.slug, row);
  }

  const addOnSeeds = [
    ["Extra cheese", 8000],
    ["Extra chutney", 2500],
    ["Extra raita", 5000],
    ["Add fried egg", 6000],
    ["Extra protein", 15000],
    ["Extra butter", 3000],
    ["Extra ice cream", 6000],
  ] as const;
  const addOnRows = new Map<string, { id: string }>();
  for (const [name, price] of addOnSeeds) {
    const row = await prisma.addOn.create({ data: { name, price } });
    addOnRows.set(name, row);
  }

  const dishBySlug = new Map<
    string,
    { id: string; name: string; price: number }
  >();
  for (const [index, dish] of dishes.entries()) {
    const category = categoryRows.get(dish.category);
    if (!category) throw new Error(`Missing category ${dish.category}`);
    const variants = dish.variantSizes
      ? [
          {
            name: "Regular",
            priceDelta: 0,
            isDefault: true,
            sortOrder: 1,
          },
          {
            name: "Large / sharing",
            priceDelta: Math.round((dish.price * 0.55) / 1000) * 1000,
            sortOrder: 2,
          },
        ]
      : [
          {
            name: "Regular",
            priceDelta: 0,
            isDefault: true,
            sortOrder: 1,
          },
        ];

    const row = await prisma.dish.create({
      data: {
        categoryId: category.id,
        name: dish.name,
        slug: dish.slug,
        description: dish.description,
        details: dish.details,
        price: dish.price,
        comparePrice: dish.comparePrice ?? null,
        image: dish.image,
        isVeg: dish.isVeg ?? false,
        isSpicy: dish.isSpicy ?? false,
        isFeatured: dish.isFeatured ?? false,
        isAvailable: true,
        prepTime: dish.prepTime ?? 20,
        calories: dish.calories ?? null,
        sortOrder: index + 1,
        variants: { create: variants },
        addOns: {
          create: (dish.addOns ?? []).map((name) => {
            const addOn = addOnRows.get(name);
            if (!addOn) throw new Error(`Missing add-on ${name}`);
            return { addOnId: addOn.id };
          }),
        },
      },
    });
    dishBySlug.set(dish.slug, {
      id: row.id,
      name: row.name,
      price: row.price,
    });
  }

  const venueSeeds = [
    {
      name: "The Garden",
      slug: "garden",
      description:
        "An open-air garden for relaxed dinners, birthdays and evening celebrations under warm lights.",
      longDescription:
        "The garden is the heart of Purple Haze: leafy corners, string lights and space to spread out. Seating layouts and weather cover can be discussed with our events team. Capacity and package pricing are available on request.",
      image: "/images/venues/garden.jpg",
      capacity: null,
      priceFrom: null,
      features: JSON.stringify([
        "Open-air garden",
        "Evening lighting",
        "Flexible seating",
        "Birthday & family dinners",
      ]),
      sortOrder: 1,
    },
    {
      name: "The Banquet Hall",
      slug: "banquet-hall",
      description:
        "An indoor banquet space for receptions, weddings and larger family celebrations.",
      longDescription:
        "A flexible indoor hall for milestone occasions. Capacity, staging, décor and menu packages are planned with our team around your event. Photography and external suppliers can be coordinated in advance.",
      image: "/images/venues/banquet.jpg",
      capacity: null,
      priceFrom: null,
      features: JSON.stringify([
        "Indoor banquet space",
        "Reception & wedding settings",
        "Customisable layout",
        "Events team support",
      ]),
      sortOrder: 2,
    },
    {
      name: "The Meeting Room",
      slug: "meeting-room",
      description:
        "A quieter room for team meetings, small conferences and private lunches.",
      longDescription:
        "A practical meeting space for presentations, working sessions and corporate lunches. Day rates, equipment and catering can be arranged on request. Capacity and package pricing are confirmed with our team.",
      image: "/images/venues/meeting-hall.jpg",
      capacity: null,
      priceFrom: null,
      features: JSON.stringify([
        "Private meeting space",
        "Conference & seminar setup",
        "Lunch and tea service",
        "Equipment on request",
      ]),
      sortOrder: 3,
    },
  ];
  const venues = [];
  for (const venue of venueSeeds) {
    venues.push(await prisma.venue.create({ data: venue }));
  }

  const couponRows = await Promise.all([
    prisma.coupon.create({
      data: {
        code: "WELCOME10",
        description: "10% off your first online order (max Rs 200).",
        type: "PERCENT",
        value: 10,
        minOrder: 50000,
        maxDiscount: 20000,
        maxUses: 500,
        startsAt: daysAgo(30),
        expiresAt: new Date(now + 180 * 86_400_000),
      },
    }),
    prisma.coupon.create({
      data: {
        code: "GARDEN500",
        description: "Rs 500 off orders over Rs 2,500.",
        type: "FIXED",
        value: 50000,
        minOrder: 250000,
        maxUses: 100,
        startsAt: daysAgo(7),
        expiresAt: new Date(now + 60 * 86_400_000),
      },
    }),
    prisma.coupon.create({
      data: {
        code: "MOMO20",
        description: "20% off a Rs 600+ order (max Rs 300).",
        type: "PERCENT",
        value: 20,
        minOrder: 60000,
        maxDiscount: 30000,
        maxUses: 200,
        startsAt: daysAgo(2),
        expiresAt: new Date(now + 30 * 86_400_000),
      },
    }),
  ]);

  await prisma.deliveryZone.createMany({
    data: [
      {
        name: "Airport Road & nearby",
        fee: 3000,
        minOrder: 25000,
        sortOrder: 1,
      },
      {
        name: "Central Biratnagar",
        fee: 5000,
        minOrder: 30000,
        sortOrder: 2,
      },
      {
        name: "Outer Biratnagar",
        fee: 10000,
        minOrder: 50000,
        sortOrder: 3,
      },
    ],
  });

  await prisma.galleryImage.createMany({
    data: [
      {
        url: "/images/venues/garden.jpg",
        title: "The garden in the evening",
        category: "Garden",
        sortOrder: 1,
      },
      {
        url: "/images/gallery/dining.jpg",
        title: "A table set for dinner",
        category: "Dining",
        sortOrder: 2,
      },
      {
        url: "/images/gallery/interior.jpg",
        title: "Inside the restaurant",
        category: "Dining",
        sortOrder: 3,
      },
      {
        url: "/images/venues/banquet.jpg",
        title: "The banquet hall",
        category: "Venues",
        sortOrder: 4,
      },
      {
        url: "/images/venues/outdoor-party.jpg",
        title: "An evening celebration",
        category: "Events",
        sortOrder: 5,
      },
      {
        url: "/images/venues/purple-night.jpg",
        title: "Purple Haze after dark",
        category: "Garden",
        sortOrder: 6,
      },
      {
        url: "/images/venues/meeting-hall.jpg",
        title: "The meeting room",
        category: "Venues",
        sortOrder: 7,
      },
      {
        url: "/images/menu/food-presentation.jpg",
        title: "A plate from our kitchen",
        category: "Food",
        sortOrder: 8,
      },
      {
        url: "/images/menu/dilkhus-kabab.jpg",
        title: "Dilkhush kabab",
        category: "Food",
        sortOrder: 9,
      },
      {
        url: "/images/menu/nepolitana-pizza.jpg",
        title: "Nepolitana pizza",
        category: "Food",
        sortOrder: 10,
      },
      {
        url: "/images/venues/banquet-hall-setup.jpg",
        title: "Banquet tables set for a celebration",
        category: "Venues",
        sortOrder: 11,
      },
      {
        url: "/images/venues/Bighall.jpg",
        title: "The big hall",
        category: "Venues",
        sortOrder: 12,
      },
      {
        url: "/images/venues/dinning-hall.jpg",
        title: "The dining hall",
        category: "Dining",
        sortOrder: 13,
      },
      {
        url: "/images/venues/garden-lawn.jpg",
        title: "The garden lawn",
        category: "Garden",
        sortOrder: 14,
      },
      {
        url: "/images/venues/garden-sitting-area.jpg",
        title: "Garden seating",
        category: "Garden",
        sortOrder: 15,
      },
      {
        url: "/images/venues/hall-stage.jpg",
        title: "The stage in the hall",
        category: "Venues",
        sortOrder: 16,
      },
      {
        url: "/images/venues/meeting.jpg",
        title: "A meeting setup",
        category: "Venues",
        sortOrder: 17,
      },
      {
        url: "/images/venues/mini-hall.jpg",
        title: "The mini hall",
        category: "Venues",
        sortOrder: 18,
      },
      {
        url: "/images/venues/purplehaze-longshot.jpg",
        title: "Purple Haze from Airport Road",
        category: "Restaurant",
        sortOrder: 19,
      },
      {
        url: "/images/venues/images (2).jpg",
        title: "A decorated stage for a celebration",
        category: "Events",
        sortOrder: 20,
      },
    ],
  });

  await prisma.banner.create({
    data: {
      title: "Garden evenings, made for gathering",
      subtitle:
        "Join us under the lights for dinner on Airport Road. Tables and event spaces are available on request.",
      image: "/images/venues/garden.jpg",
      ctaLabel: "Reserve a table",
      ctaHref: "/reservations",
      sortOrder: 1,
      isActive: true,
    },
  });

  // Testimonials are inactive placeholders until the owner supplies approved
  // guest quotes. This keeps the public site honest before launch.
  await prisma.testimonial.createMany({
    data: [
      {
        name: "Guest review pending",
        location: "Biratnagar",
        quote:
          "Replace this placeholder with an approved guest testimonial from the admin dashboard.",
        rating: 5,
        isActive: false,
        sortOrder: 1,
      },
      {
        name: "Guest review pending",
        location: "Biratnagar",
        quote:
          "Add a short, authentic quote with the guest's permission before launch.",
        rating: 5,
        isActive: false,
        sortOrder: 2,
      },
      {
        name: "Guest review pending",
        location: "Biratnagar",
        quote:
          "Testimonials can be managed under Admin → Content → Testimonials.",
        rating: 5,
        isActive: false,
        sortOrder: 3,
      },
    ],
  });

  const settings: Array<[string, string, string]> = [
    ["restaurant.name", "Purple Haze Restro & Garden", "restaurant"],
    [
      "restaurant.tagline",
      "Good food. Golden evenings. Garden memories.",
      "restaurant",
    ],
    ["restaurant.email", "purplehaze_biratnagar@gmail.com", "restaurant"],
    ["restaurant.phone", "+977 9851150987", "restaurant"],
    ["restaurant.landline", "+977 21 464193", "restaurant"],
    [
      "restaurant.address",
      "Airport Road, Biratnagar 56613, Nepal",
      "restaurant",
    ],
    ["restaurant.hours", "9:00 AM – 10:00 PM, daily", "restaurant"],
    [
      "restaurant.facebook",
      "https://www.facebook.com/purplehaze.biratnagar",
      "restaurant",
    ],
    ["order.taxRate", "13", "ordering"],
    ["order.serviceChargeRate", "0", "ordering"],
    ["order.minDeliveryOrder", "0", "ordering"],
    ["order.acceptingOrders", "true", "ordering"],
    ["order.prepTimeMinutes", "25", "ordering"],
    ["order.cancellationWindowMinutes", "10", "ordering"],
    ["payment.codEnabled", "true", "payments"],
    ["payment.esewaEnabled", "true", "payments"],
    ["payment.khaltiEnabled", "true", "payments"],
    ["content.heroEyebrow", "Biratnagar's garden table", "content"],
    [
      "content.heroTitle",
      "Dinner under the stars. Memories made around the table.",
      "content",
    ],
    [
      "content.heroSubtitle",
      "Nepali comfort food, Indian classics, Asian favourites and continental plates — served in a leafy garden on Airport Road.",
      "content",
    ],
    ["content.aboutTitle", "A little purple, a lot of heart.", "content"],
    [
      "content.aboutBody",
      "Purple Haze Restro & Garden brings together the flavours people in Biratnagar grew up with and the occasions worth dressing up for. From quick momos to wedding receptions, our garden and banquet spaces are made for gathering.",
      "content",
    ],
    ["seo.title", "Purple Haze Restro & Garden | Biratnagar", "seo"],
    [
      "seo.description",
      "Order Nepali, Indian, Asian and continental food online from Purple Haze Restro & Garden, Airport Road, Biratnagar. Book venues and reserve your table.",
      "seo",
    ],
  ];
  await prisma.setting.createMany({
    data: settings.map(([key, value, group]) => ({ key, value, group })),
  });

  const mainCustomer = customers[0];
  const address = await prisma.address.create({
    data: {
      userId: mainCustomer.id,
      label: "Home",
      fullName: mainCustomer.name ?? "Aarati Shrestha",
      phone: mainCustomer.phone ?? "+9779800000002",
      line1: "Sample address near Airport Road",
      line2: "Ward 9 (replace with your address)",
      city: "Biratnagar",
      state: "Koshi",
      country: "Nepal",
      isDefault: true,
    },
  });

  await prisma.address.create({
    data: {
      userId: mainCustomer.id,
      label: "Office",
      fullName: mainCustomer.name ?? "Aarati Shrestha",
      phone: mainCustomer.phone ?? "+9779800000002",
      line1: "Sample office address, Main Road",
      city: "Biratnagar",
      state: "Koshi",
      country: "Nepal",
      isDefault: false,
    },
  });

  await prisma.favorite.createMany({
    data: [
      {
        userId: mainCustomer.id,
        dishId: dishBySlug.get("steamed-chicken-momo")!.id,
      },
      {
        userId: mainCustomer.id,
        dishId: dishBySlug.get("margherita-pizza")!.id,
      },
    ],
  });

  const statusNotes: Record<string, string> = {
    PENDING: "Order placed from the website.",
    CONFIRMED: "Order confirmed by the restaurant.",
    PREPARING: "The kitchen has started preparing your order.",
    READY: "Your order is ready.",
    OUT_FOR_DELIVERY: "Your order has left the restaurant.",
    COMPLETED: "Order completed. Thank you for dining with us.",
    CANCELLED: "Order cancelled by the customer.",
  };
  const flowByType: Record<string, string[]> = {
    DELIVERY: [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "COMPLETED",
    ],
    PICKUP: ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"],
    DINE_IN: ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"],
  };

  const orderSpecs = [
    {
      d: 0,
      status: "PENDING",
      type: "DELIVERY",
      items: ["steamed-chicken-momo", "garlic-naan"],
    },
    {
      d: 0,
      status: "PREPARING",
      type: "PICKUP",
      items: ["margherita-pizza", "chocolate-lava-cake"],
    },
    {
      d: 1,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["chicken-thakali-set", "mustang-aloo"],
    },
    { d: 1, status: "CANCELLED", type: "PICKUP", items: ["devil-chicken"] },
    {
      d: 2,
      status: "COMPLETED",
      type: "DINE_IN",
      items: ["butter-chicken", "hyderabadi-chicken-biryani", "garlic-naan"],
    },
    {
      d: 3,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["mutton-sekuwa", "samaya-baji"],
    },
    {
      d: 4,
      status: "COMPLETED",
      type: "PICKUP",
      items: ["thai-green-curry", "szechuan-noodles"],
    },
    {
      d: 5,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["chicken-lajawab", "paneer-lababdar", "garlic-naan"],
    },
    {
      d: 6,
      status: "COMPLETED",
      type: "DINE_IN",
      items: [
        "grilled-chicken-steak",
        "classic-caesar-salad",
        "chocolate-lava-cake",
      ],
    },
    {
      d: 7,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["margherita-pizza", "garlic-parmesan-wings"],
    },
    {
      d: 8,
      status: "COMPLETED",
      type: "PICKUP",
      items: ["hunan-chicken", "szechuan-noodles"],
    },
    {
      d: 9,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["mutton-pakku", "hyderabadi-chicken-biryani"],
    },
    {
      d: 10,
      status: "COMPLETED",
      type: "DINE_IN",
      items: ["chicken-malai-tikka", "crispy-sea-bass", "mushroom-stroganoff"],
    },
    {
      d: 11,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["steamed-chicken-momo", "chicken-choila"],
    },
    {
      d: 12,
      status: "COMPLETED",
      type: "PICKUP",
      items: ["chicken-alfredo-pasta", "chocolate-lava-cake"],
    },
    {
      d: 13,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["gundruk-bodi", "chicken-thakali-set"],
    },
    {
      d: 2,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["crispy-fish-and-chips", "margherita-pizza"],
    },
    {
      d: 4,
      status: "COMPLETED",
      type: "DINE_IN",
      items: ["paneer-lababdar", "dal-makhani", "garlic-naan"],
    },
    {
      d: 6,
      status: "COMPLETED",
      type: "PICKUP",
      items: ["chicken-malai-tikka", "thai-green-curry"],
    },
    {
      d: 9,
      status: "COMPLETED",
      type: "DELIVERY",
      items: ["butter-chicken", "garlic-naan", "chocolate-lava-cake"],
    },
  ] as const;

  const seededOrders = [];
  for (const [index, spec] of orderSpecs.entries()) {
    const customer = customers[index % customers.length];
    const orderDate = daysAgo(spec.d, 12 + (index % 9), (index * 7) % 60);
    const seedItems = spec.items.map((slug) => {
      const dish = dishBySlug.get(slug);
      if (!dish) throw new Error(`Missing dish ${slug}`);
      return {
        dish,
        quantity: slug.includes("naan") ? 2 : index % 5 === 0 ? 2 : 1,
      };
    });
    const subtotal = seedItems.reduce(
      (sum, item) => sum + item.dish.price * item.quantity,
      0,
    );
    const deliveryFee = spec.type === "DELIVERY" ? 5000 : 0;
    const taxAmount = Math.round(subtotal * 0.13);
    const total = subtotal + deliveryFee + taxAmount;
    const flow = flowByType[spec.type];
    const statusIndex = flow.indexOf(spec.status);
    const historyStatuses =
      spec.status === "CANCELLED"
        ? ["PENDING", "CONFIRMED", "CANCELLED"]
        : flow.slice(0, statusIndex + 1);
    const isPaid =
      spec.status === "COMPLETED" ||
      (spec.status !== "CANCELLED" && index % 4 === 0);

    const order = await prisma.order.create({
      data: {
        orderNumber: `PH-SEED-${String(index + 1).padStart(4, "0")}`,
        publicToken: `seed-token-${String(index + 1).padStart(4, "0")}`,
        userId: customer.id,
        customerName: customer.name ?? "Sample Guest",
        customerEmail: customer.email,
        customerPhone: customer.phone ?? "+9779800000000",
        type: spec.type,
        status: spec.status,
        paymentStatus: isPaid ? "PAID" : "UNPAID",
        paymentMethod:
          index % 3 === 0 ? "ESEWA" : index % 3 === 1 ? "KHALTI" : "COD",
        subtotal,
        deliveryFee,
        taxAmount,
        discountAmount: 0,
        total,
        addressId: spec.type === "DELIVERY" && index === 2 ? address.id : null,
        zoneId: null,
        deliveryAddress:
          spec.type === "DELIVERY"
            ? "Sample delivery address, Biratnagar (seed data)"
            : null,
        tableNumber: spec.type === "DINE_IN" ? `T${(index % 8) + 1}` : null,
        notes:
          index === 1
            ? "Please keep the pizza mild for a child."
            : index === 4
              ? "Birthday dinner — please bring the dessert last."
              : null,
        createdAt: orderDate,
        isTest: true,
        items: {
          create: seedItems.map((item) => ({
            dishId: item.dish.id,
            name: item.dish.name,
            unitPrice: item.dish.price,
            quantity: item.quantity,
            lineTotal: item.dish.price * item.quantity,
            addOns: "[]",
          })),
        },
        statusHistory: {
          create: historyStatuses.map((status, historyIndex) => ({
            status,
            note:
              status === "CANCELLED"
                ? "Cancelled by the customer before preparation."
                : statusNotes[status],
            changedBy:
              historyIndex === 0
                ? customer.email
                : status === "CANCELLED"
                  ? customer.email
                  : "Sample Staff",
            createdAt: new Date(
              orderDate.getTime() + historyIndex * 10 * 60_000,
            ),
          })),
        },
        payments: {
          create: {
            provider:
              index % 3 === 0 ? "ESEWA" : index % 3 === 1 ? "KHALTI" : "COD",
            amount: total,
            status: isPaid ? "PAID" : "PENDING",
            transactionId: isPaid ? `SEED-PAY-${index + 1}` : null,
            payload: JSON.stringify({ seed: true }),
            createdAt: orderDate,
          },
        },
      },
    });
    seededOrders.push(order);
  }

  const reviewSpecs = [
    {
      orderIndex: 2,
      rating: 5,
      title: "A lovely garden dinner",
      comment:
        "The thakali set was generous and the garden was beautiful in the evening. Sample review for layout testing.",
      approved: true,
      featured: true,
    },
    {
      orderIndex: 4,
      rating: 4,
      title: "Great flavours, relaxed evening",
      comment:
        "The butter chicken and biryani were rich and comforting. Service was warm. Sample review for layout testing.",
      approved: true,
      featured: false,
    },
    {
      orderIndex: 5,
      rating: 5,
      title: "The sekuwa is worth the trip",
      comment:
        "Smoky, tender and full of flavour. We will be back for the garden. Sample review for layout testing.",
      approved: true,
      featured: true,
    },
    {
      orderIndex: 6,
      rating: 4,
      title: "Good vegetarian choices",
      comment:
        "Nice variety and fresh flavours. Sample review awaiting moderation.",
      approved: false,
      featured: false,
    },
    {
      orderIndex: 8,
      rating: 5,
      title: "A special dinner",
      comment:
        "We came for a birthday and the team made it feel easy. Sample review awaiting moderation.",
      approved: false,
      featured: false,
    },
  ];
  for (const review of reviewSpecs) {
    const order = seededOrders[review.orderIndex];
    await prisma.review.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isApproved: review.approved,
        isFeatured: review.featured,
        createdAt: new Date(order.createdAt.getTime() + 86_400_000),
      },
    });
  }

  await prisma.reservation.createMany({
    data: [
      {
        userId: mainCustomer.id,
        name: mainCustomer.name ?? "Aarati Shrestha",
        email: mainCustomer.email,
        phone: mainCustomer.phone ?? "+9779800000002",
        date: new Date(now + 2 * 86_400_000 + 19 * 3_600_000),
        guests: 4,
        occasion: "Anniversary",
        notes: "A quiet corner in the garden would be lovely.",
        status: "CONFIRMED",
      },
      {
        name: "Rohan Mehta",
        email: "rohan.demo@example.com",
        phone: "+9779800000003",
        date: new Date(now + 3 * 86_400_000 + 20 * 3_600_000),
        guests: 6,
        occasion: "Family dinner",
        notes: "",
        status: "PENDING",
      },
      {
        name: "Sneha Rai",
        email: "sneha.demo@example.com",
        phone: "+9779800000004",
        date: new Date(now + 1 * 86_400_000 + 13 * 3_600_000),
        guests: 2,
        occasion: "Lunch",
        notes: "One vegetarian diner.",
        status: "PENDING",
      },
    ],
  });

  await prisma.eventBooking.createMany({
    data: [
      {
        userId: mainCustomer.id,
        venueId: venues[1].id,
        name: mainCustomer.name ?? "Aarati Shrestha",
        email: mainCustomer.email,
        phone: mainCustomer.phone ?? "+9779800000002",
        eventType: "Reception",
        eventDate: new Date(now + 35 * 86_400_000 + 18 * 3_600_000),
        guests: 150,
        message:
          "Sample enquiry for layout testing. Venue capacity and package to be confirmed by the events team.",
        status: "PENDING",
      },
      {
        venueId: venues[2].id,
        name: "Nabin Adhikari",
        email: "nabin.demo@example.com",
        phone: "+9779800000007",
        eventType: "Corporate meeting",
        eventDate: new Date(now + 12 * 86_400_000 + 10 * 3_600_000),
        guests: 24,
        message: "Half-day meeting with lunch. Sample enquiry.",
        status: "CONFIRMED",
        adminNotes: "Sample internal note: confirm projector availability.",
      },
    ],
  });

  await prisma.contactMessage.createMany({
    data: [
      {
        name: "Priya Koirala",
        email: "priya.demo@example.com",
        phone: "+9779800000006",
        subject: "Birthday cake policy",
        message:
          "Sample message: can we bring a birthday cake for a table of eight?",
        status: "NEW",
      },
      {
        name: "Sagar Gurung",
        email: "sagar.demo@example.com",
        phone: "+9779800000009",
        subject: "Accessibility at the garden",
        message:
          "Sample message: is the garden seating accessible for a guest using a wheelchair?",
        status: "READ",
      },
    ],
  });

  await prisma.newsletterSubscriber.createMany({
    data: [
      { email: "newsletter1@example.com" },
      { email: "newsletter2@example.com" },
      { email: "newsletter3@example.com" },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        eventKey: "seed:order:1:created",
        orderId: seededOrders[0].id,
        type: "ORDER",
        title: "New order PH-SEED-0001",
        message: "Delivery · test order waiting for acceptance.",
        link: `/admin/orders/${seededOrders[0].id}`,
        isTest: true,
      },
      {
        eventKey: "seed:review:pending",
        type: "REVIEW",
        title: "2 reviews awaiting approval",
        message: "Sample reviews are waiting for moderation.",
        link: "/admin/reviews?status=pending",
        isTest: true,
      },
      {
        eventKey: "seed:message:new",
        type: "MESSAGE",
        title: "New website message",
        message: "A sample question about birthday cakes needs a reply.",
        link: "/admin/messages",
        isTest: true,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        actorEmail: admin.email,
        action: "seed.run",
        entity: "System",
        details: JSON.stringify({ environment: "development" }),
        ip: "127.0.0.1",
      },
      {
        userId: staff.id,
        actorEmail: staff.email,
        action: "order.status.change",
        entity: "Order",
        entityId: seededOrders[2].id,
        details: JSON.stringify({ from: "PREPARING", to: "COMPLETED" }),
        ip: "127.0.0.1",
      },
    ],
  });

  console.log("");
  console.log("Seed complete.");
  console.log(`  Admin: ${admin.email}`);
  if (demoAccountsEnabled) {
    console.log(`  Staff demo: ${staff.email} / Demo@12345`);
    console.log(`  Customer demo: ${mainCustomer.email} / Demo@12345`);
  } else {
    console.log(
      "  Demo staff/customer accounts are blocked because this is not a local development seed.",
    );
  }
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Dishes: ${dishes.length}`);
  console.log(`  Venues: ${venues.length}`);
  console.log(`  Orders: ${seededOrders.length}`);
  console.log(`  Coupons: ${couponRows.length}`);
  console.log("");
  console.log(
    "Sample reviews and testimonials are clearly marked placeholders. Replace or remove them before launch.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
