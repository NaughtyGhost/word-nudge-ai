import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Plus, Trash2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface PlotPoint {
  id: string;
  title: string;
  description: string;
  plot_type: string;
  tension_level: number;
  chapter_id: string;
  sequence_order: number;
}

interface Chapter {
  id: string;
  title: string;
}

interface PlotArcVisualizerProps {
  manuscriptId: string;
  chapters: Chapter[];
}

export function PlotArcVisualizer({ manuscriptId, chapters }: PlotArcVisualizerProps) {
  const [plotPoints, setPlotPoints] = useState<PlotPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    plot_type: "rising-action",
    tension_level: 5,
    chapter_id: "",
    sequence_order: 0
  });

  useEffect(() => {
    loadPlotPoints();
  }, [manuscriptId]);

  const loadPlotPoints = async () => {
    try {
      const { data, error } = await supabase
        .from("plot_points")
        .select("*")
        .eq("manuscript_id", manuscriptId)
        .order("sequence_order", { ascending: true });

      if (error) throw error;
      setPlotPoints(data || []);
    } catch (error) {
      console.error("Error loading plot points:", error);
      toast.error("Failed to load plot points");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.chapter_id) {
      toast.error("Title and chapter are required");
      return;
    }

    try {
      const { error } = await supabase.from("plot_points").insert({
        ...formData,
        manuscript_id: manuscriptId
      });

      if (error) throw error;
      toast.success("Plot point added!");
      setIsOpen(false);
      resetForm();
      loadPlotPoints();
    } catch (error) {
      console.error("Error saving plot point:", error);
      toast.error("Failed to save plot point");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("plot_points").delete().eq("id", id);
      if (error) throw error;
      toast.success("Plot point deleted");
      loadPlotPoints();
    } catch (error) {
      console.error("Error deleting plot point:", error);
      toast.error("Failed to delete plot point");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      plot_type: "rising-action",
      tension_level: 5,
      chapter_id: "",
      sequence_order: plotPoints.length
    });
  };

  const getPlotTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "exposition": "bg-blue-500/20 text-blue-500 border-blue-500/30",
      "rising-action": "bg-green-500/20 text-green-500 border-green-500/30",
      "climax": "bg-red-500/20 text-red-500 border-red-500/30",
      "falling-action": "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      "resolution": "bg-purple-500/20 text-purple-500 border-purple-500/30"
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plot Arc Visualizer</h2>
          <p className="text-sm text-muted-foreground">Track your story's dramatic structure</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Plot Point
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Plot Point</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Hero's Call to Adventure"
                />
              </div>
              <div>
                <Label htmlFor="chapter">Chapter *</Label>
                <Select value={formData.chapter_id} onValueChange={(value) => setFormData({ ...formData, chapter_id: value })}>
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
                <Label htmlFor="plot-type">Plot Stage</Label>
                <Select value={formData.plot_type} onValueChange={(value) => setFormData({ ...formData, plot_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exposition">Exposition</SelectItem>
                    <SelectItem value="rising-action">Rising Action</SelectItem>
                    <SelectItem value="climax">Climax</SelectItem>
                    <SelectItem value="falling-action">Falling Action</SelectItem>
                    <SelectItem value="resolution">Resolution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tension Level: {formData.tension_level}/10</Label>
                <Slider
                  value={[formData.tension_level]}
                  onValueChange={(value) => setFormData({ ...formData, tension_level: value[0] })}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What happens at this point?"
                  rows={3}
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                Add Plot Point
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tension Arc Visualization */}
      <Card className="p-6 bg-card/50">
        <div className="relative h-48 mb-4">
          <div className="absolute inset-0 flex items-end justify-around">
            {plotPoints.map((point, idx) => (
              <div key={point.id} className="flex flex-col items-center" style={{ height: `${point.tension_level * 10}%` }}>
                <div className="w-1 bg-primary flex-1" />
                <div className={`mt-2 px-2 py-1 rounded-full border text-xs font-medium ${getPlotTypeColor(point.plot_type)}`}>
                  {point.tension_level}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 border-b border-border" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>Story Tension Arc</span>
        </div>
      </Card>

      {/* Plot Points List */}
      <div className="space-y-3">
        {plotPoints.map((point) => {
          const chapter = chapters.find(ch => ch.id === point.chapter_id);
          return (
            <Card key={point.id} className="p-4 bg-card/50 hover:bg-card smooth-transition">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPlotTypeColor(point.plot_type)}`}>
                      {point.plot_type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {chapter?.title || 'Unknown Chapter'}
                    </span>
                  </div>
                  <h3 className="font-semibold">{point.title}</h3>
                  {point.description && (
                    <p className="text-sm text-muted-foreground">{point.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Tension: {point.tension_level}/10</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(point.id)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {plotPoints.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No plot points yet. Start mapping your story arc!</p>
        </div>
      )}
    </div>
  );
}