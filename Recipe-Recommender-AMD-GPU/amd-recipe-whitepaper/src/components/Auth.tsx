import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChefHat, Mail, Lock, Chrome, ArrowRight, Loader2, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [totalRecipes, setTotalRecipes] = useState<number | null>(null);

  React.useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setTotalRecipes(data.totalRecipes))
      .catch(() => {});
  }, []);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
        await sendEmailVerification(userCredential.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-colors duration-700 ${isLogin ? 'bg-blue-500' : 'bg-orange-500'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] opacity-20 transition-colors duration-700 ${isLogin ? 'bg-primary' : 'bg-purple-500'}`} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            animate={{ rotate: isLogin ? 0 : 180 }}
            className={`p-4 rounded-3xl mb-4 shadow-xl transition-colors duration-500 ${isLogin ? 'bg-primary' : 'bg-orange-500'}`}
          >
            <ChefHat className="w-12 h-12 text-white" />
          </motion.div>
          <h1 className="text-4xl font-bold serif tracking-tight text-center">Smart Recipe</h1>
          <p className="text-muted-foreground mt-2">
            Your AI Culinary Assistant
            {totalRecipes !== null && ` • ${totalRecipes.toLocaleString()} Recipes`}
          </p>
        </div>

        <Card className={`border-t-8 shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md transition-all duration-500 ${isLogin ? 'border-t-primary' : 'border-t-orange-500'}`}>
          <CardHeader className="pt-10 px-10 pb-6 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardTitle className={`text-3xl serif italic mb-2 ${isLogin ? 'text-primary' : 'text-orange-600'}`}>
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </CardTitle>
                <CardDescription>
                  {isLogin 
                    ? 'Sign in to access your personalized recipes' 
                    : 'Join us to start your culinary journey'}
                </CardDescription>
              </motion.div>
            </AnimatePresence>
          </CardHeader>
          <CardContent className="px-10 pb-10 space-y-6">
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div 
                    key="name-field"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 8 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                      <Input 
                        type="text" 
                        placeholder="Full Name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 rounded-full h-12 focus-visible:ring-offset-0"
                        required={!isLogin}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <Input 
                    type="email" 
                    placeholder="Email Address" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 rounded-full h-12 focus-visible:ring-offset-0"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                  <Input 
                    type="password" 
                    placeholder="Password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 rounded-full h-12 focus-visible:ring-offset-0"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-100 rounded-xl p-3"
                >
                  <p className="text-[10px] text-red-600 leading-tight">
                    {error.includes('auth/unauthorized-domain') 
                      ? `Domain "${window.location.hostname}" is not authorized. Please ensure this exact string is added to your Firebase Console Authorized Domains list.`
                      : error}
                  </p>
                </motion.div>
              )}

              {resetSent && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-green-600 px-2"
                >
                  Password reset email sent!
                </motion.p>
              )}

              <Button 
                type="submit" 
                className={`w-full rounded-full h-12 text-lg font-medium group transition-colors duration-500 ${isLogin ? 'bg-primary hover:bg-primary/90' : 'bg-orange-500 hover:bg-orange-600'}`}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {isLogin ? 'Sign In' : 'Sign Up'}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full rounded-full h-12 gap-3 font-medium"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <Chrome className="w-5 h-5 text-blue-500" />
              Google
            </Button>

            <div className="flex flex-col items-center gap-2 text-sm">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-semibold hover:underline"
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
              {isLogin && (
                <button 
                  type="button"
                  onClick={handleResetPassword}
                  className="text-muted-foreground text-xs hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
