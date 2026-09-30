import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import db from './db.js';
import { buildSystemPromptV3 } from './promptBuilder.js';
import { getActiveKey, calcCredits } from './providers/registry.js';
import { config } from './config.js';
import { checkPetrusQuota, recordPetrusCredits, logQuotaEvent } from './quota.js';

// Global state for Gemini traffic shaping (5 RPM / 250k TPM)
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 12000;
let tokenHistory: { timestamp: number, tokens: number }[] = [];
const TPM_LIMIT = 250000;
const TPM_WINDOW_MS = 60000;
// GPT desabilitado temporariamente
// const GPT_RATE = 1.3;

/**
 * Returns project limits for a user.
 * Credit limits are now managed by quota.ts (weekly, per-surface).
 * In self-hosted mode every user gets unlimited resources.
 */
export function getUserCreditLimit(userId: string): { creditLimit: number; projectLimit: number } {
  if (config.isSelfHosted) {
    return { creditLimit: Infinity, projectLimit: Infinity };
  }
  const rows = db.prepare('SELECT institutionId FROM user_institutions WHERE userId = ?').all(userId) as { institutionId: string }[];
  const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(userId) as { plan: string } | undefined;
  const isPro = user?.plan === 'pro';
  return rows.length > 0 || isPro
    ? { creditLimit: 1_000_000, projectLimit: 10 }
    : { creditLimit: 100_000,   projectLimit: 5  };
}

const baseFunctionDeclarations = [
  {
    name: 'listar_disciplinas',
    description: 'Lista as disciplinas disponíveis para o estudante no AVA.',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'ler_conteudo_disciplina',
    description: 'Lê o conteúdo programático completo de uma disciplina específica pelo seu ID. Use isso para buscar dados factuais sobre matérias didáticas e responder a perguntas do estudante com precisão.',
    parameters: {
      type: 'OBJECT',
      properties: {
        disciplinaId: { type: 'STRING', description: 'O ID da disciplina a ser lida.' }
      },
      required: ['disciplinaId']
    }
  },
  {
    name: 'listar_atividades',
    description: 'Lista as atividades/tarefas registradas com título, descrição e prazo de entrega para a sala de aula do estudante.',
    parameters: { type: 'OBJECT', properties: {} }
  },
];

function buildToolDeclarations() {
  return [{ functionDeclarations: baseFunctionDeclarations }];
}

function queryDisciplinas(userId: string) {
  const classrooms = db.prepare('SELECT classroomId FROM user_classrooms WHERE userId = ?').all(userId) as { classroomId: string }[];
  let query = `SELECT id, nome FROM disciplinas WHERE institutionId = 'scaffl' OR institutionId = 'global'`;
  const params: any[] = [];
  
  if (classrooms.length > 0) {
    const placeholders = classrooms.map(() => '?').join(', ');
    query += ` OR classroomId IN (${placeholders})`;
    params.push(...classrooms.map(c => c.classroomId));
  }
  return db.prepare(query).all(...params);
}

function queryDisciplinaConteudo(disciplinaId: string) {
  const disc = db.prepare('SELECT nome, conteudo FROM disciplinas WHERE id = ?').get(disciplinaId) as any;
  if (!disc) return { error: `Disciplina "${disciplinaId}" não encontrada.` };
  return { nome: disc.nome, conteudo: disc.conteudo };
}

function queryAtividades(userId: string) {
  const classrooms = db.prepare('SELECT classroomId FROM user_classrooms WHERE userId = ?').all(userId) as { classroomId: string }[];
  if (classrooms.length === 0) return [];

  const placeholders = classrooms.map(() => '?').join(', ');
  return db.prepare(`
    SELECT a.id, a.title, a.description, a.dueDate
    FROM activities a
    JOIN activity_classrooms ac ON a.id = ac.activityId
    WHERE ac.classroomId IN (${placeholders})
    ORDER BY a.dueDate ASC
  `).all(...classrooms.map(c => c.classroomId));
}

/**
 * Internal function to generate response from selected provider
 */
