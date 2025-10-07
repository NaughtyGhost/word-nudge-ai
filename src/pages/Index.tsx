import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import { 
  BookOpen, 
  Sparkles, 
  Wand2, 
  FileText, 
  Plus,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  ArrowLeft,
  Save,
  PenTool,
  Search,
  Maximize2,
  Minimize2,
  GripVertical
} from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { EditorPanel } from "@/components/EditorPanel";
import { WordCountStats } from "@/components/WordCountStats";
import { SortableChapter } from "@/components/SortableChapter";
import { CharacterDatabase } from "@/components/CharacterDatabase";
import { ChapterMetadata } from "@/components/ChapterMetadata";
import { VersionHistory } from "@/components/VersionHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { User } from "@supabase/supabase-js";

interface ChapterMetadata {
  notes?: string;
  tags?: string[];
  status?: "draft" | "revision" | "final";
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  metadata?: ChapterMetadata;
}

const Index = () => {
  const navigate = useNavigate();
  const { manuscriptId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [manuscript, setManuscript] = useState<any>(null);
  const [chapters, setChapters] = useState<Chapter[]>([
    { id: '1', title: 'Chapter 1', content: '' }
  ]);
  const [activeChapter, setActiveChapter] = useState('1');
  const [content, setContent] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scenePrompt, setScenePrompt] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check auth and load manuscript
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        if (manuscriptId) {
          loadManuscript();
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, manuscriptId]);

  const loadManuscript = async () => {
    if (!manuscriptId) return;

    const { data, error } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("id", manuscriptId)
      .single();

    if (error) {
      toast.error("Failed to load manuscript");
      navigate("/");
    } else {
      setManuscript(data);
      if (data.content && typeof data.content === 'object' && 'chapters' in data.content) {
        setChapters(data.content.chapters as unknown as Chapter[]);
      }
    }
  };

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

  // Auto-save to database
  useEffect(() => {
    if (!manuscript) return;

    const timer = setTimeout(() => {
      saveManuscript();
    }, 2000);

    return () => clearTimeout(timer);
  }, [chapters, manuscript]);

  const saveManuscript = async () => {
    if (!manuscriptId || saving) return;

    setSaving(true);
    const { error } = await supabase
      .from("manuscripts")
      .update({
        content: { chapters } as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", manuscriptId);

    if (error) {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const saveChapterVersion = async () => {
    const activeChapterData = chapters.find(c => c.id === activeChapter);
    if (!activeChapterData || !manuscriptId) return;

    try {
      const { data: versions } = await supabase
        .from("chapter_versions")
        .select("version_number")
        .eq("manuscript_id", manuscriptId)
        .eq("chapter_id", activeChapter)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;

      const { error } = await supabase
        .from("chapter_versions")
        .insert({
          manuscript_id: manuscriptId,
          chapter_id: activeChapter,
          title: activeChapterData.title,
          content: activeChapterData.content,
          version_number: nextVersion
        });

      if (error) throw error;
      toast.success(`Version ${nextVersion} saved!`);
    } catch (error) {
      console.error("Error saving version:", error);
      toast.error("Failed to save version");
    }
  };

  const restoreVersion = (restoredContent: string) => {
    setContent(restoredContent);
    setChapters(prev =>
      prev.map(ch =>
        ch.id === activeChapter ? { ...ch, content: restoredContent } : ch
      )
    );
  };

  const updateChapterMetadata = (metadata: ChapterMetadata) => {
    setChapters(prev =>
      prev.map(ch =>
        ch.id === activeChapter ? { ...ch, metadata } : ch
      )
    );
  };

  const callAI = async (action: string, additionalData?: any) => {
    setIsAiLoading(true);
    try {
      // Get plain text from HTML content for AI processing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

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
            text: plainText,
            context: plainText.slice(-500),
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
      setContent(content + '<p>' + result + '</p>');
      toast.success('AI continued your story!');
    }
  };

  const handleRewrite = async (type: string) => {
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
      setContent('<p>' + result + '</p>');
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
      setContent(content + '<p>' + result + '</p>');
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Filter chapters based on search
  const filteredChapters = chapters.filter(chapter =>
    chapter.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chapter.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!manuscript) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading manuscript...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Sidebar */}
      {!isFocusMode && (
        <aside className="w-64 border-r border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold truncate">{manuscript.title}</h1>
          </div>

          {saving && (
            <div className="text-xs text-muted-foreground flex items-center gap-1 px-2">
              <Save className="w-3 h-3 animate-pulse" /> Saving...
            </div>
          )}

          <WordCountStats chapters={chapters} activeChapterId={activeChapter} />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chapters..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button onClick={addChapter} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Chapter
          </Button>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredChapters.map(ch => ch.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {filteredChapters.map(chapter => (
                  <SortableChapter
                    key={chapter.id}
                    id={chapter.id}
                    title={chapter.title}
                    isActive={activeChapter === chapter.id}
                    onClick={() => setActiveChapter(chapter.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </aside>
      )}

      {/* Main Editor */}
      <main className="flex-1 flex flex-col">
        <Tabs defaultValue="write" className="flex-1 flex flex-col">
          <div className="glass-panel m-4 mb-0 p-2">
            <TabsList className="grid w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="write" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Characters
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="flex-1 flex flex-col mt-0">
            {/* Toolbar */}
            {!isFocusMode && (
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
                onClick={saveChapterVersion}
                variant="outline"
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Version
              </Button>

              <VersionHistory
                manuscriptId={manuscriptId || ""}
                chapterId={activeChapter}
                currentTitle={chapters.find(c => c.id === activeChapter)?.title || ""}
                onRestore={restoreVersion}
              />

              <Button
                onClick={() => setShowMetadata(!showMetadata)}
                variant="outline"
                size="sm"
              >
                {showMetadata ? "Hide" : "Show"} Metadata
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
            )}

            {/* Focus Mode Toggle */}
            <div className={`${isFocusMode ? 'fixed top-4 right-4 z-10' : 'absolute top-4 right-4'}`}>
              <Button
                onClick={() => setIsFocusMode(!isFocusMode)}
                variant="ghost"
                size="icon"
                className="glass-panel"
              >
                {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 px-4 pb-4 flex gap-4">
              <Card className="flex-1 p-4 bg-editor-bg border-border/50">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Begin your story..."
                />
              </Card>
              {showMetadata && (
                <div className="w-80">
                  <ChapterMetadata
                    metadata={chapters.find(c => c.id === activeChapter)?.metadata || {}}
                    onChange={updateChapterMetadata}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="flex-1 px-4 pb-4 mt-0">
            <EditorPanel chapters={chapters} />
          </TabsContent>

          <TabsContent value="characters" className="flex-1 px-4 pb-4 mt-0 overflow-y-auto">
            <Card className="p-6">
              <CharacterDatabase manuscriptId={manuscriptId || ""} />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;