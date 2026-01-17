'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  RiBookOpenLine,
  RiFileTextLine,
  RiVideoLine,
  RiExternalLinkLine,
  RiDownloadLine,
  RiLightbulbLine,
} from '@remixicon/react';

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'link';
  subject: string;
  chapter?: string;
  description: string;
  url: string;
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

const SAMPLE_RESOURCES: Resource[] = [
  // Mathematics
  {
    id: '1',
    title: 'NCERT Mathematics Class 10',
    type: 'pdf',
    subject: 'Mathematics',
    description: 'Complete NCERT Mathematics textbook for Class 10',
    url: 'https://ncert.nic.in/textbook.php?jemh1=0-8',
  },
  {
    id: '2',
    title: 'Quadratic Equations - Video Tutorial',
    type: 'video',
    subject: 'Mathematics',
    chapter: 'Quadratic Equations',
    description: 'Complete video series on Quadratic Equations with solved examples',
    url: 'https://www.youtube.com/watch?v=example',
  },
  // Science
  {
    id: '3',
    title: 'NCERT Science Class 10',
    type: 'pdf',
    subject: 'Science',
    description: 'Complete NCERT Science textbook for Class 10',
    url: 'https://ncert.nic.in/textbook.php?jesc1=0-8',
  },
  {
    id: '4',
    title: 'Chemical Reactions - Interactive Guide',
    type: 'link',
    subject: 'Science',
    chapter: 'Chemical Reactions',
    description: 'Interactive guide to understanding chemical reactions',
    url: 'https://www.khanacademy.org/science/chemistry',
  },
  // Physics
  {
    id: '5',
    title: 'NCERT Physics Class 11',
    type: 'pdf',
    subject: 'Physics',
    description: 'Complete NCERT Physics textbook for Class 11',
    url: 'https://ncert.nic.in/textbook.php?keph1=0-8',
  },
  // Chemistry
  {
    id: '6',
    title: 'NCERT Chemistry Class 11',
    type: 'pdf',
    subject: 'Chemistry',
    description: 'Complete NCERT Chemistry textbook for Class 11',
    url: 'https://ncert.nic.in/textbook.php?kech1=0-8',
  },
  // Biology
  {
    id: '7',
    title: 'NCERT Biology Class 11',
    type: 'pdf',
    subject: 'Biology',
    description: 'Complete NCERT Biology textbook for Class 11',
    url: 'https://ncert.nic.in/textbook.php?kebo1=0-8',
  },
  // English
  {
    id: '8',
    title: 'NCERT English Honeydew Class 8',
    type: 'pdf',
    subject: 'English',
    description: 'NCERT English textbook for Class 8',
    url: 'https://ncert.nic.in/textbook.php?heen1=0-8',
  },
  // Social Science
  {
    id: '9',
    title: 'NCERT History Class 10',
    type: 'pdf',
    subject: 'Social Science',
    description: 'India and the Contemporary World - II',
    url: 'https://ncert.nic.in/textbook.php?jess1=0-8',
  },
  {
    id: '10',
    title: 'NCERT Geography Class 10',
    type: 'pdf',
    subject: 'Social Science',
    description: 'Contemporary India - II',
    url: 'https://ncert.nic.in/textbook.php?jess2=0-8',
  },
];

export default function ResourcesPage() {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredResources = SAMPLE_RESOURCES.filter((resource) => {
    const subjectMatch = selectedSubject === 'all' || resource.subject === selectedSubject;
    const typeMatch = selectedType === 'all' || resource.type === selectedType;
    return subjectMatch && typeMatch;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return RiFileTextLine;
      case 'video':
        return RiVideoLine;
      case 'link':
        return RiExternalLinkLine;
      default:
        return RiFileTextLine;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'text-red-500';
      case 'video':
        return 'text-blue-500';
      case 'link':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Learning Resources</h1>
        <p className="text-muted-foreground">
          Access NCERT textbooks, video tutorials, and supplementary materials
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 pt-6">
          <RiLightbulbLine className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Study Tip</p>
            <p className="text-sm text-muted-foreground">
              All NCERT textbooks are available for free download. Use them alongside our AI Tutor
              for the best learning experience.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {SUBJECTS.map((subject) => (
              <SelectItem key={subject} value={subject}>
                {subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pdf">PDF Documents</SelectItem>
            <SelectItem value="video">Video Tutorials</SelectItem>
            <SelectItem value="link">External Links</SelectItem>
          </SelectContent>
        </Select>

        {(selectedSubject !== 'all' || selectedType !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedSubject('all');
              setSelectedType('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredResources.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <RiBookOpenLine className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Resources Found</h3>
              <p className="text-center text-sm text-muted-foreground">
                Try adjusting your filters to see more resources
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredResources.map((resource) => {
            const Icon = getTypeIcon(resource.type);
            const iconColor = getTypeColor(resource.type);

            return (
              <Card key={resource.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Icon className={`h-5 w-5 shrink-0 ${iconColor}`} />
                    <Badge variant="outline" className="capitalize">
                      {resource.type}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{resource.title}</CardTitle>
                  <CardDescription>
                    {resource.subject}
                    {resource.chapter && ` • ${resource.chapter}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    {resource.type === 'pdf' ? (
                      <>
                        <RiDownloadLine className="mr-2 h-4 w-4" />
                        Download PDF
                      </>
                    ) : resource.type === 'video' ? (
                      <>
                        <RiVideoLine className="mr-2 h-4 w-4" />
                        Watch Video
                      </>
                    ) : (
                      <>
                        <RiExternalLinkLine className="mr-2 h-4 w-4" />
                        Open Link
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Official NCERT Resources</CardTitle>
          <CardDescription>Links to official NCERT website for all textbooks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('https://ncert.nic.in/textbook.php', '_blank')}
          >
            <RiExternalLinkLine className="mr-2 h-4 w-4" />
            NCERT Textbooks (All Classes)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('https://ncert.nic.in/exemplar-problems.php', '_blank')}
          >
            <RiExternalLinkLine className="mr-2 h-4 w-4" />
            NCERT Exemplar Problems
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('https://ncert.nic.in/ncerts.html', '_blank')}
          >
            <RiExternalLinkLine className="mr-2 h-4 w-4" />
            NCERT Solutions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
