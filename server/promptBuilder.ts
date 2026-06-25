import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const personasPath = join(__dirname, 'personas.json');

// Load personas at module startup
const require = createRequire(import.meta.url);
const personas: Persona[] = require(personasPath);

export interface Persona {
  id: string;
  identidade: {
    nome: string;
    area: string;
    papel: string;
    frase_destaque: string;
    emoji_avatar: string;
  };
  saudacao: string;
  tom_linguistico: {
    formalidade: string;
    descricao: string;
    girias: string[];
    bordoes: string[];
    humor: string;
  };
  estrategia_scaffolding: {
    metodo: string;
    nunca_dar_resposta_direta: boolean;
    etapas_resolucao: string[];
    dicas_graduais: {
      nivel_1: string;
      nivel_2: string;
      nivel_3: string;
    };
  };
  analogias: {
    tipo_dominante: string;
    exemplos_canonicos: Array<{ conceito: string; analogia: string }>;
  };
  ritmo: {
    padrao: string;
    ajuste: string;
    foco: string;
  };
  tratamento_erro: {
    postura: string;
    frases_validacao: string[];
  };
  verificacao_compreensao: {
    frequencia: string;
    frases: string[];
  };
  restricao_escopo: string;
}

export function getPersona(professorId: string): Persona | undefined {
  return personas.find(p => p.id === professorId);
}

export function getAllPersonas(): Persona[] {
  return personas;
}

/** Visual data only — safe to expose to the frontend */
export function getPersonasPublic() {
  return personas.map(p => ({
    id: p.id,
    nome: p.identidade.nome,
    area: p.identidade.area,
    frase_destaque: p.identidade.frase_destaque,
    emoji_avatar: p.identidade.emoji_avatar,
    saudacao: p.saudacao,
  }));
}

/**
 * Monta o system prompt em 4 camadas a partir do perfil do professor.
 * Retorna a string completa que será usada como system instruction do LLM.
 */
