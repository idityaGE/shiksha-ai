'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/lib/hooks/use-auth';
import {
  signupSchema,
  type SignupInput,
  CLASS_LEVELS,
  BOARDS,
  SUBJECTS,
} from '@/lib/validations/auth.validation';
import Link from 'next/link';
import { RiLoader4Line, RiCheckLine, RiMailLine, RiExternalLinkLine } from '@remixicon/react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

export function SignupForm() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      subjects: [],
    },
  });

  const password = watch('password');

  const calculatePasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, feedback: '' };
    let score = 0;
    let feedback = '';

    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) feedback = 'Weak';
    else if (score <= 3) feedback = 'Fair';
    else if (score <= 4) feedback = 'Good';
    else feedback = 'Strong';

    return { score, feedback };
  };

  const handleSubjectToggle = (subject: string) => {
    const updated = selectedSubjects.includes(subject)
      ? selectedSubjects.filter((s) => s !== subject)
      : [...selectedSubjects, subject];
    setSelectedSubjects(updated);
    setValue('subjects', updated);
  };

  const onSubmit = async (data: SignupInput) => {
    try {
      setUserEmail(data.email);
      await signup(data);
      setShowVerificationMessage(true);
    } catch (error) {
      // Error already handled by auth store and shown in toast
      console.error('Signup failed:', error);
    }
  };

  // Email verification success screen
  if (showVerificationMessage) {
    return (
      <div className="w-full text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <RiMailLine className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight mb-2">Check your email</h2>
        <p className="text-muted-foreground mb-6">
          We've sent a verification link to{' '}
          <span className="font-medium text-foreground">{userEmail}</span>
        </p>
        
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3 mb-6 text-left">
          <div className="flex items-start gap-3">
            <RiCheckLine className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Verify your email address</p>
              <p className="text-sm text-muted-foreground">
                Click the verification link in the email to activate your account
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <RiCheckLine className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Check your spam folder</p>
              <p className="text-sm text-muted-foreground">
                If you don't see the email, check your spam or junk folder
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={() => {
              // Common email provider links
              const domain = userEmail.split('@')[1];
              const emailUrls: Record<string, string> = {
                'gmail.com': 'https://mail.google.com',
                'yahoo.com': 'https://mail.yahoo.com',
                'outlook.com': 'https://outlook.live.com',
                'hotmail.com': 'https://outlook.live.com',
              };
              const url = emailUrls[domain] || 'https://mail.google.com';
              window.open(url, '_blank');
            }}
          >
            <RiExternalLinkLine className="mr-2 h-4 w-4" />
            Open Email
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Continue to Login
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Already verified?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Create an account</h2>
        <p className="text-muted-foreground mt-1">Enter your details to get started with Shiksha AI</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            disabled={isLoading}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            disabled={isLoading}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={isLoading}
            {...register('password', {
              onChange: (e) => setPasswordStrength(calculatePasswordStrength(e.target.value)),
            })}
          />
          {password && (
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    passwordStrength.score <= 2
                      ? 'bg-destructive w-1/3'
                      : passwordStrength.score <= 3
                      ? 'bg-yellow-500 w-2/3'
                      : 'bg-green-500 w-full'
                  }`}
                />
              </div>
              <span className="text-xs text-muted-foreground w-12">
                {passwordStrength.feedback}
              </span>
            </div>
          )}
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class</Label>
            <Select
              disabled={isLoading}
              onValueChange={(value) => setValue('class', parseInt(value))}
            >
              <SelectTrigger id="class">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {CLASS_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.class && (
              <p className="text-sm text-destructive">{errors.class.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="board">Board</Label>
            <Select disabled={isLoading} onValueChange={(value) => setValue('board', value)}>
              <SelectTrigger id="board">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {BOARDS.map((board) => (
                  <SelectItem key={board.value} value={board.value}>
                    {board.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.board && (
              <p className="text-sm text-destructive">{errors.board.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Subjects</Label>
          <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto p-3 border rounded-md">
            {SUBJECTS.map((subject) => (
              <div key={subject.value} className="flex items-center space-x-2">
                <Checkbox
                  id={subject.value}
                  checked={selectedSubjects.includes(subject.value)}
                  onCheckedChange={() => handleSubjectToggle(subject.value)}
                  disabled={isLoading}
                />
                <label
                  htmlFor={subject.value}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {subject.label}
                </label>
              </div>
            ))}
          </div>
          {errors.subjects && (
            <p className="text-sm text-destructive">{errors.subjects.message}</p>
          )}
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>
        
        <p className="text-sm text-center text-muted-foreground pt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
