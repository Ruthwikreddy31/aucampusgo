import type { Product } from '../models'

export const CATEGORIES = [
  'All',
  'Snacks',
  'Beverages',
  'Chocolates',
  'Biscuits',
  'Instant Food',
  'Fruits',
  'Stationery',
  'Personal Care',
  'Canteen Items',
  'Meals',
  'Offers',
] as const

export type CategoryName = (typeof CATEGORIES)[number]

export const CATEGORY_EMOJI: Record<string, string> = {
  All: '🛒',
  Snacks: '🍿',
  Beverages: '🥤',
  Chocolates: '🍫',
  Biscuits: '🍪',
  'Instant Food': '🍜',
  Fruits: '🍎',
  Stationery: '✏️',
  'Personal Care': '🧴',
  'Canteen Items': '🍱',
  Meals: '🍛',
  Offers: '⚡',
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Snacks: [
    'snack', 'snacks', 'chips', 'lays', 'kurkure', 'bingo', 'doritos',
    'uncle chipps', 'crisps', 'namkeen', 'samosa', 'fries', 'popcorn',
    'french fries', 'nachos', 'bujia', 'sev',
  ],
  Beverages: [
    'beverage', 'beverages', 'drink', 'drinks', 'coke', 'coca cola',
    'pepsi', 'sprite', 'cold coffee', 'coffee', 'tea', 'chai', 'juice',
    'soda', 'frooti', 'water', 'shake', 'smoothie', 'limca', 'red bull',
  ],
  Chocolates: [
    'chocolate', 'chocolates', 'dairy milk', 'kitkat', '5 star', 'snickers',
    'munch', 'perk', 'bournville', 'silk', 'dark chocolate', 'ferrero',
  ],
  Biscuits: [
    'biscuit', 'biscuits', 'cookie', 'cookies', 'oreo', 'parle-g', 'parleg',
    'bourbon', 'good day', 'marie gold', 'hide & seek', 'hide and seek',
    'rusk', 'crackers', 'digestive',
  ],
  'Instant Food': [
    'instant food', 'maggi', 'noodle', 'noodles', 'cup noodles', 'pasta',
    'ramen', 'yippee', 'wai wai', 'instant', 'chocos', 'oats',
  ],
  Fruits: [
    'fruit', 'fruits', 'apple', 'banana', 'orange', 'mango', 'grape',
    'watermelon', 'fruit bowl', 'papaya', 'lemon', 'fresh fruit',
  ],
  Stationery: [
    'stationery', 'pen', 'notebook', 'pencil', 'eraser', 'scale', 'stapler',
    'classmate', 'folder', 'sticky notes', 'notes', 'highlighter', 'calculator',
  ],
  'Personal Care': [
    'personal care', 'sanitizer', 'soap', 'shampoo', 'face wash', 'tissue',
    'tissues', 'hand wash', 'deodorant', 'toothpaste', 'brush', 'lip balm',
  ],
  'Canteen Items': [
    'canteen', 'canteen items', 'biryani', 'wrap', 'thali', 'burger',
    'sandwich', 'puff', 'rice', 'roti', 'dosa', 'idli', 'fast food',
  ],
  Meals: [
    'meal', 'meals', 'biryani', 'rice', 'lunch', 'box', 'thali', 'curry',
    'roti', 'chapati', 'dinner', 'pulao', 'paneer',
  ],
}

export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function slugToCategory(slug: string): string | null {
  const normalized = slug.toLowerCase()
  return CATEGORIES.find((c) => categoryToSlug(c) === normalized) ?? null
}

export function productMatchesCategory(product: Product, category: string): boolean {
  if (!category || category.toLowerCase() === 'all') return true
  if (category === 'Offers') return product.id % 3 === 0

  const target = category.toLowerCase()
  const rawCat = (typeof product.category === 'string' ? product.category : product.category?.name ?? '').toLowerCase()
  const shopCat = (product.shop?.category ?? '').toLowerCase()

  // Exact match
  if (rawCat === target || shopCat === target) return true

  // Alias checks
  if (target === 'beverages' || target === 'drinks') {
    if (
      rawCat.includes('beverage') ||
      rawCat.includes('drink') ||
      rawCat.includes('coffee') ||
      rawCat.includes('tea') ||
      rawCat.includes('juice')
    ) {
      return true
    }
  }

  if (target === 'canteen items' || target === 'canteen') {
    if (
      rawCat.includes('meal') ||
      rawCat.includes('food') ||
      rawCat.includes('maggi') ||
      rawCat.includes('canteen')
    ) {
      return true
    }
  }

  if (target === 'instant food') {
    if (rawCat.includes('maggi') || rawCat.includes('noodle') || rawCat.includes('pasta')) {
      return true
    }
  }

  const searchable = `${product.name} ${product.description ?? ''} ${rawCat} ${shopCat}`.toLowerCase()
  const keywords = CATEGORY_KEYWORDS[category] ?? [category.toLowerCase()]
  return keywords.some((keyword) => searchable.includes(keyword.toLowerCase()))
}

export function getSimilarProducts(products: Product[], product: Product, limit = 6): Product[] {
  const categoryName = product.category?.name ?? product.shop?.category ?? ''
  return products
    .filter((item) => item.id !== product.id && item.active)
    .filter((item) => {
      if (!categoryName) return item.shopId === product.shopId
      return productMatchesCategory(item, categoryName) || item.shopId === product.shopId
    })
    .slice(0, limit)
}
