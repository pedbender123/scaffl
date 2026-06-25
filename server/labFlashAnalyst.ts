import { GoogleGenerativeAI } from '@google/generative-ai';
import { CodeIndex, EditPlan } from './labAgent.types.js';

const FLASH_ANALYST_SYSTEM_PROMPT = `Você é o Arquiteto Analista do TutorAI Lab. Sua missão é analisar pedidos de alteração em simulações educacionais e decidir a estratégia técnica ideal.

O projeto segue o padrão "Mini Cloud Code" (Configurações, Estado, Lógica, Render, Motor, Init).

Sua única saída deve ser um JSON puro que orientará o Executor.

REGRAS DE ESCOPO:
- "surgical": Use para mudanças de comportamento, ajustes de parâmetros físicos, novas fórmulas ou pequenas adições visuais em funções existentes. Máximo 5 funções.
- "full_rewrite": Use APENAS se o usuário pedir para mudar drasticamente o layout, adicionar uma seção de UI completamente nova (ex: um gráfico novo, um novo canvas), ou se o código atual estiver muito bagunçado para ser editado cirurgicamente.

OBJETIVO: Priorize "surgical" sempre que possível para manter a estabilidade.

ESTRUTURA DO JSON:
{
  "userIntent": "Resumo claro do que o usuário quer",
  "editScope": "surgical" | "full_rewrite",
  "reasoning": "Sua análise técnica baseada na arquitetura Mini Cloud Code",
  "targetFunctions": ["lista", "de", "funcoes"],
  "extractedCode": { "funcao": "código atual" },
  "editInstructions": "Instruções técnicas precisas para o Executor"
}`;

export async function runFlashAnalyst(params: {
  genAI: GoogleGenerativeAI;
  projectContext: string;
  codeIndex: CodeIndex;
  recentMessages: Array<{ role: string; content: string }>;
  userMessage: string;
  timeout: number;
}): Promise<{ plan: EditPlan; inputTokens: number; outputTokens: number }> {
  const { genAI, projectContext, codeIndex, recentMessages, userMessage, timeout } = params;

  // Send only function signatures to save tokens; full code is extracted later by the Coder step
  const indexSummary = Object.keys(codeIndex).length > 0
    ? `Funções existentes: ${Object.keys(codeIndex).join(', ')}`
    : 'Nenhuma função indexada encontrada.';

  const historyText = recentMessages
    .slice(-6)
    .map(m => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 300)}`)
    .join('\n');

  const userPrompt = `## Contexto do projeto
${projectContext || 'Projeto em fase inicial, sem contexto acumulado ainda.'}

## Funções disponíveis no código atual
${indexSummary || 'Nenhuma função indexada encontrada.'}

## Histórico recente
${historyText || 'Sem histórico anterior.'}

## Nova solicitação do usuário
${userMessage}

Retorne o JSON do Edit Plan agora:`;

  const model = genAI.getGenerativeModel(
    { model: 'gemini-2.5-flash', systemInstruction: FLASH_ANALYST_SYSTEM_PROMPT },
    { timeout }
  );

  const result = await model.generateContent(userPrompt);
  const response = result.response;
  const rawText = response.text().trim();

  const inputTokens  = response.usageMetadata?.promptTokenCount    ?? 0;
  const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

  const cleaned = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const plan = JSON.parse(cleaned) as EditPlan;
    return { plan, inputTokens, outputTokens };
  } catch {
    return {
      plan: {
        userIntent: userMessage,
        editScope: 'full_rewrite',
        reasoning: 'Falha ao parsear o Edit Plan — executando full_rewrite como segurança.',
        targetFunctions: [],
        extractedCode: {},
        editInstructions: userMessage,
      },
      inputTokens,
      outputTokens,
    };
  }
}
