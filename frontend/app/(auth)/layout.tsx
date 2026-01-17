import { ModeToggle } from '@/components/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4">
        <ModeToggle />
      </div>

      {/* Logo & Title */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Shiksha AI</h1>
        <p className="text-muted-foreground mt-1">Your AI learning companion</p>
      </div>

      {/* Auth Form */}
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}
