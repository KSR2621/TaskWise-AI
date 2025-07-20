import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-schedule.ts';
import '@/ai/flows/suggest-tasks.ts';
import '@/ai/flows/break-down-task.ts';
import '@/ai/flows/prioritize-tasks.ts';
import '@/ai/flows/generate-day-schedule.ts';
