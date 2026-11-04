export interface MenuVariant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface MenuAddOn {
  id: string;
  name: string;
  price: number;
}

export interface MenuDish {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  name: string;
  slug: string;
  description: string;
  details?: string | null;
  price: number;
  comparePrice?: number | null;
  image?: string | null;
  isVeg: boolean;
  isSpicy: boolean;
  isFeatured: boolean;
  isAvailable?: boolean;
  prepTime: number;
  calories?: number | null;
  variants: MenuVariant[];
  addOns: MenuAddOn[];
}

export interface MenuCategoryView {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  dishes: MenuDish[];
}

export interface CartContextType {
  source?: string;
}
