import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ChapterMetadata {
  notes?: string;
  tags?: string[];
  status?: "draft" | "revision" | "final";
}

interface ChapterMetadataProps {
  metadata: ChapterMetadata;
  onChange: (metadata: ChapterMetadata) => void;
}

export function ChapterMetadata({ metadata, onChange }: ChapterMetadataProps) {
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTags = [...(metadata.tags || []), tagInput.trim()];
      onChange({ ...metadata, tags: newTags });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = (metadata.tags || []).filter(tag => tag !== tagToRemove);
    onChange({ ...metadata, tags: newTags });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <h3 className="font-semibold text-sm">Chapter Metadata</h3>
      
      <div>
        <Label htmlFor="status">Status</Label>
        <Select
          value={metadata.status || "draft"}
          onValueChange={(value: "draft" | "revision" | "final") => 
            onChange({ ...metadata, status: value })
          }
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="revision">Revision</SelectItem>
            <SelectItem value="final">Final</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={metadata.notes || ""}
          onChange={(e) => onChange({ ...metadata, notes: e.target.value })}
          placeholder="Chapter notes, ideas, reminders..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleAddTag}
          placeholder="Add tag and press Enter"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {(metadata.tags || []).map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleRemoveTag(tag)}
              />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
