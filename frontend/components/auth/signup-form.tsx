'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { RiLoader4Line, RiCheckLine } from '@remixicon/react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

export function SignupForm() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

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
      await signup(data);
      router.push('/');
    } catch (error) {
      // Error already handled by auth store and shown in toast
      console.error('Signup failed:', error);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>Enter your details to get started with Shiksha AI</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
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
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border rounded-md">
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
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
