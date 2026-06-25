import { GoogleGenerativeAI } from '@google/generative-ai';

const COMPRESSOR_PROMPT = `Você é um assistente que resume o histórico de desenvolvimento de uma simulação educacional interativa.
Dado o histórico de mensagens de uma sessão de edição, crie um parágrafo conciso (máximo 200 palavras) que descreva:
1. O que a simulação faz (conceito científico/pedagógico)
2. As principais funcionalidades implementadas
3. Decisões de design tomadas pelo usuário (cores, estilo, elementos interativos)
4. O que está funcionando bem

Responda APENAS com o parágrafo de resumo, sem título, sem lista, sem formatação markdown.`;

export async function compressProjectContext(params: {
  genAI: GoogleGenerativeAI;
  projectId: string;
  db: any;
}): Promise<void> {
  const { genAI, projectId, db } = params;

  const project = db.prepare('SELECT turn_count, htmlContent FROM lab_projects WHERE id = ?').get(projectId);
  if (!project || project.turn_count % 6 !== 0) return;

  const messages = db.prepare(`
    SELECT role, content FROM lab_messages
    WHERE projectId = ? ORDER BY createdAt ASC
  `).all(projectId);

  if (messages.length < 4) return;

  const historyText = messages
    .map((m: any) => `[${m.role.toUpperCase()}]: ${m.content.slice(0, 400)}`)
    .join('\n');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(
    `${COMPRESSOR_PROMPT}\n\n## Histórico:\n${historyText}`
  );

  const newContext = result.response.text().trim();

  db.prepare('UPDATE lab_projects SET project_context = ? WHERE id = ?').run(newContext, projectId);
}
