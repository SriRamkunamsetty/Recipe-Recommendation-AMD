import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Search, ArrowLeft, Utensils, Flame, Leaf, Info, History, XCircle, AlertCircle, Clock, ShoppingBasket, Heart, Share2, Copy, ExternalLink, Loader2, ChevronRight, Twitter, Facebook, MessageCircle, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Recipe, View } from './types';
import { auth } from './firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Auth } from './components/Auth';

interface SearchHistory {
  calories: string;
  dietType: string;
  ingredients: string;
  cuisine: string;
  lowCalorie: boolean;
  highProtein: boolean;
  lowFat: boolean;
  lowCarb: boolean;
  highFiber: boolean;
  timestamp: number;
}

const getFoodImage = (id: string | number, width: number, height: number) => {
  // Use loremflickr with the 'food' keyword and a lock based on the ID to get a unique, consistent food image
  return `https://loremflickr.com/${width}/${height}/food,meal?lock=${id}`;
};

export default function App() {
  const [view, setView] = useState<View>('home');
  const [calories, setCalories] = useState('400');
  const [dietType, setDietType] = useState('Veg');
  const [cuisine, setCuisine] = useState('All');
  const [lowCalorie, setLowCalorie] = useState(false);
  const [highProtein, setHighProtein] = useState(false);
  const [lowFat, setLowFat] = useState(false);
  const [lowCarb, setLowCarb] = useState(false);
  const [highFiber, setHighFiber] = useState(false);
  const [userIngredients, setUserIngredients] = useState('');
  const [results, setResults] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trending, setTrending] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [allIngredients, setAllIngredients] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        fetchTrending();
        fetchFavorites();
        fetchAllIngredients();
        fetchStats();
      }
    });
    
    // Load history
    const savedHistory = localStorage.getItem('recipe_search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }

    // Handle shared recipe link
    const params = new URLSearchParams(window.location.search);
    const sharedId = params.get('recipeId');
    if (sharedId) {
      fetchRecipeById(sharedId);
    }

    return () => unsubscribe();
  }, []);

  const fetchRecipeById = async (id: string) => {
    try {
      const res = await fetch(`/api/recipe/${id}`);
      if (res.ok) {
        const recipe = await res.json();
        setSelectedRecipe(recipe);
        setView('details');
      }
    } catch (err) {
      console.error('Failed to fetch shared recipe');
    }
  };

  const fetchTrending = async () => {
    setTrendingLoading(true);
    try {
      const res = await fetch('/api/trending');
      const data = await res.json();
      setTrending(data);
    } catch (err) {
      console.error('Failed to fetch trending');
    } finally {
      setTrendingLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites');
      const data = await res.json();
      setFavorites(data);
    } catch (err) {
      console.error('Failed to fetch favorites');
    }
  };

  const fetchFavoriteRecipes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/favorites/details');
      const data = await res.json();
      setFavoriteRecipes(data);
      setView('favorites');
    } catch (err) {
      console.error('Failed to fetch favorite recipes');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllIngredients = async () => {
    try {
      const res = await fetch('/api/ingredients');
      const data = await res.json();
      setAllIngredients(data);
    } catch (err) {
      console.error('Failed to fetch ingredients');
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setTotalRecipes(data.totalRecipes);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const toggleFavorite = async (recipeId: string) => {
    const isFavorite = favorites.includes(recipeId.toString());
    
    if (isFavorite && view === 'favorites') {
      const confirmed = window.confirm('Are you sure you want to remove this recipe from your favorites?');
      if (!confirmed) return;
    }

    const action = isFavorite ? 'remove' : 'add';
    
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, action })
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites);
        if (view === 'favorites' && isFavorite) {
          setFavoriteRecipes(prev => prev.filter(r => r.id !== recipeId));
        }
      }
    } catch (err) {
      console.error('Failed to update favorite');
    }
  };

  const handleIngredientChange = (val: string) => {
    setUserIngredients(val);
    const lastPart = val.split(',').pop()?.trim().toLowerCase() || '';
    if (lastPart.length > 1) {
      const filtered = allIngredients.filter(ing => 
        ing.toLowerCase().includes(lastPart) && 
        !val.toLowerCase().split(',').map(i => i.trim()).includes(ing.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const addIngredient = (ing: string) => {
    const parts = userIngredients.split(',').map(i => i.trim());
    parts.pop();
    parts.push(ing);
    setUserIngredients(parts.join(', ') + ', ');
    setShowSuggestions(false);
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (copiedId) {
      const timer = setTimeout(() => setCopiedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedId]);

  const handleShare = (recipeId: string) => {
    const shareUrl = `${window.location.origin}?recipeId=${recipeId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(recipeId);
  };

  const shareOnTwitter = (recipe: Recipe) => {
    const text = `Check out this delicious ${recipe.name} recipe on Smart Recipe!`;
    const url = `${window.location.origin}?recipeId=${recipe.id}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnFacebook = (recipe: Recipe) => {
    const url = `${window.location.origin}?recipeId=${recipe.id}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnWhatsApp = (recipe: Recipe) => {
    const text = `Check out this delicious ${recipe.name} recipe on Smart Recipe! ${window.location.origin}?recipeId=${recipe.id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const saveToHistory = (
    cals: string, 
    diet: string, 
    ings: string, 
    cuis: string, 
    lowCal: boolean, 
    highProt: boolean,
    lFat: boolean,
    lCarb: boolean,
    hFiber: boolean
  ) => {
    const newEntry = { 
      calories: cals, 
      dietType: diet, 
      ingredients: ings, 
      cuisine: cuis,
      lowCalorie: lowCal,
      highProtein: highProt,
      lowFat: lFat,
      lowCarb: lCarb,
      highFiber: hFiber,
      timestamp: Date.now() 
    };
    const updatedHistory = [newEntry, ...history.filter(h => 
      !(h.calories === cals && h.dietType === diet && h.ingredients === ings && h.cuisine === cuis)
    )].slice(0, 5);
    setHistory(updatedHistory);
    localStorage.setItem('recipe_search_history', JSON.stringify(updatedHistory));
  };

  const handleRecommend = async (
    e: React.FormEvent | null, 
    cals?: string, 
    diet?: string, 
    ings?: string,
    cuis?: string,
    lowCal?: boolean,
    highProt?: boolean,
    lFat?: boolean,
    lCarb?: boolean,
    hFiber?: boolean
  ) => {
    if (e) e.preventDefault();
    
    const searchCals = cals || calories;
    const searchDiet = diet || dietType;
    const searchIngs = ings !== undefined ? ings : userIngredients;
    const searchCuis = cuis || cuisine;
    const searchLowCal = lowCal !== undefined ? lowCal : lowCalorie;
    const searchHighProt = highProt !== undefined ? highProt : highProtein;
    const searchLowFat = lFat !== undefined ? lFat : lowFat;
    const searchLowCarb = lCarb !== undefined ? lCarb : lowCarb;
    const searchHighFiber = hFiber !== undefined ? hFiber : highFiber;

    setLoading(true);
    setError(null);
    setView('results');
    
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          calories: searchCals, 
          dietType: searchDiet, 
          ingredients: searchIngs,
          cuisine: searchCuis,
          lowCalorie: searchLowCal,
          highProtein: searchHighProt,
          lowFat: searchLowFat,
          lowCarb: searchLowCarb,
          highFiber: searchHighFiber,
          count: 50
        }),
      });
      
      if (!res.ok) throw new Error('Failed to fetch recommendations');
      
      const data = await res.json();
      
      if (data.length === 0) {
        setError('No recipes found matching your criteria. Try adjusting your filters.');
      } else {
        setResults(data);
        saveToHistory(searchCals, searchDiet, searchIngs, searchCuis, searchLowCal, searchHighProt, searchLowFat, searchLowCarb, searchHighFiber);
      }
    } catch (err) {
      setError('Something went wrong while fetching recommendations. Please try again later.');
      console.error('Error fetching recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (id: string, rating: number) => {
    try {
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rating }),
      });
      if (res.ok) {
        const data = await res.json();
        if (selectedRecipe && selectedRecipe.id === id) {
          setSelectedRecipe({ ...selectedRecipe, rating: data.newRating });
        }
        // Update results if present
        setResults(results.map(r => r.id === id ? { ...r, rating: data.newRating } : r));
      }
    } catch (err) {
      console.error('Error rating recipe:', err);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('recipe_search_history');
  };

  const handleViewDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setActiveStep(null);
    setView('details');
  };

  const getCookingTips = (recipe: Recipe) => {
    const tips = [
      "Always taste your dish and adjust seasoning before serving.",
      "Don't overcrowd the pan to ensure proper browning.",
      "Let meat rest for a few minutes after cooking to keep it juicy.",
      "Use fresh herbs at the end of cooking for maximum flavor."
    ];
    
    if (recipe.cuisine === 'Indian') tips.push("Toast whole spices in oil to release their essential oils.");
    if (recipe.cuisine === 'Italian') tips.push("Save some pasta water to create a silky sauce.");
    if (recipe.cuisine === 'Mexican') tips.push("Char your vegetables for a deeper, smokier flavor profile.");
    if (recipe.cuisine === 'Chinese') tips.push("Prep all ingredients before you start the high-heat stir-fry.");
    
    if (recipe.ingredients.toLowerCase().includes('garlic')) tips.push("Add garlic towards the end of sautéing to prevent burning.");
    if (recipe.ingredients.toLowerCase().includes('onion')) tips.push("Sauté onions until translucent for a sweeter base.");
    
    return tips.slice(-3); // Show last 3 relevant tips
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setView('home');
    } catch (err) {
      console.error('Failed to sign out');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <Loader2 className="w-12 h-12 text-[hsl(var(--primary))] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))] p-6">
        <ChefHat className="w-16 h-16 text-primary mb-6" />
        <h2 className="text-2xl font-bold mb-2 text-center serif">Verify your email</h2>
        <p className="text-muted-foreground text-center max-w-md mb-8">
          We've sent a verification email to <strong>{user.email}</strong>. Please check your inbox and verify your email to continue.
        </p>
        <div className="flex gap-4">
          <Button onClick={() => window.location.reload()} className="rounded-full">
            I've verified my email
          </Button>
          <Button variant="outline" className="rounded-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Header */}
      <header className="p-6 flex items-center justify-between max-w-7xl mx-auto">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => {
            setView('home');
            setError(null);
          }}
        >
          <ChefHat className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold serif tracking-tight">Smart Recipe</h1>
          <p className="text-[10px] text-muted-foreground hidden sm:block">Exploring {totalRecipes.toLocaleString()} global dishes</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-[hsl(var(--border))]">
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <span className="text-sm font-medium">{user.displayName || user.email?.split('@')[0]}</span>
          </div>
          <Button 
            variant="ghost" 
            onClick={fetchFavoriteRecipes}
            className={`gap-2 rounded-full hover:bg-[hsl(var(--secondary))] ${view === 'favorites' ? 'bg-[hsl(var(--secondary))]' : ''}`}
          >
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span className="hidden sm:inline font-bold">My Favorites</span>
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSignOut}
            className="rounded-full hover:bg-red-50 hover:text-red-600"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
          {view !== 'home' && (
            <Button variant="ghost" onClick={() => {
              setView('home');
              setError(null);
            }} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Search
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <section className="text-center space-y-4 py-12">
                <h2 className="text-6xl font-light serif leading-tight">
                  Discover your next <br />
                  <span className="italic text-[hsl(var(--primary))]">perfect meal</span>
                </h2>
                <p className="text-[hsl(var(--muted-foreground))] max-w-lg mx-auto">
                  Our AI-powered engine uses the KNN algorithm to find recipes that perfectly match your nutritional needs and preferences.
                </p>
              </section>

              <div className="max-w-2xl mx-auto space-y-6">
                <Card className="border-none shadow-xl bg-white/50 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <form onSubmit={(e) => handleRecommend(e)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-semibold opacity-70">Calories Range</label>
                        <div className="relative">
                          <Flame className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                          <Input 
                            type="number" 
                            placeholder="e.g. 400" 
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            className="pl-10 rounded-full"
                            min="100"
                            max="900"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-semibold opacity-70">Dietary Preference</label>
                        <Select value={dietType} onValueChange={setDietType}>
                          <SelectTrigger className="rounded-full">
                            <SelectValue placeholder="Select diet" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Veg">Vegetarian</SelectItem>
                            <SelectItem value="Non-Veg">Non-Vegetarian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-semibold opacity-70">Cuisine Type</label>
                        <Select value={cuisine} onValueChange={setCuisine}>
                          <SelectTrigger className="rounded-full">
                            <SelectValue placeholder="Select cuisine" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="All">All Cuisines</SelectItem>
                            <SelectItem value="Indian">Indian</SelectItem>
                            <SelectItem value="Italian">Italian</SelectItem>
                            <SelectItem value="Mexican">Mexican</SelectItem>
                            <SelectItem value="Chinese">Chinese</SelectItem>
                            <SelectItem value="American">American</SelectItem>
                            <SelectItem value="French">French</SelectItem>
                            <SelectItem value="Japanese">Japanese</SelectItem>
                            <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-widest font-semibold opacity-70">Quick Filters</label>
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            type="button"
                            variant={lowCalorie ? "default" : "outline"} 
                            size="sm" 
                            className="rounded-full px-4"
                            onClick={() => setLowCalorie(!lowCalorie)}
                          >
                            Low Cal
                          </Button>
                          <Button 
                            type="button"
                            variant={highProtein ? "default" : "outline"} 
                            size="sm" 
                            className="rounded-full px-4"
                            onClick={() => setHighProtein(!highProtein)}
                          >
                            High Protein
                          </Button>
                          <Button 
                            type="button"
                            variant={lowFat ? "default" : "outline"} 
                            size="sm" 
                            className="rounded-full px-4"
                            onClick={() => setLowFat(!lowFat)}
                          >
                            Low Fat
                          </Button>
                          <Button 
                            type="button"
                            variant={lowCarb ? "default" : "outline"} 
                            size="sm" 
                            className="rounded-full px-4"
                            onClick={() => setLowCarb(!lowCarb)}
                          >
                            Low Carb
                          </Button>
                          <Button 
                            type="button"
                            variant={highFiber ? "default" : "outline"} 
                            size="sm" 
                            className="rounded-full px-4"
                            onClick={() => setHighFiber(!highFiber)}
                          >
                            High Fiber
                          </Button>
                        </div>
                      </div>
                      <div className="md:col-span-2 space-y-2 relative">
                        <label className="text-xs uppercase tracking-widest font-semibold opacity-70">Available Ingredients (Optional)</label>
                        <div className="relative">
                          <ShoppingBasket className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                          <Input 
                            placeholder="e.g. rice, tomato, onion" 
                            value={userIngredients}
                            onChange={(e) => handleIngredientChange(e.target.value)}
                            className="pl-10 rounded-full"
                          />
                          <AnimatePresence>
                            {showSuggestions && (
                              <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-[hsl(var(--primary))/10 overflow-hidden"
                              >
                                {suggestions.map((ing) => (
                                  <button
                                    key={ing}
                                    type="button"
                                    onClick={() => addIngredient(ing)}
                                    className="w-full text-left px-6 py-3 hover:bg-[hsl(var(--secondary))] transition-colors text-sm font-medium flex items-center justify-between group"
                                  >
                                    {ing}
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] px-2 italic">Separate ingredients with commas for better matching.</p>
                      </div>
                      <Button type="submit" className="md:col-span-2 w-full rounded-full h-12 text-lg font-medium">
                        Find Recipes
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {history.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-xs uppercase tracking-widest font-bold opacity-50 flex items-center gap-2">
                        <History className="w-3 h-3" /> Recent Searches
                      </h4>
                      <Button variant="ghost" size="sm" onClick={clearHistory} className="h-6 text-[10px] uppercase tracking-tighter opacity-50 hover:opacity-100">
                        Clear All
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {history.map((item, i) => (
                        <Button 
                          key={i} 
                          variant="outline" 
                          size="sm" 
                          className="rounded-full bg-white/30 border-none hover:bg-white/60"
                          onClick={() => {
                            setCalories(item.calories);
                            setDietType(item.dietType);
                            setUserIngredients(item.ingredients);
                            setCuisine(item.cuisine);
                            setLowCalorie(item.lowCalorie);
                            setHighProtein(item.highProtein);
                            setLowFat(item.lowFat);
                            setLowCarb(item.lowCarb);
                            setHighFiber(item.highFiber);
                            handleRecommend(null, item.calories, item.dietType, item.ingredients, item.cuisine, item.lowCalorie, item.highProtein, item.lowFat, item.lowCarb, item.highFiber);
                          }}
                        >
                          {item.calories} kcal • {item.dietType} {item.cuisine !== 'All' && `• ${item.cuisine}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl serif italic">Trending Today</h3>
                  <div className="h-px flex-1 mx-6 bg-[hsl(var(--border))]" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {trendingLoading ? (
                    [...Array(3)].map((_, i) => (
                      <Card key={i} className="rounded-[2.5rem] border-none shadow-xl overflow-hidden animate-pulse">
                        <div className="h-48 bg-gray-200" />
                        <CardContent className="p-6 space-y-4">
                          <div className="h-6 bg-gray-200 rounded w-3/4" />
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    trending.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onClick={() => handleViewDetails(recipe)} 
                        onRate={handleRate}
                        isFavorite={favorites.includes(recipe.id.toString())}
                        onToggleFavorite={() => toggleFavorite(recipe.id)}
                        onShare={() => handleShare(recipe.id.toString())}
                        isCopied={copiedId === recipe.id.toString()}
                      />
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl serif italic">Recommended for You</h2>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Badge variant="secondary" className="px-4 py-1 rounded-full">
                    {calories} kcal
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-1 rounded-full">
                    {dietType}
                  </Badge>
                  {cuisine !== 'All' && (
                    <Badge variant="secondary" className="px-4 py-1 rounded-full">
                      {cuisine}
                    </Badge>
                  )}
                  {lowCalorie && (
                    <Badge variant="outline" className="px-4 py-1 rounded-full border-green-500 text-green-600">
                      Low Cal
                    </Badge>
                  )}
                  {highProtein && (
                    <Badge variant="outline" className="px-4 py-1 rounded-full border-blue-500 text-blue-600">
                      High Protein
                    </Badge>
                  )}
                  {lowFat && (
                    <Badge variant="outline" className="px-4 py-1 rounded-full border-yellow-500 text-yellow-600">
                      Low Fat
                    </Badge>
                  )}
                  {lowCarb && (
                    <Badge variant="outline" className="px-4 py-1 rounded-full border-purple-500 text-purple-600">
                      Low Carb
                    </Badge>
                  )}
                  {highFiber && (
                    <Badge variant="outline" className="px-4 py-1 rounded-full border-orange-500 text-orange-600">
                      High Fiber
                    </Badge>
                  )}
                  {userIngredients && (
                    <Badge variant="outline" className="px-4 py-1 rounded-full border-[hsl(var(--primary))] text-[hsl(var(--primary))]">
                      With: {userIngredients}
                    </Badge>
                  )}
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Alert variant="destructive" className="rounded-3xl border-none bg-red-50 text-red-900 p-8 shadow-inner">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-red-100 rounded-full">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                      <div className="space-y-2">
                        <AlertTitle className="text-2xl font-bold serif italic">Oops! Something went wrong</AlertTitle>
                        <AlertDescription className="text-red-700/80 max-w-md mx-auto leading-relaxed">
                          {error.includes('No recipes found') 
                            ? "We couldn't find any recipes that match your exact filters. Try adjusting your calorie range or removing some ingredient filters to see more results."
                            : "There was a problem connecting to our recipe engine. Please check your connection and try again."}
                        </AlertDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        className="mt-6 border-red-200 text-red-800 hover:bg-red-100 rounded-full px-8 h-12 font-bold"
                        onClick={() => setView('home')}
                      >
                        Try Another Search
                      </Button>
                    </div>
                  </Alert>
                </motion.div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <div className="h-48 rounded-[2rem] bg-white/40 animate-pulse" />
                      <div className="space-y-2 px-4">
                        <div className="h-4 w-1/4 bg-white/40 animate-pulse rounded" />
                        <div className="h-6 w-3/4 bg-white/40 animate-pulse rounded" />
                        <div className="h-4 w-full bg-white/40 animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !error && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {results.map((recipe) => (
                      <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onClick={() => handleViewDetails(recipe)} 
                        onRate={handleRate}
                        isFavorite={favorites.includes(recipe.id.toString())}
                        onToggleFavorite={() => toggleFavorite(recipe.id)}
                        onShare={() => handleShare(recipe.id.toString())}
                        isCopied={copiedId === recipe.id.toString()}
                      />
                    ))}
                  </div>
                )
              )}
            </motion.div>
          )}

          {view === 'details' && selectedRecipe && (
            <motion.div
              key="details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="overflow-hidden border-none shadow-2xl rounded-[2rem]">
                <div className="h-80 bg-[hsl(var(--primary))] relative flex items-center justify-center text-white overflow-hidden">
                   <div className="absolute inset-0 opacity-40">
                      <img 
                        src={getFoodImage(selectedRecipe.id, 1200, 600)} 
                        alt="Background" 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                   </div>
                   <div className="relative text-center p-6 max-w-2xl">
                     <div className="flex justify-center gap-2 mb-4">
                       <Badge className="bg-white/20 backdrop-blur-md border-none text-white">
                          {selectedRecipe.cuisine}
                       </Badge>
                       <Badge className="bg-white/20 backdrop-blur-md border-none text-white">
                          {selectedRecipe.dietType}
                       </Badge>
                     </div>
                     <h2 className="text-6xl font-bold serif leading-tight mb-4">{selectedRecipe.name}</h2>
                     <div className="flex flex-wrap justify-center gap-6 items-center">
                       <div className="flex items-center gap-2 text-white/90">
                         <Clock className="w-5 h-5" />
                         <span className="font-medium">{selectedRecipe.cookingTime} mins</span>
                       </div>
                       <div className="flex items-center gap-2 text-white/90">
                         <Flame className="w-5 h-5" />
                         <span className="font-medium">{selectedRecipe.calories} kcal</span>
                       </div>
                       <div className="flex items-center gap-2 text-white/90">
                         <Utensils className="w-5 h-5" />
                         <span className="font-medium">{selectedRecipe.protein}g Protein</span>
                       </div>
                       <div className="flex flex-wrap justify-center gap-2 items-center">
                         <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                           <span className="text-yellow-400 text-xl">★</span>
                           <span className="font-bold text-xl">{selectedRecipe.rating}</span>
                         </div>
                         <div className="flex gap-1 ml-2">
                           {[...Array(5)].map((_, i) => (
                             <motion.span 
                               key={i} 
                               whileHover={{ scale: 1.2 }}
                               className={`cursor-pointer text-lg ${i < Math.floor(selectedRecipe.rating) ? 'text-yellow-400' : 'text-white/30'}`}
                               onClick={() => handleRate(selectedRecipe.id, i + 1)}
                             >
                               ★
                             </motion.span>
                           ))}
                         </div>
                       </div>
                       <div className="flex gap-2">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className={`rounded-full bg-white/20 hover:bg-white/40 text-white ${favorites.includes(selectedRecipe.id.toString()) ? 'text-red-400' : ''}`}
                           onClick={() => toggleFavorite(selectedRecipe.id)}
                           title="Favorite"
                         >
                           <Heart className={`w-6 h-6 ${favorites.includes(selectedRecipe.id.toString()) ? 'fill-current' : ''}`} />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className={`rounded-full bg-white/20 hover:bg-white/40 text-white transition-all ${copiedId === selectedRecipe.id.toString() ? 'text-green-400' : ''}`}
                           onClick={() => handleShare(selectedRecipe.id.toString())}
                           title="Copy Link"
                         >
                           {copiedId === selectedRecipe.id.toString() ? <Copy className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="rounded-full bg-white/20 hover:bg-white/40 text-white hover:text-blue-400"
                           onClick={() => shareOnTwitter(selectedRecipe)}
                           title="Share on Twitter"
                         >
                           <Twitter className="w-6 h-6" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="rounded-full bg-white/20 hover:bg-white/40 text-white hover:text-blue-600"
                           onClick={() => shareOnFacebook(selectedRecipe)}
                           title="Share on Facebook"
                         >
                           <Facebook className="w-6 h-6" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           className="rounded-full bg-white/20 hover:bg-white/40 text-white hover:text-green-500"
                           onClick={() => shareOnWhatsApp(selectedRecipe)}
                           title="Share on WhatsApp"
                         >
                           <MessageCircle className="w-6 h-6" />
                         </Button>
                       </div>
                     </div>
                   </div>
                </div>
                <CardContent className="p-10 space-y-12 bg-white">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                    <div className="p-4 rounded-3xl bg-[hsl(var(--background))] space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Calories</p>
                      <p className="text-xl font-bold">{selectedRecipe.calories}</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-[hsl(var(--background))] space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Protein</p>
                      <p className="text-xl font-bold">{selectedRecipe.protein}g</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-[hsl(var(--background))] space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Fat</p>
                      <p className="text-xl font-bold">{selectedRecipe.fat}g</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-[hsl(var(--background))] space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Carbs</p>
                      <p className="text-xl font-bold">{selectedRecipe.carbs}g</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-[hsl(var(--background))] space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Fiber</p>
                      <p className="text-xl font-bold">{selectedRecipe.fiber}g</p>
                    </div>
                    <div className="p-4 rounded-3xl bg-[hsl(var(--background))] space-y-1 text-center">
                      <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Time</p>
                      <p className="text-xl font-bold">{selectedRecipe.cookingTime}m</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-2xl serif italic flex items-center gap-2 border-b pb-2">
                      <Info className="w-6 h-6 text-[hsl(var(--primary))]" />
                      Chef's Cooking Tips
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {getCookingTips(selectedRecipe).map((tip, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-[hsl(var(--secondary))] border border-[hsl(var(--primary))/10 text-sm italic">
                          "{tip}"
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
                    <div className="md:col-span-2 space-y-6">
                      <h4 className="text-2xl serif italic flex items-center gap-2 border-b pb-2">
                        Ingredients Checklist
                      </h4>
                      <div className="space-y-4">
                        {selectedRecipe.ingredients.split(', ').map((ing, i) => (
                          <motion.label 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-[hsl(var(--background))] cursor-pointer hover:bg-[hsl(var(--secondary))] transition-colors group"
                          >
                            <input type="checkbox" className="w-5 h-5 rounded-full border-2 border-[hsl(var(--primary))] text-[hsl(var(--primary))] focus:ring-[hsl(var(--primary))]" />
                            <span className="text-lg group-has-[:checked]:line-through group-has-[:checked]:opacity-50">{ing}</span>
                          </motion.label>
                        ))}
                      </div>
                    </div>

                    <div className="md:col-span-3 space-y-6">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h4 className="text-2xl serif italic flex items-center gap-2">
                          Cooking Steps
                        </h4>
                        <Button 
                          onClick={() => setActiveStep(0)}
                          className="rounded-full bg-primary hover:bg-primary/90 text-white"
                          disabled={activeStep !== null}
                        >
                          Cook This Now
                        </Button>
                      </div>
                      <div className="space-y-8 text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">
                        {selectedRecipe.instructions.split('. ').filter(s => s.trim().length > 0).map((step, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex gap-6 group ${activeStep === i ? 'bg-primary/5 p-4 rounded-2xl border border-primary/20 shadow-sm' : ''}`}
                          >
                            <div className={`flex-none w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl border-2 transition-all duration-300 ${activeStep === i ? 'bg-primary text-white border-primary' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] border-[hsl(var(--primary))/10 group-hover:bg-[hsl(var(--primary))] group-hover:text-white'}`}>
                              {i + 1}
                            </div>
                            <div className="space-y-2 pt-1 flex-1">
                              <p className={`font-bold text-sm uppercase tracking-widest ${activeStep === i ? 'text-primary' : 'text-black opacity-40'}`}>Step {i + 1}</p>
                              <p className="text-gray-800 leading-relaxed">{step.trim()}{step.endsWith('.') ? '' : '.'}</p>
                              {activeStep === i && (
                                <div className="pt-4 flex gap-3">
                                  <Button 
                                    onClick={() => setActiveStep(i + 1 < selectedRecipe.instructions.split('. ').filter(s => s.trim().length > 0).length ? i + 1 : null)}
                                    className="rounded-full"
                                  >
                                    {i + 1 < selectedRecipe.instructions.split('. ').filter(s => s.trim().length > 0).length ? 'Next Step' : 'Finish Cooking'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setActiveStep(null)}
                                    className="rounded-full"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {view === 'favorites' && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-4xl font-bold serif">My Favorite Recipes</h2>
                  <p className="opacity-60">Your personal collection of saved recipes</p>
                </div>
                <Button variant="outline" onClick={() => setView('home')} className="rounded-full px-8">
                  Explore More
                </Button>
              </div>

              {favoriteRecipes.length === 0 ? (
                <div className="text-center py-20 bg-white/40 rounded-[3rem] border-2 border-dashed border-[hsl(var(--primary))/20]">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-medium opacity-40">No favorites yet. Start exploring!</p>
                  <Button onClick={() => setView('home')} className="mt-6 rounded-full px-8">
                    Go to Home
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {favoriteRecipes.map((recipe) => (
                    <RecipeCard 
                      key={recipe.id} 
                      recipe={recipe} 
                      onClick={() => handleViewDetails(recipe)} 
                      onRate={handleRate}
                      isFavorite={favorites.includes(recipe.id.toString())}
                      onToggleFavorite={() => toggleFavorite(recipe.id)}
                      onShare={() => handleShare(recipe.id.toString())}
                      isCopied={copiedId === recipe.id.toString()}
                      isFavoritesView={true}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-12 text-center text-[hsl(var(--muted-foreground))] text-sm">
        <p>© 2026 Smart Recipe Recommender • developed by MOHAN SRIRAM</p>
      </footer>
    </div>
  );
}

function RecipeCard({ 
  recipe, 
  onClick, 
  onRate, 
  isFavorite, 
  onToggleFavorite, 
  onShare,
  isCopied,
  isFavoritesView
}: { 
  recipe: Recipe; 
  onClick: () => void; 
  onRate: (id: string, rating: number) => void; 
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  isCopied?: boolean;
  isFavoritesView?: boolean;
  key?: any 
}) {
  // Use curated food images for faster loading and guaranteed relevance
  const imageUrl = getFoodImage(recipe.id, 400, 300);
  
  return (
    <motion.div
      whileHover={{ y: -10 }}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
    >
      <Card className="overflow-hidden border-none shadow-lg rounded-[2.5rem] bg-white/80 backdrop-blur-sm group transition-all duration-300 hover:shadow-2xl h-full flex flex-col">
        <div className="h-48 bg-[hsl(var(--secondary))] relative overflow-hidden flex-none">
          <img 
            src={imageUrl} 
            alt={recipe.name} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4">
            <div className="flex items-center bg-yellow-400/90 text-black border-none backdrop-blur-sm px-3 py-1 rounded-full gap-1 shadow-sm">
              <span className="text-sm">★</span>
              <span className="text-xs font-bold">{recipe.rating}</span>
            </div>
          </div>
          <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
            <div className="flex gap-2">
              {isFavoritesView ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-full shadow-sm text-xs px-3 h-8 bg-red-500/90 hover:bg-red-600 backdrop-blur-md border-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Unsave
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove from Favorites?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to remove "{recipe.name}" from your favorites? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel variant="outline" size="default">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onToggleFavorite()} className="bg-red-500 hover:bg-red-600 text-white">
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className={`rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white transition-all ${isFavorite ? 'text-red-400' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white transition-all ${isCopied ? 'text-green-400' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
              >
                {isCopied ? <Copy className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </Button>
            </div>
            {recipe.matchPercentage !== undefined && recipe.matchPercentage > 0 && (
              <Badge className="bg-[hsl(var(--primary))] text-white border-none backdrop-blur-sm px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                <ShoppingBasket className="w-3 h-3" />
                {recipe.matchPercentage}% Match
              </Badge>
            )}
            <Badge className="bg-white/90 text-black border-none backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
              {recipe.calories} kcal
            </Badge>
          </div>
        </div>
        <CardContent className="p-8 space-y-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">{recipe.cuisine}</p>
            <Leaf className={`w-4 h-4 ${recipe.dietType === 'Veg' ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <h4 className="text-2xl font-bold serif leading-tight group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-2 min-h-[4rem]">
            {recipe.name}
          </h4>
          <div className="flex flex-wrap gap-1 flex-1 content-start">
            {recipe.ingredients.split(', ').slice(0, 3).map((ing, i) => (
              <span key={i} className="text-[10px] bg-[hsl(var(--background))] px-2 py-0.5 rounded-full opacity-60">
                {ing}
              </span>
            ))}
            {recipe.ingredients.split(', ').length > 3 && (
              <span className="text-[10px] opacity-40">+{recipe.ingredients.split(', ').length - 3} more</span>
            )}
          </div>
          <Button variant="ghost" className="w-full rounded-full border border-[hsl(var(--border))] group-hover:bg-[hsl(var(--primary))] group-hover:text-white transition-all mt-auto">
            View Recipe
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
