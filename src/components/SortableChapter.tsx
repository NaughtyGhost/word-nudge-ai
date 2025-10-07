import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical } from 'lucide-react';

interface SortableChapterProps {
  id: string;
  title: string;
  isActive: boolean;
  onClick: () => void;
}

export const SortableChapter = ({ id, title, isActive, onClick }: SortableChapterProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 w-full rounded-lg transition-colors ${
        isActive 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-secondary text-foreground'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing px-2 py-2 hover:bg-background/10 rounded-l-lg"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        onClick={onClick}
        className="flex-1 text-left px-2 py-2 flex items-center justify-between group"
      >
        <span className="truncate">{title}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${
          isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
        }`} />
      </button>
    </div>
  );
};
