"use client";

import * as React from "react";
import {
  CalendarIcon,
  CheckCircle,
  Circle,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Sparkles,
  ListOrdered,
  Split,
  CalendarClock,
  LoaderCircle,
  Info,
  ClipboardList,
  MessageSquareQuote,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { cn } from "@/lib/utils";
import type { Task, Subtask, Priority, TaskCategory } from "@/lib/types";
import { suggestTasks } from "@/ai/flows/suggest-tasks";
import { breakDownTask } from "@/ai/flows/break-down-task";
import { suggestSchedule } from "@/ai/flows/suggest-schedule";
import { prioritizeTasks } from "@/ai/flows/prioritize-tasks";
import { generateDaySchedule } from "@/ai/flows/generate-day-schedule";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Logo from "@/components/logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const initialTasks: Task[] = [
  { id: 'task-1', title: 'Plan company offsite event', completed: false, priority: 'High', deadline: '2024-08-15', subtasks: [], userCriteria: 'Must be budget-friendly', category: 'This Week' },
  { id: 'task-2', title: 'Develop Q3 marketing strategy', completed: false, priority: 'High', deadline: '2024-07-30', subtasks: [
    { id: 'sub-1', title: 'Research competitors', completed: true },
    { id: 'sub-2', title: 'Define target audience', completed: false },
  ], category: 'This Week'},
  { id: 'task-3', title: 'Finalize Q2 performance reviews', completed: false, priority: 'Medium', deadline: '2024-07-22', subtasks: [], category: 'Today' },
  { id: 'task-4', title: 'Book flight for leadership summit', completed: true, priority: 'High', deadline: '2024-07-25', subtasks: [], category: 'Today' },
  { id: 'task-5', title: 'Outline 2025 product roadmap', completed: false, priority: 'Low', deadline: '2024-09-30', subtasks: [], category: 'Long Term' },
];

