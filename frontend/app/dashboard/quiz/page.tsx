'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  RiQuestionLine, 
  RiLoader4Line, 
  RiSparklingLine, 
  RiCheckLine, 
  RiTimeLine,
  RiPlayCircleLine 
} from '@remixicon/react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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

interface Quiz {
  id: string;
  subject: string;
  chapter: string;
  topic: string | null;
  difficulty: string;
  num_questions: number;
  created_at: string;
  latest_attempt?: {
    score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
  };
}

export default function QuizPage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [quizHistory, setQuizHistory] = useState<Quiz[]>([]);
  const [formData, setFormData] = useState({
    subject: '',
    chapter: '',
    topic: '',
    difficulty: 'medium',
    num_questions: 5,
  });

  useEffect(() => {
    fetchQuizHistory();
  }, []);

  const fetchQuizHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/quiz/list?limit=10`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setQuizHistory(data.data.quizzes || []);
      }
    } catch (error) {
      console.error('Error fetching quiz history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleGenerate = async () => {
    if (!formData.subject || !formData.chapter) {
      toast.error('Please fill in subject and chapter');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to generate quiz');
      }

      const data = await response.json();
      toast.success('Quiz generated successfully!');
      
      // Refresh quiz history
      await fetchQuizHistory();
      
      // Navigate to quiz attempt page
      router.push(`/dashboard/quiz/${data.data.quiz.id}`);
    } catch (error: any) {
      console.error('Error generating quiz:', error);
      toast.error(error.message || 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quiz</h1>
        <p className="text-muted-foreground">Generate AI-powered quizzes to test your knowledge</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiSparklingLine className="h-5 w-5 text-primary" />
              Generate New Quiz
            </CardTitle>
            <CardDescription>Create a personalized quiz on any topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={formData.subject}
                onValueChange={(value) => setFormData({ ...formData, subject: value })}
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
              <Label htmlFor="chapter">Chapter</Label>
              <Input
                id="chapter"
                placeholder="e.g., Motion and Time"
                value={formData.chapter}
                onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic (Optional)</Label>
              <Input
                id="topic"
                placeholder="e.g., Speed and Velocity"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
                >
                  <SelectTrigger id="difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="num_questions">Questions</Label>
                <Select
                  value={formData.num_questions.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, num_questions: parseInt(value) })
                  }
                >
                  <SelectTrigger id="num_questions">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 15, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
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
                  Generate Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiQuestionLine className="h-5 w-5" />
              Recent Quizzes
            </CardTitle>
            <CardDescription>Your quiz history</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : quizHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quizzes yet. Generate one to get started!</p>
            ) : (
              <div className="space-y-3">
                {quizHistory.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/quiz/${quiz.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{quiz.subject}</h4>
                        <Badge variant="outline" className="capitalize text-xs">
                          {quiz.difficulty}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {quiz.chapter}
                        {quiz.topic && ` • ${quiz.topic}`}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiQuestionLine className="h-3 w-3" />
                          {quiz.num_questions} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="h-3 w-3" />
                          {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    {quiz.latest_attempt ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">
                            {quiz.latest_attempt.percentage.toFixed(0)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {quiz.latest_attempt.score}/{quiz.latest_attempt.total_questions}
                          </p>
                        </div>
                        <RiCheckLine className="h-4 w-4 text-green-500" />
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost">
                        <RiPlayCircleLine className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
