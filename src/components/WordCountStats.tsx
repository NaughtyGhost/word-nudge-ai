import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, FileText, Edit2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface WordCountStatsProps {
  chapters: Chapter[];
  activeChapterId: string;
}

export const WordCountStats = ({ chapters, activeChapterId }: WordCountStatsProps) => {
  const [dailyGoal, setDailyGoal] = useState(1000);
  const [sessionGoal, setSessionGoal] = useState(500);
  const [tempDailyGoal, setTempDailyGoal] = useState("1000");
  const [tempSessionGoal, setTempSessionGoal] = useState("500");
  const [sessionStart, setSessionStart] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Count words in HTML content
  const countWords = (html: string): number => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const activeChapter = chapters.find(c => c.id === activeChapterId);
  const chapterWordCount = activeChapter ? countWords(activeChapter.content) : 0;
  const totalWordCount = chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);
  const sessionWordCount = totalWordCount - sessionStart;

  const dailyProgress = Math.min((sessionWordCount / dailyGoal) * 100, 100);
  const sessionProgress = Math.min((sessionWordCount / sessionGoal) * 100, 100);

  useEffect(() => {
    setSessionStart(totalWordCount);
  }, []);

  const handleSaveGoals = () => {
    const daily = parseInt(tempDailyGoal) || 1000;
    const session = parseInt(tempSessionGoal) || 500;
    setDailyGoal(daily);
    setSessionGoal(session);
    setIsDialogOpen(false);
  };

  return (
    <Card className="p-4 space-y-4 bg-card/50 border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Writing Progress</h3>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Edit2 className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Writing Goals</DialogTitle>
              <DialogDescription>
                Customize your daily and session word count targets
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Daily Goal (words)</label>
                <Input
                  type="number"
                  value={tempDailyGoal}
                  onChange={(e) => setTempDailyGoal(e.target.value)}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Session Goal (words)</label>
                <Input
                  type="number"
                  value={tempSessionGoal}
                  onChange={(e) => setTempSessionGoal(e.target.value)}
                  placeholder="500"
                />
              </div>
              <Button onClick={handleSaveGoals} className="w-full">
                Save Goals
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            Chapter
          </div>
          <div className="text-2xl font-bold">{chapterWordCount.toLocaleString()}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            Total
          </div>
          <div className="text-2xl font-bold">{totalWordCount.toLocaleString()}</div>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Target className="h-3 w-3" />
            Daily Goal
          </div>
          <span className="font-medium">
            {sessionWordCount.toLocaleString()} / {dailyGoal.toLocaleString()}
          </span>
        </div>
        <Progress value={dailyProgress} className="h-2" />
      </div>

      {/* Session Goal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Target className="h-3 w-3" />
            Session Goal
          </div>
          <span className="font-medium">
            {sessionWordCount.toLocaleString()} / {sessionGoal.toLocaleString()}
          </span>
        </div>
        <Progress value={sessionProgress} className="h-2" />
      </div>
    </Card>
  );
};
