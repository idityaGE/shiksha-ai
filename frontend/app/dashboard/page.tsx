'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import { RiFireLine, RiCalendarCheckLine, RiTrophyLine, RiTimeLine } from '@remixicon/react';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { name: 'Study Streak', value: '0 days', icon: RiFireLine, color: 'text-orange-500' },
    { name: 'Tasks Completed', value: '0/0', icon: RiCalendarCheckLine, color: 'text-green-500' },
    { name: 'Quiz Score', value: 'N/A', icon: RiTrophyLine, color: 'text-yellow-500' },
    { name: 'Study Time', value: '0h', icon: RiTimeLine, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Student'}!</h1>
        <p className="text-muted-foreground">Here's your learning progress overview</p>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's Study Plan</CardTitle>
            <CardDescription>Your tasks for today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No tasks scheduled yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your learning activity</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weak Topics</CardTitle>
          <CardDescription>Topics that need more practice</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Start learning to identify weak topics</p>
        </CardContent>
      </Card>
    </div>
  );
}
