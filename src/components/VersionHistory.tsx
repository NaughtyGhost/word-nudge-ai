import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, History, RotateCcw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Version {
  id: string;
  version_number: number;
  title: string;
  content: string;
  created_at: string;
}

interface VersionHistoryProps {
  manuscriptId: string;
  chapterId: string;
  currentTitle: string;
  onRestore: (content: string) => void;
}

export function VersionHistory({ manuscriptId, chapterId, currentTitle, onRestore }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chapter_versions")
        .select("*")
        .eq("manuscript_id", manuscriptId)
        .eq("chapter_id", chapterId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error("Error loading versions:", error);
      toast({ title: "Failed to load version history", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, manuscriptId, chapterId]);

  const handleRestore = (content: string, versionNumber: number) => {
    onRestore(content);
    toast({ title: `Restored to version ${versionNumber}` });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Version History - {currentTitle}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <p>No saved versions yet. Versions are created automatically when you make changes.</p>
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {versions.map((version) => (
                <div key={version.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">Version {version.version_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(version.created_at), "PPp")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(version.content, version.version_number)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                  <div className="text-sm bg-muted/50 p-3 rounded max-h-32 overflow-y-auto">
                    <p className="whitespace-pre-wrap line-clamp-6">{version.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {version.content.split(/\s+/).length} words
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