export default function TaskWisePage() {
  const [tasks, setTasks] = React.useState<Task[]>(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TaskCategory>("Today");
  const [isSuggestingTasks, setIsSuggestingTasks] = React.useState(false);
  const [isPrioritizing, setIsPrioritizing] = React.useState(false);
  const [dialogState, setDialogState] = React.useState<{
    suggestTasks?: boolean;
    breakdownTask?: Task | null;
    suggestSchedule?: Task | null;
    editTask?: Task | null;
    planDay?: boolean;
  }>({});

  const { toast } = useToast();

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: newTaskTitle.trim(),
        completed: false,
        priority: "Medium",
        subtasks: [],
        category: activeTab,
      };
      setTasks([newTask, ...tasks]);
      setNewTaskTitle("");
    }
  };
  
  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map(task => task.id === updatedTask.id ? updatedTask : task));
  };

  const toggleTaskCompletion = (taskId: string) => {
    setTasks(
      tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };
  
  const toggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
            return {
                ...task,
                subtasks: task.subtasks.map(subtask => 
                    subtask.id === subtaskId ? { ...subtask, completed: !subtask.completed } : subtask
                )
            };
        }
        return task;
    }));
  };
  
  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  const handlePrioritize = async () => {
    setIsPrioritizing(true);
    try {
      const tasksToPrioritize = tasks.filter(t => t.category === activeTab);
      if (tasksToPrioritize.length === 0) {
        toast({ title: "No tasks to prioritize", description: `There are no tasks in the "${activeTab}" view.` });
        return;
      }

      const apiTasks = tasksToPrioritize.map(({ id, title, deadline, priority, userCriteria }) => ({
        id,
        description: title,
        deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        importance: priority,
        userCriteria: userCriteria || ''
      }));

      const prioritized = await prioritizeTasks({ tasks: apiTasks });
      
      const taskMap = new Map(tasks.map(t => [t.id, t]));
      const sortedTasks = prioritized
        .sort((a, b) => b.priorityScore - a.priorityScore)
        .map(pTask => {
          const originalTask = taskMap.get(pTask.id);
          return originalTask ? { ...originalTask, priorityScore: pTask.priorityScore, reasoning: pTask.reasoning } : null;
        })
        .filter((t): t is Task => t !== null);
      
      const otherTasks = tasks.filter(t => !sortedTasks.some(st => st.id === t.id));
      setTasks([...sortedTasks, ...otherTasks]);

      toast({ title: "Tasks Prioritized", description: `Tasks in "${activeTab}" view have been re-ordered.` });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "Failed to prioritize tasks." });
    } finally {
      setIsPrioritizing(false);
    }
  };

  const filteredTasks = tasks.filter(task => task.category === activeTab);
  const completedCount = filteredTasks.filter(t => t.completed).length;
  const totalCount = filteredTasks.length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground font-body">
        <main className="container mx-auto max-w-4xl p-4 md:p-8">
          <header className="flex flex-col md:flex-row items-center justify-between mb-8 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-0">
              <Logo className="h-10 w-10 md:h-12 md:w-12 text-primary" />
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
                  TaskWise AI
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">Your intelligent to-do list by KSR</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setDialogState({ planDay: true })}>
                    <ClipboardList className="h-4 w-4" />
                    <span className="sr-only">Plan My Day</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Plan My Day</TooltipContent>
              </Tooltip>
              <Button variant="ghost" className="hidden md:inline-flex" onClick={() => setDialogState({ planDay: true })}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Plan My Day
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setDialogState({ suggestTasks: true })} disabled={isSuggestingTasks}>
                    {isSuggestingTasks ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    <span className="sr-only">Suggest Tasks</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Suggest Tasks</TooltipContent>
              </Tooltip>
              <Button variant="ghost" className="hidden md:inline-flex" onClick={() => setDialogState({ suggestTasks: true })} disabled={isSuggestingTasks}>
                {isSuggestingTasks ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Suggest Tasks
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={handlePrioritize} disabled={isPrioritizing}>
                    {isPrioritizing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ListOrdered className="h-4 w-4" />}
                    <span className="sr-only">Prioritize</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Prioritize</TooltipContent>
              </Tooltip>
              <Button variant="ghost" className="hidden md:inline-flex" onClick={handlePrioritize} disabled={isPrioritizing}>
                {isPrioritizing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ListOrdered className="mr-2 h-4 w-4" />}
                Prioritize
              </Button>
            </div>
          </header>

          <section className="mb-8">
            <form onSubmit={handleAddTask} className="relative">
              <Input
                type="text"
                placeholder="What needs to be done?"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                className="w-full pl-4 pr-28 md:pr-32 py-6 text-base md:text-lg border-2 border-primary/20 focus:border-primary focus:glow-shadow"
              />
              <Button type="submit" size="lg" className="absolute right-2 top-1/2 -translate-y-1/2 text-sm md:text-base px-3 md:px-4">
                <Plus className="h-5 w-5 md:mr-2" /> <span className="hidden md:inline">Add Task</span>
              </Button>
            </form>
          </section>

          <section>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TaskCategory)}>
                <div className="flex items-center justify-between mb-4">
                    <TabsList>
                        <TabsTrigger value="Today">Today</TabsTrigger>
                        <TabsTrigger value="This Week">This Week</TabsTrigger>
                        <TabsTrigger value="Long Term">Long Term</TabsTrigger>
                    </TabsList>
                    <span className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
                        {completedCount} / {totalCount} done
                    </span>
                </div>
                <TabsContent value="Today">
                    <TaskList tasks={filteredTasks} />
                </TabsContent>
                <TabsContent value="This Week">
                    <TaskList tasks={filteredTasks} />
                </TabsContent>
                <TabsContent value="Long Term">
                    <TaskList tasks={filteredTasks} />
                </TabsContent>
            </Tabs>
          </section>
        </main>

        <PlanDayDialog
            open={dialogState.planDay || false}
            onOpenChange={(open) => setDialogState({ planDay: open })}
            onScheduleGenerated={(newTasks) => {
                setTasks(prev => [...newTasks, ...prev]);
            }}
        />

        <SuggestTasksDialog
          open={dialogState.suggestTasks || false}
          onOpenChange={(open) => setDialogState({ suggestTasks: open })}
          onAddTasks={(newTasks) => {
            const tasksToAdd = newTasks.map(title => ({
              id: `task-${Date.now()}-${Math.random()}`,
              title,
              completed: false,
              priority: 'Medium' as Priority,
              subtasks: [],
              category: 'Today' as TaskCategory,
            }));
            setTasks(prev => [...tasksToAdd, ...prev]);
          }}
          setLoading={setIsSuggestingTasks}
        />
        
        <BreakdownTaskDialog
          task={dialogState.breakdownTask || null}
          onOpenChange={() => setDialogState({ breakdownTask: null })}
          onUpdateTask={updateTask}
        />

        <SuggestScheduleDialog
          task={dialogState.suggestSchedule || null}
          onOpenChange={() => setDialogState({ suggestSchedule: null })}
          onUpdateTask={updateTask}
        />

        <EditTaskDialog
            task={dialogState.editTask || null}
            onOpenChange={() => setDialogState({ editTask: null })}
            onUpdateTask={updateTask}
        />
      </div>
    </TooltipProvider>
  );
  
  function TaskList({ tasks }: { tasks: Task[] }) {
    if (tasks.length === 0) {
      return (
         <div className="text-center py-16 border-2 border-dashed border-border/50 rounded-lg bg-card/50">
            <CheckCircle className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-semibold text-foreground">You're all caught up!</h3>
            <p className="mt-2 text-base text-muted-foreground">Looks like there's nothing on your plate for {activeTab}.</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            onToggleComplete={toggleTaskCompletion}
            onToggleSubtaskComplete={toggleSubtaskCompletion}
            onDelete={deleteTask}
            onEdit={(editedTask) => setDialogState({ editTask: editedTask })}
            onBreakdown={(taskToBreakdown) => setDialogState({ breakdownTask: taskToBreakdown })}
            onSuggestSchedule={(taskToSchedule) => setDialogState({ suggestSchedule: taskToSchedule })}
          />
        ))}
      </div>
    );
  }
}

