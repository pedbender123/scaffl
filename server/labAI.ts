import { LabProject } from './labAgent.types.js';
import { getProvider, getDefaultModel, calcCredits } from './providers/registry.js';

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
}

async function _runSimAgentInternal(params: {
  project: LabProject;
  userMessage: string;
  recentMessages: Array<{ role: string; content: string }>;
  modelToUse?: string;
  userImageUrl?: string;
}): Promise<SimAgentResult> {
  const { project, userMessage, recentMessages, userImageUrl } = params;

  const modelId = params.modelToUse ?? getDefaultModel()?.id ?? FALLBACK_MODEL;

  const currentHtml = project.htmlContent || '';
  const historyParts: string[] = [];
  if (recentMessages?.length > 0) {
    const recent = recentMessages.slice(-4);
    for (const m of recent) {
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

  const provider = getProvider(modelId);
  const chatResult = await provider.chat({
    messages: [{ role: 'user', content: userPrompt }],
    systemPrompt: LAB_WRITER_SYSTEM_PROMPT,
    modelId,
    imageBase64,
    imageMimeType: 'image/jpeg',
  });

  const rawText = chatResult.text;

  // Extract HTML from markdown code block
  let cleanedHtml = rawText;
  const htmlMatch = rawText.match(/```html([\s\S]*?)```/);
  if (htmlMatch) {
    cleanedHtml = htmlMatch[1].trim();
  } else if (rawText.includes('<html')) {
    cleanedHtml = rawText.trim();
  }

  const creditsUsed = calcCredits(modelId, chatResult.inputTokens, chatResult.cachedTokens, chatResult.outputTokens);
  const tokensUsed = chatResult.inputTokens + chatResult.outputTokens;

  console.log(`[Lab Agent] Done. Model: ${modelId}, Tokens: in=${chatResult.inputTokens}, cached=${chatResult.cachedTokens}, out=${chatResult.outputTokens} | Credits: ${creditsUsed}`);

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
  };
}

let labAgentQueue: Promise<any> = Promise.resolve();

export async function runSimAgent(params: {
  project: LabProject;
  userMessage: string;
  recentMessages: Array<{ role: string; content: string }>;
  modelToUse?: string;
  userImageUrl?: string;
}): Promise<SimAgentResult> {
  const result = await (labAgentQueue = labAgentQueue
    .catch(() => {})
    .then(() => _runSimAgentInternal(params)));
  return result;
}
