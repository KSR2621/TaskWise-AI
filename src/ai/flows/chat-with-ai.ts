'use server';

/**
 * @fileOverview A conversational AI flow to chat with the user about their day and suggest tasks.
 *
 * - chatWithAI - A function that handles the chat interaction.
 * - ChatWithAIInput - The input type for the chatWithAI function.
 * - ChatWithAIOutput - The return type for the chatWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestedTaskSchema = z.object({
    task: z.string().describe('A short description of the task or event.'),
    priority: z.enum(['High', 'Medium', 'Low']).describe('The priority of the task.'),
    category: z.enum(['Today', 'This Week', 'Long Term']).describe('The category for the task.'),
});

const ChatWithAIInputSchema = z.object({
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string(),
  })).describe('The history of the conversation so far.'),
  userInput: z.string().describe('The latest message from the user.'),
});
export type ChatWithAIInput = z.infer<typeof ChatWithAIInputSchema>;

const ChatWithAIOutputSchema = z.object({
  response: z.string().describe('The AI\'s conversational response to the user.'),
  suggestedTasks: z.array(SuggestedTaskSchema).optional().describe('An array of tasks suggested based on the conversation. Only suggest tasks if the user seems ready or asks for them. Do not suggest tasks on every turn.'),
});
export type ChatWithAIOutput = z.infer<typeof ChatWithAIOutputSchema>;

export async function chatWithAI(input: ChatWithAIInput): Promise<ChatWithAIOutput> {
  return chatWithAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'chatWithAIPrompt',
  input: {schema: ChatWithAIInputSchema},
  output: {schema: ChatWithAIOutputSchema},
  prompt: `You are a friendly and helpful productivity assistant chatbot. Your goal is to chat with the user about their day, their goals, and their plans.

Based on the conversation, you can suggest tasks for them to add to their to-do list.

- Be conversational and natural.
- Keep your responses concise.
- If the user mentions something that sounds like a task (e.g., "I need to finish that report," or "I should probably go to the gym"), you can formulate it as a suggested task.
- Only suggest tasks when it feels natural. Don't force it in every message.
- Ask clarifying questions if you need more details to create a good task suggestion.
- Infer the priority and category ('Today', 'This Week', 'Long Term') for the tasks based on the user's language (e.g., "I need to do this today" implies 'Today' and 'High' priority).

Conversation History:
{{#each conversationHistory}}
- {{this.role}}: {{this.text}}
{{/each}}

New User Message:
"{{{userInput}}}"

Your response should continue the conversation. If you have identified tasks, include them in the 'suggestedTasks' field.
`,
});

const chatWithAIFlow = ai.defineFlow(
  {
    name: 'chatWithAIFlow',
    inputSchema: ChatWithAIInputSchema,
    outputSchema: ChatWithAIOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
