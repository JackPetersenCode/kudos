// Category-based placeholder images served from Cloudflare R2
const R2_BASE = "https://pub-e3a9c8c4ae654841ba1d956cb83dc898.r2.dev/placeholders";

const CATEGORY_IMAGES: Record<string, string> = {
  // Food & Drink
  "restaurant": `${R2_BASE}/restaurant.jpg`,
  "coffee-shop": `${R2_BASE}/coffee-shop.jpg`,
  "bakery": `${R2_BASE}/bakery.jpg`,
  "bar": `${R2_BASE}/bar.jpg`,
  "brewery": `${R2_BASE}/brewery.jpg`,
  "wine-bar": `${R2_BASE}/wine-bar.jpg`,
  "dessert-shop": `${R2_BASE}/dessert-shop.jpg`,
  "ice-cream-shop": `${R2_BASE}/ice-cream-shop.jpg`,
  "deli": `${R2_BASE}/deli.jpg`,
  "pizza": `${R2_BASE}/pizza.jpg`,
  "seafood": `${R2_BASE}/seafood.jpg`,
  "steakhouse": `${R2_BASE}/steakhouse.jpg`,
  "sushi": `${R2_BASE}/sushi.jpg`,
  "mexican": `${R2_BASE}/mexican.jpg`,
  "italian": `${R2_BASE}/italian.jpg`,
  "bbq": `${R2_BASE}/bbq.jpg`,

  // Shopping
  "clothing-store": `${R2_BASE}/clothing-store.jpg`,
  "bookstore": `${R2_BASE}/bookstore.jpg`,
  "gift-shop": `${R2_BASE}/gift-shop.jpg`,
  "jewelry-store": `${R2_BASE}/jewelry-store.jpg`,
  "florist": `${R2_BASE}/florist.jpg`,
  "furniture-store": `${R2_BASE}/furniture-store.jpg`,
  "electronics-store": `${R2_BASE}/electronics-store.jpg`,
  "pet-store": `${R2_BASE}/pet-store.jpg`,
  "grocery-store": `${R2_BASE}/grocery-store.jpg`,
  "thrift-store": `${R2_BASE}/thrift-store.jpg`,

  // Health & Beauty
  "salon": `${R2_BASE}/salon.jpg`,
  "barber-shop": `${R2_BASE}/barber-shop.jpg`,
  "spa": `${R2_BASE}/spa.jpg`,
  "massage": `${R2_BASE}/massage.jpg`,
  "nail-salon": `${R2_BASE}/nail-salon.jpg`,
  "gym": `${R2_BASE}/gym.jpg`,
  "yoga-studio": `${R2_BASE}/yoga-studio.jpg`,
  "tattoo-shop": `${R2_BASE}/tattoo-shop.jpg`,

  // Home & Auto
  "auto-repair": `${R2_BASE}/auto-repair.jpg`,
  "car-wash": `${R2_BASE}/car-wash.jpg`,
  "landscaping": `${R2_BASE}/landscaping.jpg`,

  // Professional Services
  "law-firm": `${R2_BASE}/law-firm.jpg`,
  "accounting": `${R2_BASE}/accounting.jpg`,
  "real-estate": `${R2_BASE}/real-estate.jpg`,
  "photography": `${R2_BASE}/photography.jpg`,

  // Entertainment & Recreation
  "movie-theater": `${R2_BASE}/movie-theater.jpg`,
};

const PARENT_CATEGORY_IMAGES: Record<string, string> = {
  "food-drink": `${R2_BASE}/food-drink.jpg`,
  "shopping": `${R2_BASE}/shopping.jpg`,
  "health-beauty": `${R2_BASE}/health-beauty.jpg`,
  "home-auto": `${R2_BASE}/home-auto.jpg`,
  "professional-services": `${R2_BASE}/professional-services.jpg`,
  "entertainment-recreation": `${R2_BASE}/entertainment-recreation.jpg`,
};

const DEFAULT_IMAGE = `${R2_BASE}/default.jpg`;

/**
 * Returns a placeholder image URL from R2 based on the business's categories.
 */
export function getPlaceholderImage(categories: string[]): string {
  for (const cat of categories) {
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    if (CATEGORY_IMAGES[slug]) return CATEGORY_IMAGES[slug];
  }

  for (const cat of categories) {
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    if (PARENT_CATEGORY_IMAGES[slug]) return PARENT_CATEGORY_IMAGES[slug];
  }

  return DEFAULT_IMAGE;
}

// Keep emoji icons for inline placeholder UI (no-photo showcase, etc.)
const CATEGORY_ICONS: Record<string, string> = {
  "restaurant": "🍽️", "coffee-shop": "☕", "bakery": "🥐", "bar": "🍸",
  "brewery": "🍺", "jewelry-store": "💎", "clothing-store": "👗",
  "salon": "💇", "gym": "🏋️", "auto-repair": "🔧", "law-firm": "⚖️",
  "real-estate": "🏠", "movie-theater": "🎬", "pizza": "🍕",
};

const PARENT_ICONS: Record<string, string> = {
  "food-drink": "🍴", "shopping": "🛍️", "health-beauty": "✨",
  "home-auto": "🏠", "professional-services": "💼", "entertainment-recreation": "🎭",
};

export function getCategoryIcon(categories: string[]): string {
  for (const cat of categories) {
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    if (CATEGORY_ICONS[slug]) return CATEGORY_ICONS[slug];
  }
  for (const cat of categories) {
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    if (PARENT_ICONS[slug]) return PARENT_ICONS[slug];
  }
  return "🏢";
}
