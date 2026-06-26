import { LabProject } from './labAgent.types.js';
import { getProvider, getDefaultModel, calcCredits } from './providers/registry.js';
import { getModelQueue, retryWithFallback } from './limiter.js';
import { logQuotaEvent } from './quota.js';

const FALLBACK_MODEL = 'gemini-2.5-flash';


const LAB_WRITER_SYSTEM_PROMPT = `Você é a IA Escritora de Simuladores Científicos do Scaffl.
Sua missão é gerar um código HTML5 autocontido (incluindo HTML, Tailwind CSS para estilos e JavaScript para física/lógica no Canvas) com base nas ideias dos estudantes.

DIRETRIZES DE DESIGN E QUALIDADE (MANDATÓRIAS):
1. Visual Moderno e Premium: Use um tema escuro (background: #0b0f19), com cores vibrantes em gradientes de neon (azul ciano, esmeralda, violeta, rosa quente, âmbar).
2. Canvas Dinâmico: Desenhe elementos de física ou química usando HTML5 Canvas. A animação deve ser a 60 FPS com requestAnimationFrame.
3. Interatividade e Controles: Forneça controles claros em Tailwind (como sliders deslizantes, botões de ação e cards translúcidos de glassmorphism). O estado da simulação deve mudar instantaneamente conforme o usuário mexe nos controles.
4. Partículas e Efeitos Visuais: Adicione efeitos como rastro nas partículas (motion trail) com opacidade gradual, brilhos nas colisões e vetores simples de força se aplicável.
5. Código Seguro e Autocontido: Responda APENAS com o código HTML completo e válido dentro de um bloco de código markdown. Não inclua conversas ou textos explicativos fora do código.`;

export interface SimAgentResult {
  explanation: string;
  htmlContent: string;
  projectContext: string;
  codeIndex: Record<string, any>;
  editPlan: null;
  editScope: string;
  patchedFunctions: string[];
  tokensUsed: number;
  creditsUsed: number;
  modelUsed: string;
}

async function _callModel(params: {
  project: LabProject;
  userMessage: string;
  recentMessages: Array<{ role: string; content: string }>;
  modelId: string;
  userImageUrl?: string;
}): Promise<SimAgentResult> {
  const { project, userMessage, recentMessages, modelId, userImageUrl } = params;

  const currentHtml = project.htmlContent || '';
  const historyParts: string[] = [];
  if (recentMessages?.length > 0) {
    for (const m of recentMessages.slice(-4)) {
      historyParts.push(`${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.content.slice(0, 500)}`);
    }
  }

  let userPrompt = '';
  if (currentHtml) {
    userPrompt += `Código HTML atual do simulador:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\n`;
  }
  if (historyParts.length > 0) {
    userPrompt += `Histórico recente do Lab:\n${historyParts.join('\n')}\n\n`;
  }
  userPrompt += `Modificação solicitada pelo aluno: "${userMessage}"`;

  let imageBase64: string | undefined;
  if (userImageUrl) {
    imageBase64 = userImageUrl.includes('base64,')
      ? userImageUrl.split('base64,')[1]
      : userImageUrl;
  }

  console.log(`[Lab Agent] Calling ${modelId}...`);

  const queue = getModelQueue(modelId);
  const chatResult = await queue.enqueue(() =>
    getProvider(modelId).chat({
      messages: [{ role: 'user', content: userPrompt }],
      systemPrompt: LAB_WRITER_SYSTEM_PROMPT,
      modelId,
      imageBase64,
      imageMimeType: 'image/jpeg',
    })
  );

  const rawText = chatResult.text;
  let cleanedHtml = rawText;
  const htmlMatch = rawText.match(/```html([\s\S]*?)```/);
  if (htmlMatch) {
    cleanedHtml = htmlMatch[1].trim();
  } else if (rawText.includes('<html')) {
    cleanedHtml = rawText.trim();
  }

  const creditsUsed = calcCredits(modelId, chatResult.inputTokens, chatResult.cachedTokens, chatResult.outputTokens);
  const tokensUsed = chatResult.inputTokens + chatResult.outputTokens;

  console.log(
    `[Lab Agent] Done. Model: ${modelId}, in=${chatResult.inputTokens}, cached=${chatResult.cachedTokens}, out=${chatResult.outputTokens}, credits=${creditsUsed}`
  );

  return {
    explanation: 'Simulador atualizado com sucesso.',
    htmlContent: cleanedHtml,
    projectContext: '[]',
    codeIndex: {},
    editPlan: null,
    editScope: 'surgical',
    patchedFunctions: [],
    tokensUsed,
    creditsUsed,
    modelUsed: modelId,
  };
}

export async function runSimAgent(params: {
  project: LabProject;
  userMessage: string;
  recentMessages: Array<{ role: string; content: string }>;
  modelToUse?: string;
  userImageUrl?: string;
  userId?: string;
}): Promise<SimAgentResult> {
  const { userId } = params;

  // Build the fallback chain: requested/default → Flash
  const primary = params.modelToUse ?? getDefaultModel()?.id ?? FALLBACK_MODEL;
  const chain = primary === FALLBACK_MODEL
    ? [FALLBACK_MODEL]
    : [primary, FALLBACK_MODEL];

  const factories = chain.map((modelId) => () =>
    _callModel({ ...params, modelId })
  );

  return retryWithFallback(factories, (fromIndex, err) => {
    const fromModel = chain[fromIndex];
    console.warn(`[Lab Agent] ${fromModel} failed (${(err as any)?.status ?? (err as any)?.message}), falling back to ${chain[fromIndex + 1]}`);
    logQuotaEvent({ userId, surface: 'lab', event: 'fallback', model: fromModel });
    logQuotaEvent({ userId, surface: 'lab', event: '429', model: fromModel });
  });
}
