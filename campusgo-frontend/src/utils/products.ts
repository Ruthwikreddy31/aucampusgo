import type { Product } from '../models'

export function normalizeProduct(raw: Product & { category?: Product['category'] | string }): Product {
  const categoryName =
    typeof raw.category === 'string'
      ? raw.category
      : raw.category?.name ?? raw.shop?.category ?? 'Food'

  return {
    ...raw,
    shopId: raw.shopId ?? raw.shop?.id ?? 0,
    categoryId: raw.categoryId ?? 0,
    category:
      typeof raw.category === 'object' && raw.category?.name
        ? raw.category
        : {
            id: raw.categoryId ?? 0,
            name: categoryName,
            description: '',
            imageUrl: '',
            active: true,
          },
  }
}

export function normalizeProducts(products: Product[]): Product[] {
  return products.map(normalizeProduct)
}
