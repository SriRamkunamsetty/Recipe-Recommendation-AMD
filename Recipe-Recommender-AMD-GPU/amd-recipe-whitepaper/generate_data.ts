import fs from 'fs';
import path from 'path';

const cuisines = ['Italian', 'Indian', 'Mexican', 'Chinese', 'American', 'French', 'Japanese', 'Mediterranean', 'Thai', 'Greek'];
const dietTypes = ['Veg', 'Non-Veg'];

const recipeNames: Record<string, string[]> = {
  'Indian': [
    'Paneer Butter Masala', 'Chicken Tikka Masala', 'Dal Makhani', 'Biryani', 'Aloo Gobi', 
    'Chana Masala', 'Palak Paneer', 'Butter Chicken', 'Rogan Josh', 'Masala Dosa',
    'Vada Pav', 'Pani Puri', 'Samosa Chat', 'Malai Kofta', 'Baingan Bharta',
    'Fish Curry', 'Prawn Balchao', 'Lamb Vindaloo', 'Tandoori Chicken', 'Mutter Paneer',
    'Kadai Chicken', 'Hyderabadi Biryani', 'Chettinad Chicken', 'Dhokla', 'Pav Bhaji',
    'Chole Bhature', 'Rajma Chawal', 'Kashmiri Pulao', 'Chicken Korma', 'Mutton Curry',
    'Fish Tikka', 'Paneer Tikka', 'Aloo Tikki', 'Bhindi Masala', 'Gajar Ka Halwa',
    'Gulab Jamun', 'Rasgulla', 'Jalebi', 'Kheer', 'Lassi',
    'Chicken 65', 'Medu Vada', 'Idli Sambar', 'Upma', 'Poha',
    'Khandvi', 'Undhiyu', 'Thepla', 'Kachori', 'Mirchi Bada'
  ],
  'Italian': [
    'Margherita Pizza', 'Spaghetti Carbonara', 'Lasagna', 'Risotto', 'Penne Arrabbiata',
    'Fettuccine Alfredo', 'Gnocchi', 'Bruschetta', 'Tiramisu', 'Minestrone Soup',
    'Chicken Parmigiana', 'Osso Buco', 'Pesto Pasta', 'Calzone', 'Focaccia'
  ],
  'Mexican': [
    'Tacos Al Pastor', 'Enchiladas', 'Guacamole', 'Burritos', 'Quesadillas',
    'Chiles Rellenos', 'Tamales', 'Nachos Supreme', 'Fajitas', 'Mole Poblano',
    'Tostadas', 'Salsa Verde Chicken', 'Mexican Rice', 'Churros', 'Elote'
  ],
  'Chinese': [
    'Kung Pao Chicken', 'Dim Sum', 'Hot and Sour Soup', 'Chow Mein', 'Spring Rolls',
    'Mapo Tofu', 'Peking Duck', 'Sweet and Sour Pork', 'Wonton Soup', 'Fried Rice',
    'Szechuan Beef', 'General Tso\'s Chicken', 'Egg Drop Soup', 'Lo Mein', 'Dumplings'
  ],
  'American': [
    'Cheeseburger', 'Buffalo Wings', 'Mac and Cheese', 'BBQ Ribs', 'Clam Chowder',
    'Apple Pie', 'Fried Chicken', 'Meatloaf', 'Hot Dogs', 'Steak and Fries',
    'Pancakes', 'Cornbread', 'Coleslaw', 'Potato Salad', 'Club Sandwich'
  ],
  'Japanese': [
    'Sushi Rolls', 'Ramen', 'Tempura', 'Teriyaki Chicken', 'Miso Soup',
    'Udon Noodles', 'Sashimi', 'Yakitori', 'Okonomiyaki', 'Tonkatsu',
    'Gyoza', 'Onigiri', 'Takoyaki', 'Matcha Cake', 'Donburi'
  ],
  'Mediterranean': [
    'Hummus', 'Falafel', 'Tabbouleh', 'Baba Ganoush', 'Shawarma',
    'Greek Salad', 'Moussaka', 'Baklava', 'Kebab', 'Gyros',
    'Paella', 'Ratatouille', 'Couscous', 'Shakshuka', 'Dolma'
  ],
  'Thai': [
    'Pad Thai', 'Green Curry', 'Tom Yum Soup', 'Massaman Curry', 'Som Tum',
    'Red Curry', 'Mango Sticky Rice', 'Thai Basil Chicken', 'Panang Curry', 'Satay'
  ],
  'Greek': [
    'Souvlaki', 'Spanakopita', 'Tzatziki', 'Pastitsio', 'Greek Yogurt Bowl',
    'Dolmades', 'Keftedes', 'Feta Pasta', 'Horiatiki', 'Avgolemono'
  ],
  'French': [
    'Coq au Vin', 'Quiche Lorraine', 'Bouillabaisse', 'French Onion Soup', 'Crepes',
    'Cassoulet', 'Beef Bourguignon', 'Escargot', 'Profiteroles', 'Nicoise Salad'
  ]
};

