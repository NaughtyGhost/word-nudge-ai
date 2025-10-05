import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  BookOpen, 
  Sparkles, 
  Wand2, 
  FileText, 
  Plus,
  ChevronRight,
  Lightbulb,
  MessageSquare
} from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const Index = () => {
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: '1', title: 'Chapter 1', content: '' }
  ]);
  const [activeChapter, setActiveChapter] = useState('1');
  const [content, setContent] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scenePrompt, setScenePrompt] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load content when chapter changes
  useEffect(() => {
    const chapter = chapters.find(c => c.id === activeChapter);
    if (chapter) {
      setContent(chapter.content);
    }
  }, [activeChapter, chapters]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      setChapters(prev => 
        prev.map(ch => 
          ch.id === activeChapter ? { ...ch, content } : ch
        )
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, activeChapter]);

  const callAI = async (action: string, additionalData?: any) => {
    setIsAiLoading(true);
    try {
      const selection = textareaRef.current?.value.substring(
        textareaRef.current.selectionStart,
        textareaRef.current.selectionEnd
      );

      const contextStart = Math.max(0, (textareaRef.current?.selectionStart || 0) - 500);
      const context = textareaRef.current?.value.substring(
        contextStart,
        textareaRef.current?.selectionStart
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-writer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action,
            text: selection || content,
            context: context || content.slice(-500),
            ...additionalData
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'AI request failed');
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('AI error:', error);
      toast.error(error instanceof Error ? error.message : 'AI operation failed');
      return null;
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAutocomplete = async () => {
    const result = await callAI('autocomplete');
    if (result) {
      const cursorPos = textareaRef.current?.selectionStart || content.length;
      const newContent = content.slice(0, cursorPos) + ' ' + result + content.slice(cursorPos);
      setContent(newContent);
      toast.success('AI continued your story!');
    }
  };

  const handleRewrite = async (type: string) => {
    const selection = textareaRef.current?.value.substring(
      textareaRef.current.selectionStart,
      textareaRef.current.selectionEnd
    );

    if (!selection) {
      toast.error('Please select text to rewrite');
      return;
    }

    let action = '';
    switch (type) {
      case 'suspenseful':
        action = 'rewrite-suspenseful';
        break;
      case 'show':
        action = 'rewrite-show';
        break;
      case 'dialogue':
        action = 'rewrite-dialogue';
        break;
    }

    const result = await callAI(action);
    if (result) {
      const start = textareaRef.current!.selectionStart;
      const end = textareaRef.current!.selectionEnd;
      const newContent = content.slice(0, start) + result + content.slice(end);
      setContent(newContent);
      toast.success('Text rewritten!');
    }
  };

  const handleGenerateScene = async () => {
    if (!scenePrompt) {
      toast.error('Please enter a scene description');
      return;
    }

    const result = await callAI('generate-scene', { prompt: scenePrompt });
    if (result) {
      const cursorPos = textareaRef.current?.selectionStart || content.length;
      const newContent = content.slice(0, cursorPos) + '\n\n' + result + '\n\n' + content.slice(cursorPos);
      setContent(newContent);
      setScenePrompt('');
      toast.success('Scene generated!');
    }
  };

  const handleSummarize = async () => {
    if (!content.trim()) {
      toast.error('No content to summarize');
      return;
    }

    const result = await callAI('summarize');
    if (result) {
      toast(
        <div className="space-y-2">
          <div className="font-semibold">Chapter Summary:</div>
          <div className="text-sm text-muted-foreground">{result}</div>
        </div>,
        { duration: 10000 }
      );
    }
  };

  const addChapter = () => {
    const newId = String(chapters.length + 1);
    setChapters([...chapters, { 
      id: newId, 
      title: `Chapter ${newId}`, 
      content: '' 
    }]);
    setActiveChapter(newId);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">NovelForge</h1>
        </div>

        <Button onClick={addChapter} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Chapter
        </Button>

        <div className="space-y-1">
          {chapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => setActiveChapter(chapter.id)}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group ${
                activeChapter === chapter.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-secondary text-foreground'
              }`}
            >
              <span className="truncate">{chapter.title}</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${
                activeChapter === chapter.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
              }`} />
            </button>
          ))}
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="glass-panel m-4 p-3 flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleAutocomplete}
            disabled={isAiLoading}
            variant="default"
            size="sm"
            className="ai-glow"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Continue Writing
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" disabled={isAiLoading}>
                <Wand2 className="h-4 w-4 mr-2" />
                Rewrite
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleRewrite('suspenseful')}>
                Make More Suspenseful
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRewrite('show')}>
                Show, Don't Tell
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRewrite('dialogue')}>
                Improve Dialogue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" disabled={isAiLoading}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Generate Scene
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Scene</DialogTitle>
                <DialogDescription>
                  Describe the scene you want to create
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="e.g., A rainy night in a dystopian city..."
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateScene()}
                />
                <Button 
                  onClick={handleGenerateScene} 
                  disabled={isAiLoading}
                  className="w-full"
                >
                  Generate
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            onClick={handleSummarize}
            disabled={isAiLoading}
            variant="secondary"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            Summarize
          </Button>

          <Button
            onClick={() => setIsChatOpen(true)}
            variant="secondary"
            size="sm"
            className="ml-auto"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat with AI
          </Button>

          {isAiLoading && (
            <div className="ml-auto flex items-center gap-2 text-sm text-primary">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              AI thinking...
            </div>
          )}
        </div>

        {/* Editor Area */}
        <div className="flex-1 px-4 pb-4">
          <Card className="h-full p-8 bg-editor-bg border-border/50">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Begin your story..."
              className="editor-prose w-full h-full resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
            />
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Index;
