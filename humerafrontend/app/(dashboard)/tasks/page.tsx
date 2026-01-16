'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { tasksApi } from '@/lib/api/tasks';
import { projectsApi } from '@/lib/api/projects';
import { Task, TaskStatus } from '@/lib/types/task.types';
import { Project } from '@/lib/types/project.types';
import TaskCard from '@/components/tasks/TaskCard';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
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
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const [projectData, tasksData] = await Promise.all([
        projectsApi.getById(projectId),
        tasksApi.getByProject(projectId),
      ]);
      setProject(projectData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading data:', error);
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
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask || activeTask.status === 'done') return;

    const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];
    if (statuses.includes(overId as TaskStatus)) {
      const newStatus = overId as TaskStatus;
      setTasks(
        tasks.map((t) => (t.id === activeId ? { ...t, status: newStatus } : t))
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);

    if (!task || task.status === 'done') return;

    let newStatus: TaskStatus;
    const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];

    if (statuses.includes(over.id as TaskStatus)) {
      newStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      newStatus = overTask.status;
    }

    if (task.status === newStatus) return;

    try {
      await tasksApi.update(taskId, { status: newStatus });
      console.log(`Task ${taskId} updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating task:', error);
      loadData();
    }
  };

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const columns: { id: TaskStatus; title: string; color: string }[] = [
    { id: 'todo', title: 'To Do', color: 'bg-zinc-100 dark:bg-zinc-800' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50 dark:bg-blue-900/20' },
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
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{project?.name}</h1>
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => {
            const columnTasks = getTasksByStatus(column.id);

            return (
              <div
                key={column.id}
                className={`${column.color} rounded-lg p-4 min-h-[500px]`}
              >
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center justify-between">
                  {column.title}
                  <span className="text-sm text-zinc-500">{columnTasks.length}</span>
                </h3>

                <SortableContext
                  id={column.id}
                  items={columnTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div
                    className="space-y-3 min-h-[400px]"
                    data-status={column.id}
                  >
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onDelete={handleDeleteTask}
                        isDone={column.id === 'done'}
                      />
                    ))}

                    {/* Drop zone invisible */}
                    {columnTasks.length === 0 && (
                      <div className="h-full min-h-[100px] flex items-center justify-center text-zinc-400 text-sm">
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="bg-white dark:bg-zinc-700 rounded-lg p-4 shadow-lg border-2 border-blue-500 rotate-3 opacity-90">
              <h4 className="font-medium text-zinc-900 dark:text-white">{activeTask.title}</h4>
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
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
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