'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import { RiFireLine, RiCalendarCheckLine, RiTrophyLine, RiTimeLine } from '@remixicon/react';
import { IntelligenceCard, ProgressSummaryCard, LeaderboardCard } from '@/components/dashboard/widgets';

export default function DashboardPage() {
  const { user, profile } = useAuth();

  // These would come from API later (stats endpoint)
  const stats = [
    { name: 'Study Streak', value: '0 days', icon: RiFireLine, color: 'text-orange-500' },
    { name: 'Tasks Completed', value: '0/0', icon: RiCalendarCheckLine, color: 'text-green-500' },
    { name: 'Quiz Score', value: 'N/A', icon: RiTrophyLine, color: 'text-yellow-500' },
    { name: 'Study Time', value: '0h', icon: RiTimeLine, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Student'}!</h1>
        <p className="text-muted-foreground">Here's your learning progress overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Progress Summary */}
          <ProgressSummaryCard />

          {/* Today's Study Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Study Plan</CardTitle>
              <CardDescription>Your tasks for today</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No tasks scheduled yet</p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Intelligence Card */}
          <IntelligenceCard />

          {/* Leaderboard Card */}
          <LeaderboardCard />
        </div>
      </div>

      {/* Weak Topics */}
      <Card>
        <CardHeader>
          <CardTitle>Weak Topics</CardTitle>
          <CardDescription>Topics that need more practice based on quiz performance</CardDescription>
        </CardHeader>
        <CardContent>
          {profile?.weak_topics && profile.weak_topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.weak_topics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start taking quizzes to identify weak topics
            </p>
          )}
        </CardContent>
      </Card>

      {/* Strong Topics */}
      {profile?.strong_topics && profile.strong_topics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Strong Topics</CardTitle>
            <CardDescription>Topics where you're performing well</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.strong_topics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-sm"
                >
                  {topic}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
