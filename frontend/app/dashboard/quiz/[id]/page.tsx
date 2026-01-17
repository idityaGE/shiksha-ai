'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { RiCheckLine, RiCloseLine, RiLoader4Line, RiTimeLine } from '@remixicon/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Question {
  question: string;
  options: string[];
  difficulty?: string;
  topic?: string;
}

interface QuizData {
  quiz: {
    id: string;
    subject: string;
    chapter: string;
    topic: string;
    difficulty: string;
    total_questions: number;
  };
  questions: Question[];
}

export default function QuizAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [startTime] = useState(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetchQuiz();
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/${quizId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch quiz');

      const data = await response.json();
      setQuizData(data.data);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
      router.push('/dashboard/quiz');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== quizData?.questions.length) {
      toast.error('Please answer all questions before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        question_index: parseInt(index),
        selected_answer: answer as 'A' | 'B' | 'C' | 'D',
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          quiz_id: quizId,
          answers: formattedAnswers,
          time_taken_seconds: timeTaken,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit quiz');

      const data = await response.json();
      setResults(data.data);
      setShowResults(true);
      toast.success(`Quiz completed! Score: ${data.data.attempt.score_percent.toFixed(0)}%`);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <RiLoader4Line className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quizData) return null;

  if (showResults && results) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-3xl">Quiz Results</CardTitle>
            <CardDescription className="text-center">
              {quizData.quiz.subject} - {quizData.quiz.chapter}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="mb-2 text-6xl font-bold text-primary">
                {results.attempt.score_percent.toFixed(0)}%
              </div>
              <p className="text-lg text-muted-foreground">
                {results.attempt.correct_answers} / {results.attempt.total_questions} correct
              </p>
            </div>

            <div className="space-y-4">
              {results.results.map((result: any, index: number) => (
                <Card key={index} className={cn(result.is_correct ? 'border-green-500' : 'border-red-500')}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      {result.is_correct ? (
                        <RiCheckLine className="h-5 w-5 shrink-0 text-green-500" />
                      ) : (
                        <RiCloseLine className="h-5 w-5 shrink-0 text-red-500" />
                      )}
                      <div className="flex-1 space-y-2">
                        <p className="font-medium">{result.question}</p>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-muted-foreground">Your answer:</span>{' '}
                            <span className={result.is_correct ? 'text-green-600' : 'text-red-600'}>
                              {result.selected_answer}
                            </span>
                          </p>
                          {!result.is_correct && (
                            <p>
                              <span className="text-muted-foreground">Correct answer:</span>{' '}
                              <span className="text-green-600">{result.correct_answer}</span>
                            </p>
                          )}
                          {result.explanation && (
                            <p className="text-muted-foreground italic">{result.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => router.push('/dashboard/quiz')} className="flex-1">
                Back to Quizzes
              </Button>
              <Button onClick={() => router.push(`/dashboard/quiz/${quizId}`)} variant="outline" className="flex-1">
                Retry Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestion + 1) / quizData.questions.length) * 100;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{quizData.quiz.subject}</h1>
            <p className="text-muted-foreground">{quizData.quiz.chapter}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {quizData.questions.length}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {quizData.questions[currentQuestion].question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={answers[currentQuestion]}
            onValueChange={(value) =>
              setAnswers({ ...answers, [currentQuestion]: value })
            }
          >
            {quizData.questions[currentQuestion].options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <RadioGroupItem value={['A', 'B', 'C', 'D'][idx]} id={`option-${idx}`} />
                <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                  {['A', 'B', 'C', 'D'][idx]}. {option}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              Previous
            </Button>

            {currentQuestion === quizData.questions.length - 1 ? (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </Button>
            ) : (
              <Button
                onClick={() =>
                  setCurrentQuestion((prev) =>
                    Math.min(quizData.questions.length - 1, prev + 1)
                  )
                }
              >
                Next
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
