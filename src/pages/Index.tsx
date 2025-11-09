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
  Lightbulb,
  MessageSquare,
  ArrowLeft,
  Save,
  PenTool,
  Search,
  Maximize2,
  Minimize2,
  Download,
  Users,
  MapPin,
  Clock,
  History,
  TrendingUp,
  Flame,
  FileStack
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { ChatPanel } from "@/components/ChatPanel";
import { EditorPanel } from "@/components/EditorPanel";
import { WordCountStats } from "@/components/WordCountStats";
import { SortableChapter } from "@/components/SortableChapter";
import { CharacterDatabase } from "@/components/CharacterDatabase";
import { LocationDatabase } from "@/components/LocationDatabase";
import { Timeline } from "@/components/Timeline";
import { ChapterMetadata } from "@/components/ChapterMetadata";
import { VersionHistory } from "@/components/VersionHistory";
import { PlotArcVisualizer } from "@/components/PlotArcVisualizer";
import { CharacterRelationshipMap } from "@/components/CharacterRelationshipMap";
import { ConflictTracker } from "@/components/ConflictTracker";
import { DraftManager } from "@/components/DraftManager";
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
import { exportToPDF, exportToDOCX } from "@/utils/exportUtils";

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

  const loadDraft = (draftChapters: Chapter[]) => {
    setChapters(draftChapters);
    if (draftChapters.length > 0) {
      setActiveChapter(draftChapters[0].id);
    }
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
        <aside className="w-72 border-r border-border bg-card/50 backdrop-blur-sm smooth-transition animate-slide-in">
          <div className="p-4 border-b border-border/50 space-y-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="shrink-0 smooth-transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <BookOpen className="h-5 w-5 text-primary shrink-0" />
                <h1 className="text-base font-semibold truncate">{manuscript.title}</h1>
              </div>
              <ThemeSwitcher />
            </div>

            {saving && (
              <div className="text-xs text-primary flex items-center gap-2 bg-primary/10 rounded-md px-3 py-1.5 animate-fade-in border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="font-medium">Auto-saving...</span>
              </div>
            )}

            {!saving && (
              <div className="text-xs text-muted-foreground flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-1.5">
                <Save className="w-3 h-3" /> 
                <span>All changes saved</span>
              </div>
            )}

            <WordCountStats chapters={chapters} activeChapterId={activeChapter} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full smooth-transition">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover z-50 animate-scale-in">
                <DropdownMenuItem onClick={() => exportToPDF(manuscript.title, chapters)} className="smooth-transition">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToDOCX(manuscript.title, chapters)} className="smooth-transition">
                  <FileText className="h-4 w-4 mr-2" />
                  Export as DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chapters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50"
              />
            </div>

            <Button onClick={addChapter} className="w-full h-9 smooth-transition" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Chapter
            </Button>
          </div>

          <div className="px-4 pb-4 flex-1 overflow-y-auto">

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
          </div>
        </aside>
      )}

      {/* Main Editor */}
      <main className="flex-1 flex flex-col bg-background/50">
        <Tabs defaultValue="write" className="flex-1 flex flex-col">
          <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
            <TabsList className="h-12 bg-transparent border-0 p-0 mx-4">
              <TabsTrigger value="write" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <PenTool className="h-4 w-4" />
                <span className="hidden sm:inline">Write</span>
              </TabsTrigger>
              <TabsTrigger value="editor" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Editor</span>
              </TabsTrigger>
              <TabsTrigger value="characters" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Characters</span>
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Locations</span>
              </TabsTrigger>
              <TabsTrigger value="timeline" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="plot-arc" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Plot Arc</span>
              </TabsTrigger>
              <TabsTrigger value="relationships" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Relationships</span>
              </TabsTrigger>
              <TabsTrigger value="conflicts" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <Flame className="h-4 w-4" />
                <span className="hidden sm:inline">Conflicts</span>
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2 data-[state=active]:bg-background/80 smooth-transition">
                <FileStack className="h-4 w-4" />
                <span className="hidden sm:inline">Drafts</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="flex-1 flex flex-col mt-0">
            {/* Toolbar */}
            {!isFocusMode && (
              <div className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                  {/* AI Tools Group */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleAutocomplete}
                      disabled={isAiLoading}
                      variant="default"
                      size="sm"
                      className={`ai-glow smooth-transition ${isAiLoading ? 'ai-thinking' : ''}`}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Continue
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isAiLoading} className="smooth-transition">
                          <Wand2 className="h-4 w-4 mr-2" />
                          Rewrite
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-popover z-50 animate-scale-in">
                        <DropdownMenuItem onClick={() => handleRewrite('suspenseful')} className="smooth-transition">
                          Make More Suspenseful
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRewrite('show')} className="smooth-transition">
                          Show, Don't Tell
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRewrite('dialogue')} className="smooth-transition">
                          Improve Dialogue
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isAiLoading} className="smooth-transition">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Scene
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-background animate-scale-in">
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
                            className="smooth-transition"
                          />
                          <Button 
                            onClick={handleGenerateScene} 
                            disabled={isAiLoading}
                            className={`w-full smooth-transition ${isAiLoading ? 'ai-thinking' : ''}`}
                          >
                            Generate
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      onClick={handleSummarize}
                      disabled={isAiLoading}
                      variant="outline"
                      size="sm"
                      className="smooth-transition"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Summarize
                    </Button>
                  </div>

                  <div className="h-6 w-px bg-border" />

                  {/* Version & Metadata Group */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={saveChapterVersion}
                      variant="ghost"
                      size="sm"
                      className="smooth-transition"
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
                      variant="ghost"
                      size="sm"
                      className="smooth-transition"
                    >
                      {showMetadata ? "Hide" : "Show"} Notes
                    </Button>
                  </div>

                  {/* Right Side Actions */}
                  <div className="ml-auto flex items-center gap-2">
                    {isAiLoading && (
                      <div className="flex items-center gap-2 text-sm text-primary animate-fade-in">
                        <div className="h-2 w-2 rounded-full bg-primary ai-thinking" />
                        <span className="hidden sm:inline">AI thinking...</span>
                      </div>
                    )}
                    
                    <Button
                      onClick={() => setIsChatOpen(true)}
                      variant="outline"
                      size="sm"
                      className="smooth-transition"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Focus Mode Toggle */}
            <div className={`${isFocusMode ? 'fixed top-4 right-4 z-20' : 'absolute top-4 right-4'}`}>
              <Button
                onClick={() => setIsFocusMode(!isFocusMode)}
                variant="ghost"
                size="icon"
                className="bg-card/80 backdrop-blur-sm hover:bg-card smooth-transition"
              >
                {isFocusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-4 flex gap-4 overflow-hidden">
              <Card className="flex-1 p-6 bg-editor-bg border-border/50 overflow-y-auto smooth-transition">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Begin your story..."
                />
              </Card>
              {showMetadata && (
                <div className="w-80 shrink-0 animate-slide-in">
                  <ChapterMetadata
                    metadata={chapters.find(c => c.id === activeChapter)?.metadata || {}}
                    onChange={updateChapterMetadata}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="flex-1 p-4 mt-0 overflow-y-auto">
            <EditorPanel chapters={chapters} />
          </TabsContent>

          <TabsContent value="characters" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <CharacterDatabase manuscriptId={manuscriptId || ""} />
            </Card>
          </TabsContent>

          <TabsContent value="locations" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <LocationDatabase manuscriptId={manuscriptId || ""} />
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <Timeline manuscriptId={manuscriptId || ""} />
            </Card>
          </TabsContent>

          <TabsContent value="plot-arc" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <PlotArcVisualizer 
                manuscriptId={manuscriptId || ""} 
                chapters={chapters.map(ch => ({ id: ch.id, title: ch.title }))} 
              />
            </Card>
          </TabsContent>

          <TabsContent value="relationships" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <CharacterRelationshipMap manuscriptId={manuscriptId || ""} />
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <ConflictTracker 
                manuscriptId={manuscriptId || ""} 
                chapters={chapters.map(ch => ({ id: ch.id, title: ch.title }))} 
              />
            </Card>
          </TabsContent>

          <TabsContent value="drafts" className="flex-1 p-4 mt-0 overflow-y-auto">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <DraftManager 
                manuscriptId={manuscriptId || ""} 
                chapters={chapters}
                onLoadDraft={loadDraft}
              />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;