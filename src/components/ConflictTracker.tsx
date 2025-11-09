import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Flame, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";

interface Conflict {
  id: string;
  title: string;
  description: string;
  conflict_type: string;
  status: string;
  introduced_chapter: string;
  resolved_chapter: string | null;
  characters_involved: string[];
}

interface Chapter {
  id: string;
  title: string;
}

interface ConflictTrackerProps {
  manuscriptId: string;
  chapters: Chapter[];
}

export function ConflictTracker({ manuscriptId, chapters }: ConflictTrackerProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    conflict_type: "internal",
    status: "unresolved",
    introduced_chapter: "",
    resolved_chapter: "",
    characters_involved: ""
  });

  useEffect(() => {
    loadConflicts();
  }, [manuscriptId]);

  const loadConflicts = async () => {
    try {
      const { data, error } = await supabase
        .from("conflicts")
        .select("*")
        .eq("manuscript_id", manuscriptId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConflicts(data || []);
    } catch (error) {
      console.error("Error loading conflicts:", error);
      toast.error("Failed to load conflicts");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.introduced_chapter) {
      toast.error("Title and introduced chapter are required");
      return;
    }

    try {
      const charactersArray = formData.characters_involved
        ? formData.characters_involved.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const { error } = await supabase.from("conflicts").insert({
        title: formData.title,
        description: formData.description,
        conflict_type: formData.conflict_type,
        status: formData.status,
        introduced_chapter: formData.introduced_chapter,
        resolved_chapter: formData.resolved_chapter || null,
        characters_involved: charactersArray,
        manuscript_id: manuscriptId
      });

      if (error) throw error;
      toast.success("Conflict added!");
      setIsOpen(false);
      resetForm();
      loadConflicts();
    } catch (error) {
      console.error("Error saving conflict:", error);
      toast.error("Failed to save conflict");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("conflicts").delete().eq("id", id);
      if (error) throw error;
      toast.success("Conflict deleted");
      loadConflicts();
    } catch (error) {
      console.error("Error deleting conflict:", error);
      toast.error("Failed to delete conflict");
    }
  };

  const handleToggleStatus = async (conflict: Conflict) => {
    try {
      const newStatus = conflict.status === "resolved" ? "unresolved" : "resolved";
      const { error } = await supabase
        .from("conflicts")
        .update({ status: newStatus })
        .eq("id", conflict.id);

      if (error) throw error;
      toast.success(`Conflict marked as ${newStatus}`);
      loadConflicts();
    } catch (error) {
      console.error("Error updating conflict:", error);
      toast.error("Failed to update conflict");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      conflict_type: "internal",
      status: "unresolved",
      introduced_chapter: "",
      resolved_chapter: "",
      characters_involved: ""
    });
  };

  const getConflictTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "internal": "bg-purple-500/20 text-purple-500 border-purple-500/30",
      "external": "bg-blue-500/20 text-blue-500 border-blue-500/30",
      "interpersonal": "bg-green-500/20 text-green-500 border-green-500/30",
      "societal": "bg-orange-500/20 text-orange-500 border-orange-500/30"
    };
    return colors[type] || "bg-gray-500/20 text-gray-500 border-gray-500/30";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const unresolvedConflicts = conflicts.filter(c => c.status === "unresolved");
  const resolvedConflicts = conflicts.filter(c => c.status === "resolved");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            Conflict Tracker
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track conflicts and tensions throughout your manuscript
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Conflict
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Conflict</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Hero vs. Antagonist"
                />
              </div>
              <div>
                <Label htmlFor="conflict-type">Conflict Type</Label>
                <Select value={formData.conflict_type} onValueChange={(value) => setFormData({ ...formData, conflict_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal (Character vs. Self)</SelectItem>
                    <SelectItem value="external">External (Character vs. Nature/Fate)</SelectItem>
                    <SelectItem value="interpersonal">Interpersonal (Character vs. Character)</SelectItem>
                    <SelectItem value="societal">Societal (Character vs. Society)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="introduced">Introduced in Chapter *</Label>
                <Select value={formData.introduced_chapter} onValueChange={(value) => setFormData({ ...formData, introduced_chapter: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {chapters.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="resolved">Resolved in Chapter (optional)</Label>
                <Select value={formData.resolved_chapter} onValueChange={(value) => setFormData({ ...formData, resolved_chapter: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Not resolved yet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not resolved</SelectItem>
                    {chapters.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="characters">Characters Involved (comma-separated)</Label>
                <Input
                  id="characters"
                  value={formData.characters_involved}
                  onChange={(e) => setFormData({ ...formData, characters_involved: e.target.value })}
                  placeholder="e.g., Alice, Bob, Carol"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the conflict and its implications"
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                Add Conflict
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Total Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{conflicts.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Circle className="h-4 w-4 text-orange-500" />
              Unresolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{unresolvedConflicts.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Resolved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{resolvedConflicts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Unresolved Conflicts */}
      {unresolvedConflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Unresolved Conflicts</h3>
          {unresolvedConflicts.map((conflict) => {
            const introChapter = chapters.find(ch => ch.id === conflict.introduced_chapter);
            return (
              <Card key={conflict.id} className="p-4 bg-card/50 hover:bg-card smooth-transition border-l-4 border-l-orange-500">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getConflictTypeColor(conflict.conflict_type)}>
                        {conflict.conflict_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Introduced: {introChapter?.title || 'Unknown'}
                      </span>
                    </div>
                    <h3 className="font-semibold">{conflict.title}</h3>
                    {conflict.description && (
                      <p className="text-sm text-muted-foreground">{conflict.description}</p>
                    )}
                    {conflict.characters_involved && conflict.characters_involved.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {conflict.characters_involved.map((char, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {char}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(conflict)}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(conflict.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolved Conflicts */}
      {resolvedConflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Resolved Conflicts</h3>
          {resolvedConflicts.map((conflict) => {
            const introChapter = chapters.find(ch => ch.id === conflict.introduced_chapter);
            const resolvedChapter = chapters.find(ch => ch.id === conflict.resolved_chapter);
            return (
              <Card key={conflict.id} className="p-4 bg-card/50 hover:bg-card smooth-transition opacity-75 border-l-4 border-l-green-500">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={getConflictTypeColor(conflict.conflict_type)}>
                        {conflict.conflict_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {introChapter?.title} → {resolvedChapter?.title || 'N/A'}
                      </span>
                    </div>
                    <h3 className="font-semibold">{conflict.title}</h3>
                    {conflict.description && (
                      <p className="text-sm text-muted-foreground">{conflict.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(conflict)}
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(conflict.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {conflicts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No conflicts tracked yet. Start adding conflicts to monitor story tension!</p>
        </div>
      )}
    </div>
  );
}