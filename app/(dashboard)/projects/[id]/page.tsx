'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tasksApi } from '@/lib/api/tasks';
import { Task, TaskStatus } from '@/lib/types/task.types';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverEvent,
  pointerWithin,
  rectIntersection,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';

function DroppableColumn({
  id,
  title,
  color,
  tasks,
  onDelete,
  isDone,
}: {
  id: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
  onDelete: (taskId: string) => void;
  isDone: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${color} rounded-lg p-4 min-h-[500px] transition-all ${
        isOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
    >
      <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center justify-between">
        {title}
        <span className="text-sm text-zinc-500">{tasks.length}</span>
      </h3>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-zinc-400 text-sm border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg">
            Drop tasks here
          </div>
        ) : (
          tasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              onDelete={onDelete}
              isDone={isDone}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableTask({
  task,
  onDelete,
  isDone,
}: {
  task: Task;
  onDelete: (taskId: string) => void;
  isDone: boolean;
}) {
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
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-zinc-700 rounded-lg p-4 shadow-sm border border-zinc-200 dark:border-zinc-600 select-none ${
        isDone
          ? 'opacity-75 cursor-not-allowed'
          : 'cursor-grab active:cursor-grabbing hover:shadow-md'
      } ${isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''} transition-shadow`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-zinc-900 dark:text-white flex-1 pointer-events-none">
          {task.title}
        </h4>
        {!isDone && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-red-500 hover:text-red-700 text-xl leading-none ml-2 pointer-events-auto"
          >
            ×
          </button>
        )}
      </div>
      {task.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2 pointer-events-none">
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between pointer-events-none">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">@{task.assignee}</span>
        {isDone && (
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
            ✓ Done
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignee: '',
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const tasksData = await tasksApi.getByProject(projectId);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTask = await tasksApi.create({
        project_id: projectId,
        ...formData,
      });
      setTasks([newTask, ...tasks]);
      setFormData({ title: '', description: '', assignee: '' });
      setShowModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await tasksApi.delete(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task && task.status !== 'done') {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (!task || task.status === 'done') return;

    const newStatus = over.id as TaskStatus;
    const validStatuses: TaskStatus[] = ['todo', 'in_progress', 'done'];

    if (!validStatuses.includes(newStatus) || task.status === newStatus) {
      return;
    }

    setTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await tasksApi.update(taskId, { status: newStatus });
      console.log(`✓ Task "${task.title}" moved to ${newStatus}`);
    } catch (error) {
      console.error('Error updating task:', error);
      loadTasks();
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'bg-zinc-100 dark:bg-zinc-800' },
    {
      id: 'in_progress',
      title: 'In Progress',
      color: 'bg-blue-50 dark:bg-blue-900/20',
    },
    { id: 'done', title: 'Done', color: 'bg-green-50 dark:bg-green-900/20' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <button
            onClick={() => router.push('/projects')}
            className="text-blue-600 hover:text-blue-700 mb-2 text-sm"
          >
            ← Back to Projects
          </button>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Project Tasks
          </h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        >
          + New Task
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <DroppableColumn
              key={column.id}
              id={column.id}
              title={column.title}
              color={column.color}
              tasks={getTasksByStatus(column.id)}
              onDelete={handleDeleteTask}
              isDone={column.id === 'done'}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white dark:bg-zinc-700 rounded-lg p-4 shadow-2xl border-2 border-blue-500 rotate-2 opacity-90">
              <h4 className="font-medium text-zinc-900 dark:text-white">
                {activeTask.title}
              </h4>
              <p className="text-xs text-zinc-500 mt-1">@{activeTask.assignee}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Modal Create Task */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">
              Create New Task
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                  placeholder="Task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                  placeholder="Task description (optional)"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Assignee
                </label>
                <input
                  type="text"
                  required
                  value={formData.assignee}
                  onChange={(e) =>
                    setFormData({ ...formData, assignee: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-zinc-700 dark:text-white"
                  placeholder="username"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({ title: '', description: '', assignee: '' });
                  }}
                  className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}