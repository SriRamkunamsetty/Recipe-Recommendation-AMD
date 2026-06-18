export interface Recipe {
  id: string;
  name: string;
  calories: number;
  ingredients: string;
  cuisine: string;
  dietType: string;
  cookingTime: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  rating: number;
  instructions: string;
  distance?: number;
  matchPercentage?: number;
  matchCount?: number;
}

export type View = 'home' | 'results' | 'details' | 'favorites';
