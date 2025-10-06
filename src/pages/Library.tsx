import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PenTool, Plus, BookOpen, LogOut, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Manuscript {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function Library() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadManuscripts();
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
  }, [navigate]);

  const loadManuscripts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("manuscripts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Failed to load manuscripts");
    } else {
      setManuscripts(data || []);
    }
    setLoading(false);
  };

  const createManuscript = async () => {
    if (!newTitle.trim()) {
      toast.error("Please enter a title");
      return;
    }

    const { data, error } = await supabase
      .from("manuscripts")
      .insert({
        title: newTitle,
        description: newDescription,
        user_id: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create manuscript");
    } else {
      toast.success("Manuscript created!");
      setDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      navigate(`/write/${data.id}`);
    }
  };

  const deleteManuscript = async (id: string) => {
    const { error } = await supabase
      .from("manuscripts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete manuscript");
    } else {
      toast.success("Manuscript deleted");
      loadManuscripts();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background flex items-center justify-center">
        <div className="text-center">
          <PenTool className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-background">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <PenTool className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-serif font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              My Library
            </h1>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="glass-panel p-8 h-64 flex flex-col items-center justify-center gap-4 hover:bg-primary/10 transition-all group cursor-pointer">
                <Plus className="w-16 h-16 text-primary group-hover:scale-110 transition-transform" />
                <p className="text-lg font-medium">New Manuscript</p>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Manuscript</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter your manuscript title..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What's your story about?"
                    rows={4}
                  />
                </div>
                <Button onClick={createManuscript} className="w-full">
                  Create Manuscript
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {manuscripts.map((manuscript) => (
            <div
              key={manuscript.id}
              className="glass-panel p-6 h-64 flex flex-col justify-between group hover:shadow-lg transition-all"
            >
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                  <BookOpen className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl font-bold mb-2 truncate">
                      {manuscript.title}
                    </h3>
                    {manuscript.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {manuscript.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => navigate(`/write/${manuscript.id}`)}
                  className="flex-1"
                >
                  Open
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => deleteManuscript(manuscript.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}