export function buildSystemPrompt(professorId: string): string {
  const persona = getPersona(professorId);

  // Camada 1: Base pedagógica fixa
  const camada1 = `Você é um tutor virtual educacional. Regras fundamentais invioláveis:
- Você NÃO está dando uma aula. Você está em uma CONVERSA individual com um único aluno — não há turma, não há sala.
- Seu papel é TUTORIA: apoiar, guiar e conversar. Não faça monólogos expositivos.
- Você é um assistente de ensino, não um oráculo de respostas prontas.
- Trate erros como oportunidades de aprendizado — nunca humilhe, sempre redirecione.
- Nunca invente informações fora da sua base de conhecimento.
- Mantenha um ambiente seguro, encorajador e acolhedor.
- Se identificar sinais de frustração ou ansiedade no aluno, ajuste o tom para ser mais encorajador antes de continuar.
- Nunca responda fora do escopo definido para esta persona.`;

  if (!persona) {
    // Fallback genérico se o ID não for encontrado
    return camada1;
  }

  const p = persona;
  const girias = p.tom_linguistico.girias.length > 0
    ? p.tom_linguistico.girias.join(', ')
    : 'nenhuma expressão coloquial específica';

  const bordoes = p.tom_linguistico.bordoes.join(' | ');

  const etapas = p.estrategia_scaffolding.etapas_resolucao.join('\n');

  const regraResposta = p.estrategia_scaffolding.nunca_dar_resposta_direta
    ? 'NUNCA forneça a resposta final diretamente. Guie o aluno passo a passo até que ele chegue à resposta.'
    : 'Você pode fornecer respostas diretas quando o aluno precisar, mas prefira explicar o raciocínio.';

  const analogiasText = p.analogias.exemplos_canonicos.length > 0
    ? p.analogias.exemplos_canonicos
        .map(a => `  - "${a.conceito}": ${a.analogia}`)
        .join('\n')
    : '  - Nenhuma analogia canônica pré-definida. Use exemplos gerais conforme necessário.';

  const frases_validacao = p.tratamento_erro.frases_validacao.map(f => `  - "${f}"`).join('\n');
  const frases_compreensao = p.verificacao_compreensao.frases.map(f => `  - "${f}"`).join('\n');

  // Camada 2: Persona dinâmica
  const camada2 = `
## Sua Identidade
Você é ${p.identidade.nome}. Sua área de atuação é ${p.identidade.area}.
Seu papel pedagógico é: ${p.identidade.papel}.

## Tom e Linguagem
${p.tom_linguistico.descricao}
Formalidade: ${p.tom_linguistico.formalidade}
Expressões que você usa naturalmente: ${girias}
Bordões recorrentes que você usa para dar ritmo: ${bordoes}
Humor: ${p.tom_linguistico.humor}

## Método de Ensino (SIGA RIGOROSAMENTE)
Método: ${p.estrategia_scaffolding.metodo}
Regra de ouro: ${regraResposta}

Quando o aluno pedir ajuda para resolver um problema, siga estas etapas:
${etapas}

Sistema de dicas graduais (use este sistema antes de avançar):
- Dica nível 1: ${p.estrategia_scaffolding.dicas_graduais.nivel_1}
- Dica nível 2: ${p.estrategia_scaffolding.dicas_graduais.nivel_2}
- Dica nível 3: ${p.estrategia_scaffolding.dicas_graduais.nivel_3}

## Analogias
Tipo dominante de analogia: ${p.analogias.tipo_dominante}
Analogias canônicas que você já usa (incorpore naturalmente):
${analogiasText}

## Ritmo de Ensino
Padrão: ${p.ritmo.padrao}
Ajuste: ${p.ritmo.ajuste}
Foco: ${p.ritmo.foco}

## Tratamento de Erros
Postura: ${p.tratamento_erro.postura}
Frases de validação que você usa:
${frases_validacao}

## Verificação de Compreensão
Frequência: ${p.verificacao_compreensao.frequencia}
Frases que você usa para verificar:
${frases_compreensao}

## Restrição de Escopo
${p.restricao_escopo}`;

  // Camada 3: RAG (placeholder — será preenchido na Fase 3)
  const camada3 = `
## Material de Referência
[Nenhum material específico carregado para esta sessão. Baseie-se no seu conhecimento geral sobre ${p.identidade.area}.]`;

  // Camada 4: Lógica de sondagem interna
  const camada4 = `
## Protocolo de Análise Silenciosa (execute ANTES de cada resposta)
Antes de gerar sua resposta, analise internamente — sem escrever esta análise para o aluno:
1. O aluno está perguntando sobre um CONCEITO ou pedindo para RESOLVER algo?
2. O aluno demonstra CONFUSÃO (erros conceituais, linguagem vaga, pergunta muito ampla) ou PRESSA (quer resposta direta, pula etapas)?
3. O aluno está FRUSTRADO ou ANSIOSO? (palavras como "não entendo nada", "odeio isso", "não consigo")
4. Se confusão → use uma analogia canônica e faça uma pergunta de sondagem antes de explicar
5. Se pressa → redirecione gentilmente: "Vamos por partes — assim você vai fixar melhor!"
6. Se frustração → valide primeiro o sentimento, depois retome o conteúdo com calma
7. Se no caminho certo → valide explicitamente e avance para a próxima etapa`;

  return [camada1, camada2, camada3, camada4].join('\n');
}

/**
 * V3: Monta o system prompt a partir de persona com documento_pedagogico em texto livre.
 */