// Sub-components for better organization

type TaskItemProps = {
  task: Task;
  index: number;
  onToggleComplete: (id: string) => void;
  onToggleSubtaskComplete: (taskId: string, subtaskId: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onBreakdown: (task: Task) => void;
  onSuggestSchedule: (task: Task) => void;
};

const TaskItem = ({ task, index, onToggleComplete, onToggleSubtaskComplete, onDelete, onEdit, onBreakdown, onSuggestSchedule }: TaskItemProps) => {
    const priorityClasses = {
        High: "border-l-4 border-red-400",
        Medium: "border-l-4 border-yellow-400",
        Low: "border-l-4 border-sky-400",
    };
    
    return (
        <Card 
            className={cn(
                "transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg bg-card/80 backdrop-blur-sm",
                task.completed ? "opacity-60 bg-card/50" : "bg-card",
                priorityClasses[task.priority]
            )}
            style={{ animation: `fadeInUp 0.5s ${index * 0.05}s ease-out both` }}
        >
            <CardContent className="p-4 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <Checkbox
                        id={`task-${task.id}`}
                        checked={task.completed}
                        onCheckedChange={() => onToggleComplete(task.id)}
                        className="mt-1 h-5 w-5 rounded-full"
                    />
                    <div className="flex-grow">
                        <label
                            htmlFor={`task-${task.id}`}
                            className={cn(
                                "font-semibold text-base md:text-lg transition-colors cursor-pointer",
                                task.completed ? "line-through text-muted-foreground" : "text-foreground"
                            )}
                        >
                            {task.title}
                        </label>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant={task.priority === 'High' ? 'destructive' : task.priority === 'Medium' ? 'secondary' : 'outline'}>{task.priority}</Badge>
                            {task.deadline && <Badge variant="outline" className="font-mono"><CalendarIcon className="mr-1 h-3 w-3" />{format(parseISO(task.deadline), "MMM d")}</Badge>}
                            {task.priorityScore && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="secondary" className="cursor-help">Score: {task.priorityScore}</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">{task.reasoning || "AI Prioritization score"}</p>
                                    </TooltipContent>
                                </Tooltip>
                            )}
                            {task.suggestedSchedule && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="cursor-help"><CalendarClock className="mr-1 h-3 w-3" />Scheduled</Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Suggested: {task.suggestedSchedule}</p>
                                        {task.reminderInterval && <p>Reminder: {task.reminderInterval}</p>}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(task)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onBreakdown(task)}><Split className="mr-2 h-4 w-4" />AI Breakdown</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onSuggestSchedule(task)}><CalendarClock className="mr-2 h-4 w-4" />Suggest Schedule</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-400 focus:text-red-400 focus:bg-red-400/10"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                {task.subtasks.length > 0 && (
                    <div className="pl-11 space-y-3 pt-2 border-t border-border/50">
                        {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-3">
                                <Checkbox
                                    id={`subtask-${subtask.id}`}
                                    checked={subtask.completed}
                                    onCheckedChange={() => onToggleSubtaskComplete(task.id, subtask.id)}
                                />
                                <label
                                    htmlFor={`subtask-${subtask.id}`}
                                    className={cn("text-sm transition-colors", subtask.completed ? "line-through text-muted-foreground" : "text-foreground")}
                                >
                                    {subtask.title}
                                </label>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// Dialog Components

const planDaySchema = z.object({
  mainGoal: z.string().min(3, { message: "Please enter a main goal." }),
  wakeUpTime: z.string().min(1, { message: "Wake up time is required." }),
  sleepTime: z.string().min(1, { message: "Sleep time is required." }),
  fixedAppointments: z.string().optional(),
  waterIntakeLiters: z.coerce.number().min(0).max(10),
});

const PlanDayDialog = ({ open, onOpenChange, onScheduleGenerated }: { open: boolean, onOpenChange: (open: boolean) => void, onScheduleGenerated: (tasks: Task[]) => void }) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof planDaySchema>>({
        resolver: zodResolver(planDaySchema),
        defaultValues: {
            mainGoal: "",
            wakeUpTime: "8:00 AM",
            sleepTime: "11:00 PM",
            fixedAppointments: "",
            waterIntakeLiters: 3,
        },
    });

    const onSubmit = async (values: z.infer<typeof planDaySchema>) => {
        setIsLoading(true);
        try {
            const result = await generateDaySchedule(values);
            const newTasks: Task[] = result.schedule.map(item => ({
                id: `task-${Date.now()}-${Math.random()}`,
                title: `${item.time}: ${item.task}`,
                completed: false,
                priority: item.priority,
                subtasks: [],
                category: 'Today',
            }));
            onScheduleGenerated(newTasks);
            toast({ title: "Day Planned!", description: "Your schedule has been added to your tasks." });
            onClose();
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "AI Error", description: "Could not generate a schedule." });
        } finally {
            setIsLoading(false);
        }
    };

    const onClose = () => {
        onOpenChange(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Plan Your Perfect Day</DialogTitle>
                    <DialogDescription>Answer a few questions and let AI create a schedule for you.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="mainGoal" render={({ field }) => (
                            <FormItem><FormLabel>What's your main goal for today?</FormLabel><FormControl><Input placeholder="e.g., Finish the project proposal" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="wakeUpTime" render={({ field }) => (
                                <FormItem><FormLabel>Wake-up time</FormLabel><FormControl><Input placeholder="e.g., 7:00 AM" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="sleepTime" render={({ field }) => (
                                <FormItem><FormLabel>Sleep time</FormLabel><FormControl><Input placeholder="e.g., 11:00 PM" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="fixedAppointments" render={({ field }) => (
                            <FormItem><FormLabel>Any fixed appointments?</FormLabel><FormControl><Textarea placeholder="e.g., Meeting from 2pm-3pm, Dentist at 4:30pm" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="waterIntakeLiters" render={({ field }) => (
                            <FormItem><FormLabel>Daily Water Intake (Liters)</FormLabel><FormControl><Input type="number" step="0.5" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardList className="mr-2 h-4 w-4" />}
                                Generate My Schedule
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


const suggestTasksSchema = z.object({
  projects: z.string().min(3, "Please describe your projects briefly."),
  habits: z.string().min(3, "Please describe your habits briefly."),
});

const SuggestTasksDialog = ({ open, onOpenChange, onAddTasks, setLoading }: { open: boolean, onOpenChange: (open: boolean) => void, onAddTasks: (tasks: string[]) => void, setLoading: (loading: boolean) => void }) => {
  const [suggestedTasks, setSuggestedTasks] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof suggestTasksSchema>>({
    resolver: zodResolver(suggestTasksSchema),
    defaultValues: { projects: "", habits: "" },
  });

  const onSubmit = async (values: z.infer<typeof suggestTasksSchema>) => {
    setIsLoading(true);
    setLoading(true);
    try {
      const result = await suggestTasks(values);
      setSuggestedTasks(result.tasks);
    } catch (e) {
      toast({ variant: "destructive", title: "AI Error", description: "Could not suggest tasks." });
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  };
  
  const handleAddSelected = () => {
    onAddTasks(suggestedTasks);
    onClose();
  };

  const onClose = () => {
    onOpenChange(false);
    form.reset();
    setSuggestedTasks([]);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Task Suggestions</DialogTitle>
          <DialogDescription>Tell us about your goals, and we'll suggest some tasks.</DialogDescription>
        </DialogHeader>
        {suggestedTasks.length === 0 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="projects" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Projects</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Launching a new website, learning guitar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="habits" render={({ field }) => (
                <FormItem>
                  <FormLabel>Past Habits or Goals</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Read 10 pages a day, go for a morning run" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Ideas
              </Button>
            </form>
          </Form>
        ) : (
          <div>
            <h3 className="font-semibold mb-2">Here are some ideas:</h3>
            <div className="space-y-2">
              {suggestedTasks.map((task, i) => (
                <div key={i} className="flex items-center p-2 rounded-md bg-muted/50">
                  <Circle className="mr-2 h-2 w-2 fill-current" />
                  <span>{task}</span>
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button onClick={handleAddSelected}>
                <Plus className="mr-2 h-4 w-4" /> Add to My List
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const breakdownResponseSchema = z.object({
  response: z.string().min(5, "Please provide a more detailed response."),
});

const BreakdownTaskDialog = ({ task, onOpenChange, onUpdateTask }: { task: Task | null, onOpenChange: () => void, onUpdateTask: (task: Task) => void }) => {
    const [questions, setQuestions] = React.useState<string[]>([]);
    const [subtasks, setSubtasks] = React.useState<string[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof breakdownResponseSchema>>({
        resolver: zodResolver(breakdownResponseSchema),
        defaultValues: { response: "" },
    });

    React.useEffect(() => {
        if (task) {
            setIsLoading(true);
            setQuestions([]);
            setSubtasks([]);
            form.reset();
            breakDownTask({ task: task.title })
                .then(result => {
                    if (result.questions) {
                        setQuestions(result.questions);
                    } else if (result.subtasks) {
                        setSubtasks(result.subtasks);
                    }
                })
                .catch(() => toast({ variant: 'destructive', title: 'AI Error', description: 'Could not start task breakdown.' }))
                .finally(() => setIsLoading(false));
        }
    }, [task, toast, form]);

    const handleResponseSubmit = async (values: z.infer<typeof breakdownResponseSchema>) => {
        if (!task) return;
        setIsLoading(true);
        try {
            const result = await breakDownTask({ task: task.title, userResponse: values.response });
            if (result.questions) {
                setQuestions(result.questions);
                form.reset();
            } else if (result.subtasks) {
                setQuestions([]);
                setSubtasks(result.subtasks);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'AI Error', description: 'Could not process your response.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddSubtasks = () => {
        if (!task) return;
        const newSubtasks: Subtask[] = subtasks.map((title, i) => ({
            id: `sub-${task.id}-${i}-${Date.now()}`,
            title,
            completed: false,
        }));
        onUpdateTask({ ...task, subtasks: [...task.subtasks, ...newSubtasks] });
        onOpenChange();
    };

    const hasGeneratedResult = subtasks.length > 0;
    
    return (
        <Dialog open={!!task} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Breakdown: {task?.title}</DialogTitle>
                    <DialogDescription>
                        {hasGeneratedResult 
                            ? "Here are the smaller steps to complete this task." 
                            : "Answer a few questions to break down this task."
                        }
                    </DialogDescription>
                </DialogHeader>
                
                {isLoading && !hasGeneratedResult && (
                    <div className="flex items-center justify-center p-8"><LoaderCircle className="h-8 w-8 animate-spin text-primary" /></div>
                )}

                {!isLoading && questions.length > 0 && (
                    <div className="space-y-4">
                        <div className="space-y-2 rounded-md bg-muted/50 p-4">
                            {questions.map((q, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <MessageSquareQuote className="h-4 w-4 mt-1 flex-shrink-0 text-primary" />
                                    <p className="font-medium">{q}</p>
                                </div>
                            ))}
                        </div>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleResponseSubmit)} className="space-y-4">
                                <FormField control={form.control} name="response" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Your Response</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Provide details here..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <DialogFooter>
                                    <Button type="submit" disabled={isLoading}>
                                        {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                        Generate Subtasks
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                )}
                
                {hasGeneratedResult && (
                    <>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {subtasks.map((sub, i) => (
                                <div key={i} className="flex items-center p-2 rounded-md bg-muted/50">
                                    <Circle className="mr-2 h-2 w-2 fill-current" />
                                    <span>{sub}</span>
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddSubtasks} disabled={isLoading}>
                                {isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Add as Subtasks</>}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};


const scheduleSchema = z.object({
  deadline: z.date(),
  priority: z.enum(["Low", "Medium", "High"]),
  availability: z.string().min(5, "e.g., Weekdays 9am-5pm"),
});

const SuggestScheduleDialog = ({ task, onOpenChange, onUpdateTask }: { task: Task | null, onOpenChange: () => void, onUpdateTask: (task: Task) => void }) => {
    const [suggestion, setSuggestion] = React.useState<{ schedule: string; reminder: string, reasoning: string } | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof scheduleSchema>>({
        resolver: zodResolver(scheduleSchema),
    });

    React.useEffect(() => {
        if (task) {
            form.reset({
                deadline: task.deadline ? parseISO(task.deadline) : new Date(),
                priority: task.priority,
                availability: "Weekdays 9am to 5pm",
            });
            setSuggestion(null);
        }
    }, [task, form]);

    const onSubmit = async (values: z.infer<typeof scheduleSchema>) => {
        if (!task) return;
        setIsLoading(true);
        try {
            const result = await suggestSchedule({
                taskName: task.title,
                deadline: format(values.deadline, "yyyy-MM-dd HH:mm"),
                userAvailability: values.availability,
                priority: values.priority,
            });
            setSuggestion({ schedule: result.suggestedSchedule, reminder: result.reminderInterval, reasoning: result.reasoning });
        } catch (e) {
            toast({ variant: 'destructive', title: 'AI Error', description: 'Could not suggest a schedule.' });
        } finally {
            setIsLoading(false);
        }
    };

    const applySchedule = () => {
        if (!task || !suggestion) return;
        onUpdateTask({ ...task, suggestedSchedule: suggestion.schedule, reminderInterval: suggestion.reminder });
        onOpenChange();
    };

    return (
        <Dialog open={!!task} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Suggest Schedule for: {task?.title}</DialogTitle>
                </DialogHeader>
                {!suggestion ? (
                  <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField control={form.control} name="deadline" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Deadline</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={form.control} name="priority" render={({ field }) => (
                            <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name="availability" render={({ field }) => (
                            <FormItem><FormLabel>Your Availability</FormLabel><FormControl><Input placeholder="e.g., Weekdays after 6pm" {...field} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <Button type="submit" disabled={isLoading}>{isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Get Suggestion</Button>
                      </form>
                  </Form>
                ) : (
                  <div>
                      <Card>
                          <CardHeader><CardTitle>AI Suggestion</CardTitle></CardHeader>
                          <CardContent className="space-y-2">
                              <p><strong>Suggested Time:</strong> {suggestion.schedule}</p>
                              <p><strong>Smart Reminder:</strong> {suggestion.reminder}</p>
                          </CardContent>
                          <CardFooter className="text-sm text-muted-foreground italic flex items-start gap-2">
                            <Info className="h-4 w-4 mt-1 flex-shrink-0" />
                            <span>{suggestion.reasoning}</span>
                          </CardFooter>
                      </Card>
                      <DialogFooter className="mt-4">
                          <Button onClick={applySchedule}>Apply Schedule</Button>
                      </DialogFooter>
                  </div>
                )}
            </DialogContent>
        </Dialog>
    );
};


const editTaskSchema = z.object({
  title: z.string().min(1, "Title is required."),
  priority: z.enum(["Low", "Medium", "High"]),
  deadline: z.date().optional(),
  category: z.enum(["Today", "This Week", "Long Term"]),
  userCriteria: z.string().optional(),
});

const EditTaskDialog = ({ task, onOpenChange, onUpdateTask }: { task: Task | null, onOpenChange: () => void, onUpdateTask: (task: Task) => void }) => {
    const form = useForm<z.infer<typeof editTaskSchema>>({
        resolver: zodResolver(editTaskSchema),
    });

    React.useEffect(() => {
        if (task) {
            form.reset({
                title: task.title,
                priority: task.priority,
                deadline: task.deadline ? parseISO(task.deadline) : undefined,
                category: task.category,
                userCriteria: task.userCriteria || '',
            });
        }
    }, [task, form]);

    const onSubmit = (values: z.infer<typeof editTaskSchema>) => {
        if (!task) return;
        onUpdateTask({
            ...task,
            title: values.title,
            priority: values.priority,
            deadline: values.deadline ? values.deadline.toISOString().split('T')[0] : undefined,
            category: values.category,
            userCriteria: values.userCriteria,
        });
        onOpenChange();
    };

    return (
        <Dialog open={!!task} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="priority" render={({ field }) => (
                               <FormItem><FormLabel>Priority</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="category" render={({ field }) => (
                               <FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Today">Today</SelectItem><SelectItem value="This Week">This Week</SelectItem><SelectItem value="Long Term">Long Term</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />
                        </div>
                        
                        <FormField control={form.control} name="deadline" render={({ field }) => (
                           <FormItem className="flex flex-col"><FormLabel>Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="userCriteria" render={({ field }) => (
                            <FormItem><FormLabel>Notes / Criteria</FormLabel><FormControl><Textarea placeholder="Any specific requirements for this task?" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

    