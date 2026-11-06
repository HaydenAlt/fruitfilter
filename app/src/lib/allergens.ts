export const ALLERGEN_IDS = [
  'latex',
  'birch',
  'ragweed',
  'peanut',
  'tree-nuts',
  'milk',
  'egg',
  'wheat',
  'soy',
  'fish',
  'shellfish',
  'sesame',
] as const

export type AllergenId = (typeof ALLERGEN_IDS)[number]

export function isAllergenId(value: string): value is AllergenId {
  return (ALLERGEN_IDS as readonly string[]).includes(value)
}

export function allergenKey(id: string): string {
  return id.replaceAll('-', '_')
}

const FRUIT_TAGS: Record<string, AllergenId[]> = {
  banana: ['latex', 'ragweed'],
  plantain: ['latex', 'ragweed'],
  kiwi: ['latex', 'birch'],
  avocado: ['latex'],
  chestnut: ['latex', 'tree-nuts'],
  papaya: ['latex'],
  mango: ['latex'],
  pineapple: ['latex'],
  apple: ['birch'],
  cherry: ['birch'],
  pear: ['birch'],
  peach: ['birch'],
  plum: ['birch'],
  apricot: ['birch'],
  nectarine: ['birch'],
  hazelnut: ['birch', 'tree-nuts'],
  watermelon: ['ragweed'],
  melon: ['ragweed'],
  cantaloupe: ['ragweed'],
  honeydew: ['ragweed'],
  cucumber: ['ragweed'],
  zucchini: ['ragweed'],
}

const ORDERED_KEYS = Object.keys(FRUIT_TAGS).sort((a, b) => b.length - a.length)

function matchTags(fruit: string): AllergenId[] {
  const text = fruit.toLowerCase()
  for (const key of ORDERED_KEYS) {
    const pattern = new RegExp(`(^|[^a-z])${key}([^a-z]|$)`)
    if (pattern.test(text)) return FRUIT_TAGS[key]
  }
  return []
}

export function checkAllergens(fruit: string, selected: string[]): AllergenId[] {
  if (!fruit || selected.length === 0) return []
  const tags = matchTags(fruit)
  return selected.filter((id): id is AllergenId => isAllergenId(id) && tags.includes(id))
}

export function ingredientConflicts(allergens: string[], selected: string[]): AllergenId[] {
  if (selected.length === 0) return []
  return selected.filter(
    (id): id is AllergenId => isAllergenId(id) && allergens.includes(id),
  )
}