const ingredientsList = [
  'Tomato', 'Onion', 'Garlic', 'Chicken', 'Spinach', 'Paneer', 'Rice', 'Pasta', 'Potato', 'Carrot',
  'Lentils', 'Beans', 'Cheese', 'Butter', 'Cream', 'Ginger', 'Chili', 'Coriander', 'Lemon', 'Olive Oil',
  'Cumin', 'Turmeric', 'Garam Masala', 'Yogurt', 'Coconut Milk', 'Soy Sauce', 'Basil', 'Oregano', 'Thyme',
  'Bell Pepper', 'Mushroom', 'Shrimp', 'Beef', 'Pork', 'Lamb', 'Egg', 'Flour', 'Sugar', 'Milk', 'Honey'
];

const recipes = [];

for (let i = 1; i <= 100000; i++) {
  // Ensure at least 10000 Indian recipes
  let cuisine;
  if (i <= 10000) {
    cuisine = 'Indian';
  } else {
    // Distribute the rest among other cuisines
    const otherCuisines = cuisines.filter(c => c !== 'Indian');
    cuisine = otherCuisines[Math.floor(Math.random() * otherCuisines.length)];
  }
  
  const dietType = dietTypes[Math.floor(Math.random() * dietTypes.length)];
  
  // Pick a base name and add a variation to ensure uniqueness
  const baseNames = recipeNames[cuisine] || [`${cuisine} Special`];
  const baseName = baseNames[Math.floor(Math.random() * baseNames.length)];
  const variations = ['Classic', 'Spicy', 'Homemade', 'Chef\'s Special', 'Quick', 'Healthy', 'Traditional', 'Modern Twist', 'Rustic', 'Gourmet'];
  const variation = variations[Math.floor(Math.random() * variations.length)];
  
  const name = `${variation} ${baseName} #${i}`;
  const calories = Math.floor(Math.random() * 800) + 100;
  
  // Randomly select 4-8 ingredients
  const numIngredients = Math.floor(Math.random() * 5) + 4;
  const ingredients = [];
  while (ingredients.length < numIngredients) {
    const ing = ingredientsList[Math.floor(Math.random() * ingredientsList.length)];
    if (!ingredients.includes(ing)) ingredients.push(ing);
  }

  const cookingTime = Math.floor(Math.random() * 60) + 15;
  const protein = dietType === 'Non-Veg' 
    ? Math.floor(Math.random() * 35) + 15
    : Math.floor(Math.random() * 20) + 5;
  
  const fat = Math.floor(Math.random() * 35) + 5;
  const carbs = Math.floor(Math.random() * 70) + 20;
  const fiber = Math.floor(Math.random() * 12) + 2;
  const rating = (Math.random() * 1.5 + 3.5).toFixed(1);

  recipes.push({
    id: i,
    name,
    calories,
    ingredients: ingredients.join(', '),
    cuisine,
    dietType,
    cookingTime,
    protein,
    fat,
    carbs,
    fiber,
    rating,
    instructions: `1. Start by prepping the ${ingredients[0]} and ${ingredients[1]}. 2. Heat a large pan with some oil and sauté the ${ingredients[2]}. 3. Add the ${ingredients[3]} and cook until tender. 4. Mix in the remaining ingredients and simmer for ${Math.floor(cookingTime/2)} minutes. 5. Garnish with fresh herbs and serve warm.`
  });
}

const csvContent = [
  'id,name,calories,ingredients,cuisine,dietType,cookingTime,protein,fat,carbs,fiber,rating,instructions',
  ...recipes.map(r => `${r.id},"${r.name}",${r.calories},"${r.ingredients}","${r.cuisine}","${r.dietType}",${r.cookingTime},${r.protein},${r.fat},${r.carbs},${r.fiber},${r.rating},"${r.instructions}"`)
].join('\n');

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

fs.writeFileSync(path.join(dataDir, 'recipes.csv'), csvContent);
console.log('Generated 100000 recipes in data/recipes.csv');