async function _generateChatResponse(
  history: { role: 'user' | 'model'; content: string }[],
  newMessage: string,
  chatId: string,
  userId: string,
  provider: 'google' | 'gpt' = 'google',
  overrideSystemPrompt?: string
) {
  // Fetch credentials from registry (DB first, env fallback)
  const { key: googleKey } = getActiveKey('google');
  const genAI = new GoogleGenerativeAI(googleKey);

  // 1. Token Limit: 50k per request (approximate)
  const historyText = history.map(m => m.content).join(' ');
  const estimatedInputTokens = Math.ceil((historyText.length + newMessage.length) / 4);
  if (estimatedInputTokens > 50000) {
    throw new Error('Limite de 50k tokens por requisição excedido.');
  }

  // 2. Weekly Petrus credit quota
  if (config.isCloud) {
    const quotaCheck = checkPetrusQuota(userId);
    if (!quotaCheck.allowed) {
      throw new Error(quotaCheck.reason ?? 'Limite de créditos atingido.');
    }
  }

  // Build system prompt — usa override se fornecido, senão busca persona do chat
  let systemInstruction: string;
  if (overrideSystemPrompt) {
    systemInstruction = overrideSystemPrompt;
  } else {
    // 0. Fetch Chat, Persona and Disciplina data
    const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId) as any;
    if (!chat) throw new Error('Chat não encontrado.');

    const persona = db.prepare('SELECT * FROM personas WHERE id = ?').get(chat.personaDbId) as any;
    if (!persona) throw new Error('Persona não encontrada.');

    let disciplina = null;
    if (chat.disciplinaId) {
      disciplina = db.prepare('SELECT * FROM disciplinas WHERE id = ?').get(chat.disciplinaId) as any;
    }

    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
    const studentName = user ? user.name : 'Estudante';

    systemInstruction = buildSystemPromptV3(
      persona.nome,
      persona.documentoPedagogico,
      persona.isGenerico === 1,
      disciplina ? { nome: disciplina.nome, conteudo: disciplina.conteudo } : undefined,
      studentName
    );
  }

  try {
    let text = '';
    let tokensUsed = 0;
    let inputTokFinal = 0;
    let outputTokFinal = 0;
    let cachedTok = 0;

    if (provider === 'google') {
      // Traffic Shaping for Gemini
      const cleanTokenHistory = () => {
        const now = Date.now();
        tokenHistory = tokenHistory.filter(h => now - h.timestamp < TPM_WINDOW_MS);
      };
      const getTPMUsage = () => {
        cleanTokenHistory();
        return tokenHistory.reduce((sum, h) => sum + h.tokens, 0);
      };

      let tpmUsage = getTPMUsage();
      while (tpmUsage + estimatedInputTokens > TPM_LIMIT) {
        const oldest = tokenHistory[0];
        const waitTime = TPM_WINDOW_MS - (Date.now() - oldest.timestamp) + 100;
        console.log(`[AI] TPM Limit reached. Waiting ${Math.ceil(waitTime/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        tpmUsage = getTPMUsage();
      }

      const timeSinceLast = Date.now() - lastRequestTime;
      if (timeSinceLast < MIN_INTERVAL_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - timeSinceLast));
      }
      lastRequestTime = Date.now();

      const model = genAI.getGenerativeModel(
        {
          model: 'gemini-2.5-flash',
          systemInstruction,
          tools: buildToolDeclarations()
        },
        { timeout: 60_000 } // 60s for standard chat
      );
      const contents: any[] = history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: newMessage }] });

      let result = await model.generateContent({ contents });
      let response = await result.response;
      
      let functionCalls = response.functionCalls();
      let limitCount = 0;
      
      while (functionCalls && functionCalls.length > 0 && limitCount < 5) {
        limitCount++;
        const toolResponseParts = [];
        
        for (const call of functionCalls) {
          const { name, args } = call;
          let toolResult;
          
          try {
            if (name === 'listar_disciplinas') {
              toolResult = queryDisciplinas(userId);
            } else if (name === 'ler_conteudo_disciplina') {
              toolResult = queryDisciplinaConteudo((args as any).disciplinaId);
            } else if (name === 'listar_atividades') {
              toolResult = queryAtividades(userId);
            } else {
              toolResult = { error: 'Ferramenta desconhecida.' };
            }
          } catch (err: any) {
            toolResult = { error: err.message || 'Erro ao executar ferramenta.' };
          }
          
          toolResponseParts.push({
            functionResponse: {
              name,
              response: { result: toolResult }
            }
          });
        }
        
        contents.push({
          role: 'model',
          parts: response.candidates?.[0]?.content?.parts || []
        });
        contents.push({
          role: 'user',
          parts: toolResponseParts
        });
        
        result = await model.generateContent({ contents });
        response = await result.response;
        functionCalls = response.functionCalls();
      }

      text = response.text();
      inputTokFinal  = response.usageMetadata?.promptTokenCount    ?? Math.ceil((historyText.length + newMessage.length) / 4);
      outputTokFinal = response.usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4);
      tokensUsed = inputTokFinal + outputTokFinal;
      tokenHistory.push({ timestamp: Date.now(), tokens: tokensUsed });
      cachedTok = (response.usageMetadata as any)?.cachedContentTokenCount ?? 0;

    } else {
      // OpenAI-compatible path
      const { key: openaiKey, baseUrl } = getActiveKey('openai-compatible');
      const openaiClient = new OpenAI({ apiKey: openaiKey, ...(baseUrl ? { baseURL: baseUrl } : {}) });
      const messages: any[] = [{ role: 'system', content: systemInstruction }];
      history.forEach(m => messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
      messages.push({ role: 'user', content: newMessage });

      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
      });

      text = completion.choices[0].message.content || '';
      tokensUsed = completion.usage?.total_tokens || Math.ceil((newMessage.length + text.length) / 4);
    }

    // Para GPT, estimar split 40/60 input/output pois não temos separado
    if (provider !== 'google') {
      inputTokFinal  = Math.ceil(tokensUsed * 0.4);
      outputTokFinal = Math.ceil(tokensUsed * 0.6);
    }

    const modelId = provider === 'google' ? 'gemini-2.5-flash' : 'gpt-4o-mini';
    const creditsUsed = calcCredits(modelId, inputTokFinal, cachedTok, outputTokFinal);
    console.log(`[AI] Request completed. Chat: ${chatId}, Model: ${modelId}, Credits: ${creditsUsed} (cached: ${cachedTok}, input: ${inputTokFinal}, output: ${outputTokFinal})`);

    if (config.isCloud) {
      recordPetrusCredits(userId, creditsUsed);
      logQuotaEvent({ userId, surface: 'petrus', event: 'request', model: modelId, credits: creditsUsed });
    }

    return { text, tokensUsed, creditsUsed };

  } catch (error: any) {
    console.error('AI Error:', error);
    if (error.status === 429) throw new Error('Limite de cota atingido. Tente em alguns segundos.');
    throw error;
  }
}

let geminiQueue: Promise<any> = Promise.resolve();

export async function generateChatResponse(
  history: { role: 'user' | 'model'; content: string }[],
  newMessage: string,
  chatId: string,
  userId: string,
  provider: 'google' | 'gpt' = 'google',
  overrideSystemPrompt?: string
) {
  const result = await (geminiQueue = geminiQueue
    .catch(() => {})
    .then(() => _generateChatResponse(history, newMessage, chatId, userId, provider, overrideSystemPrompt)));
  return result;
}
