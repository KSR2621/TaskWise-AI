'use server';

/**
 * @fileOverview A flow to generate a complete daily schedule based on user's goals and constraints.
 *
 * - generateDaySchedule - A function that handles the daily schedule generation.
 * - GenerateDayScheduleInput - The input type for the generateDaySchedule function.
 * - GenerateDayScheduleOutput - The return type for the generateDaySchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDayScheduleInputSchema = z.object({
  mainGoal: z.string().describe('The user\'s main goal for the day.'),
  wakeUpTime: z.string().describe('The time the user wakes up (e.g., "7 AM").'),
  sleepTime: z.string().describe('The time the user goes to sleep (e.g., "11 PM").'),
  fixedAppointments: z.string().optional().describe('Any fixed appointments or meetings the user has, with their times (e.g., "Team meeting 2pm-3pm").'),
  waterIntakeLiters: z.number().min(0).describe('The target amount of water to drink in liters.'),
});
export type GenerateDayScheduleInput = z.infer<typeof GenerateDayScheduleInputSchema>;

const ScheduledTaskSchema = z.object({
    time: z.string().describe('The specific time for the task (e.g., "9:00 AM" or "1:00 PM - 2:00 PM").'),
    task: z.string().describe('A short description of the task or event.'),
    priority: z.enum(['High', 'Medium', 'Low']).describe('The priority of the task.'),
});

const GenerateDayScheduleOutputSchema = z.object({
  schedule: z.array(ScheduledTaskSchema).describe('An array of scheduled tasks and events for the day.'),
});
export type GenerateDayScheduleOutput = z.infer<typeof GenerateDayScheduleOutputSchema>;

export async function generateDaySchedule(input: GenerateDayScheduleInput): Promise<GenerateDayScheduleOutput> {
  return generateDayScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDaySchedulePrompt',
  input: {schema: GenerateDayScheduleInputSchema},
  output: {schema: GenerateDayScheduleOutputSchema},
  prompt: `You are a productivity expert and personal assistant. Your task is to create a detailed, realistic, and productive daily schedule for a user.

User's Details:
- Main Goal for Today: {{{mainGoal}}}
- Wake-up Time: {{{wakeUpTime}}}
- Bedtime: {{{sleepTime}}}
- Fixed Appointments: {{{fixedAppointments}}}
- Target Water Intake: {{{waterIntakeLiters}}} liters

Instructions:
1.  Create a schedule that starts from the user's wake-up time and ends at their bedtime.
2.  Block out time for the fixed appointments.
3.  The central part of the schedule should be dedicated to achieving the user's main goal. Break this goal down into smaller, actionable tasks and schedule them. Mark these tasks as 'High' priority.
4.  Incorporate breaks (e.g., short 10-minute breaks, a longer lunch break). Mark these as 'Low' priority.
5.  Schedule meals (breakfast, lunch, dinner). Mark these as 'Medium' priority.
6.  Distribute water reminders throughout the day to help the user reach their {{{waterIntakeLiters}}} liter goal. A good approach is one glass (250ml) every hour or two.
7.  Include a wind-down period before bedtime (e.g., reading, meditating).
8.  Assign a 'High', 'Medium', or 'Low' priority to every item in the schedule.
9.  Return the schedule as a JSON array of objects, where each object has a 'time', 'task', and 'priority' field.
`,
});

const generateDayScheduleFlow = ai.defineFlow(
  {
    name: 'generateDayScheduleFlow',
    inputSchema: GenerateDayScheduleInputSchema,
    outputSchema: GenerateDayScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
