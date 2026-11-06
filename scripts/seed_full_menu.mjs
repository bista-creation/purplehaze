import { PrismaClient } from '@prisma/client';

const SUPABASE_DB_URL = 'postgresql://postgres.lcexncppqesfnsdetoqv:hackme%4099supabase@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres';
const prisma = new PrismaClient({ datasources: { db: { url: SUPABASE_DB_URL } } });

const CATEGORIES = [
  { name: 'Soups', slug: 'soups', description: 'Warm, comforting and fragrant broths crafted with fresh local herbs and aromatics.', sortOrder: 1, image: null },
  { name: 'Salads', slug: 'salads', description: 'Crisp garden greens, zesty dressings and refreshing Himalayan crunch.', sortOrder: 2, image: null },
  { name: "Chef's Recommendations", slug: 'chefs-recommendations', description: "Signature slow-cooked specialties, seafood feasts and Chef's proudest creations.", sortOrder: 3, image: null },
  { name: 'From the Country Yard', slug: 'country-yard', description: 'Authentic Nepali and Newari comfort foods, Sekuwa, Khaja sets, Bara, and mountain delicacies.', sortOrder: 4, image: null },
  { name: 'All Time Favourites', slug: 'all-time-favourites', description: 'Irresistible starters, spicy woks, crispy bites, wings, and crowd-pleasing snacks.', sortOrder: 5, image: null },
  { name: 'Tandoori & Kabab', slug: 'tandoori-kabab', description: 'Skewered delights slow-charred over live charcoal embers in our traditional clay oven.', sortOrder: 6, image: null },
  { name: 'Main Entrees', slug: 'main-entrees', description: 'Sizzlers, herb-grilled meats, stroganoff, and whole fish delicacies.', sortOrder: 7, image: null },
  { name: 'Noodles & Fried Rice', slug: 'noodles-fried-rice', description: 'Wok-tossed noodles and fragrant rice with savory seasonings and your choice of protein.', sortOrder: 8, image: null },
  { name: 'Revisited Mo:Mo', slug: 'momo', description: 'Biratnagar’s favorite handmade dumplings in steam, fried, kothey, jhol, chilly, jhaneko & tandoori.', sortOrder: 9, image: null },
  { name: 'Pizzas', slug: 'pizzas', description: 'Hand-stretched dough baked golden with rich mozzarella and premium toppings.', sortOrder: 10, image: null },
  { name: 'Pasta', slug: 'pasta', description: 'Classic Italian pastas in velvety Alfredo, spicy Arrabiata, Rosatella and Carbonara sauces.', sortOrder: 11, image: null },
  { name: 'Indian Curry', slug: 'indian-curry', description: 'Rich, slow-simmered gravies, tender paneer, aromatic chicken and royal mutton curries.', sortOrder: 12, image: null },
  { name: 'Rice & Biryani', slug: 'rice-biryani', description: 'Fragrant dum biryanis, basmati pulao and aromatic cumin rice served with raita.', sortOrder: 13, image: null },
  { name: 'Naan & Roti', slug: 'naan-roti', description: 'Clay-oven baked tandoori rotis, garlic butter naans, cheese naans and stuffed kulchas.', sortOrder: 14, image: null },
  { name: 'Thakali Thali Set', slug: 'thakali-thali', description: 'Traditional Nepali feast with steamed basmati rice, Mustang aalu, daal, saag, pickles, curd & ghee.', sortOrder: 15, image: null },
  { name: 'Beverages', slug: 'beverages', description: 'Freshly brewed coffees, organic Ilam teas, chilled mocktails, smoothies and coolers.', sortOrder: 16, image: null },
];