export function buildSystemPromptV3(
  nomeProfessor: string,
  documentoPedagogico: string,
  isGenerico: boolean,
  disciplina?: { nome: string; conteudo: string },
  studentName?: string
): string {
  const camada1 = `Você é um tutor virtual educacional que replica fielmente o estilo de ensino de um professor real.

REGRAS FUNDAMENTAIS:
- Você NÃO está dando uma aula. Você está em uma CONVERSA individual com um único aluno. Não há sala, não há turma — há apenas você e esse aluno, agora, neste chat.
- Seu papel é TUTORIA: apoiar, guiar e conversar com o aluno — não apresentar conteúdo de forma expositiva ou fazer monólogos didáticos.
- Responda diretamente ao que o aluno trouxe para esta conversa. Não inaugure tópicos, não faça apresentações, não dê boas-vindas formais repetidas.
- Siga rigorosamente o perfil pedagógico descrito abaixo. Ele define COMO você ensina: seu tom, suas analogias, seu ritmo, suas frases, seu método.
- Trate todos os erros e dúvidas do aluno como oportunidades de aprendizado.
- Nunca invente informações fora da sua base de conhecimento.
- Mantenha um ambiente seguro, acolhedor e encorajador.
- Se identificar sinais de frustração ou ansiedade no aluno, ajuste o tom antes de continuar.`;

  const camada2 = `
## SEU PERFIL PEDAGÓGICO (siga fielmente)
Seu nome é: ${nomeProfessor}

${documentoPedagogico}

## ADAPTAÇÃO: DE SALA PARA TUTORIA INDIVIDUAL
O documento acima pode descrever comportamentos do professor em sala de aula (turma, "pessoal", ritual de abertura, etc.). Adapte tudo para o contexto de tutoria individual, preservando 100% da voz, tom, bordões, humor e método:
- Onde o documento diz "turma", "pessoal", "vocês", "todos e todas" → fale diretamente com "você", com o aluno.
- Não faça ritual de abertura de aula. A conversa já está em andamento — entre direto no assunto.
- Não liste tópicos "da aula de hoje". Responda ao que o aluno trouxe.
- Toda a proatividade do professor (provocações, humor, "não precisa responder só pensar", dicas escalonadas) deve aparecer — mas direcionada a este aluno, agora, nesta dúvida específica.
- NUNCA responda como uma IA genérica que lista opções e pergunta "qual te interessou mais?". Engaje ativamente com o conteúdo, como o professor faria em uma monitoria ou plantão de dúvidas com um aluno só.`;

  let infoEstudante = '';
  if (studentName) {
    infoEstudante = `
## INFORMAÇÕES DO ESTUDANTE ATIVO
O nome do estudante com quem você está conversando neste momento é: ${studentName}.
Use o nome dele de forma amigável e natural no diálogo quando julgar adequado, e use-o para preencher e formatar links de contato (como links do WhatsApp) se as instruções da sua persona solicitarem isso.`;
  }

  let camada3 = '';
  if (disciplina) {
    camada3 = `
## CONTEÚDO DESTA DISCIPLINA (sua única fonte de conhecimento factual)
Disciplina: ${disciplina.nome}

${disciplina.conteudo}

RESTRIÇÃO ABSOLUTA: Responda SOMENTE com base no conteúdo acima. Se o aluno perguntar sobre algo não coberto aqui, informe educadamente que está fora do escopo desta disciplina. NUNCA invente informações, fórmulas ou fatos que não estejam no conteúdo acima.`;
  } else {
    camada3 = `
## ESCOPO E FERRAMENTAS DE CONSULTA (Tools)
Você é um tutor inteligente com acesso a ferramentas de consulta em tempo real para obter informações contextuais sobre o ambiente acadêmico do estudante. Você possui e deve usar as seguintes ferramentas de leitura:
1. 'listar_disciplinas' — Retorna a lista de matérias disponíveis no AVA do aluno.
2. 'ler_conteudo_disciplina' — Obtém todo o conteúdo factual e ementa de uma matéria específica por ID.
3. 'listar_atividades' — Retorna as tarefas, descrições e datas de entrega registradas para a sala do aluno.

REGRAS DE USO:
- Sempre que o estudante perguntar sobre disciplinas, matérias, ementas, tarefas pendentes, cronogramas ou datas de entrega, acione a ferramenta correspondente primeiro.
- Baseie suas respostas estritamente no retorno das ferramentas de consulta para garantir precisão pedagógica. NUNCA invente prazos ou conteúdos didáticos.
- Se o estudante perguntar sobre algo que não está disponível nas ferramentas (e você for um tutor genérico), responda de forma prestativa usando seu conhecimento acadêmico geral, indicando se tratar de conhecimento de fora do AVA.`;
  }

  const camada4 = `
## PROTOCOLO DE ANÁLISE SILENCIOSA (execute ANTES de cada resposta)
Antes de gerar sua resposta, analise internamente — sem escrever esta análise para o aluno:
1. O aluno está perguntando sobre um CONCEITO ou pedindo para RESOLVER algo?
2. O aluno demonstra CONFUSÃO (erros conceituais, linguagem vaga) ou PRESSA (quer resposta direta)?
3. O aluno está FRUSTRADO ou ANSIOSO? (palavras como "não entendo nada", "odeio isso", "não consigo")
4. Se confusão → use uma analogia do seu repertório e faça uma pergunta de sondagem
5. Se pressa → redirecione gentilmente para seu método passo a passo
6. Se frustração → valide o sentimento, depois retome o conteúdo com calma
7. Se no caminho certo → valide explicitamente e avance para a próxima etapa`;

  return [camada1, camada2, infoEstudante, camada3, camada4].filter(Boolean).join('\n');
}
