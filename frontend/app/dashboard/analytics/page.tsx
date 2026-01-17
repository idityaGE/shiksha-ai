'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  RiFireLine,
  RiTrophyLine,
  RiTimeLine,
  RiBookOpenLine,
  RiLoader4Line,
  RiCheckLine,
} from '@remixicon/react';
import { cn } from '@/lib/utils';

interface StatsData {
  streak: {
    current_streak: number;
    longest_streak: number;
  };
  activity: {
    total_sessions: number;
    total_quizzes: number;
    total_plans: number;
  };
  quiz_performance: {
    average_score: number;
    total_attempts: number;
    best_score: number;
  };
  weak_topics: Array<{
    topic: string;
    weakness_score: number;
  }>;
  strong_topics: string[];
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats/overview`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Study Streak',
      value: stats?.streak.current_streak || 0,
      suffix: 'days',
      icon: RiFireLine,
      color: 'text-orange-500',
      description: `Longest: ${stats?.streak.longest_streak || 0} days`,
    },
    {
      title: 'Quiz Average',
      value: stats?.quiz_performance.average_score.toFixed(0) || 0,
      suffix: '%',
      icon: RiTrophyLine,
      color: 'text-yellow-500',
      description: `${stats?.quiz_performance.total_attempts || 0} attempts`,
    },
    {
      title: 'Tutor Sessions',
      value: stats?.activity.total_sessions || 0,
      suffix: '',
      icon: RiBookOpenLine,
      color: 'text-blue-500',
      description: 'Total conversations',
    },
    {
      title: 'Study Plans',
      value: stats?.activity.total_plans || 0,
      suffix: '',
      icon: RiCheckLine,
      color: 'text-green-500',
      description: 'Plans created',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your learning progress and performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.value}
                {stat.suffix}
              </div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weak Topics</CardTitle>
            <CardDescription>Topics that need more practice</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.weak_topics && stats.weak_topics.length > 0 ? (
              <div className="space-y-4">
                {stats.weak_topics.slice(0, 5).map((topic, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{topic.topic}</span>
                      <span className="text-muted-foreground">
                        {topic.weakness_score.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={topic.weakness_score} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No weak topics identified yet. Keep learning!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strong Topics</CardTitle>
            <CardDescription>Topics you've mastered</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.strong_topics && stats.strong_topics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.strong_topics.map((topic, index) => (
                  <div
                    key={index}
                    className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400"
                  >
                    {topic}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete quizzes to identify your strengths
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Performance</CardTitle>
          <CardDescription>Your quiz attempt history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {stats?.quiz_performance.average_score.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Average Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {stats?.quiz_performance.best_score.toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Best Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {stats?.quiz_performance.total_attempts}
                </p>
                <p className="text-xs text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
