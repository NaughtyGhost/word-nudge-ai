import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  BookCheck, 
  Users, 
  TrendingUp, 
  FileText,
  Sparkles,
  MessageSquare,
  Mic,
  Square
} from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface EditorPanelProps {
  chapters: Chapter[];
  onContentUpdate?: (chapterId: string, content: string) => void;
}

export function EditorPanel({ chapters, onContentUpdate }: EditorPanelProps) {
  const [feedback, setFeedback] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);
  const { isRecording, isTranscribing, startRecording, stopRecording } = useVoiceRecording();
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(
    chapters.length > 0 ? chapters[0].id : null
  );

  const getManuscriptText = () => {
    return chapters
      .map(chapter => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chapter.content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        return `## ${chapter.title}\n\n${plainText}`;
      })
      .join('\n\n---\n\n');
  };

  const handleDictation = async () => {
    if (isRecording) {
      try {
        const text = await stopRecording();
        if (text && selectedChapterId && onContentUpdate) {
          const chapter = chapters.find(c => c.id === selectedChapterId);
          if (chapter) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = chapter.content;
            const currentText = tempDiv.textContent || '';
            const newContent = `<p>${currentText} ${text}</p>`;
            onContentUpdate(selectedChapterId, newContent);
            toast.success('Dictation added to manuscript');
          }
        }
      } catch (error) {
        console.error('Dictation error:', error);
      }
    } else {
      if (!selectedChapterId) {
        toast.error('Please select a chapter first');
        return;
      }
      await startRecording();
      toast('Recording...', { description: 'Speak now. Click stop when finished.' });
    }
  };

  const analyzeManuscript = async (type: string) => {
    setIsAnalyzing(true);
    setActiveAnalysis(type);
    
    try {
      const manuscriptText = getManuscriptText();
      
      if (!manuscriptText.trim()) {
        toast.error("No content to analyze");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-writer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: `editor-${type}`,
            text: manuscriptText,
            context: manuscriptText,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Analysis failed');
      }

      const data = await response.json();
      setFeedback(data.result);
      toast.success('Analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
      setActiveAnalysis(null);
    }
  };

  const analysisOptions = [
    {
      type: 'plot',
      icon: BookCheck,
      label: 'Plot Analysis',
      description: 'Check plot consistency, pacing, and structure'
    },
    {
      type: 'characters',
      icon: Users,
      label: 'Character Development',
      description: 'Analyze character arcs and consistency'
    },
    {
      type: 'pacing',
      icon: TrendingUp,
      label: 'Pacing Review',
      description: 'Evaluate narrative flow and tension'
    },
    {
      type: 'overall',
      icon: FileText,
      label: 'Overall Feedback',
      description: 'Comprehensive editorial review'
    }
  ];

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Editorial Assistant</h2>
        </div>
        
        {onContentUpdate && (
          <div className="mb-4">
            <Button
              onClick={handleDictation}
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              disabled={isTranscribing || chapters.length === 0}
              className="w-full"
            >
              {isRecording ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Stop Dictation
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {isTranscribing ? 'Transcribing...' : 'Dictate to Current Chapter'}
                </>
              )}
            </Button>
          </div>
        )}
        
        <p className="text-sm text-muted-foreground mb-4">
          Get professional editorial feedback on your manuscript. The AI editor will analyze all {chapters.length} chapter(s) and provide detailed insights.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {analysisOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.type}
                onClick={() => analyzeManuscript(option.type)}
                disabled={isAnalyzing || chapters.length === 0}
                variant="outline"
                className="h-auto py-4 px-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={`h-4 w-4 ${activeAnalysis === option.type ? 'animate-pulse text-primary' : ''}`} />
                  <span className="font-medium">{option.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {option.description}
                </span>
              </Button>
            );
          })}
        </div>

        {chapters.length === 0 && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            Start writing to enable editorial analysis
          </p>
        )}
      </div>

      {feedback && (
        <Card className="flex-1 p-4 bg-editor-bg border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Editorial Feedback</h3>
          </div>
          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="prose prose-sm max-w-none pr-4">
              <div className="whitespace-pre-wrap">{feedback}</div>
            </div>
          </ScrollArea>
        </Card>
      )}

      {!feedback && (
        <Card className="flex-1 p-8 bg-editor-bg border-border/50 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select an analysis type to get started</p>
          </div>
        </Card>
      )}
    </div>
  );
}
