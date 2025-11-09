import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Draft {
  id: string;
  title: string;
  description: string;
  content: any;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

interface Chapter {
  id: string;
  title: string;
  content: string;
}

interface DraftManagerProps {
  manuscriptId: string;
  chapters: Chapter[];
  onLoadDraft: (chapters: Chapter[]) => void;
}

export function DraftManager({ manuscriptId, chapters, onLoadDraft }: DraftManagerProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: ""
  });

  useEffect(() => {
    loadDrafts();
  }, [manuscriptId]);

  const loadDrafts = async () => {
    try {
      const { data, error } = await supabase
        .from("drafts")
        .select("*")
        .eq("manuscript_id", manuscriptId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Error loading drafts:", error);
      toast.error("Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title) {
      toast.error("Draft title is required");
      return;
    }

    setSaving(true);
    try {
      // Unmark all drafts as current
      await supabase
        .from("drafts")
        .update({ is_current: false })
        .eq("manuscript_id", manuscriptId);

      const { error } = await supabase.from("drafts").insert([{
        title: formData.title,
        description: formData.description,
        content: { chapters } as any,
        is_current: true,
        manuscript_id: manuscriptId
      }]);

      if (error) throw error;
      toast.success("Draft saved!");
      setIsOpen(false);
      resetForm();
      loadDrafts();
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDraft = async (draft: Draft) => {
    try {
      // Unmark all drafts as current
      await supabase
        .from("drafts")
        .update({ is_current: false })
        .eq("manuscript_id", manuscriptId);

      // Mark this draft as current
      await supabase
        .from("drafts")
        .update({ is_current: true })
        .eq("id", draft.id);

      onLoadDraft(draft.content.chapters);
      toast.success(`Loaded draft: ${draft.title}`);
      loadDrafts();
    } catch (error) {
      console.error("Error loading draft:", error);
      toast.error("Failed to load draft");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("drafts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Draft deleted");
      loadDrafts();
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("Failed to delete draft");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: ""
    });
  };

  const countWords = (chapters: Chapter[]): number => {
    return chapters.reduce((sum, ch) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = ch.content;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      return sum + text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Draft Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Save and manage different versions of your manuscript
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Save Current Draft
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save New Draft</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Draft Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., First Draft - Complete"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Notes about this draft version"
                  rows={3}
                />
              </div>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground">
                  Current manuscript: {chapters.length} chapters, {countWords(chapters).toLocaleString()} words
                </p>
              </div>
              <Button onClick={handleSaveDraft} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Draft
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drafts List */}
      <div className="space-y-3">
        {drafts.map((draft) => {
          const wordCount = draft.content?.chapters ? countWords(draft.content.chapters) : 0;
          const chapterCount = draft.content?.chapters?.length || 0;

          return (
            <Card
              key={draft.id}
              className={`p-4 bg-card/50 hover:bg-card smooth-transition ${
                draft.is_current ? 'border-l-4 border-l-primary' : ''
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{draft.title}</h3>
                    {draft.is_current && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Current
                      </Badge>
                    )}
                  </div>
                  {draft.description && (
                    <p className="text-sm text-muted-foreground">{draft.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{chapterCount} chapters</span>
                    <span>{wordCount.toLocaleString()} words</span>
                    <span>Saved {formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!draft.is_current && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLoadDraft(draft)}
                    >
                      Load
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(draft.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {drafts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No saved drafts yet. Save your first draft to track manuscript versions!</p>
        </div>
      )}
    </div>
  );
}