import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  background: string;
  notes: string;
}

interface CharacterDatabaseProps {
  manuscriptId: string;
}

export function CharacterDatabase({ manuscriptId }: CharacterDatabaseProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    description: "",
    personality: "",
    background: "",
    notes: ""
  });

  useEffect(() => {
    loadCharacters();
  }, [manuscriptId]);

  const loadCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("*")
        .eq("manuscript_id", manuscriptId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error("Error loading characters:", error);
      toast({ title: "Failed to load characters", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProfile = async () => {
    if (!formData.name) {
      toast({ title: "Please enter a character name first", variant: "destructive" });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-writer", {
        body: {
          action: "generate-character",
          text: formData.name,
          context: `Role: ${formData.role || "Not specified"}\nDescription: ${formData.description || "Not specified"}`
        }
      });

      if (error) throw error;

      const generated = data.result;
      setFormData(prev => ({
        ...prev,
        personality: generated.personality || prev.personality,
        background: generated.background || prev.background,
        description: generated.description || prev.description
      }));

      toast({ title: "Character profile generated!" });
    } catch (error) {
      console.error("Error generating character:", error);
      toast({ title: "Failed to generate profile", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({ title: "Character name is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (editingCharacter) {
        const { error } = await supabase
          .from("characters")
          .update(formData)
          .eq("id", editingCharacter.id);

        if (error) throw error;
        toast({ title: "Character updated!" });
      } else {
        const { error } = await supabase
          .from("characters")
          .insert({ ...formData, manuscript_id: manuscriptId });

        if (error) throw error;
        toast({ title: "Character created!" });
      }

      setIsOpen(false);
      resetForm();
      loadCharacters();
    } catch (error) {
      console.error("Error saving character:", error);
      toast({ title: "Failed to save character", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("characters").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Character deleted" });
      loadCharacters();
    } catch (error) {
      console.error("Error deleting character:", error);
      toast({ title: "Failed to delete character", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      role: "",
      description: "",
      personality: "",
      background: "",
      notes: ""
    });
    setEditingCharacter(null);
  };

  const openEditDialog = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name,
      role: character.role || "",
      description: character.description || "",
      personality: character.personality || "",
      background: character.background || "",
      notes: character.notes || ""
    });
    setIsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Characters</h2>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Character
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCharacter ? "Edit Character" : "New Character"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Character name"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g., Protagonist, Antagonist, Supporting"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Physical appearance and first impression"
                  rows={3}
                />
              </div>
              <Button onClick={handleGenerateProfile} disabled={generating} variant="outline" className="w-full">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Profile with AI
              </Button>
              <div>
                <Label htmlFor="personality">Personality</Label>
                <Textarea
                  id="personality"
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  placeholder="Traits, quirks, motivations"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="background">Background</Label>
                <Textarea
                  id="background"
                  value={formData.background}
                  onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                  placeholder="Character history and backstory"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCharacter ? "Update" : "Create"} Character
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => (
          <Card key={character.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => openEditDialog(character)}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                {character.role && <p className="text-sm text-muted-foreground">{character.role}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(character.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {character.description && (
                <p className="text-sm line-clamp-3 mb-2">{character.description}</p>
              )}
              {character.personality && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  <strong>Personality:</strong> {character.personality}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {characters.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No characters yet. Create your first character!</p>
        </div>
      )}
    </div>
  );
}
