'use server';

/**
 * @fileOverview AI flow to suggest optimal scheduling times for tasks with smart reminders.
 *
 * - suggestSchedule - A function that suggests an optimal schedule for a task.
 * - SuggestScheduleInput - The input type for the suggestSchedule function.
 * - SuggestScheduleOutput - The return type for the suggestSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestScheduleInputSchema = z.object({
  taskName: z.string().describe('The name of the task to schedule.'),
  deadline: z.string().describe('The deadline for the task (e.g., YYYY-MM-DD HH:MM).'),
  userAvailability: z.string().describe('The user availability (e.g., available between 9 AM and 5 PM on weekdays).'),
  priority: z.enum(['High', 'Medium', 'Low']).describe('The priority of the task.'),
});
export type SuggestScheduleInput = z.infer<typeof SuggestScheduleInputSchema>;

const SuggestScheduleOutputSchema = z.object({
  suggestedSchedule: z.string().describe('The suggested schedule for the task (e.g., YYYY-MM-DD HH:MM).'),
  reminderInterval: z.string().describe('The suggested reminder interval (e.g., 1 hour before, 1 day before).'),
  reasoning: z.string().describe('Explanation of why the schedule and interval are optimal.'),
});
export type SuggestScheduleOutput = z.infer<typeof SuggestScheduleOutputSchema>;

export async function suggestSchedule(input: SuggestScheduleInput): Promise<SuggestScheduleOutput> {
  return suggestScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSchedulePrompt',
  input: {schema: SuggestScheduleInputSchema},
  output: {schema: SuggestScheduleOutputSchema},
  prompt: `You are an AI assistant that suggests optimal schedules and smart reminders for tasks.

  Given the following task details, suggest an optimal schedule and reminder interval to ensure the task is completed on time.

  Task Name: {{{taskName}}}
  Deadline: {{{deadline}}}
  User Availability: {{{userAvailability}}}
  Priority: {{{priority}}}

  Consider the user's availability and the task's priority when suggesting the schedule and reminder interval.
  Explain your reasoning for the suggested schedule and reminder interval. Adhere to the output schema.
  `,
});

const suggestScheduleFlow = ai.defineFlow(
  {
    name: 'suggestScheduleFlow',
    inputSchema: SuggestScheduleInputSchema,
    outputSchema: SuggestScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
