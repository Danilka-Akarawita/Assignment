'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/auth/store';
import { Bot, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const { login, register, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      router.replace('/chat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <Card className="w-full max-w-md border-brand-200/60 shadow-elevated">
      <CardHeader className="space-y-3">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-100 lg:hidden">
          <Bot className="size-6 text-brand-400" />
        </div>
        <div>
          <CardTitle className="text-2xl font-semibold">
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </CardTitle>
          <CardDescription className="mt-1.5 text-base">
            {mode === 'login'
              ? 'Access your AI assistant workspace'
              : 'Register to start chatting with your knowledge base'}
          </CardDescription>
        </div>
      </CardHeader>
      <form onSubmit={(e) => void submit(e)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 bg-white"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="h-10 w-full shadow-sm" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === 'login' ? 'Sign in' : 'Register'}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            {mode === 'login' ? (
              <>
                No account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
