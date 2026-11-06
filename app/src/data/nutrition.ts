export interface NutritionRow {
  kcal: number
  fiber: number
  vitaminC: number
  sugar: number
}

// Per 100 g, raw. Static extract of USDA FoodData Central.
export const NUTRITION: Record<string, NutritionRow> = {
  apple: { kcal: 52, fiber: 2.4, vitaminC: 4.6, sugar: 10.4 },
  banana: { kcal: 89, fiber: 2.6, vitaminC: 8.7, sugar: 12.2 },
  orange: { kcal: 47, fiber: 2.4, vitaminC: 53.2, sugar: 9.4 },
  strawberry: { kcal: 32, fiber: 2.0, vitaminC: 58.8, sugar: 4.9 },
  blueberry: { kcal: 57, fiber: 2.4, vitaminC: 9.7, sugar: 10.0 },
  grape: { kcal: 69, fiber: 0.9, vitaminC: 3.2, sugar: 15.5 },
  watermelon: { kcal: 30, fiber: 0.4, vitaminC: 8.1, sugar: 6.2 },
  mango: { kcal: 60, fiber: 1.6, vitaminC: 36.4, sugar: 13.7 },
  pineapple: { kcal: 50, fiber: 1.4, vitaminC: 47.8, sugar: 9.9 },
  pear: { kcal: 57, fiber: 3.1, vitaminC: 4.3, sugar: 9.8 },
  peach: { kcal: 39, fiber: 1.5, vitaminC: 6.6, sugar: 8.4 },
  kiwi: { kcal: 61, fiber: 3.0, vitaminC: 92.7, sugar: 9.0 },
  avocado: { kcal: 160, fiber: 6.7, vitaminC: 10.0, sugar: 0.7 },
  lemon: { kcal: 29, fiber: 2.8, vitaminC: 53.0, sugar: 2.5 },
  raspberry: { kcal: 52, fiber: 6.5, vitaminC: 26.2, sugar: 4.4 },
  cherry: { kcal: 63, fiber: 2.1, vitaminC: 7.0, sugar: 12.8 },
  plum: { kcal: 46, fiber: 1.4, vitaminC: 9.5, sugar: 9.9 },
  grapefruit: { kcal: 42, fiber: 1.6, vitaminC: 31.2, sugar: 6.9 },
  papaya: { kcal: 43, fiber: 1.7, vitaminC: 60.9, sugar: 7.8 },
  pomegranate: { kcal: 83, fiber: 4.0, vitaminC: 10.2, sugar: 13.7 },
  cantaloupe: { kcal: 34, fiber: 0.9, vitaminC: 36.7, sugar: 7.9 },
  apricot: { kcal: 48, fiber: 2.0, vitaminC: 10.0, sugar: 9.2 },
  fig: { kcal: 74, fiber: 2.9, vitaminC: 2.0, sugar: 16.3 },
  lime: { kcal: 30, fiber: 2.8, vitaminC: 29.1, sugar: 1.7 },
}

export function nutritionFor(fruit: string): NutritionRow | null {
  const key = fruit.toLowerCase().trim()
  if (NUTRITION[key]) return NUTRITION[key]
  const match = Object.keys(NUTRITION).find((item) => key.includes(item))
  return match ? NUTRITION[match] : null
}
