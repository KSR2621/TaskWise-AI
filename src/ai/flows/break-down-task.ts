'use server';

/**
 * @fileOverview A flow to break down a large task into smaller, manageable subtasks by asking clarifying questions.
 *
 * - breakDownTask - A function that handles the task breakdown process.
 * - BreakDownTaskInput - The input type for the breakDownTask function.
 * - BreakDownTaskOutput - The return type for the breakDownTask function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BreakDownTaskInputSchema = z.object({
  task: z.string().describe('The large task to break down into smaller subtasks.'),
  userResponse: z.string().optional().describe('The user\'s response to the clarifying questions.'),
});
export type BreakDownTaskInput = z.infer<typeof BreakDownTaskInputSchema>;

const BreakDownTaskOutputSchema = z.object({
  questions: z.array(z.string()).optional().describe('Clarifying questions for the user to answer.'),
  subtasks: z.array(z.string()).optional().describe('An array of subtasks that make up the larger task.'),
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

{{#if userResponse}}
You previously asked some questions to understand the task better. Here is the user's response:
"{{userResponse}}"

Based on this new information, generate a list of concrete, actionable subtasks.
If the user's response is vague, ask another clarifying question.
Otherwise, provide the subtasks and no more questions.
{{else}}
To break down this task effectively, I need more information. Ask the user 2-3 clarifying questions to better understand the scope, dependencies, and desired outcome.
For example:
- What is the final deliverable or outcome for this task?
- Are there any deadlines or milestones I should be aware of?
- Who are the key stakeholders involved?
Return ONLY the questions in the 'questions' field.
{{/if}}
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
