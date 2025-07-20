'use server';

/**
 * @fileOverview A flow to break down a large task into smaller, manageable subtasks.
 *
 * - breakDownTask - A function that handles the task breakdown process.
 * - BreakDownTaskInput - The input type for the breakDownTask function.
 * - BreakDownTaskOutput - The return type for the breakDownTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakDownTaskInputSchema = z.object({
  task: z.string().describe('The large task to break down into smaller subtasks.'),
});
export type BreakDownTaskInput = z.infer<typeof BreakDownTaskInputSchema>;

const BreakDownTaskOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('An array of subtasks that make up the larger task.'),
});
export type BreakDownTaskOutput = z.infer<typeof BreakDownTaskOutputSchema>;

export async function breakDownTask(input: BreakDownTaskInput): Promise<BreakDownTaskOutput> {
  return breakDownTaskFlow(input);
}

const prompt = ai.definePrompt({
  name: 'breakDownTaskPrompt',
  input: {schema: BreakDownTaskInputSchema},
  output: {schema: BreakDownTaskOutputSchema},
  prompt: `You are a task management expert. Your job is to break down large tasks into smaller, more manageable subtasks.

  Task: {{{task}}}

  Consider the following when breaking down the task:
  - What are the individual steps required to complete the task?
  - What are the dependencies between the steps?
  - How can the steps be grouped into logical subtasks?

  Return the subtasks as a JSON array of strings.
  `,
});

const breakDownTaskFlow = ai.defineFlow(
  {
    name: 'breakDownTaskFlow',
    inputSchema: BreakDownTaskInputSchema,
    outputSchema: BreakDownTaskOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
