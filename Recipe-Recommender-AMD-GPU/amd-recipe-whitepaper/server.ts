import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

interface Recipe {
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
}

let recipes: Recipe[] = [];

// Simple stemming to handle basic plurals
function stem(word: string) {
  return word.toLowerCase()
    .replace(/ies$/, 'y')
    .replace(/es$/, '')
    .replace(/s$/, '')
    .trim();
}

// Load and parse CSV
function loadData() {
  const csvPath = path.join(process.cwd(), 'data', 'recipes.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    cast: true
  }) as Recipe[];
  recipes = records;
  console.log(`Loaded ${recipes.length} recipes.`);
}

loadData();

// KNN Recommendation Logic with Ingredient Filtering and Advanced Options
function recommendRecipes(
  targetCalories: number, 
  targetDiet: string, 
  userIngredients: string = '', 
  cuisine: string = 'All',
  lowCalorie: boolean = false,
  highProtein: boolean = false,
  lowFat: boolean = false,
  lowCarb: boolean = false,
  highFiber: boolean = false,
  count: number = 50
) {
  // Normalize calories (assuming range 100-900)
  const minCal = 100;
  const maxCal = 900;
  const normalize = (val: number) => (val - minCal) / (maxCal - minCal);

  const targetCalNorm = normalize(targetCalories);
  const targetDietVal = targetDiet === 'Veg' ? 0 : 1;
  
  const userIngList = userIngredients.toLowerCase().split(',').map(i => stem(i)).filter(i => i !== '');

  const scoredRecipes = recipes
    .filter(recipe => {
      // Hard filters
      if (cuisine !== 'All' && recipe.cuisine !== cuisine) return false;
      if (lowCalorie && recipe.calories > 300) return false;
      if (highProtein && recipe.protein < 20) return false;
      if (lowFat && recipe.fat > 15) return false;
      if (lowCarb && recipe.carbs > 30) return false;
      if (highFiber && recipe.fiber < 5) return false;
      return true;
    })
    .map(recipe => {
      const calNorm = normalize(recipe.calories);
      const dietVal = recipe.dietType === 'Veg' ? 0 : 1;

      // 1. Diet Distance (Strict)
      const dietDistance = targetDietVal === dietVal ? 0 : 100; 
      
      // 2. Calorie Distance
      const calDistance = Math.abs(targetCalNorm - calNorm) * 2;

      // 3. Ingredient Similarity (Jaccard Index with Stemming)
      let ingredientScore = 0;
      if (userIngList.length > 0) {
        const recipeIngs = Array.from(new Set(recipe.ingredients.toLowerCase().split(',').map(i => stem(i))));
        const uniqueUserIngs = Array.from(new Set(userIngList));
        
        // Jaccard Similarity = Intersection / Union
        const intersection = uniqueUserIngs.filter(ing => recipeIngs.some(ri => ri.includes(ing) || ing.includes(ri)));
        const union = Array.from(new Set([...uniqueUserIngs, ...recipeIngs]));
        
        const jaccard = intersection.length / union.length;
        // Distance is 1 - similarity
        ingredientScore = 1 - jaccard;
      }

      // 4. Rating Influence (Higher rating = slightly lower distance)
      const ratingBonus = (recipe.rating - 3.5) / 1.5 * 0.1; // Max 0.1 bonus

      // Combined distance (weighted)
      const distance = Math.sqrt(
        Math.pow(calDistance, 2) + 
        Math.pow(dietDistance, 2) + 
        Math.pow(ingredientScore * 10, 2)
      ) - ratingBonus;

      let matchPercentage = 0;
      let matchCount = 0;
      if (userIngList.length > 0) {
        const recipeIngs = Array.from(new Set(recipe.ingredients.toLowerCase().split(',').map(i => stem(i))));
        const uniqueUserIngs = Array.from(new Set(userIngList));
        const intersection = uniqueUserIngs.filter(ing => recipeIngs.some(ri => ri.includes(ing) || ing.includes(ri)));
        matchPercentage = Math.round((intersection.length / uniqueUserIngs.length) * 100);
        matchCount = intersection.length;
      }

      return { 
        ...recipe, 
        distance, 
        matchPercentage,
        matchCount
      };
    });

  // Sort by distance and return top N
  return scoredRecipes
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

// API Routes
app.post('/api/recommend', (req, res) => {
  const { calories, dietType, ingredients, cuisine, lowCalorie, highProtein, lowFat, lowCarb, highFiber, count } = req.body;
  
  if (!calories || !dietType) {
    return res.status(400).json({ error: 'Calories and dietType are required' });
  }

  const recommendations = recommendRecipes(
    Number(calories), 
    dietType, 
    ingredients, 
    cuisine, 
    lowCalorie, 
    highProtein,
    lowFat,
    lowCarb,
    highFiber,
    count ? Number(count) : 50
  );
  res.json(recommendations);
});

app.post('/api/rate', (req, res) => {
  const { id, rating } = req.body;
  const recipe = recipes.find(r => r.id.toString() === id.toString());
  if (recipe) {
    // Simple moving average for rating
    recipe.rating = Number(((recipe.rating + Number(rating)) / 2).toFixed(1));
    
    // Persist to CSV
    try {
      const csvPath = path.join(process.cwd(), 'data', 'recipes.csv');
      const header = 'id,name,calories,ingredients,cuisine,dietType,cookingTime,protein,fat,carbs,fiber,rating,instructions\n';
      const rows = recipes.map(r => 
        `${r.id},"${r.name}",${r.calories},"${r.ingredients}","${r.cuisine}","${r.dietType}",${r.cookingTime},${r.protein},${r.fat},${r.carbs},${r.fiber},${r.rating},"${r.instructions.replace(/"/g, '""')}"`
      ).join('\n');
      fs.writeFileSync(csvPath, header + rows);
      res.json({ success: true, newRating: recipe.rating });
    } catch (err) {
      console.error('Error saving ratings:', err);
      res.status(500).json({ error: 'Failed to save rating' });
    }
  } else {
    res.status(404).json({ error: 'Recipe not found' });
  }
});

app.get('/api/ingredients', (req, res) => {
  const allIngredients = new Set<string>();
  recipes.forEach(r => {
    r.ingredients.split(',').forEach(i => allIngredients.add(i.trim()));
  });
  res.json(Array.from(allIngredients).sort());
});

app.get('/api/recipe/:id', (req, res) => {
  const recipe = recipes.find(r => r.id.toString() === req.params.id);
  if (recipe) {
    res.json(recipe);
  } else {
    res.status(404).json({ error: 'Recipe not found' });
  }
});

const FAVORITES_FILE = path.join(process.cwd(), 'data', 'favorites.json');

app.get('/api/favorites', (req, res) => {
  try {
    if (fs.existsSync(FAVORITES_FILE)) {
      const favorites = JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf-8'));
      res.json(favorites);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorites' });
  }
});

app.post('/api/favorites', (req, res) => {
  const { recipeId, action } = req.body; // action: 'add' or 'remove'
  try {
    let favorites: string[] = [];
    if (fs.existsSync(FAVORITES_FILE)) {
      favorites = JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf-8'));
    }
    
    if (action === 'add') {
      if (!favorites.includes(recipeId.toString())) {
        favorites.push(recipeId.toString());
      }
    } else {
      favorites = favorites.filter(id => id !== recipeId.toString());
    }
    
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(favorites));
    res.json({ success: true, favorites });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update favorites' });
  }
});

app.get('/api/favorites/details', (req, res) => {
  try {
    let favoriteIds: string[] = [];
    if (fs.existsSync(FAVORITES_FILE)) {
      favoriteIds = JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf-8'));
    }
    const favoriteRecipes = recipes.filter(r => favoriteIds.includes(r.id.toString()));
    res.json(favoriteRecipes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load favorite details' });
  }
});

app.get('/api/trending', (req, res) => {
  // Sort by rating for trending
  const trending = [...recipes].sort((a, b) => b.rating - a.rating).slice(0, 3);
  res.json(trending);
});

app.get('/api/stats', (req, res) => {
  res.json({ totalRecipes: recipes.length });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
