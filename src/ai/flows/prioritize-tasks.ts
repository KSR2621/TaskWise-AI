'use server';

/**
 * @fileOverview AI-powered task prioritization flow.
 *
 * - prioritizeTasks - A function that prioritizes a list of tasks based on deadlines, importance, and user-defined criteria.
 * - PrioritizeTasksInput - The input type for the prioritizeTasks function.
 * - PrioritizeTasksOutput - The return type for the prioritizeTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskSchema = z.object({
  id: z.string().describe('Unique identifier for the task.'),
  description: z.string().describe('Description of the task.'),
  deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD).'),
  importance: z.enum(['High', 'Medium', 'Low']).describe('Importance level of the task.'),
  userCriteria: z.string().optional().describe('Any user-defined criteria for prioritizing the task.'),
});

export type Task = z.infer<typeof TaskSchema>;

const PrioritizeTasksInputSchema = z.object({
  tasks: z.array(TaskSchema).describe('Array of tasks to be prioritized.'),
});

export type PrioritizeTasksInput = z.infer<typeof PrioritizeTasksInputSchema>;

const PrioritizedTaskSchema = TaskSchema.extend({
  priorityScore: z.number().describe('A numerical score indicating the priority of the task.'),
  reasoning: z.string().describe('Explanation of why the task was prioritized as such.')
});

const PrioritizeTasksOutputSchema = z.array(PrioritizedTaskSchema);

export type PrioritizeTasksOutput = z.infer<typeof PrioritizeTasksOutputSchema>;

export async function prioritizeTasks(input: PrioritizeTasksInput): Promise<PrioritizeTasksOutput> {
  return prioritizeTasksFlow(input);
}

const prioritizeTasksPrompt = ai.definePrompt({
  name: 'prioritizeTasksPrompt',
  input: {schema: PrioritizeTasksInputSchema},
  output: {schema: PrioritizeTasksOutputSchema},
  prompt: `You are an AI task prioritization assistant. Analyze the following list of tasks and prioritize them based on their deadlines, importance, and any user-defined criteria. Return the tasks with a priority score (higher is more important) and the reasoning for the score.

Tasks:
{{#each tasks}}
- ID: {{this.id}}
  Description: {{this.description}}
  Deadline: {{this.deadline}}
  Importance: {{this.importance}}
  User Criteria: {{this.userCriteria}}
{{/each}}

Output the tasks with a 'priorityScore' and 'reasoning' field for each task.

Example output:
[
  {
    "id": "task1",
    "description": "Grocery Shopping",
    "deadline": "2024-07-08",
    "importance": "High",
    "userCriteria": "Get ingredients for dinner",
    "priorityScore": 95,
    "reasoning": "High importance and approaching deadline."
  },
  {
    "id": "task2",
    "description": "Book Hotel",
    "deadline": "2024-07-15",
    "importance": "Medium",
    "userCriteria": "Near the beach",
    "priorityScore": 60,
    "reasoning": "Medium importance and a week until the deadline."
  }
]
`,
});

const prioritizeTasksFlow = ai.defineFlow(
  {
    name: 'prioritizeTasksFlow',
    inputSchema: PrioritizeTasksInputSchema,
    outputSchema: PrioritizeTasksOutputSchema,
  },
  async input => {
    const {output} = await prioritizeTasksPrompt(input);
    return output!;
  }
);
