import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { FileSearch, Mail, Phone, Chrome, Eye, EyeOff, Loader2 } from 'lucide-react';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const phoneSchema = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number');

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithPhone, verifyOTP } = useAuth();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateEmail = () => {
    try {
      emailSchema.parse(email);
      setErrors(prev => ({ ...prev, email: '' }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, email: e.errors[0].message }));
      }
      return false;
    }
  };

  const validatePassword = () => {
    try {
      passwordSchema.parse(password);
      setErrors(prev => ({ ...prev, password: '' }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, password: e.errors[0].message }));
      }
      return false;
    }
  };

  const validatePhone = () => {
    try {
      phoneSchema.parse(phone);
      setErrors(prev => ({ ...prev, phone: '' }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, phone: e.errors[0].message }));
      }
      return false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail() || !validatePassword()) return;
    
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({ title: 'Account exists', description: 'This email is already registered. Please sign in instead.', variant: 'destructive' });
          } else {
            toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
          }
        } else {
          toast({ title: 'Welcome!', description: 'Account created successfully.' });
        }
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          toast({ title: 'Sign in failed', description: 'Invalid email or password.', variant: 'destructive' });
        } else {
          toast({ title: 'Welcome back!', description: 'You have signed in successfully.' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: 'Google sign in failed', description: error.message, variant: 'destructive' });
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;
    
    setLoading(true);
    try {
      const { error } = await signInWithPhone(phone);
      if (error) {
        toast({ title: 'Failed to send OTP', description: error.message, variant: 'destructive' });
      } else {
        setOtpSent(true);
        toast({ title: 'OTP sent', description: 'Please check your phone for the verification code.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter the 6-digit code' }));
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await verifyOTP(phone, otp);
      if (error) {
        toast({ title: 'Verification failed', description: 'Invalid or expired code.', variant: 'destructive' });
      } else {
        toast({ title: 'Welcome!', description: 'Phone verified successfully.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{isSignUp ? 'Sign Up' : 'Sign In'} | OCR Document Extractor</title>
      </Helmet>

      <div className="min-h-screen gradient-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 rounded-xl gradient-primary">
              <FileSearch className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">OCR Extractor</h1>
              <p className="text-sm text-muted-foreground">Document Intelligence</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-lg">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </CardTitle>
              <CardDescription>
                {isSignUp 
                  ? 'Sign up to start extracting data from your documents'
                  : 'Sign in to access your document extractions'
                }
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Google Sign In */}
              <Button
                variant="outline"
                className="w-full h-11 gap-3"
                onClick={handleGoogleAuth}
                disabled={loading}
              >
                <Chrome className="h-5 w-5" />
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Auth Method Tabs */}
              <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as 'email' | 'phone')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="phone" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Phone
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="mt-4">
                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    {isSignUp && (
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onBlur={validateEmail}
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={validatePassword}
                          className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isSignUp ? 'Sign Up' : 'Sign In'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="phone" className="mt-4">
                  {!otpSent ? (
                    <form onSubmit={handlePhoneAuth} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={validatePhone}
                          className={errors.phone ? 'border-destructive' : ''}
                        />
                        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                        <p className="text-xs text-muted-foreground">Include country code (e.g., +91 for India)</p>
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Send OTP
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTP} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp">Verification Code</Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="123456"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className={errors.otp ? 'border-destructive' : ''}
                          maxLength={6}
                        />
                        {errors.otp && <p className="text-xs text-destructive">{errors.otp}</p>}
                      </div>
                      
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Verify OTP
                      </Button>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setOtpSent(false)}
                      >
                        Change phone number
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>

              {/* Toggle Sign Up/In */}
              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </span>{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Auth;
