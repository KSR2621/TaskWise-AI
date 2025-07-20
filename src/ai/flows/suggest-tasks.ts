// src/ai/flows/suggest-tasks.ts
'use server';
/**
 * @fileOverview A task suggestion AI agent.
 *
 * - suggestTasks - A function that suggests tasks based on user projects and habits.
 * - SuggestTasksInput - The input type for the suggestTasks function.
 * - SuggestTasksOutput - The return type for the suggestTasks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTasksInputSchema = z.object({
  projects: z
    .string()
    .describe('The user current projects, comma separated.'),
  pastHabits: z.string().describe('The user past habits, comma separated.'),
});
export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

const SuggestTasksOutputSchema = z.object({
  tasks: z.array(z.string()).describe('An array of suggested tasks.'),
});
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestTasksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: {schema: SuggestTasksInputSchema},
  output: {schema: SuggestTasksOutputSchema},
  prompt: `You are a personal assistant. Based on the user's current projects and past habits, suggest some tasks that the user may want to add to their to-do list.

Current Projects: {{{projects}}}
Past Habits: {{{pastHabits}}}

Suggest 5 tasks.`,
});

const suggestTasksFlow = ai.defineFlow(
  {
    name: 'suggestTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
