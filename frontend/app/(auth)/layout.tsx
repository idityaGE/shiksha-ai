import { ModeToggle } from '@/components/theme-toggle';
import { RiBookOpenLine, RiSparklingLine, RiRobot2Line, RiBarChartLine } from '@remixicon/react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-gradient-to-br from-primary/10 via-primary/5 to-background p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <RiBookOpenLine className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Shiksha AI</h1>
              <p className="text-sm text-muted-foreground">Learn Smarter</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Your Personalized AI Learning Companion
            </h2>
            <p className="text-lg text-muted-foreground">
              Master your curriculum with AI-powered tutoring, adaptive quizzes, and intelligent study planning.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <RiRobot2Line className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Tutor</h3>
                <p className="text-sm text-muted-foreground">
                  Get instant help with NCERT-aligned explanations
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <RiSparklingLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Quizzes</h3>
                <p className="text-sm text-muted-foreground">
                  Practice with AI-generated questions tailored to your level
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <RiBarChartLine className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your growth with detailed analytics
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="flex flex-1 flex-col">
        <div className="absolute top-4 right-4 z-10">
          <ModeToggle />
        </div>
        
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile Logo */}
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <RiBookOpenLine className="h-9 w-9" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Shiksha AI</h1>
              <p className="text-muted-foreground mt-2">Your AI learning companion</p>
            </div>
            
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
