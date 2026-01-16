/**
 * Study Plan Context
 */
export interface PlannerPromptContext {
  studentClass: number;
  board: string;
  subject: string;
  examDate: string; // ISO date string
  weakTopics: string[];
  strongTopics: string[];
  dailyStudyHours: number;
  currentDate?: string; // ISO date string
}

/**
 * Study Plan Structure
 */
export interface StudyPlan {
  title: string;
  total_days: number;
  daily_hours: number;
  phases: StudyPhase[];
}

export interface StudyPhase {
  name: string;
  duration_days: number;
  focus: string;
  tasks: StudyTask[];
}

export interface StudyTask {
  day: number;
  title: string;
  description: string;
  estimated_hours: number;
  resources: string[];
  topics: string[];
}

/**
 * Calculate days until exam
 */
const calculateDaysUntilExam = (examDate: string, currentDate?: string): number => {
  const exam = new Date(examDate);
  const today = currentDate ? new Date(currentDate) : new Date();
  const diffTime = exam.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1); // At least 1 day
};

/**
 * Generate study plan creation prompt
 */
export const getStudyPlanPrompt = (context: PlannerPromptContext): string => {
  const daysUntilExam = calculateDaysUntilExam(context.examDate, context.currentDate);
  const totalStudyHours = daysUntilExam * context.dailyStudyHours;

  // Calculate phase durations (Foundation 40%, Practice 40%, Revision 20%)
  const foundationDays = Math.ceil(daysUntilExam * 0.4);
  const practiceDays = Math.ceil(daysUntilExam * 0.4);
  const revisionDays = daysUntilExam - foundationDays - practiceDays;

  return `Create a personalized study plan for a Class ${context.studentClass} ${context.board} student preparing for ${context.subject} exam.

**Student Profile:**
- Class: ${context.studentClass}
- Board: ${context.board}
- Subject: ${context.subject}
- Days until exam: ${daysUntilExam}
- Daily study hours available: ${context.dailyStudyHours}
- Total study hours available: ${totalStudyHours}

**Weak Topics (PRIORITIZE THESE):**
${context.weakTopics.length > 0 ? context.weakTopics.map(t => `- ${t}`).join('\n') : '- None identified yet'}

**Strong Topics (Quick revision only):**
${context.strongTopics.length > 0 ? context.strongTopics.map(t => `- ${t}`).join('\n') : '- None identified yet'}

**Plan Structure:**

**Phase 1: Foundation Building (${foundationDays} days, ~40%)**
- Cover all chapters systematically
- **Prioritize weak topics** - allocate more time here
- Focus on understanding concepts from NCERT
- Take detailed notes
- Solve NCERT examples and in-text questions

**Phase 2: Practice & Application (${practiceDays} days, ~40%)**
- Solve NCERT exercise questions
- Practice numerical problems
- Work on previous year questions
- **More practice on weak topics**
- Self-assessment quizzes

**Phase 3: Revision & Consolidation (${revisionDays} days, ~20%)**
- Quick revision of all chapters
- Focus on formulas, definitions, key concepts
- Solve sample papers
- **Quick drill on weak topics**
- Last-minute doubt clearing

**Requirements:**
1. **Realistic Tasks**: Each day's tasks should fit in ${context.dailyStudyHours} hours
2. **NCERT First**: Base all resources on NCERT textbook (mention chapter numbers and page ranges)
3. **Weak Topic Priority**: Allocate 60% of time to weak topics, 40% to other topics
4. **Balanced**: Include reading, solving, practice, and revision
5. **Breaks**: Include short breaks between study sessions
6. **Flexibility**: Some buffer days for unexpected delays

**Output Format:**
Return ONLY a valid JSON object (no markdown):

{
  "title": "Class ${context.studentClass} ${context.subject} - ${daysUntilExam} Day Study Plan",
  "total_days": ${daysUntilExam},
  "daily_hours": ${context.dailyStudyHours},
  "phases": [
    {
      "name": "Foundation Building",
      "duration_days": ${foundationDays},
      "focus": "Understanding core concepts from NCERT",
      "tasks": [
        {
          "day": 1,
          "title": "Chapter 1: Introduction to [Topic]",
          "description": "Read NCERT Chapter 1, understand key definitions and concepts. Focus on [specific weak topic if applicable].",
          "estimated_hours": ${context.dailyStudyHours},
          "resources": ["NCERT Class ${context.studentClass} ${context.subject} Ch 1 (pg 1-15)", "NCERT Examples 1.1-1.5"],
          "topics": ["Topic 1", "Topic 2"]
        }
      ]
    }
  ]
}

Generate the complete study plan now:`;
};

/**
 * Generate prompt for daily task recommendations
 */
export const getDailyTaskPrompt = (
  currentDay: number,
  studyPlan: StudyPlan,
  completedTasks: string[],
  studentPerformance: { topic: string; score: number }[]
): string => {
  return `Generate today's study tasks based on the student's progress.

**Current Day:** Day ${currentDay} of ${studyPlan.total_days}
**Daily Study Hours:** ${studyPlan.daily_hours}

**Original Plan Progress:**
${JSON.stringify(studyPlan, null, 2)}

**Completed Tasks:**
${completedTasks.length > 0 ? completedTasks.join('\n') : 'None yet'}

**Recent Performance:**
${studentPerformance.map(p => `- ${p.topic}: ${p.score}%`).join('\n')}

**Instructions:**
1. If student is behind schedule, prioritize catching up
2. If student scored <60% on any topic, add extra practice for that topic
3. Maintain the original plan's structure but adapt based on progress
4. Keep total time within ${studyPlan.daily_hours} hours

Return today's recommended tasks as a JSON array.`;
};

/**
 * Generate prompt for study plan adjustment
 */
export const getStudyPlanAdjustmentPrompt = (
  originalPlan: StudyPlan,
  completedDays: number,
  weaknessesIdentified: string[],
  newExamDate?: string
): string => {
  return `Adjust this study plan based on student's progress and new information.

**Original Plan:**
${JSON.stringify(originalPlan, null, 2)}

**Progress:**
- Days completed: ${completedDays} / ${originalPlan.total_days}
- Days remaining: ${originalPlan.total_days - completedDays}

**Newly Identified Weaknesses:**
${weaknessesIdentified.map(w => `- ${w}`).join('\n')}

${newExamDate ? `**New Exam Date:** ${newExamDate}` : ''}

**Instructions:**
1. Keep completed days as-is
2. Adjust remaining days to address new weaknesses
3. If exam date changed, recalculate the entire timeline
4. Maintain the 40-40-20 phase split for remaining days
5. Ensure all critical topics are covered

Return the updated study plan as a complete JSON object.`;
};

/**
 * Generate motivational message for study plan
 */
export const getMotivationalPrompt = (
  daysCompleted: number,
  totalDays: number,
  recentScore: number
): string => {
  const progress = (daysCompleted / totalDays) * 100;
  
  return `Generate a short, encouraging message for a student.

**Progress:** ${daysCompleted}/${totalDays} days completed (${Math.round(progress)}%)
**Recent Quiz Score:** ${recentScore}%

The message should:
- Be 2-3 sentences
- Acknowledge their progress
- Encourage them to keep going
- Be culturally appropriate for Indian students
- Reference their score (praise if good, motivate if needs improvement)

Example: "Great job completing Day ${daysCompleted}! You've covered ${Math.round(progress)}% of your study plan. Your ${recentScore}% score shows you're making solid progress - keep up the excellent work!"

Generate an encouraging message now:`;
};