const DISHES = [
  // 1. SOUPS
  {
    categorySlug: 'soups',
    name: 'Cream Soup',
    slug: 'cream-soup',
    description: 'A velvety, rich cream soup prepared with wild mushrooms or tender chicken bits.',
    priceNPR: 390,
    isVeg: true,
    isSpicy: false,
    variants: [
      { name: 'Mushroom (Veg)', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'soups',
    name: 'Roasted Tomato Soup',
    slug: 'roasted-tomato-soup',
    description: 'Silky, oven-roasted ripe tomatoes infused with fresh basil and garlic.',
    priceNPR: 370,
    isVeg: true,
    isSpicy: false,
  },
  {
    categorySlug: 'soups',
    name: 'Hot & Sour Soup',
    slug: 'hot-and-sour-soup',
    description: 'A spicy, tangy Asian broth loaded with assorted vegetables or tender chicken.',
    priceNPR: 390,
    isVeg: false,
    isSpicy: true,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 40, isDefault: false },
    ],
  },
  {
    categorySlug: 'soups',
    name: 'Ocean Delight Seafood Soup',
    slug: 'ocean-delight-seafood-soup',
    description: 'A rich coastal seafood broth simmered with fresh catches, herbs, and aromatics.',
    priceNPR: 550,
    isVeg: false,
    isSpicy: false,
  },
  {
    categorySlug: 'soups',
    name: 'Classic Manchow Soup',
    slug: 'classic-manchow-soup',
    description: 'A hearty Indo-Chinese dark soup spiked with ginger, garlic, and served with crispy noodles.',
    priceNPR: 350,
    isVeg: false,
    isSpicy: true,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 40, isDefault: false },
    ],
  },

  // 2. SALADS
  {
    categorySlug: 'salads',
    name: 'Greek Salad',
    slug: 'greek-salad',
    description: 'A refreshing blend of crisp lettuce, cucumber, tomatoes, olives, onions, and feta cheese, drizzled with classic olive oil dressing.',
    priceNPR: 470,
    isVeg: true,
    isSpicy: false,
  },
  {
    categorySlug: 'salads',
    name: 'Mexican Zesty Salad',
    slug: 'mexican-zesty-salad',
    description: 'A refreshing mix of fresh garden vegetables, sweet corn, and grilled chicken, tossed in a zesty Mexican dressing with a hint of spice.',
    priceNPR: 490,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'salads',
    name: 'Oriental Asian Salad',
    slug: 'oriental-asian-salad',
    description: 'A refreshing mix of crisp vegetables, cabbage, carrots, and cucumber tossed in a tangy Asian sesame-soy dressing with a hint of spice and crunch.',
    priceNPR: 390,
    isVeg: true,
    isSpicy: false,
  },
  {
    categorySlug: 'salads',
    name: 'Himalayan / Nepali Style Salad',
    slug: 'himalayan-nepali-salad',
    description: 'Fresh cucumbers, radishes, and local greens tossed with toasted mustard oil, lemon, and a touch of roasted sesame.',
    priceNPR: 290,
    isVeg: true,
    isSpicy: false,
  },

  // 3. CHEF'S RECOMMENDATIONS
  {
    categorySlug: 'chefs-recommendations',
    name: 'Himalayan Herb Chicken',
    slug: 'himalayan-herb-chicken',
    description: 'Tender chicken marinated in local mountain herbs and spices, cooked with spiced herbed garlic.',
    priceNPR: 590,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'BBQ Whole Fish',
    slug: 'bbq-whole-fish',
    description: 'Fresh whole fish marinated in house spices, grilled over wood charcoal, served with lemon butter sauce.',
    priceNPR: 890,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Slow-Cooked Lamb Shank',
    slug: 'slow-cooked-lamb-shank',
    description: 'Tender lamb shank braised for hours in a rich aromatic jus with root vegetables.',
    priceNPR: 1650,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Chicken Pesto Kebab',
    slug: 'chicken-pesto-kebab',
    description: 'Chicken supreme marinated with aromatic Indian herbs and spices infused with cream cheese tandoor grilled to perfection.',
    priceNPR: 750,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Golden Baked Stuffed Chicken Supreme',
    slug: 'golden-baked-stuffed-chicken-supreme',
    description: 'Tender grilled chicken breast stuffed with fresh herbs, baked to perfection and served with a rich, velvety cheese sauce and sautéed garden vegetables.',
    priceNPR: 890,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: "Chef's Ocean Platter",
    slug: 'chefs-ocean-platter',
    description: 'Grilled prawns, fish, calamari, and seasonal seafood served with two signature dips.',
    priceNPR: 1850,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Italian Crispy Calamari',
    slug: 'italian-crispy-calamari',
    description: 'Lightly floured squid rings, fried golden and served with garlic sauce, lemon wedges and fresh parsley.',
    priceNPR: 750,
    isVeg: false,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Dynamite Prawns',
    slug: 'dynamite-prawns',
    description: 'Crispy fried prawns tossed in a spicy, creamy dynamite sauce, served over a bed of fresh greens.',
    priceNPR: 1290,
    isVeg: false,
    isSpicy: true,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Pan-Seared Duck Breast',
    slug: 'pan-seared-duck-breast',
    description: 'Crispy skinned, tender duck breast served over a spiced plum reduction alongside buttery garlic mashed potatoes.',
    priceNPR: 950,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Lamb Bulgogi',
    slug: 'lamb-bulgogi',
    description: 'Thinly sliced lamb marinated in a savory-sweet soy, sesame, and garlic sauce, seared to perfection.',
    priceNPR: 890,
    isVeg: false,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Imperial Chicken',
    slug: 'imperial-chicken',
    description: 'Pot-roasted chicken tossed in a fiery Chinese chilli-garlic sauce, infused with aromatic spices and finished with a rich, savory glaze.',
    priceNPR: 690,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'chefs-recommendations',
    name: 'Herbs Infused Smoked Mutton Ribs',
    slug: 'herbs-infused-smoked-mutton-ribs',
    description: 'Char grilled Smoked Mutton Ribs serve with mashed potato, seasonal veg and rosemary and timmur infused reduction.',
    priceNPR: 950,
    isVeg: false,
    isFeatured: true,
  },

  // 4. FROM THE COUNTRY YARD
  {
    categorySlug: 'country-yard',
    name: 'Mutton Fila',
    slug: 'mutton-fila',
    description: 'Authentic Himalayan mutton fila served in your choice of Poleko, Sandheko or Boiled style.',
    priceNPR: 650,
    isVeg: false,
    variants: [
      { name: 'Poleko', priceDeltaNPR: 0, isDefault: true },
      { name: 'Sandheko', priceDeltaNPR: 0, isDefault: false },
      { name: 'Boiled', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'country-yard',
    name: 'Hyakula',
    slug: 'hyakula',
    description: 'Succulent mutton breast cut cooked to perfection in authentic Nepali flavours.',
    priceNPR: 750,
    isVeg: false,
    variants: [
      { name: 'Boil', priceDeltaNPR: 0, isDefault: true },
      { name: 'Poleko', priceDeltaNPR: 0, isDefault: false },
      { name: 'Daameko', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'country-yard',
    name: 'Khasiko Tauko',
    slug: 'khasiko-tauko',
    description: 'Authentic spicy mutton head preparation, available boiled or fried with traditional spices.',
    priceNPR: 650,
    isVeg: false,
    variants: [
      { name: 'Boiled', priceDeltaNPR: 0, isDefault: true },
      { name: 'Fry', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'country-yard',
    name: 'Mutton Pakku',
    slug: 'mutton-pakku',
    description: 'Slow-cooked Nepali spiced mutton braised to dark, rich, melt-in-mouth tenderness.',
    priceNPR: 750,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'country-yard',
    name: 'Mutton Bhutan',
    slug: 'mutton-bhutan',
    description: 'Pan-fried spiced mutton organ meat tossed with shallots, chillies, and mountain herbs.',
    priceNPR: 590,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'country-yard',
    name: 'Himalayan Timmur Mutton Ribs',
    slug: 'himalayan-timmur-mutton-ribs',
    description: 'Crispy roasted mutton ribs infused with mouth-tingling Himalayan timmur pepper.',
    priceNPR: 890,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'country-yard',
    name: 'Poleko Wings',
    slug: 'poleko-wings',
    description: 'Charcoal fire-roasted chicken wings with spicy mustard oil and herb rub.',
    priceNPR: 650,
    isVeg: false,
  },
  {
    categorySlug: 'country-yard',
    name: 'Taareko Machha (Pan fried Local Rahu Fish)',
    slug: 'taareko-machha',
    description: 'Crisp pan-fried local Rahu fish with turmeric, lemon, and homemade timmur chutney.',
    priceNPR: 690,
    isVeg: false,
  },
  {
    categorySlug: 'country-yard',
    name: 'Poleko Machha (Fire Grilled Whole Fish)',
    slug: 'poleko-machha',
    description: 'Whole river fish fire-grilled over charcoal embers with Nepali mountain spices.',
    priceNPR: 690,
    isVeg: false,
  },
  {
    categorySlug: 'country-yard',
    name: 'Khaja Set',
    slug: 'khaja-set',
    description: 'Authentic Nepali khaja set served with baji (beaten rice), choice of curry, bhatmas, achar, and accompaniments.',
    priceNPR: 450,
    isVeg: false,
    isFeatured: true,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 140, isDefault: false },
      { name: 'Mutton', priceDeltaNPR: 240, isDefault: false },
    ],
  },
  {
    categorySlug: 'country-yard',
    name: 'Samaya Baji (Veg)',
    slug: 'samaya-baji-veg',
    description: 'Bitten rice, Bara, Aalu Tama, Newari Achar, Black beans, and Mushroom Choila.',
    priceNPR: 490,
    isVeg: true,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'country-yard',
    name: 'Samaya Baji (Non-Veg)',
    slug: 'samaya-baji-nonveg',
    description: 'Bitten rice, Bara, Aalu Tama, Newari Achar, Black beans, Chicken Choila, fried fish, and egg.',
    priceNPR: 650,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'country-yard',
    name: 'Bara (Wow)',
    slug: 'bara-wow',
    description: 'Traditional Newari golden black lentil pancake cooked fresh on iron griddle.',
    priceNPR: 360,
    isVeg: true,
    variants: [
      { name: 'Plain', priceDeltaNPR: 0, isDefault: true },
      { name: 'Egg', priceDeltaNPR: 90, isDefault: false },
      { name: 'Keema Mutton', priceDeltaNPR: 230, isDefault: false },
    ],
  },
  {
    categorySlug: 'country-yard',
    name: 'Chatamri',
    slug: 'chatamri',
    description: 'Traditional Newari rice crepe topped with seasoned vegetables or minced chicken.',
    priceNPR: 390,
    isVeg: true,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 100, isDefault: false },
    ],
  },
  {
    categorySlug: 'country-yard',
    name: 'Mutton Sekuwa',
    slug: 'mutton-sekuwa',
    description: 'Tender boneless mutton cubes marinated with rustic Nepali spices, flame-roasted on charcoal.',
    priceNPR: 550,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'country-yard',
    name: 'Chicken Sekuwa',
    slug: 'chicken-sekuwa',
    description: 'Juicy chicken cubes marinated in mustard oil, timmur, and spices, charred to perfection.',
    priceNPR: 450,
    isVeg: false,
    isFeatured: true,
  },

  // 5. ALL TIME FAVOURITES
  {
    categorySlug: 'all-time-favourites',
    name: 'Mustang Aalu',
    slug: 'mustang-aalu',
    description: 'Iconic potato wedges tossed in garlic, Himalayan timmur pepper, and mountain herbs.',
    priceNPR: 460,
    isVeg: true,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'French Fries',
    slug: 'french-fries',
    description: 'Crisp golden potato fries served hot with signature dip.',
    priceNPR: 350,
    isVeg: true,
    variants: [
      { name: 'Plain', priceDeltaNPR: 0, isDefault: true },
      { name: 'Peri Peri', priceDeltaNPR: 25, isDefault: false },
    ],
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Honey Chilly Garlic Potato',
    slug: 'honey-chilly-garlic-potato',
    description: 'Crispy coated potato fingers glazed in sweet honey, fiery chilli, and toasted sesame.',
    priceNPR: 490,
    isVeg: true,
    isSpicy: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Cheesy Fries',
    slug: 'cheesy-fries',
    description: 'Crispy potato fries generously smothered in melted cheese blend.',
    priceNPR: 475,
    isVeg: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Chilly (Veg Starter)',
    slug: 'chilly-veg-starter',
    description: 'Wok-tossed Indo-Chinese chilli starter with bell peppers, onions, and spicy soy-chilli glaze.',
    priceNPR: 590,
    isVeg: true,
    isSpicy: true,
    variants: [
      { name: 'Paneer', priceDeltaNPR: 0, isDefault: true },
      { name: 'Mushroom', priceDeltaNPR: 0, isDefault: false },
      { name: 'Baby-corn', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Crispy Corn Salt and Pepper',
    slug: 'crispy-corn-salt-pepper',
    description: 'Golden fried sweet corn kernels tossed with crunchy spring onions, crushed pepper, and sea salt.',
    priceNPR: 570,
    isVeg: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Corn Crunchy Kabab',
    slug: 'corn-crunchy-kabab',
    description: 'Crisp spiced sweet corn patties with a molten savory center, served with mint chutney.',
    priceNPR: 650,
    isVeg: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Crispy Mushroom',
    slug: 'crispy-mushroom',
    description: 'Batter-fried fresh button mushrooms dusted with hot spice mix.',
    priceNPR: 540,
    isVeg: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Dragon Vegetables',
    slug: 'dragon-vegetables',
    description: 'Crunchy assorted garden vegetables in a fiery, sweet-and-sour Dragon glaze with toasted cashews.',
    priceNPR: 490,
    isVeg: true,
    isSpicy: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'BBQ Vegetables',
    slug: 'bbq-vegetables',
    description: 'Skewered char-grilled seasonal vegetables brushed with tangy smoky barbecue sauce.',
    priceNPR: 460,
    isVeg: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Chilly Non-Veg Wok',
    slug: 'chilly-nonveg-wok',
    description: 'Popular Indo-Chinese chilli wok with bell peppers, green chillies, garlic, and savory sauce.',
    priceNPR: 590,
    isVeg: false,
    isSpicy: true,
    variants: [
      { name: 'Chicken', priceDeltaNPR: 0, isDefault: true },
      { name: 'Fish', priceDeltaNPR: 60, isDefault: false },
      { name: 'Prawns', priceDeltaNPR: 360, isDefault: false },
    ],
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Dragon Chicken',
    slug: 'dragon-chicken',
    description: 'Thin strips of crispy fried chicken tossed with cashews, fiery red chillies, and a savory glaze.',
    priceNPR: 750,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Hunan Chicken',
    slug: 'hunan-chicken',
    description: 'Tender chicken sauteed in authentic hot Hunan chilli paste with crunchy peppers and scallions.',
    priceNPR: 690,
    isVeg: false,
    isSpicy: true,
    image: null,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Kung Pao Chicken',
    slug: 'kung-pao-chicken',
    description: 'Classic stir-fried chicken with crunchy peanuts, dry red chillies, and sweet-savory Sichuan sauce.',
    priceNPR: 650,
    isVeg: false,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Fish Fingers',
    slug: 'fish-fingers',
    description: 'Crisp golden panko-crumbed fish fillets served with homemade tartar sauce.',
    priceNPR: 675,
    isVeg: false,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Fish & Chips',
    slug: 'fish-and-chips',
    description: 'Crispy batter-fried fish served with seasoned french fries, lemon wedges, and tartar dip.',
    priceNPR: 750,
    isVeg: false,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Prawn Popcorn',
    slug: 'prawn-popcorn',
    description: 'Bite-sized crispy spiced prawns fried golden, served with spicy garlic mayo.',
    priceNPR: 950,
    isVeg: false,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Butter Garlic Prawns',
    slug: 'butter-garlic-prawns',
    description: 'Plump juicy prawns sauteed in rich golden garlic butter, white wine reduction, and fresh parsley.',
    priceNPR: 970,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Chicken Lollypop',
    slug: 'chicken-lollypop',
    description: 'Frenched chicken winglets tossed in fiery Indo-Chinese Szechuan garlic sauce.',
    priceNPR: 590,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Crispy Himalayan Timmur Wings',
    slug: 'crispy-himalayan-timmur-wings',
    description: 'Crunchy double-fried chicken wings coated with zesty Himalayan timmur and citrus glaze.',
    priceNPR: 690,
    isVeg: false,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Garlic Parmesan Wings',
    slug: 'garlic-parmesan-wings',
    description: 'Golden crispy wings tossed in savory garlic butter and finished with aged parmesan.',
    priceNPR: 750,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'Tama Chicken',
    slug: 'tama-chicken',
    description: 'Traditional Nepali chicken curry cooked with fermented bamboo shoot (tama) and black-eyed beans.',
    priceNPR: 780,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'all-time-favourites',
    name: 'BBQ Meat Platter',
    slug: 'bbq-meat-platter',
    description: 'Charcoal-grilled meats glazed with rich smoky house BBQ sauce.',
    priceNPR: 690,
    isVeg: false,
    variants: [
      { name: 'Chicken', priceDeltaNPR: 0, isDefault: true },
      { name: 'Mutton', priceDeltaNPR: 200, isDefault: false },
    ],
  },

  // 6. TANDOORI & KABAB
  {
    categorySlug: 'tandoori-kabab',
    name: 'Tandoori Chicken',
    slug: 'tandoori-chicken',
    description: 'Bone-in chicken steeped in traditional yogurt marinade and aromatic ground spices, slow-roasted over flaming charcoal.',
    priceNPR: 850,
    isVeg: false,
    isFeatured: true,
    image: null,
    variants: [
      { name: 'Half (4 pcs)', priceDeltaNPR: 0, isDefault: true },
      { name: 'Full (8 pcs)', priceDeltaNPR: 750, isDefault: false },
    ],
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Chicken Tikka',
    slug: 'chicken-tikka',
    description: 'Succulent chicken morsels infused with spiced yogurt, mustard oil, and Kashmiri chilli, tandoor-charred for a smoky depth.',
    priceNPR: 790,
    isVeg: false,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Chicken Malai Tikka',
    slug: 'chicken-malai-tikka',
    description: 'Tender chicken bites marinated in a silky mix of rich cream, fresh cheese, and aromatic cardamoms, gently grilled.',
    priceNPR: 850,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Fish Tikka',
    slug: 'fish-tikka',
    description: 'Delicate river fish fillets seasoned with carom seeds, ginger, and herbs, expertly roasted over clay tandoor embers.',
    priceNPR: 825,
    isVeg: false,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Chicken Banjara Kebab',
    slug: 'chicken-banjara-kebab',
    description: 'Fiery, herb-crusted chicken cubes marinated with fresh cilantro, mint, and rustic spices, grilled to juicy perfection.',
    priceNPR: 850,
    isVeg: false,
    isSpicy: true,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Chicken Seekh Kebab',
    slug: 'chicken-seekh-kebab',
    description: 'Finely minced chicken seasoned with garden herbs and freshly ground spices, skewer-roasted over open charcoal coals.',
    priceNPR: 750,
    isVeg: false,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Mutton Seekh Kebab',
    slug: 'mutton-seekh-kebab',
    description: 'Rich, spiced minced lamb pressed onto skewers and charred to tender, flavorful perfection with traditional aromatic herbs.',
    priceNPR: 870,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Cocktail Kebab',
    slug: 'cocktail-kebab',
    description: 'Succulent mutton seekh wrapped in juicy marinated chicken, tandoor-grilled to perfection.',
    priceNPR: 890,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Chicken Seekh-e-Khaas',
    slug: 'chicken-seekh-e-khaas',
    description: 'Juicy chicken seekh kebab wrapped in delicately marinated chicken breast slices, chargrilled to perfection in a traditional clay tandoor.',
    priceNPR: 830,
    isVeg: false,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Stuffed Tangri-e-Khaas',
    slug: 'stuffed-tangri-e-khaas',
    description: 'Plump chicken drumsticks stuffed with spiced minced meat and cottage cheese, marinated in royal spices and tandoor-roasted.',
    priceNPR: 890,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Paneer Tikka',
    slug: 'paneer-tikka',
    description: 'Thick cubes of fresh cottage cheese, bell peppers, and onions tossed in a tangy spiced yogurt marinade and cooked in Tandoori oven.',
    priceNPR: 650,
    isVeg: true,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Makhamali Malai Paneer Tikka',
    slug: 'makhamali-malai-paneer-tikka',
    description: 'Thick cubes of stuffed fresh cottage cheese, bell peppers, and onions tossed in a tangy spiced yogurt marinade and cooked in Tandoori oven.',
    priceNPR: 650,
    isVeg: true,
  },
  {
    categorySlug: 'tandoori-kabab',
    name: 'Chicken Wings Tandoori',
    slug: 'chicken-wings-tandoori',
    description: 'Crispy chicken wings bathed in a robust, smoky tandoori marinade and flame-grilled in the clay oven.',
    priceNPR: 690,
    isVeg: false,
  },

  // 7. MAIN ENTREES
  {
    categorySlug: 'main-entrees',
    name: 'Sweet & Sour Fish',
    slug: 'sweet-and-sour-fish',
    description: 'Crispy fish fillets tossed in a vibrant sweet and tangy sauce, served alongside steamed rice and steamed wok greens.',
    priceNPR: 750,
    isVeg: false,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Grilled Chicken Breast with Lemon Butter Sauce',
    slug: 'grilled-chicken-lemon-butter',
    description: 'Herb-marinated chicken breast grilled to perfection, drizzled with zesty lemon butter sauce, accompanied by buttered mashed potatoes and grilled assorted vegetables.',
    priceNPR: 890,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Grilled Fish Fillet with Capers Sauce',
    slug: 'grilled-fish-capers-sauce',
    description: 'Tender fish fillet pan-seared and finished with a creamy, savory caper sauce, served with garlic herb rice and sautéed seasonal vegetables.',
    priceNPR: 895,
    isVeg: false,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Roasted Chicken Leg With Mushroom Sauce',
    slug: 'roasted-chicken-leg-mushroom-sauce',
    description: 'Succulent roasted chicken leg smothered in a rich, earthy fresh mushroom gravy, served with creamy carrot puree and roasted potato & veggies.',
    priceNPR: 850,
    isVeg: false,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Sizzler',
    slug: 'sizzler',
    description: 'A piping hot platter of grilled marinated chicken or garden fresh vegetables cutlets in a savory mushroom sauce, served with veggies and buttered noodles.',
    priceNPR: 590,
    isVeg: false,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 160, isDefault: false },
    ],
  },
  {
    categorySlug: 'main-entrees',
    name: 'Chicken Stroganoff',
    slug: 'chicken-stroganoff',
    description: 'Tender strips of chicken and mushrooms simmered in white wine sauce with a hint of spices and served with boiled pasta and veggies.',
    priceNPR: 760,
    isVeg: false,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Chicken Parmesan',
    slug: 'chicken-parmesan',
    description: 'Crispy breaded chicken breast topped with rich marinara sauce and melted mozzarella, served alongside garlic butter spaghetti & roasted carrot.',
    priceNPR: 790,
    isVeg: false,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Steamed Whole Fish in Soy Sauce',
    slug: 'steamed-whole-fish-soy-sauce',
    description: 'Fresh whole fish delicately steamed to perfection, finished with hot sesame oil and a savoury soy sauce dressing. A light, fragrant and authentic Chinese delicacy.',
    priceNPR: 825,
    isVeg: false,
  },
  {
    categorySlug: 'main-entrees',
    name: 'Whole Fish in Szechuan Sauce',
    slug: 'whole-fish-szechuan-sauce',
    description: 'Fresh whole fish cooked to perfection and coated in a bold, spicy Szechuan sauce with garlic, ginger, chilli and spring onions. A delicious balance of fiery heat, savoury flavours and aromatic spices.',
    priceNPR: 890,
    isVeg: false,
    isSpicy: true,
  },

  // 8. NOODLES & FRIED RICE
  {
    categorySlug: 'noodles-fried-rice',
    name: 'Wok Noodles',
    slug: 'wok-noodles',
    description: 'Wok-tossed noodles with shredded vegetables and choice of signature seasoning. Add chicken, mutton, or prawns for extra goodness.',
    priceNPR: 350,
    isVeg: true,
    image: null,
    variants: [
      { name: 'Hakka Noodles', priceDeltaNPR: 0, isDefault: true },
      { name: 'Hong Kong Noodles', priceDeltaNPR: 0, isDefault: false },
      { name: 'Mongolian Noodles', priceDeltaNPR: 0, isDefault: false },
      { name: 'Szechuan Noodles', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'noodles-fried-rice',
    name: 'Wok Fried Rice',
    slug: 'wok-fried-rice',
    description: 'Fragrant wok-fried long grain rice with garden vegetables and aromatic seasonings. Add chicken, mutton, or prawns for extra goodness.',
    priceNPR: 390,
    isVeg: true,
    variants: [
      { name: 'Regular Fried Rice', priceDeltaNPR: 0, isDefault: true },
      { name: 'Hong Kong Fried Rice', priceDeltaNPR: 0, isDefault: false },
      { name: 'Szechuan Fried Rice', priceDeltaNPR: 0, isDefault: false },
    ],
  },

  // 9. REVISITED MO:MO
  {
    categorySlug: 'momo',
    name: 'Vegetarian Mo:Mo',
    slug: 'vegetarian-momo',
    description: 'Handmade Nepali dumplings filled with finely chopped cabbage, carrots, paneer, and mountain spices.',
    priceNPR: 270,
    isVeg: true,
    isFeatured: true,
    image: null,
    variants: [
      { name: 'Steam', priceDeltaNPR: 0, isDefault: true },
      { name: 'Fried', priceDeltaNPR: 10, isDefault: false },
      { name: 'Kothey', priceDeltaNPR: 20, isDefault: false },
      { name: 'Jhol', priceDeltaNPR: 70, isDefault: false },
      { name: 'Chilly', priceDeltaNPR: 110, isDefault: false },
      { name: 'Jhaneko', priceDeltaNPR: 180, isDefault: false },
      { name: 'Tandoori', priceDeltaNPR: 125, isDefault: false },
    ],
  },
  {
    categorySlug: 'momo',
    name: 'Chicken Mo:Mo',
    slug: 'chicken-momo',
    description: 'Juicy minced chicken and onion dumplings wrapped in delicate dough and seasoned with aromatic spices.',
    priceNPR: 330,
    isVeg: false,
    isFeatured: true,
    image: null,
    variants: [
      { name: 'Steam', priceDeltaNPR: 0, isDefault: true },
      { name: 'Fried', priceDeltaNPR: 10, isDefault: false },
      { name: 'Kothey', priceDeltaNPR: 20, isDefault: false },
      { name: 'Jhol', priceDeltaNPR: 60, isDefault: false },
      { name: 'Chilly', priceDeltaNPR: 110, isDefault: false },
      { name: 'Jhaneko', priceDeltaNPR: 160, isDefault: false },
      { name: 'Tandoori', priceDeltaNPR: 100, isDefault: false },
    ],
  },

  // 10. PIZZAS
  {
    categorySlug: 'pizzas',
    name: 'Margherita Pizza',
    slug: 'margherita-pizza',
    description: 'Tomato sauce, mozzarella cheese, olive oil.',
    priceNPR: 490,
    isVeg: true,
    image: null,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 100, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Mexican Pizza',
    slug: 'mexican-pizza',
    description: 'Tomato sauce, mozzarella, sweetcorn, capsicum, jalapeno, red onion, cilantro, black olive.',
    priceNPR: 590,
    isVeg: true,
    isSpicy: true,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 150, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Fungi Pizza',
    slug: 'fungi-pizza',
    description: 'Garlic sauce, tomato sauce, mozzarella, red onion, fresh mushroom, oregano.',
    priceNPR: 570,
    isVeg: true,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 155, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Farm House Pizza',
    slug: 'farm-house-pizza',
    description: 'Tomato sauce, mozzarella, assorted veggies, black olive, bell peppers, red onion, oregano, chilly flakes.',
    priceNPR: 570,
    isVeg: true,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 155, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'BBQ Hawaiian Pizza',
    slug: 'bbq-hawaiian-pizza',
    description: 'BBQ sauce, mozzarella, roasted chicken, pineapple, red onion.',
    priceNPR: 670,
    isVeg: false,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 150, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Al Pollo Pizza',
    slug: 'al-pollo-pizza',
    description: 'Tomato sauce, mozzarella, jalapeno, red onion, roasted chicken.',
    priceNPR: 650,
    isVeg: false,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 140, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Pizza Tuna',
    slug: 'pizza-tuna',
    description: 'Tomato sauce, mozzarella, tuna fish, black olives, red onion.',
    priceNPR: 650,
    isVeg: false,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 140, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Chicken Tandoori Pizza',
    slug: 'chicken-tandoori-pizza',
    description: 'Tomato sauce, mozzarella, tandoori chicken, capsicum, onion & fresh tomato.',
    priceNPR: 690,
    isVeg: false,
    isFeatured: true,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 150, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Chicken Pepperoni Pizza',
    slug: 'chicken-pepperoni-pizza',
    description: 'Tomato sauce, mozzarella, chicken pepperoni.',
    priceNPR: 750,
    isVeg: false,
    isFeatured: true,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 190, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Chicken Salami Pizza',
    slug: 'chicken-salami-pizza',
    description: 'Savory chicken salami layered with melted mozzarella, fresh bell peppers, onions and black olives on a classic pizza base.',
    priceNPR: 690,
    isVeg: false,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 150, isDefault: false },
    ],
  },
  {
    categorySlug: 'pizzas',
    name: 'Meatlover Pizza',
    slug: 'meatlover-pizza',
    description: 'A hearty feast of smoked chicken, salami, pepperoni, minced lamb, loaded with melted mozzarella.',
    priceNPR: 840,
    isVeg: false,
    isFeatured: true,
    variants: [
      { name: 'Medium', priceDeltaNPR: 0, isDefault: true },
      { name: 'Large', priceDeltaNPR: 150, isDefault: false },
    ],
  },

  // 11. PASTA
  {
    categorySlug: 'pasta',
    name: 'Penne Alfredo',
    slug: 'penne-alfredo',
    description: 'Butter, cream, assorted veg, mushroom or chicken & parmesan.',
    priceNPR: 490,
    isVeg: true,
    image: null,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 100, isDefault: false },
    ],
  },
  {
    categorySlug: 'pasta',
    name: 'Penne Arrabiata',
    slug: 'penne-arrabiata',
    description: 'Assorted veg, mushroom or chicken in spicy tomato sauce.',
    priceNPR: 430,
    isVeg: true,
    isSpicy: true,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 100, isDefault: false },
    ],
  },
  {
    categorySlug: 'pasta',
    name: 'Rosatella Pasta',
    slug: 'rosatella-pasta',
    description: 'Bechamel sauce, Napoletana sauce, Assorted veg mushroom or chicken pepper flakes.',
    priceNPR: 525,
    isVeg: true,
    variants: [
      { name: 'Vegetarian', priceDeltaNPR: 0, isDefault: true },
      { name: 'Chicken', priceDeltaNPR: 100, isDefault: false },
    ],
  },
  {
    categorySlug: 'pasta',
    name: 'Chicken Carbonara',
    slug: 'chicken-carbonara',
    description: 'Chicken pepperoni or Bacon, egg, parmesan & crushed pepper.',
    priceNPR: 650,
    isVeg: false,
  },

  // 12. INDIAN CURRY
  {
    categorySlug: 'indian-curry',
    name: 'Mix Veg Curry',
    slug: 'mix-veg-curry',
    description: 'Seasonal garden vegetables simmered in mild spiced onion-tomato gravy.',
    priceNPR: 425,
    isVeg: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Matar Paneer',
    slug: 'matar-paneer',
    description: 'Fresh paneer cubes and green peas in spiced home-style curry.',
    priceNPR: 495,
    isVeg: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Paneer Butter Masala',
    slug: 'paneer-butter-masala',
    description: 'Paneer cubes in silky, buttery tomato-cashew gravy with dried fenugreek.',
    priceNPR: 595,
    isVeg: true,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Paneer Tikka Masala',
    slug: 'paneer-tikka-masala',
    description: 'Tandoor-charred paneer cubes in rich spiced masala gravy.',
    priceNPR: 650,
    isVeg: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Shahi Paneer',
    slug: 'shahi-paneer',
    description: 'Royal preparation of cottage cheese in fragrant almond-cashew creamy gravy.',
    priceNPR: 695,
    isVeg: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Kadhai Paneer / Mushroom',
    slug: 'kadhai-paneer-mushroom',
    description: 'Fresh paneer or button mushrooms cooked with crushed coriander seeds, bell peppers, and kadhai spices.',
    priceNPR: 595,
    isVeg: true,
    variants: [
      { name: 'Paneer', priceDeltaNPR: 0, isDefault: true },
      { name: 'Mushroom', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'indian-curry',
    name: 'Mushroom Makai Masala',
    slug: 'mushroom-makai-masala',
    description: 'Fresh mushrooms and sweet corn simmered in rich spiced gravy.',
    priceNPR: 625,
    isVeg: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Daal Fried / Tadka',
    slug: 'daal-fried-tadka',
    description: 'Yellow lentils cooked with aromatic cumin, garlic, and desi ghee tadka.',
    priceNPR: 390,
    isVeg: true,
    variants: [
      { name: 'Fried', priceDeltaNPR: 0, isDefault: true },
      { name: 'Tadka', priceDeltaNPR: 0, isDefault: false },
    ],
  },
  {
    categorySlug: 'indian-curry',
    name: 'Daal Makhani',
    slug: 'daal-makhani',
    description: 'Black lentils slow-cooked overnight with cream, butter, and mild spices.',
    priceNPR: 450,
    isVeg: true,
    isFeatured: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Paneer Reshmi Masala',
    slug: 'paneer-reshmi-masala',
    description: 'Silky paneer cooked in velvety, mildly spiced royal reshmi gravy.',
    priceNPR: 695,
    isVeg: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Chicken Curry',
    slug: 'chicken-curry',
    description: 'Classic homestyle chicken curry cooked with onions, ginger, and aromatic spices.',
    priceNPR: 550,
    isVeg: false,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Kadhai Special (Chicken / Mutton)',
    slug: 'kadhai-special',
    description: 'Tender meat pieces wok-cooked with bell peppers, onions, and freshly roasted coriander spices.',
    priceNPR: 575,
    isVeg: false,
    variants: [
      { name: 'Chicken', priceDeltaNPR: 0, isDefault: true },
      { name: 'Mutton', priceDeltaNPR: 175, isDefault: false },
    ],
  },
  {
    categorySlug: 'indian-curry',
    name: 'Chicken Butter Masala',
    slug: 'chicken-butter-masala',
    description: 'Charcoal-tandoor chicken pieces cooked in velvety butter and rich tomato-cashew gravy.',
    priceNPR: 695,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Chicken Tikka Masala',
    slug: 'chicken-tikka-masala',
    description: 'Smoky tandoori chicken tikka simmered in zesty, spiced onion-tomato gravy.',
    priceNPR: 750,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Rara Curry (Chicken / Mutton)',
    slug: 'rara-curry',
    description: 'Delicious Himalayan specialty cooked with tender meat pieces and minced meat in a thick gravy.',
    priceNPR: 740,
    isVeg: false,
    variants: [
      { name: 'Chicken', priceDeltaNPR: 0, isDefault: true },
      { name: 'Mutton', priceDeltaNPR: 110, isDefault: false },
    ],
  },
  {
    categorySlug: 'indian-curry',
    name: 'Keema Curry (Chicken / Mutton)',
    slug: 'keema-curry',
    description: 'Slow-simmered spiced minced meat with peas and warming spices.',
    priceNPR: 650,
    isVeg: false,
    variants: [
      { name: 'Chicken', priceDeltaNPR: 0, isDefault: true },
      { name: 'Mutton', priceDeltaNPR: 100, isDefault: false },
    ],
  },
  {
    categorySlug: 'indian-curry',
    name: 'Mutton Curry',
    slug: 'mutton-curry',
    description: 'Tender bone-in mutton pieces slow-cooked in rich aromatic Nepali spiced gravy.',
    priceNPR: 690,
    isVeg: false,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Mutton Roghan Josh',
    slug: 'mutton-roghan-josh',
    description: 'Authentic Kashmiri style slow-braised mutton with aromatic spices and Kashmiri chilli.',
    priceNPR: 840,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'indian-curry',
    name: 'Chicken Dhaniya Adhraki',
    slug: 'chicken-dhaniya-adhraki',
    description: 'Chicken curry prepared with freshly crushed ginger, green coriander, and rustic whole spices.',
    priceNPR: 590,
    isVeg: false,
  },

  // 13. RICE & BIRYANI
  {
    categorySlug: 'rice-biryani',
    name: 'Plain Rice',
    slug: 'plain-rice',
    description: 'Steamed fragrant long grain basmati rice.',
    priceNPR: 270,
    isVeg: true,
  },
  {
    categorySlug: 'rice-biryani',
    name: 'Jeera Rice',
    slug: 'jeera-rice',
    description: 'Basmati rice tempered with golden cumin seeds and desi ghee.',
    priceNPR: 330,
    isVeg: true,
  },
  {
    categorySlug: 'rice-biryani',
    name: 'Veg Pulao',
    slug: 'veg-pulao',
    description: 'Fragrant basmati rice gently cooked with garden vegetables and whole spices.',
    priceNPR: 395,
    isVeg: true,
  },
  {
    categorySlug: 'rice-biryani',
    name: 'Veg Biryani',
    slug: 'veg-biryani',
    description: 'Dum-cooked layered basmati rice with spiced seasonal vegetables and saffron, served with raita.',
    priceNPR: 495,
    isVeg: true,
  },
  {
    categorySlug: 'rice-biryani',
    name: 'Chicken Biryani',
    slug: 'chicken-biryani',
    description: 'Aromatic dum biryani with marinated bone-in chicken, fragrant spices, and caramelized onions, served with raita.',
    priceNPR: 650,
    isVeg: false,
    isFeatured: true,
    image: null,
  },
  {
    categorySlug: 'rice-biryani',
    name: 'Mutton Biryani',
    slug: 'mutton-biryani',
    description: 'Royal slow-cooked dum biryani with tender mutton cuts, aromatic basmati rice, saffron, and raita.',
    priceNPR: 770,
    isVeg: false,
    isFeatured: true,
    image: null,
  },

  // 14. NAAN & ROTI
  {
    categorySlug: 'naan-roti',
    name: 'Tandoori Roti',
    slug: 'tandoori-roti',
    description: 'Whole wheat flatbread baked fresh in clay tandoor.',
    priceNPR: 95,
    isVeg: true,
    variants: [
      { name: 'Plain', priceDeltaNPR: 0, isDefault: true },
      { name: 'Butter', priceDeltaNPR: 25, isDefault: false },
    ],
  },
  {
    categorySlug: 'naan-roti',
    name: 'Naan',
    slug: 'naan',
    description: 'Traditional soft leavened clay-oven flatbread.',
    priceNPR: 190,
    isVeg: true,
    variants: [
      { name: 'Plain', priceDeltaNPR: 0, isDefault: true },
      { name: 'Butter', priceDeltaNPR: 40, isDefault: false },
    ],
  },
  {
    categorySlug: 'naan-roti',
    name: 'Garlic Naan',
    slug: 'garlic-naan',
    description: 'Tandoori naan topped with minced roasted garlic, butter, and coriander.',
    priceNPR: 260,
    isVeg: true,
    isFeatured: true,
  },
  {
    categorySlug: 'naan-roti',
    name: 'Cheese Naan',
    slug: 'cheese-naan',
    description: 'Tandoori naan stuffed with molten melted cheese blend.',
    priceNPR: 350,
    isVeg: true,
  },
  {
    categorySlug: 'naan-roti',
    name: 'Chicken Keema Naan',
    slug: 'chicken-keema-naan',
    description: 'Tandoori naan stuffed with spiced minced chicken.',
    priceNPR: 375,
    isVeg: false,
  },
  {
    categorySlug: 'naan-roti',
    name: 'Masala Kulcha',
    slug: 'masala-kulcha',
    description: 'Crispy leavened bread stuffed with spiced potatoes, onions, and herbs.',
    priceNPR: 275,
    isVeg: true,
  },
  {
    categorySlug: 'naan-roti',
    name: 'Paneer Kulcha',
    slug: 'paneer-kulcha',
    description: 'Tandoori kulcha stuffed with seasoned fresh cottage cheese.',
    priceNPR: 310,
    isVeg: true,
  },
  {
    categorySlug: 'naan-roti',
    name: 'Aalu Paratha',
    slug: 'aalu-paratha',
    description: 'Whole wheat griddle bread stuffed with spiced mashed potato filling.',
    priceNPR: 195,
    isVeg: true,
  },
  {
    categorySlug: 'naan-roti',
    name: 'Lachha Paratha',
    slug: 'lachha-paratha',
    description: 'Multi-layered flaky whole wheat paratha baked in clay tandoor with desi ghee.',
    priceNPR: 120,
    isVeg: true,
  },

  // 15. THAKALI THALI SET
  {
    categorySlug: 'thakali-thali',
    name: 'Veg Thali',
    slug: 'veg-thali',
    description: 'Steamed basmati rice, yellow daal, seasonal vegetables, saag, Mustang Aalu, traditional salad, local pickles, fresh curd & pure desi ghee.',
    priceNPR: 425,
    isVeg: true,
    isFeatured: true,
  },
  {
    categorySlug: 'thakali-thali',
    name: 'Chicken Thali',
    slug: 'chicken-thali',
    description: 'Steamed basmati rice, homestyle chicken curry, seasonal vegetables, yellow daal, saag, Mustang Aalu, salad, pickles, curd & desi ghee.',
    priceNPR: 590,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'thakali-thali',
    name: 'Mutton Thali',
    slug: 'mutton-thali',
    description: 'Steamed basmati rice, tender mutton curry, seasonal vegetables, daal, saag, Mustang Aalu, salad, pickles, curd & pure desi ghee.',
    priceNPR: 690,
    isVeg: false,
    isFeatured: true,
  },
  {
    categorySlug: 'thakali-thali',
    name: 'Fish Thali',
    slug: 'fish-thali',
    description: 'Steamed basmati rice, local Rahu fish curry, seasonal vegetables, daal, saag, Mustang Aalu, salad, pickles, curd & pure desi ghee.',
    priceNPR: 590,
    isVeg: false,
    isFeatured: true,
  },
];

async function seed() {
  console.log('--- Starting Complete Purple Haze Menu Entry ---');

  // 1. Upsert Categories
  const categoryMap = new Map();
  for (const cat of CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { slug: cat.slug } });
    if (existing) {
      const updated = await prisma.category.update({
        where: { id: existing.id },
        data: {
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          isActive: true,
          image: cat.image || existing.image,
        },
      });
      categoryMap.set(cat.slug, updated.id);
      console.log(`[Category Updated] ${cat.name}`);
    } else {
      const created = await prisma.category.create({
        data: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          sortOrder: cat.sortOrder,
          isActive: true,
          image: cat.image,
        },
      });
      categoryMap.set(cat.slug, created.id);
      console.log(`[Category Created] ${cat.name}`);
    }
  }

  // 2. Add-ons: Chicken (+150), Mutton (+250), Prawns (+350)
  const addOnData = [
    { name: 'Chicken', price: 15000 },
    { name: 'Mutton', price: 25000 },
    { name: 'Prawns', price: 35000 },
  ];
  const addOnIds = [];
  for (const ao of addOnData) {
    const existing = await prisma.addOn.findFirst({ where: { name: { equals: ao.name, mode: 'insensitive' } } });
    if (existing) {
      const updated = await prisma.addOn.update({
        where: { id: existing.id },
        data: { price: ao.price, isActive: true },
      });
      addOnIds.push(updated.id);
    } else {
      const created = await prisma.addOn.create({
        data: { name: ao.name, price: ao.price, isActive: true },
      });
      addOnIds.push(created.id);
    }
  }

  // 3. Upsert Dishes and Variants
  let createdCount = 0;
  let updatedCount = 0;
  let variantCount = 0;

  for (let i = 0; i < DISHES.length; i++) {
    const d = DISHES[i];
    const categoryId = categoryMap.get(d.categorySlug);
    if (!categoryId) {
      console.error(`Category not found for slug: ${d.categorySlug}`);
      continue;
    }

    const pricePaisa = d.priceNPR * 100;
    const existing = await prisma.dish.findUnique({ where: { slug: d.slug } });

    let dishId;
    if (existing) {
      const updated = await prisma.dish.update({
        where: { id: existing.id },
        data: {
          name: d.name,
          categoryId,
          description: d.description,
          price: pricePaisa,
          isVeg: d.isVeg,
          isSpicy: d.isSpicy || false,
          isFeatured: d.isFeatured || false,
          isAvailable: true,
          sortOrder: i + 1,
          image: d.image || existing.image,
        },
      });
      dishId = updated.id;
      updatedCount++;
    } else {
      const created = await prisma.dish.create({
        data: {
          name: d.name,
          slug: d.slug,
          categoryId,
          description: d.description,
          price: pricePaisa,
          isVeg: d.isVeg,
          isSpicy: d.isSpicy || false,
          isFeatured: d.isFeatured || false,
          isAvailable: true,
          sortOrder: i + 1,
          image: d.image || null,
        },
      });
      dishId = created.id;
      createdCount++;
    }

    // Variants
    if (d.variants && d.variants.length > 0) {
      // Clean existing variants for fresh synchronization
      await prisma.dishVariant.deleteMany({ where: { dishId } });
      for (let vIdx = 0; vIdx < d.variants.length; vIdx++) {
        const v = d.variants[vIdx];
        await prisma.dishVariant.create({
          data: {
            dishId,
            name: v.name,
            priceDelta: v.priceDeltaNPR * 100,
            isDefault: Boolean(v.isDefault),
            isAvailable: true,
            sortOrder: vIdx + 1,
          },
        });
        variantCount++;
      }
    }

    // Link add-ons for noodles and fried rice
    if (d.categorySlug === 'noodles-fried-rice') {
      for (const aoId of addOnIds) {
        await prisma.dishAddOn.upsert({
          where: { dishId_addOnId: { dishId, addOnId: aoId } },
          create: { dishId, addOnId: aoId },
          update: {},
        });
      }
    }
  }

  const totalDishes = await prisma.dish.count();
  const totalCategories = await prisma.category.count();
  const totalVariants = await prisma.dishVariant.count();

  console.log('--- Menu Seed Complete ---');
  console.log(`Dishes Created: ${createdCount}, Updated: ${updatedCount}`);
  console.log(`Variants Synced: ${variantCount}`);
  console.log(`Total in Supabase Database: ${totalCategories} Categories, ${totalDishes} Dishes, ${totalVariants} Variants`);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
