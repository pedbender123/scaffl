import { generateChatResponse } from './ai.js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../.env') });

async function testQueue() {
  console.log('Starting 3 concurrent Gemini requests...');
  
  const p1 = generateChatResponse([], 'Diga "1"', 'professor', 'user1');
  const p2 = generateChatResponse([], 'Diga "2"', 'professor', 'user2');
  const p3 = generateChatResponse([], 'Diga "3"', 'professor', 'user3');
  
  const results = await Promise.all([p1, p2, p3]);
  console.log('All requests finished.');
  console.log('Result 1:', results[0].text);
  console.log('Result 2:', results[1].text);
  console.log('Result 3:', results[2].text);
}

testQueue().catch(console.error);
