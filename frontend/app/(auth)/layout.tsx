import { ModeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Shiksha AI</h1>
        <p className="text-muted-foreground mt-2">Your personalized AI learning companion</p>
      </div>
      {children}
    </div>
  );
}
