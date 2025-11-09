import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

interface Character {
  id: string;
  name: string;
  role: string;
}

interface CharacterRelationshipMapProps {
  manuscriptId: string;
}

export function CharacterRelationshipMap({ manuscriptId }: CharacterRelationshipMapProps) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCharacters();
  }, [manuscriptId]);

  const loadCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from("characters")
        .select("id, name, role")
        .eq("manuscript_id", manuscriptId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCharacters(data || []);
    } catch (error) {
      console.error("Error loading characters:", error);
      toast.error("Failed to load characters");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Group characters by role
  const charactersByRole = characters.reduce((acc, char) => {
    const role = char.role || "Other";
    if (!acc[role]) acc[role] = [];
    acc[role].push(char);
    return acc;
  }, {} as Record<string, Character[]>);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Character Relationships
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visual overview of your cast organized by role
        </p>
      </div>

      {characters.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No characters yet. Create characters in the Characters tab to see them mapped here.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(charactersByRole).map(([role, chars]) => (
            <Card key={role} className="bg-card/50 hover:bg-card smooth-transition animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">({chars.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chars.map((char) => (
                    <div
                      key={char.id}
                      className="p-3 rounded-lg bg-background/50 border border-border/50 hover:border-border smooth-transition"
                    >
                      <p className="font-medium">{char.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Relationship Grid */}
      {characters.length > 1 && (
        <Card className="p-6 bg-card/50">
          <h3 className="font-semibold mb-4">Character Connections Matrix</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b border-border"></th>
                  {characters.map((char) => (
                    <th key={char.id} className="text-center p-2 border-b border-border text-xs">
                      <div className="rotate-[-45deg] origin-bottom-left whitespace-nowrap">
                        {char.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {characters.map((char1, i) => (
                  <tr key={char1.id}>
                    <td className="p-2 border-b border-border font-medium text-xs">
                      {char1.name}
                    </td>
                    {characters.map((char2, j) => (
                      <td
                        key={char2.id}
                        className={`p-2 border-b border-border text-center ${
                          i === j ? 'bg-muted/50' : 'hover:bg-accent/50 cursor-pointer smooth-transition'
                        }`}
                      >
                        {i !== j && (
                          <div className="w-3 h-3 rounded-full bg-primary/20 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            This matrix shows potential relationships between characters. Click cells to define relationships in future updates.
          </p>
        </Card>
      )}
    </div>
  );
}