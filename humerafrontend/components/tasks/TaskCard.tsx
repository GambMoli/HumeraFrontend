import { Task } from '@/lib/types/task.types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
  isDone: boolean;
}

export default function TaskCard({ task, onDelete, isDone }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDone,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-zinc-700 rounded-lg p-4 shadow-sm border border-zinc-200 dark:border-zinc-600 ${
        isDone ? 'opacity-75' : 'cursor-grab active:cursor-grabbing hover:shadow-md'
      } ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''} transition-shadow`}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex justify-between items-start mb-2"
      >
        <h4 className="font-medium text-zinc-900 dark:text-white flex-1">{task.title}</h4>
        {!isDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="text-red-500 hover:text-red-700 text-xl leading-none ml-2"
          >
            ×
          </button>
        )}
      </div>
      {task.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">@{task.assignee}</span>
        {isDone && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">✓ Done</span>
        )}
      </div>
    </div>
  );
}