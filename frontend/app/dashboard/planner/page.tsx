'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  RiCalendarLine,
  RiCheckLine,
  RiTimeLine,
  RiBookOpenLine,
  RiLoader4Line,
  RiPlayCircleLine,
  RiSparklingLine,
} from '@remixicon/react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Task {
  id: string;
  task_type: string;
  subject: string;
  chapter: string;
  topic: string;
  duration_min: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  scheduled_at: string;
}

interface PlanData {
  plan: {
    id: string;
    plan_date: string;
    plan_meta: {
      title?: string;
      subject?: string;
      daily_hours?: number;
    };
  };
  tasks: Task[];
}

const SUBJECTS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Hindi',
  'Social Science',
  'History',
  'Geography',
];

export default function PlannerPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    subject: '',
    exam_date: '',
    daily_study_hours: 2,
  });

  useEffect(() => {
    fetchPlan();
  }, [selectedDate]);

  const fetchPlan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/planner/plan?date=${selectedDate}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlanData(data.data);
      } else {
        setPlanData(null);
      }
    } catch (error) {
      console.error('Error fetching plan:', error);
      setPlanData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!generateForm.subject || !generateForm.exam_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/planner/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...generateForm,
          exam_date: new Date(generateForm.exam_date).toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate plan');
      }

      toast.success('Study plan generated successfully!');
      setShowGenerateDialog(false);
      fetchPlan();
    } catch (error: any) {
      console.error('Error generating plan:', error);
      toast.error(error.message || 'Failed to generate study plan');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    // Optimistically update UI
    if (planData) {
      const updatedTasks = planData.tasks.map((task) =>
        task.id === taskId ? { ...task, status: status as Task['status'] } : task
      );
      setPlanData({ ...planData, tasks: updatedTasks });
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/planner/task/${taskId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            status,
            completed_at: status === 'completed' ? new Date().toISOString() : undefined,
          }),
        }
      );

      if (!response.ok) {
        // Revert on error
        fetchPlan();
        throw new Error('Failed to update task');
      }

      toast.success('Task updated!');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const completedTasks = planData?.tasks.filter((t) => t.status === 'completed').length || 0;
  const totalTasks = planData?.tasks.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'study':
        return RiBookOpenLine;
      case 'quiz':
        return RiPlayCircleLine;
      case 'revision':
        return RiCheckLine;
      default:
        return RiTimeLine;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Study Planner</h1>
          <p className="text-muted-foreground">Plan and track your daily study tasks</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <RiSparklingLine className="mr-2 h-4 w-4" />
                Generate Plan
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Study Plan</DialogTitle>
                <DialogDescription>
                  Create a personalized study plan based on your exam schedule
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={generateForm.subject}
                    onValueChange={(value) =>
                      setGenerateForm({ ...generateForm, subject: value })
                    }
                  >
                    <SelectTrigger id="subject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exam_date">Exam Date</Label>
                  <Input
                    id="exam_date"
                    type="date"
                    value={generateForm.exam_date}
                    onChange={(e) =>
                      setGenerateForm({ ...generateForm, exam_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily_study_hours">Daily Study Hours</Label>
                  <Select
                    value={generateForm.daily_study_hours.toString()}
                    onValueChange={(value) =>
                      setGenerateForm({
                        ...generateForm,
                        daily_study_hours: parseFloat(value),
                      })
                    }
                  >
                    <SelectTrigger id="daily_study_hours">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6].map((hours) => (
                        <SelectItem key={hours} value={hours.toString()}>
                          {hours} {hours === 1 ? 'hour' : 'hours'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RiSparklingLine className="mr-2 h-4 w-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {!planData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RiCalendarLine className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No Plan for This Day</h3>
            <p className="mb-4 text-center text-sm text-muted-foreground">
              Generate a study plan to get personalized daily tasks
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{planData.plan.plan_meta.title || 'Study Plan'}</CardTitle>
                  <CardDescription>
                    {planData.plan.plan_meta.subject} • {planData.plan.plan_meta.daily_hours}h/day
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{progress.toFixed(0)}%</div>
                  <p className="text-sm text-muted-foreground">
                    {completedTasks}/{totalTasks} completed
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Today's Tasks</h2>
            {planData.tasks.map((task) => {
              const Icon = getTaskIcon(task.task_type);
              return (
                <Card
                  key={task.id}
                  className={cn(
                    'transition-colors',
                    task.status === 'completed' && 'bg-muted/50'
                  )}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={(checked) =>
                        updateTaskStatus(task.id, checked ? 'completed' : 'pending')
                      }
                    />
                    <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={cn(
                            'font-medium',
                            task.status === 'completed' && 'line-through text-muted-foreground'
                          )}
                        >
                          {task.topic}
                        </h3>
                        <Badge variant="outline" className="capitalize">
                          {task.task_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.subject} • {task.chapter}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <RiTimeLine className="h-4 w-4" />
                      {task.duration_min}m
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
