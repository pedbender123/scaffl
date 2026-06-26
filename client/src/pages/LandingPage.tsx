import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, Sun, Moon, Menu, X, ArrowRight, ChevronRight,
  Check, Server, Book, Cpu, Shield, Sliders, DollarSign,
  GraduationCap, Quote, Copy, ExternalLink, MessageSquare, Code2,
  BookOpen, Layers, Network, Atom,
} from 'lucide-react';

/* ─── Font injection ─── */
const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';

/* ─── Self-contained theme system ─── */
const THEMES = {
  teal:    { a1:'#22D3EE', a2:'#14B8A6', a3:'#10B981' },
  lilac:   { a1:'#DDD6FE', a2:'#A78BFA', a3:'#8B5CF6' },
  blue:    { a1:'#93C5FD', a2:'#60A5FA', a3:'#3B82F6' },
  neutral: { a1:'#CBD5E1', a2:'#94A3B8', a3:'#475569' }, // branco/preto conforme modo
} as const;
type ThemeName = keyof typeof THEMES;
type Mode = 'dark' | 'light';
type Lang  = 'pt' | 'en' | 'es';
type Page  = 'home' | 'examples' | 'about' | 'self' | 'docs' | 'researchers';

/* ─── i18n — translated by the author ─── */
const T = {
  pt: {
    navHome:'Início', navEx:'Exemplos', navAbout:'Sobre', navSelf:'Self-Hosted', navDocs:'Docs', navResearchers:'Pesquisadores', navLogin:'Entrar na Plataforma',
    heroBadge:'IA educacional de pesquisa · CIAGE / UCS',
    heroTitle:'Dois agentes.', heroGrad:'Um percurso de aprendizagem.',
    heroSub:'SCAFFL une um tutor socrático que ajuda o estudante a pensar e um agente que constrói simuladores de química a partir das suas próprias palavras. Tudo registrado, do primeiro prompt ao artefato final.',
    heroCta1:'Acessar Plataforma', heroCta2:'Como funciona',
    hm1:'agentes de IA', hm2:'interações registradas', hm3:'simuladores criados', hm4:'estudantes',
    agKicker:'Arquitetura dual', agTitle:'Conversar é diferente de construir.',
    agLead:'A plataforma separa, de propósito, duas naturezas comunicativas. Um agente medeia o pensamento; o outro executa o artefato. A passagem de um para o outro é onde a aprendizagem acontece.',
    ptTag:'Tutor pedagógico', ptName:'Petrus', ptRole:'Mediação socrática · andaimamento cognitivo',
    ptDesc:'Petrus não escreve código. Ele devolve perguntas, propõe decomposições e induz o estudante a nomear o mecanismo por trás do fenômeno antes de ir ao laboratório.',
    ptB1:'Perguntas orientadoras em vez de respostas prontas', ptB2:'Devoluções reflexivas que expandem o perfil conceitual', ptB3:'Externalização do modelo mental do estudante',
    lbTag:'Agente de código', lbName:'Lab Agent', lbRole:'Geração de simuladores · execução',
    lbDesc:'O Lab Agent recebe instruções em linguagem natural e gera simuladores interativos em HTML/JS. A resposta é executiva — o simulador aparece na tela em segundos.',
    lbB1:'Do prompt ao artefato renderizável em segundos', lbB2:'Ciclo iterativo: pedir → gerar → testar → refinar', lbB3:'O prompt cru revela a zona conceitual ativa',
    modKicker:'Três espaços, um fluxo', modTitle:'Da sala de aula ao simulador funcionando.',
    modLead:'Cada módulo tem um papel no percurso do estudante. O professor acompanha em tempo real; a plataforma registra tudo.',
    chatK:'Home · Chat', chatT:'Monitoria', chatD:'O estudante conversa com Petrus para planejar e refinar a ideia antes de construir.',
    labK:'Lab · Simuladores', labT:'Laboratório', labD:'Galeria de simuladores interativos criados pela turma com o Lab Agent.',
    clsK:'Class · Mural', clsT:'Mural Virtual', clsD:'Sala de aula com disciplinas, atividades e cronograma compartilhado.',
    stKicker:'Corpus piloto', stTitle:'Dados do estudo piloto',
    stCap:'CETEC — Sala Delta 2 · 27 mai – 06 jun 2026 · sujeitos pseudonimizados E1–E19',
    s1:'interações registradas', s2:'monitoria / laboratório', s3:'projetos de simulador', s4:'estudantes',
    reKicker:'Fundamentação de pesquisa', reTitle:'Uma plataforma que também é instrumento de pesquisa.',
    reP1:'Por exigir que o estudante descreva em linguagem natural aquilo que a IA vai construir, a SCAFFL funciona como dispositivo de externalização de modelos mentais. O prompt enviado ao Lab Agent é um registro direto da zona conceitual mobilizada naquele momento.',
    reP2:'A captura total da mediação — incluindo falhas, silêncios e cadeias abandonadas — permite tratar discursivamente o registro completo de um episódio de aprendizagem, algo metodologicamente novo para a Educação em Ciências.',
    rePk:'Artigo em desenvolvimento', rePdesc:'Mediação discursiva e instalação de driver cognitivo na interação estudante–IA durante a construção de simuladores de ciência.', rePmeta:'→ Research in Science Education (Springer)',
    reTg1:'Perfis Conceituais · Mortimer', reTg2:'Perfis Epistemológicos · Bachelard', reTg3:'TMCR · sophotechnia', reTg4:'Escala de apropriação discursiva',
    // Examples
    exKicker:'Demonstração', exTitle:'A plataforma em ação.',
    exLead:'Do diálogo socrático à simulação interativa — cada etapa do percurso de aprendizagem registrada e acessível ao professor em tempo real.',
    ex1Title:'Chat com Petrus', ex1Lead:'O estudante descreve o que quer simular. Petrus não entrega o código — devolve perguntas que ampliam a compreensão conceitual antes de ir ao laboratório.',
    ex2Title:'Lab Agent em ação', ex2Lead:'Com o conceito mapeado, o estudante pede ao Lab Agent em linguagem natural. O agente gera código HTML/JS executável na hora, com prévia imediata.',
    ex3Title:'Mural da turma', ex3Lead:'Os simuladores ficam em galeria compartilhada. O professor acompanha a evolução de cada estudante e pode comentar diretamente no projeto.',
    exPrivacy:'Todos os registros são anonimizados. Os estudantes são identificados por códigos (E1–E19) e nenhum dado pessoal é armazenado além do necessário para a pesquisa.',
    // About
    abKicker:'Sobre o projeto', abTitle:'Uma pesquisa que virou plataforma.',
    abP1:'A SCAFFL nasceu como instrumento de uma Iniciação Científica sobre mediação discursiva na interação estudante–IA no ensino de química. A necessidade de capturar e analisar essa mediação levou ao desenvolvimento de uma plataforma completa.',
    abP2:'O nome SCAFFL vem de scaffolding — andaimamento cognitivo, o processo pelo qual um mediador oferece suporte temporário para que o aprendiz avance além do que conseguiria sozinho.',
    abMissionTitle:'Missão', abMission:'Oferecer suporte estruturado à construção de conhecimento científico através da mediação inteligente entre estudante, professor e tecnologia.',
    abTeam:'Equipe', abResearcher:'Pesquisador', abAdvisor:'Orientador', abGroup:'Grupo de Pesquisa',
    abArchTitle:'Arquitetura', abResTitle:'Base teórica', abStack:'Stack tecnológica',
    q1:'O obstáculo epistemológico não está no objeto de conhecimento, mas no próprio ato de conhecer.',
    q1a:'Gaston Bachelard, A Formação do Espírito Científico, 1938',
    q2:'O perfil conceitual de um indivíduo é o conjunto de formas de pensar sobre um conceito que coexistem.',
    q2a:'Eduardo Mortimer, Linguagem e Formação de Conceitos no Ensino de Ciências, 2000',
    // Self
    slKicker:'Instalação própria', slTitle:'Rode a SCAFFL na sua infraestrutura.',
    slLead:'A SCAFFL é open-source e pode ser instalada em qualquer servidor Linux. Você mantém o controle total dos dados dos seus estudantes.',
    slW1T:'Privacidade total', slW1D:'Todos os dados ficam no seu servidor. Nenhuma interação sai para terceiros além das APIs de IA.',
    slW2T:'Customizável', slW2D:'Modifique o prompt do Petrus, ajuste as regras do Lab Agent, personalize o visual para sua instituição.',
    slW3T:'Sem mensalidade', slW3D:'Você paga apenas pelas chamadas de API (Anthropic + Gemini). A plataforma em si é gratuita.',
    slReq:'Requisitos', slDocker:'Via Docker (recomendado)', slManual:'Instalação manual', slEnv:'Variáveis de ambiente',
    slDlTitle:'Downloads', slGit:'GitHub — Código-fonte', slDockerHub:'Docker Hub', slVideo:'Tutorial em vídeo (em breve)',
    // Docs
    dcKicker:'Documentação', dcTitle:'Referência da plataforma.',
    dcLead:'Tudo o que você precisa para entender, configurar e estender a SCAFFL.',
    dcOvTitle:'Visão geral', dcOvDesc:'A SCAFFL é uma aplicação Node.js + React. O servidor expõe uma API REST e gerencia sessões com PostgreSQL.',
    dcPtTitle:'Agente Petrus', dcPtDesc:'Petrus é implementado como chamada streaming a um LLM configurável (padrão: Gemini 2.5 Flash). O system prompt define o papel socrático e as regras de mediação.',
    dcLbTitle:'Lab Agent', dcLbDesc:'O Lab Agent usa o modelo Gemini 2.5 Flash (Google) para geração de código. Cada turno recebe o histórico comprimido dos simuladores anteriores do estudante.',
    dcApiTitle:'API REST', dcApiDesc:'Todos os endpoints requerem autenticação Bearer JWT obtido via POST /api/auth/login.',
    dcCfgTitle:'Configuração', dcCfgDesc:'Todas as opções são definidas via variáveis de ambiente no arquivo .env do servidor.',
    dcEndpoints:'Endpoints principais',
    // Footer
    ftTagline:'Plataforma de tutoria inteligente para o ensino de ciências.',
    ftRights:'Todos os direitos reservados.',
    ftResearcher:'Pesquisador', ftAdvisor:'Orientador', ftInst:'CIAGE · Universidade de Caxias do Sul',
    ftVersion:'Versão Experimental 2026',
  },
  en: {
    navHome:'Home', navEx:'Examples', navAbout:'About', navSelf:'Self-Hosted', navDocs:'Docs', navResearchers:'Researchers', navLogin:'Access Platform',
    heroBadge:'Research AI educational platform · CIAGE / UCS',
    heroTitle:'Two agents.', heroGrad:'One learning journey.',
    heroSub:'SCAFFL combines a Socratic tutor that helps students think and an agent that builds chemistry simulations from the student\'s own words. Everything recorded, from first prompt to final artifact.',
    heroCta1:'Access Platform', heroCta2:'How it works',
    hm1:'AI agents', hm2:'interactions recorded', hm3:'simulations built', hm4:'students',
    agKicker:'Dual architecture', agTitle:'Talking is different from building.',
    agLead:'The platform intentionally separates two communicative natures. One agent mediates thought; the other executes the artifact. The transition between them is where learning happens.',
    ptTag:'Pedagogical tutor', ptName:'Petrus', ptRole:'Socratic mediation · cognitive scaffolding',
    ptDesc:'Petrus does not write code. It returns questions, proposes decompositions and pushes the student to name the mechanism behind the phenomenon before going to the lab.',
    ptB1:'Guiding questions instead of ready-made answers', ptB2:'Reflective responses that expand the conceptual profile', ptB3:'Externalization of the student\'s mental model',
    lbTag:'Code agent', lbName:'Lab Agent', lbRole:'Simulator generation · execution',
    lbDesc:'The Lab Agent receives instructions in natural language and generates interactive HTML/JS simulators. The response is executive — the simulator appears on screen in seconds.',
    lbB1:'From prompt to renderable artifact in seconds', lbB2:'Iterative cycle: request → generate → test → refine', lbB3:'The raw prompt reveals the active conceptual zone',
    modKicker:'Three spaces, one flow', modTitle:'From the classroom to a working simulator.',
    modLead:'Each module plays a role in the student\'s journey. The teacher monitors in real time; the platform records everything.',
    chatK:'Home · Chat', chatT:'Tutoring', chatD:'The student talks with Petrus to plan and refine the idea before building.',
    labK:'Lab · Simulators', labT:'Laboratory', labD:'Gallery of interactive simulations created by the class using Lab Agent.',
    clsK:'Class · Board', clsT:'Virtual Board', clsD:'Classroom with disciplines, activities and shared schedule.',
    stKicker:'Pilot corpus', stTitle:'Pilot study data',
    stCap:'CETEC — Delta 2 Class · May 27 – Jun 6, 2026 · pseudonymized subjects E1–E19',
    s1:'interactions recorded', s2:'tutoring / laboratory', s3:'simulator projects', s4:'students',
    reKicker:'Research foundation', reTitle:'A platform that is also a research instrument.',
    reP1:'By requiring students to describe in natural language what the AI will build, SCAFFL works as an externalization device for mental models. The prompt sent to Lab Agent is a direct record of the conceptual zone mobilized at that moment.',
    reP2:'Total capture of mediation — including failures, silences and abandoned chains — enables a fully discursive treatment of a complete learning episode, something methodologically novel for Science Education.',
    rePk:'Article in development', rePdesc:'Discursive mediation and cognitive driver installation in student–AI interaction during the construction of science simulations.', rePmeta:'→ Research in Science Education (Springer)',
    reTg1:'Conceptual Profiles · Mortimer', reTg2:'Epistemological Profiles · Bachelard', reTg3:'TMCR · sophotechnia', reTg4:'Discursive appropriation scale',
    exKicker:'Demo', exTitle:'The platform in action.',
    exLead:'From Socratic dialogue to interactive simulation — every step of the learning journey recorded and accessible to the teacher in real time.',
    ex1Title:'Chat with Petrus', ex1Lead:'The student describes what they want to simulate. Petrus doesn\'t deliver code — it returns questions that broaden conceptual understanding before going to the lab.',
    ex2Title:'Lab Agent in action', ex2Lead:'With the concept mapped, the student asks Lab Agent in natural language. The agent generates executable HTML/JS code immediately, with instant preview.',
    ex3Title:'Class board', ex3Lead:'Simulators are displayed in a shared gallery. The teacher monitors each student\'s progress and can comment directly on their project.',
    exPrivacy:'All records are anonymized. Students are identified by codes (E1–E19) and no personal data is stored beyond what is necessary for research.',
    abKicker:'About the project', abTitle:'A research project that became a platform.',
    abP1:'SCAFFL was born as an instrument for an undergraduate research project on discursive mediation in student–AI interaction in chemistry education. The need to capture and analyze this mediation led to the development of a complete platform.',
    abP2:'The name SCAFFL comes from scaffolding — the cognitive support process by which a mediator provides temporary assistance for the learner to advance beyond what they could achieve alone.',
    abMissionTitle:'Mission', abMission:'Provide structured support for the construction of scientific knowledge through intelligent mediation between student, teacher and technology.',
    abTeam:'Team', abResearcher:'Researcher', abAdvisor:'Advisor', abGroup:'Research Group',
    abArchTitle:'Architecture', abResTitle:'Theoretical foundation', abStack:'Technology stack',
    q1:'The epistemological obstacle does not lie in the object of knowledge, but in the very act of knowing.',
    q1a:'Gaston Bachelard, The Formation of the Scientific Mind, 1938',
    q2:'An individual\'s conceptual profile is the set of ways of thinking about a concept that coexist.',
    q2a:'Eduardo Mortimer, Language and Concept Formation in Science Teaching, 2000',
    slKicker:'Self-hosted', slTitle:'Run SCAFFL on your own infrastructure.',
    slLead:'SCAFFL is open-source and can be installed on any Linux server. You maintain full control of your students\' data.',
    slW1T:'Full privacy', slW1D:'All data stays on your server. No interactions are sent to third parties beyond the AI APIs.',
    slW2T:'Customizable', slW2D:'Modify Petrus\' prompt, adjust Lab Agent rules, personalize the look for your institution.',
    slW3T:'No monthly fee', slW3D:'You only pay for API calls (Anthropic + Gemini). The platform itself is free.',
    slReq:'Requirements', slDocker:'Via Docker (recommended)', slManual:'Manual installation', slEnv:'Environment variables',
    slDlTitle:'Downloads', slGit:'GitHub — Source code', slDockerHub:'Docker Hub', slVideo:'Video tutorial (coming soon)',
    dcKicker:'Documentation', dcTitle:'Platform reference.',
    dcLead:'Everything you need to understand, configure and extend SCAFFL.',
    dcOvTitle:'Overview', dcOvDesc:'SCAFFL is a Node.js + React application. The server exposes a REST API and manages sessions with PostgreSQL.',
    dcPtTitle:'Petrus Agent', dcPtDesc:'Petrus is implemented as a streaming call to the Claude model (Anthropic). The system prompt defines the Socratic role and mediation rules.',
    dcLbTitle:'Lab Agent', dcLbDesc:'Lab Agent uses the Gemini model (Google) for code generation. Each turn receives the compressed history of the student\'s previous simulators.',
    dcApiTitle:'REST API', dcApiDesc:'All endpoints require Bearer JWT authentication obtained via POST /api/auth/login.',
    dcCfgTitle:'Configuration', dcCfgDesc:'All options are defined via environment variables in the server\'s .env file.',
    dcEndpoints:'Main endpoints',
    ftTagline:'Intelligent tutoring platform for science education.',
    ftRights:'All rights reserved.',
    ftResearcher:'Researcher', ftAdvisor:'Advisor', ftInst:'CIAGE · University of Caxias do Sul',
    ftVersion:'Experimental Version 2026',
  },
  es: {
    navHome:'Inicio', navEx:'Ejemplos', navAbout:'Acerca de', navSelf:'Self-Hosted', navDocs:'Docs', navResearchers:'Investigadores', navLogin:'Entrar a la Plataforma',
    heroBadge:'Plataforma IA educativa de investigación · CIAGE / UCS',
    heroTitle:'Dos agentes.', heroGrad:'Un recorrido de aprendizaje.',
    heroSub:'SCAFFL combina un tutor socrático que ayuda al estudiante a pensar y un agente que construye simuladores de química a partir de sus propias palabras. Todo registrado, desde el primer prompt hasta el artefacto final.',
    heroCta1:'Acceder a la Plataforma', heroCta2:'Cómo funciona',
    hm1:'agentes de IA', hm2:'interacciones registradas', hm3:'simuladores creados', hm4:'estudiantes',
    agKicker:'Arquitectura dual', agTitle:'Conversar es diferente de construir.',
    agLead:'La plataforma separa, a propósito, dos naturalezas comunicativas. Un agente media el pensamiento; el otro ejecuta el artefacto. La transición entre uno y otro es donde ocurre el aprendizaje.',
    ptTag:'Tutor pedagógico', ptName:'Petrus', ptRole:'Mediación socrática · andamiaje cognitivo',
    ptDesc:'Petrus no escribe código. Devuelve preguntas, propone descomposiciones e induce al estudiante a nombrar el mecanismo detrás del fenómeno antes de ir al laboratorio.',
    ptB1:'Preguntas orientadoras en lugar de respuestas directas', ptB2:'Respuestas reflexivas que amplían el perfil conceptual', ptB3:'Externalización del modelo mental del estudiante',
    lbTag:'Agente de código', lbName:'Lab Agent', lbRole:'Generación de simuladores · ejecución',
    lbDesc:'El Lab Agent recibe instrucciones en lenguaje natural y genera simuladores interactivos en HTML/JS. La respuesta es ejecutiva — el simulador aparece en pantalla en segundos.',
    lbB1:'Del prompt al artefacto renderizable en segundos', lbB2:'Ciclo iterativo: pedir → generar → probar → refinar', lbB3:'El prompt crudo revela la zona conceptual activa',
    modKicker:'Tres espacios, un flujo', modTitle:'Del aula al simulador funcionando.',
    modLead:'Cada módulo tiene un papel en el recorrido del estudiante. El docente monitorea en tiempo real; la plataforma registra todo.',
    chatK:'Home · Chat', chatT:'Tutoría', chatD:'El estudiante conversa con Petrus para planificar y refinar la idea antes de construir.',
    labK:'Lab · Simuladores', labT:'Laboratorio', labD:'Galería de simuladores interactivos creados por la clase con el Lab Agent.',
    clsK:'Class · Mural', clsT:'Mural Virtual', clsD:'Aula con disciplinas, actividades y cronograma compartido.',
    stKicker:'Corpus piloto', stTitle:'Datos del estudio piloto',
    stCap:'CETEC — Sala Delta 2 · 27 may – 06 jun 2026 · sujetos seudonimizados E1–E19',
    s1:'interacciones registradas', s2:'tutoría / laboratorio', s3:'proyectos de simulador', s4:'estudiantes',
    reKicker:'Fundamento de investigación', reTitle:'Una plataforma que también es instrumento de investigación.',
    reP1:'Al exigir que el estudiante describa en lenguaje natural lo que la IA construirá, la SCAFFL funciona como dispositivo de externalización de modelos mentales. El prompt enviado al Lab Agent es un registro directo de la zona conceptual movilizada en ese momento.',
    reP2:'La captura total de la mediación — incluyendo fallos, silencios y cadenas abandonadas — permite tratar discursivamente el registro completo de un episodio de aprendizaje.',
    rePk:'Artículo en desarrollo', rePdesc:'Mediación discursiva e instalación de driver cognitivo en la interacción estudiante–IA durante la construcción de simuladores de ciencia.', rePmeta:'→ Research in Science Education (Springer)',
    reTg1:'Perfiles Conceptuales · Mortimer', reTg2:'Perfiles Epistemológicos · Bachelard', reTg3:'TMCR · sophotechnia', reTg4:'Escala de apropiación discursiva',
    exKicker:'Demostración', exTitle:'La plataforma en acción.',
    exLead:'Del diálogo socrático a la simulación interactiva — cada paso del recorrido de aprendizaje registrado y accesible para el docente en tiempo real.',
    ex1Title:'Chat con Petrus', ex1Lead:'El estudiante describe lo que quiere simular. Petrus no entrega el código — devuelve preguntas que amplían la comprensión conceptual antes de ir al laboratorio.',
    ex2Title:'Lab Agent en acción', ex2Lead:'Con el concepto mapeado, el estudiante pide al Lab Agent en lenguaje natural. El agente genera código HTML/JS ejecutable de inmediato, con vista previa instantánea.',
    ex3Title:'Mural de la clase', ex3Lead:'Los simuladores se exhiben en una galería compartida. El docente monitorea la evolución de cada estudiante y puede comentar directamente en el proyecto.',
    exPrivacy:'Todos los registros están anonimizados. Los estudiantes se identifican mediante códigos (E1–E19) y no se almacenan datos personales más allá de lo necesario para la investigación.',
    abKicker:'Acerca del proyecto', abTitle:'Una investigación que se convirtió en plataforma.',
    abP1:'SCAFFL nació como instrumento de una investigación de iniciación científica sobre la mediación discursiva en la interacción estudiante–IA en la enseñanza de química. La necesidad de capturar y analizar esa mediación llevó al desarrollo de una plataforma completa.',
    abP2:'El nombre SCAFFL proviene de scaffolding — andamiaje cognitivo, el proceso por el cual un mediador ofrece soporte temporal para que el aprendiz avance más allá de lo que podría lograr solo.',
    abMissionTitle:'Misión', abMission:'Ofrecer soporte estructurado para la construcción de conocimiento científico mediante la mediación inteligente entre estudiante, docente y tecnología.',
    abTeam:'Equipo', abResearcher:'Investigador', abAdvisor:'Orientador', abGroup:'Grupo de Investigación',
    abArchTitle:'Arquitectura', abResTitle:'Base teórica', abStack:'Stack tecnológico',
    q1:'El obstáculo epistemológico no está en el objeto de conocimiento, sino en el propio acto de conocer.',
    q1a:'Gaston Bachelard, La Formación del Espíritu Científico, 1938',
    q2:'El perfil conceptual de un individuo es el conjunto de formas de pensar sobre un concepto que coexisten.',
    q2a:'Eduardo Mortimer, Lenguaje y Formación de Conceptos en la Enseñanza de Ciencias, 2000',
    slKicker:'Instalación propia', slTitle:'Ejecuta SCAFFL en tu propia infraestructura.',
    slLead:'SCAFFL es open-source y puede instalarse en cualquier servidor Linux. Mantienes el control total de los datos de tus estudiantes.',
    slW1T:'Privacidad total', slW1D:'Todos los datos permanecen en tu servidor. Ninguna interacción se envía a terceros más allá de las APIs de IA.',
    slW2T:'Personalizable', slW2D:'Modifica el prompt de Petrus, ajusta las reglas del Lab Agent, personaliza el aspecto visual para tu institución.',
    slW3T:'Sin mensualidad', slW3D:'Solo pagas por las llamadas a la API (Anthropic + Gemini). La plataforma en sí es gratuita.',
    slReq:'Requisitos', slDocker:'Con Docker (recomendado)', slManual:'Instalación manual', slEnv:'Variables de entorno',
    slDlTitle:'Descargas', slGit:'GitHub — Código fuente', slDockerHub:'Docker Hub', slVideo:'Tutorial en video (próximamente)',
    dcKicker:'Documentación', dcTitle:'Referencia de la plataforma.',
    dcLead:'Todo lo que necesitas para entender, configurar y extender SCAFFL.',
    dcOvTitle:'Visión general', dcOvDesc:'SCAFFL es una aplicación Node.js + React. El servidor expone una API REST y gestiona las sesiones con PostgreSQL.',
    dcPtTitle:'Agente Petrus', dcPtDesc:'Petrus está implementado como una llamada en streaming a un LLM configurable (por defecto: Gemini 2.5 Flash). El system prompt define el rol socrático y las reglas de mediación.',
    dcLbTitle:'Lab Agent', dcLbDesc:'El Lab Agent usa el modelo Gemini 2.5 Flash (Google) para la generación de código. Cada turno recibe el historial comprimido de los simuladores anteriores del estudiante.',
    dcApiTitle:'API REST', dcApiDesc:'Todos los endpoints requieren autenticación Bearer JWT obtenido mediante POST /api/auth/login.',
    dcCfgTitle:'Configuración', dcCfgDesc:'Todas las opciones se definen mediante variables de entorno en el archivo .env del servidor.',
    dcEndpoints:'Endpoints principales',
    ftTagline:'Plataforma de tutoría inteligente para la enseñanza de ciencias.',
    ftRights:'Todos los derechos reservados.',
    ftResearcher:'Investigador', ftAdvisor:'Orientador', ftInst:'CIAGE · Universidad de Caxias do Sul',
    ftVersion:'Versión Experimental 2026',
  },
} as const;
type TKey = keyof typeof T.pt;

/* ─── Helpers ─── */
const hexToRgb = (h: string) =>
  `${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)}`;

/* ─── Sub-components ─── */
function Kicker({ text, color }: { text: string; color: string }) {
  return <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.7rem', letterSpacing:'0.12em', textTransform:'uppercase', color, marginBottom:12, fontWeight:600 }}>{text}</div>;
}

function Bullet({ text, color }: { text: string; color: string }) {
  return (
    <li style={{ display:'flex', gap:12, fontSize:'0.9rem', alignItems:'flex-start', color:'#94A3B8' }}>
      <span style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, marginTop:2, display:'flex', alignItems:'center', justifyContent:'center', background:`${color}22` }}>
        <Check size={11} color={color} />
      </span>
      {text}
    </li>
  );
}

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', border:`1px solid ${color}35`, color, background:`${color}0d`, padding:'6px 12px', borderRadius:999, display:'inline-block' }}>
      {text}
    </span>
  );
}

function Term({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid rgba(255,255,255,0.09)', background:'#070B14' }}>
      <div style={{ background:'#0D1526', padding:'10px 14px', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:11, height:11, borderRadius:'50%', background:'#FF5F57', display:'inline-block' }} />
        <span style={{ width:11, height:11, borderRadius:'50%', background:'#FEBC2E', display:'inline-block' }} />
        <span style={{ width:11, height:11, borderRadius:'50%', background:'#28C840', display:'inline-block' }} />
        {title && <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color:'#4B5563', marginLeft:8 }}>{title}</span>}
      </div>
      <pre style={{ margin:0, padding:'18px 22px', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', lineHeight:1.9, color:'#94A3B8', overflowX:'auto', whiteSpace:'pre-wrap' }}>
        {children}
      </pre>
    </div>
  );
}

function BrowserFrame({ title, children, dark }: { title: string; children: React.ReactNode; dark: boolean }) {
  return (
    <div style={{ borderRadius:14, overflow:'hidden', border:`1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`, boxShadow: dark ? '0 24px 60px rgba(0,0,0,0.5)' : '0 24px 60px rgba(0,0,0,0.15)' }}>
      <div style={{ background: dark ? '#141E35' : '#F1F5F9', padding:'11px 14px', display:'flex', alignItems:'center', gap:8, borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}>
        <span style={{ width:11, height:11, borderRadius:'50%', background:'#FF5F57', display:'inline-block' }} />
        <span style={{ width:11, height:11, borderRadius:'50%', background:'#FEBC2E', display:'inline-block' }} />
        <span style={{ width:11, height:11, borderRadius:'50%', background:'#28C840', display:'inline-block' }} />
        <div style={{ flex:1, margin:'0 8px', background: dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderRadius:6, padding:'4px 10px', fontSize:'0.7rem', fontFamily:"'JetBrains Mono',monospace", color: dark ? '#64748B' : '#94A3B8', textAlign:'center' }}>
          app.scaffl.com.br/{title}
        </div>
      </div>
      <div style={{ background: dark ? '#0C1220' : '#FFFFFF' }}>{children}</div>
    </div>
  );
}

/* Chat mockup */
function ChatMockup({ dark, a2 }: { dark: boolean; a2: string }) {
  const bg = dark ? '#0C1220' : '#F8FAFC';
  const userBg = a2;
  const botBg = dark ? '#1A2540' : '#F1F5F9';
  const txt = dark ? '#E2E8F0' : '#1E293B';
  const muted = dark ? '#64748B' : '#94A3B8';
  const msgs = [
    { bot: true, text: 'Que variáveis você acha que controlam a velocidade de uma reação química?' },
    { bot: false, text: 'Temperatura e concentração dos reagentes.' },
    { bot: true, text: 'Bom. E como elas afetam diferentemente a energia de ativação? Pense na teoria das colisões.' },
    { bot: false, text: 'Temperatura aumenta a energia cinética… mais colisões efetivas?' },
    { bot: true, text: 'Exato. Com esse modelo em mente, o que você quer que a simulação mostre?' },
  ];
  return (
    <div style={{ background: bg, padding:0 }}>
      <div style={{ borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:`${a2}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <MessageSquare size={14} color={a2} />
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.82rem', color: txt }}>Petrus</div>
          <div style={{ fontSize:'0.68rem', color: muted }}>Tutor · online</div>
        </div>
      </div>
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:10, maxHeight:240, overflowY:'auto' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent: m.bot ? 'flex-start' : 'flex-end' }}>
            <div style={{ maxWidth:'78%', padding:'9px 13px', borderRadius: m.bot ? '4px 14px 14px 14px' : '14px 4px 14px 14px', background: m.bot ? botBg : userBg, color: m.bot ? txt : '#fff', fontSize:'0.8rem', lineHeight:1.5 }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 14px', borderTop:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, display:'flex', gap:8 }}>
        <div style={{ flex:1, background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius:10, padding:'9px 13px', fontSize:'0.78rem', color: muted }}>Quero simular taxa de reação por temperatura…</div>
        <div style={{ width:36, height:36, borderRadius:10, background: a2, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <ArrowRight size={16} color="#fff" />
        </div>
      </div>
    </div>
  );
}

/* Lab mockup */
function LabMockup({ dark, a2 }: { dark: boolean; a2: string }) {
  const bg = dark ? '#0C1220' : '#F8FAFC';
  const txt = dark ? '#E2E8F0' : '#1E293B';
  const muted = dark ? '#64748B' : '#94A3B8';
  return (
    <div style={{ background: bg }}>
      <div style={{ borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:`${a2}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Code2 size={14} color={a2} />
          </div>
          <div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.82rem', color: txt }}>Lab Agent</div>
            <div style={{ fontSize:'0.68rem', color: muted }}>E07 · Cinética Química</div>
          </div>
        </div>
        <div style={{ fontSize:'0.68rem', fontFamily:"'JetBrains Mono',monospace", color: a2, background:`${a2}15`, padding:'4px 10px', borderRadius:6 }}>✓ Simulação atualizada</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, minHeight:220 }}>
        <div style={{ borderRight:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, padding:'14px', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', lineHeight:1.8, color: muted, background: dark ? '#080C18' : '#F1F5F9', overflowY:'auto', maxHeight:220 }}>
          <span style={{ color:'#60A5FA' }}>const</span> <span style={{ color: txt }}>canvas</span> = <span style={{ color:'#60A5FA' }}>document</span>{'\n'}.getElementById(<span style={{ color:'#86EFAC' }}>'sim'</span>);{'\n'}
          <span style={{ color:'#60A5FA' }}>const</span> ctx = canvas.getContext({'\n'}  <span style={{ color:'#86EFAC' }}>'2d'</span>);{'\n'}{'\n'}
          <span style={{ color:'#64748B' }}>// Arrhenius equation</span>{'\n'}
          <span style={{ color:'#60A5FA' }}>function</span> <span style={{ color:a2 }}>rate</span>(T) {'{'}{'\n'}
          {'  '}<span style={{ color:'#60A5FA' }}>return</span> A * Math.exp({'\n'}
          {'    '}-Ea / (R * T));{'\n'}
          {'}'}
        </div>
        <div style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: muted }}>Pré-visualização</div>
          <div style={{ flex:1, borderRadius:10, background: dark ? '#0F1A2C' : '#EEF2F7', border:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:10 }}>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontSize:'0.72rem', color: txt, fontWeight:600 }}>Taxa de Reação × T(K)</div>
            <svg viewBox="0 0 120 60" style={{ width:'100%', maxWidth:140 }}>
              <polyline points="10,50 30,42 50,30 70,16 90,8 110,4" fill="none" stroke={a2} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="52" x2="110" y2="52" stroke={muted} strokeWidth="0.8" />
              <line x1="10" y1="4"  x2="10"  y2="52" stroke={muted} strokeWidth="0.8" />
            </svg>
            <div style={{ fontSize:'0.64rem', color: muted }}>k = A·e^(−Eₐ/RT)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Class/Mural mockup */
function ClassMockup({ dark, a2 }: { dark: boolean; a2: string }) {
  const bg = dark ? '#0C1220' : '#F8FAFC';
  const txt = dark ? '#E2E8F0' : '#1E293B';
  const muted = dark ? '#64748B' : '#94A3B8';
  const panel = dark ? '#111D30' : '#FFFFFF';
  const cards = [
    { author:'E03', title:'Equilíbrio Ácido-Base', score:'9.2', color:'#10B981' },
    { author:'E07', title:'Cinética Química', score:'8.8', color: a2 },
    { author:'E11', title:'Eletroquímica', score:'9.5', color:'#8B5CF6' },
    { author:'E14', title:'Gases Ideais', score:'8.1', color:'#F59E0B' },
  ];
  return (
    <div style={{ background: bg }}>
      <div style={{ borderBottom:`1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, padding:'12px 16px', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:32, height:32, borderRadius:10, background:`${a2}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BookOpen size={14} color={a2} />
        </div>
        <div>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.82rem', color: txt }}>Mural da Turma</div>
          <div style={{ fontSize:'0.68rem', color: muted }}>Sala Delta 2 · 20 simuladores</div>
        </div>
      </div>
      <div style={{ padding:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {cards.map(c => (
          <div key={c.author} style={{ background: panel, borderRadius:10, padding:'10px 12px', border:`1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>
            <div style={{ fontSize:'0.68rem', fontFamily:"'JetBrains Mono',monospace", color: muted, marginBottom:4 }}>{c.author}</div>
            <div style={{ fontSize:'0.78rem', fontWeight:600, fontFamily:"'Space Grotesk',sans-serif", color: txt, marginBottom:8, lineHeight:1.3 }}>{c.title}</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ width:32, height:3, borderRadius:2, background:`${c.color}30` }}>
                <div style={{ width:`${parseFloat(c.score)*10}%`, height:'100%', borderRadius:2, background: c.color }} />
              </div>
              <span style={{ fontSize:'0.7rem', fontFamily:"'JetBrains Mono',monospace", color: c.color }}>{c.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [mode, setMode]   = useState<Mode>('dark');
  const [color, setColor] = useState<ThemeName>('teal');
  const [lang, setLang]   = useState<Lang>('pt');
  const [page, setPage]   = useState<Page>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  type RTab = 'abstract'|'motivation'|'agents'|'axes'|'theory'|'corpus'|'output'|'method'|'collab';
  const [rTab, setRTab] = useState<RTab>('abstract');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const dark   = mode === 'dark';
  const theme  = THEMES[color];
  // Tema neutro: branco em dark, quase-preto em light (igual à plataforma com "white")
  const a2     = color === 'neutral' ? (dark ? '#FFFFFF' : '#0F172A') : theme.a2;
  const t      = (k: TKey): string => (T[lang] as Record<string, string>)[k] ?? k;

  /* Inject fonts */
  useEffect(() => {
    if (document.getElementById('scaffl-landing-fonts')) return;
    const l = document.createElement('link');
    l.id = 'scaffl-landing-fonts';
    l.rel = 'stylesheet';
    l.href = FONT_URL;
    document.head.appendChild(l);
  }, []);

  /* Canvas animation */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let id: number;
    type P = { x:number; y:number; vx:number; vy:number; r:number };
    let pts: P[] = [];
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    const init = () => {
      pts = Array.from({ length: 55 }, () => ({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.45, vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 1.8 + 0.4,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rgb = hexToRgb(a2);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx*dx + dy*dy);
          if (d < 140) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(${rgb},${(1 - d/140)*0.25})`; ctx.lineWidth = 0.9; ctx.stroke();
          }
        }
      }
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${rgb},0.5)`; ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      });
      id = requestAnimationFrame(draw);
    };
    resize(); init(); draw();
    const onResize = () => { resize(); init(); };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', onResize); };
  }, [a2]);

  /* Style shortcuts */
  const BG    = dark ? '#080C18' : '#F6F8FC';
  const BG2   = dark ? '#0C1220' : '#EEF2F8';
  const PANEL = dark ? '#111A2E' : '#FFFFFF';
  const LINE  = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const TX    = dark ? '#F0F6FF' : '#0F172A';
  const TX2   = dark ? '#94A3B8' : '#475569';
  const TX3   = dark ? '#4B5563' : '#94A3B8';
  const GRAD  = `linear-gradient(135deg,${theme.a1},${a2} 50%,${theme.a3})`;
  // text on a2/GRAD background — needs dark in neutral+dark (white gradient)
  const btnTx = color === 'neutral' && dark ? '#0F172A' : '#fff';

  const navPages: { id: Page; key: TKey }[] = [
    { id:'home',     key:'navHome'  },
    { id:'examples', key:'navEx'    },
    { id:'about',    key:'navAbout' },
    { id:'docs',     key:'navDocs'  },
  ];

  const go = (p: Page) => { setPage(p); setMenuOpen(false); window.scrollTo({ top:0, behavior:'smooth' }); };

  /* Corner marks */
  const Reg = ({ pos }: { pos: 'tl'|'tr'|'bl'|'br' }) => {
    const top  = pos.startsWith('t') ? 16 : undefined;
    const bot  = pos.startsWith('b') ? 16 : undefined;
    const left = pos.endsWith('l')   ? 16 : undefined;
    const right= pos.endsWith('r')   ? 16 : undefined;
    return (
      <div style={{ position:'fixed', width:22, height:22, top, bottom:bot, left, right, zIndex:60, pointerEvents:'none', opacity:0.4 }}>
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:1.5, background: a2, ...(pos.includes('r') ? { left:'auto', right:0 } : {}) }} />
        <div style={{ position:'absolute', top:0, left:0, width:1.5, height:'100%', background: a2, ...(pos.includes('r') ? { left:'auto', right:0 } : {}), ...(pos.includes('b') ? { top:'auto', bottom:0 } : {}) }} />
      </div>
    );
  };

  const SectionWrap = ({ children, bg }: { children: React.ReactNode; bg?: string }) => (
    <section style={{ padding:'88px 0', background: bg ?? BG }}>
      <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 24px' }}>{children}</div>
    </section>
  );

  /* ── HOME PAGE ── */
  const HomePage = () => (
    <>
      {/* Hero */}
      <section style={{ position:'relative', paddingTop:80, minHeight:'100vh', display:'flex', alignItems:'center', overflow:'hidden', background: BG }}>
        {/* Dot grid */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none',
          backgroundImage: dark ? 'radial-gradient(rgba(255,255,255,0.048) 1px,transparent 1px)' : 'radial-gradient(rgba(0,0,0,0.055) 1px,transparent 1px)',
          backgroundSize:'28px 28px' }} />
        {/* Orbs */}
        <div style={{ position:'absolute', top:'18%', right:'14%', width:500, height:500, borderRadius:'50%', background: a2, opacity:0.13, filter:'blur(90px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:'12%', left:'8%', width:300, height:300, borderRadius:'50%', background: theme.a1, opacity:0.08, filter:'blur(70px)', pointerEvents:'none' }} />
        {/* Canvas */}
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', opacity: dark ? 0.7 : 0.4 }} />
        <div style={{ position:'relative', zIndex:2, maxWidth:1160, margin:'0 auto', padding:'80px 24px 100px' }}>
          {/* Badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:9, padding:'7px 14px', borderRadius:999, border:`1px solid ${a2}38`, background:`${a2}0e`, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color: a2, marginBottom:28 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: a2, animation:'pulse 2s infinite', display:'inline-block' }} />
            {t('heroBadge')}
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, lineHeight:1.04, marginBottom:24, color: TX, fontSize:'clamp(2.8rem,7vw,5.2rem)' }}>
            {t('heroTitle')}<br />
            <span style={{ background: GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{t('heroGrad')}</span>
          </h1>
          <p style={{ maxWidth:640, lineHeight:1.72, marginBottom:40, color: TX2, fontSize:'clamp(1rem,1.8vw,1.18rem)' }}>{t('heroSub')}</p>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginBottom:60 }}>
            <button onClick={() => navigate('/login')} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:14, background: GRAD, color: btnTx, fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.97rem', border:'none', cursor:'pointer', boxShadow:`0 8px 28px ${a2}45` }}>
              {t('heroCta1')} <ArrowRight size={18} />
            </button>
            <button onClick={() => go('examples')} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 28px', borderRadius:14, background:'transparent', color: TX, fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.97rem', border:`1px solid ${LINE}`, cursor:'pointer' }}>
              {t('heroCta2')} <ChevronRight size={18} />
            </button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:28, paddingTop:32, borderTop:`1px solid ${LINE}` }}>
            {[['2','hm1'],['164','hm2'],['20','hm3'],['19','hm4']].map(([n,k]) => (
              <div key={k}>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(2rem,4vw,2.8rem)', background: GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{n}</div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.74rem', color: TX3, marginTop:4 }}>{t(k as TKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents */}
      <SectionWrap bg={BG2}>
        <Kicker text={t('agKicker')} color={a2} />
        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.9rem,3.5vw,2.8rem)', color: TX, marginBottom:14 }}>{t('agTitle')}</h2>
        <p style={{ color: TX2, maxWidth:680, lineHeight:1.7, marginBottom:48 }}>{t('agLead')}</p>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22 }}>
          {([
            { tag:'ptTag', name:'ptName', role:'ptRole', desc:'ptDesc', bullets:['ptB1','ptB2','ptB3'] as TKey[], Icon:MessageSquare, side:'left' },
            { tag:'lbTag', name:'lbName', role:'lbRole', desc:'lbDesc', bullets:['lbB1','lbB2','lbB3'] as TKey[], Icon:Code2, side:'right' },
          ]).map(({ tag, name, role, desc, bullets, Icon }) => (
            <div key={name} style={{ position:'relative', background: PANEL, border:`1px solid ${LINE}`, borderRadius:20, padding:32, overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: GRAD }} />
              <div style={{ width:44, height:44, borderRadius:12, background:`${a2}18`, border:`1px solid ${a2}28`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon size={20} color={a2} />
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', letterSpacing:'0.08em', textTransform:'uppercase', color: a2, marginBottom:4 }}>{t(tag as TKey)}</div>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'1.7rem', color: TX, margin:'4px 0 2px' }}>{t(name as TKey)}</h3>
              <p style={{ fontSize:'0.87rem', color: TX3, marginBottom:14 }}>{t(role as TKey)}</p>
              <p style={{ fontSize:'0.93rem', color: TX2, lineHeight:1.65, marginBottom:20 }}>{t(desc as TKey)}</p>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:10 }}>
                {bullets.map(b => <Bullet key={b} text={t(b)} color={a2} />)}
              </ul>
            </div>
          ))}
        </div>
      </SectionWrap>

      {/* Modules */}
      <SectionWrap bg={BG}>
        <Kicker text={t('modKicker')} color={a2} />
        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.9rem,3.5vw,2.8rem)', color: TX, marginBottom:14 }}>{t('modTitle')}</h2>
        <p style={{ color: TX2, maxWidth:640, lineHeight:1.7, marginBottom:48 }}>{t('modLead')}</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18 }}>
          {([
            { Icon:MessageSquare, k:'chatK', t:'chatT', d:'chatD' },
            { Icon:Code2,         k:'labK',  t:'labT',  d:'labD'  },
            { Icon:BookOpen,      k:'clsK',  t:'clsT',  d:'clsD'  },
          ]).map(({ Icon, k, t:ti, d }) => (
            <div key={k} style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:18, padding:28 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:`${a2}14`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                <Icon size={18} color={a2} />
              </div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', letterSpacing:'0.1em', textTransform:'uppercase', color: a2, marginBottom:8 }}>{t(k as TKey)}</div>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, marginBottom:8 }}>{t(ti as TKey)}</h3>
              <p style={{ fontSize:'0.88rem', color: TX2, lineHeight:1.65 }}>{t(d as TKey)}</p>
            </div>
          ))}
        </div>
      </SectionWrap>

      {/* Stats */}
      <SectionWrap bg={BG2}>
        <Kicker text={t('stKicker')} color={a2} />
        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.6rem,2.8vw,2.2rem)', color: TX, marginBottom:40 }}>{t('stTitle')}</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
          {[['164','s1'],['89/75','s2'],['20','s3'],['19','s4']].map(([n,k]) => (
            <div key={k} style={{ border:`1px solid ${LINE}`, borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.8rem,3.5vw,2.6rem)', background: GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{n}</div>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color: TX3, marginTop:6 }}>{t(k as TKey)}</div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color: TX3, textAlign:'center' }}>{t('stCap')}</p>
      </SectionWrap>

      {/* Research */}
      <SectionWrap bg={BG}>
        <Kicker text={t('reKicker')} color={a2} />
        <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.9rem,3.5vw,2.8rem)', color: TX, marginBottom:40, maxWidth:'22ch' }}>{t('reTitle')}</h2>
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:40, alignItems:'start' }}>
          <div>
            <p style={{ color: TX2, lineHeight:1.75, marginBottom:18 }}>{t('reP1')}</p>
            <p style={{ color: TX2, lineHeight:1.75, marginBottom:28 }}>{t('reP2')}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {(['reTg1','reTg2','reTg3','reTg4'] as TKey[]).map(k => <Tag key={k} text={t(k)} color={a2} />)}
            </div>
          </div>
          <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:18, padding:28 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', letterSpacing:'0.1em', textTransform:'uppercase', color: a2, marginBottom:10 }}>{t('rePk')}</div>
            <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.18rem', color: TX, marginBottom:10 }}>From Command to Authorship</h3>
            <p style={{ fontSize:'0.88rem', color: TX2, lineHeight:1.65, marginBottom:16 }}>{t('rePdesc')}</p>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', color: a2 }}>{t('rePmeta')}</p>
            <div style={{ marginTop:20, paddingTop:18, borderTop:`1px solid ${LINE}`, display:'flex', flexWrap:'wrap', gap:8 }}>
              {[['GraduationCap','Mortimer'],['Atom','Bachelard'],['Network','TMCR'],['Layers','Sophotechnia']].map(([,label]) => (
                <span key={label} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', padding:'5px 10px', borderRadius:8, border:`1px solid ${LINE}`, color: TX3 }}>{label}</span>
              ))}
            </div>
          </div>
        </div>
      </SectionWrap>

      {/* CTA Banner */}
      <SectionWrap bg={BG2}>
        <div style={{ borderRadius:24, padding:'64px 40px', textAlign:'center', background:`linear-gradient(135deg,${a2}1a 0%,${a2}07 60%,transparent)`, border:`1px solid ${a2}28`, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:`radial-gradient(ellipse at 50% 0%,${a2}14,transparent 65%)`, pointerEvents:'none' }} />
          <div style={{ position:'relative', zIndex:1 }}>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.8rem,3.5vw,2.8rem)', color: TX, marginBottom:14 }}>{lang==='pt' ? 'Pronto para explorar?' : lang==='en' ? 'Ready to explore?' : '¿Listo para explorar?'}</h2>
            <p style={{ color: TX2, maxWidth:420, margin:'0 auto 32px', lineHeight:1.7 }}>{lang==='pt' ? 'Acesse com o convite da sua instituição ou entre com suas credenciais.' : lang==='en' ? 'Access with your institution\'s invite or sign in with your credentials.' : 'Accede con el enlace de tu institución o entra con tus credenciales.'}</p>
            <button onClick={() => navigate('/login')} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'16px 36px', borderRadius:16, background: GRAD, color: btnTx, fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1rem', border:'none', cursor:'pointer', boxShadow:`0 12px 40px ${a2}50` }}>
              {t('heroCta1')} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </SectionWrap>
    </>
  );

  /* ── EXAMPLES PAGE ── */
  const ExamplesPage = () => (
    <>
      <div style={{ paddingTop:80, background: BG }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'80px 24px 40px' }}>
          <Kicker text={t('exKicker')} color={a2} />
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(2rem,4vw,3.2rem)', color: TX, marginBottom:16 }}>{t('exTitle')}</h1>
          <p style={{ color: TX2, maxWidth:640, lineHeight:1.7, marginBottom:0 }}>{t('exLead')}</p>
        </div>
      </div>
      <SectionWrap bg={BG}>
        <div style={{ display:'grid', gridTemplateColumns:'0.9fr 1.1fr', gap:40, alignItems:'center', marginBottom:72 }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color: a2, marginBottom:10 }}>01</div>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.7rem', color: TX, marginBottom:14 }}>{t('ex1Title')}</h2>
            <p style={{ color: TX2, lineHeight:1.72, marginBottom:20 }}>{t('ex1Lead')}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              <Tag text={lang==='pt' ? 'Andaimamento socrático' : lang==='en' ? 'Socratic scaffolding' : 'Andamiaje socrático'} color={a2} />
              <Tag text={lang==='pt' ? 'Zona de desenvolvimento proximal' : lang==='en' ? 'Zone of proximal development' : 'Zona de desarrollo próximo'} color={a2} />
            </div>
          </div>
          <BrowserFrame title="chat" dark={dark}>
            <img src="/screenshots/screenshot-chat-petrus.jpg" style={{ width:'100%', display:'block' }} alt="Chat com Petrus — SCAFFL" />
          </BrowserFrame>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 0.9fr', gap:40, alignItems:'center', marginBottom:72 }}>
          <BrowserFrame title="lab/simuladores" dark={dark}>
            <img src="/screenshots/screenshot-lab-simuladores.jpg" style={{ width:'100%', display:'block' }} alt="Laboratório de Simuladores — SCAFFL" />
          </BrowserFrame>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color: a2, marginBottom:10 }}>02</div>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.7rem', color: TX, marginBottom:14 }}>{t('ex2Title')}</h2>
            <p style={{ color: TX2, lineHeight:1.72, marginBottom:20 }}>{t('ex2Lead')}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              <Tag text={lang==='pt' ? 'Geração em linguagem natural' : lang==='en' ? 'Natural language generation' : 'Generación en lenguaje natural'} color={a2} />
              <Tag text={lang==='pt' ? 'Artefato interativo' : lang==='en' ? 'Interactive artifact' : 'Artefacto interactivo'} color={a2} />
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'0.9fr 1.1fr', gap:40, alignItems:'center', marginBottom:48 }}>
          <div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color: a2, marginBottom:10 }}>03</div>
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.7rem', color: TX, marginBottom:14 }}>{t('ex3Title')}</h2>
            <p style={{ color: TX2, lineHeight:1.72, marginBottom:20 }}>{t('ex3Lead')}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              <Tag text={lang==='pt' ? 'Avaliação formativa' : lang==='en' ? 'Formative assessment' : 'Evaluación formativa'} color={a2} />
              <Tag text={lang==='pt' ? 'Visibilidade pedagógica' : lang==='en' ? 'Pedagogical visibility' : 'Visibilidad pedagógica'} color={a2} />
            </div>
          </div>
          <BrowserFrame title="class/mural" dark={dark}>
            <img src="/screenshots/screenshot-mural.jpg" style={{ width:'100%', display:'block' }} alt="Mural Virtual — SCAFFL" />
          </BrowserFrame>
        </div>
        {/* Privacy notice */}
        <div style={{ display:'flex', gap:14, alignItems:'flex-start', border:`1px dashed ${a2}40`, borderRadius:14, padding:'18px 22px', background:`${a2}07` }}>
          <Shield size={20} color={a2} style={{ flexShrink:0, marginTop:2 }} />
          <p style={{ fontSize:'0.87rem', color: TX2, lineHeight:1.65, margin:0 }}>{t('exPrivacy')}</p>
        </div>
      </SectionWrap>
    </>
  );

  /* ── ABOUT PAGE ── */
  const AboutPage = () => (
    <>
      <div style={{ paddingTop:80, background: BG }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'80px 24px 40px' }}>
          <Kicker text={t('abKicker')} color={a2} />
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(2rem,4vw,3.2rem)', color: TX, marginBottom:16 }}>{t('abTitle')}</h1>
          <p style={{ color: TX2, maxWidth:700, lineHeight:1.75, marginBottom:8 }}>{t('abP1')}</p>
          <p style={{ color: TX2, maxWidth:700, lineHeight:1.75 }}>{t('abP2')}</p>
        </div>
      </div>
      <SectionWrap bg={BG2}>
        {/* Institutional context */}
        <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:18, padding:30, marginBottom:28 }}>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: a2, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:14 }}>
            {lang==='pt' ? 'Contexto institucional' : lang==='en' ? 'Institutional context' : 'Contexto institucional'}
          </div>
          <p style={{ color: TX, lineHeight:1.8, fontSize:'0.95rem', margin:'0 0 14px' }}>
            {lang==='pt'
              ? 'A SCAFFL é desenvolvida no âmbito do Programa de Pós-Graduação em Ensino de Ciências e Matemática (PPGECiMa) da Universidade de Caxias do Sul (UCS), vinculada ao projeto guarda-chuva IAGENEduc, coordenado pelo Prof. Dr. Agostinho Serrano de Andrade Neto. O desenvolvimento conta com financiamento da FAPERGS via PROBIC (Iniciação Científica) e tem como campo de aplicação o ensino médio do CETEC/UCS.'
              : lang==='en'
              ? 'SCAFFL is developed within the Graduate Program in Science and Mathematics Education (PPGECiMa) at the University of Caxias do Sul (UCS), linked to the IAGENEduc umbrella project coordinated by Prof. Dr. Agostinho Serrano de Andrade Neto. Development is funded by FAPERGS via PROBIC (undergraduate research grant) and the intended application context is secondary education at CETEC/UCS.'
              : 'SCAFFL se desarrolla en el marco del Programa de Posgrado en Enseñanza de Ciencias y Matemáticas (PPGECiMa) de la Universidad de Caxias do Sul (UCS), vinculado al proyecto IAGENEduc coordinado por el Prof. Dr. Agostinho Serrano de Andrade Neto. El desarrollo cuenta con financiamiento de FAPERGS vía PROBIC y su contexto de aplicación previsto es la enseñanza media del CETEC/UCS.'}
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {['PPGECiMa / UCS', 'CIAGE', 'FAPERGS · PROBIC', 'CETEC/UCS'].map(tag => (
              <span key={tag} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', border:`1px solid ${a2}35`, color: a2, background:`${a2}0d`, padding:'5px 11px', borderRadius:999 }}>{tag}</span>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:22, marginBottom:48 }}>
          <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:18, padding:30 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: a2, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>{t('abMissionTitle')}</div>
            <p style={{ color: TX, lineHeight:1.75, fontSize:'1rem', fontStyle:'italic', margin:0 }}>{t('abMission')}</p>
          </div>
          <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:18, padding:30 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: a2, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:12 }}>{t('abArchTitle')}</div>
            <div style={{ display:'flex', alignItems:'center', gap:0, flexWrap:'wrap' }}>
              {['Browser','→','SCAFFL Server','→','Claude API','→','Gemini API','→','PostgreSQL'].map((n, i) => (
                n === '→'
                  ? <span key={i} style={{ color: TX3, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.8rem', padding:'0 6px' }}>→</span>
                  : <span key={i} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', padding:'5px 10px', border:`1px solid ${LINE}`, borderRadius:8, color: TX2, background: dark ? '#0C1220' : '#F1F5F9' }}>{n}</span>
              ))}
            </div>
          </div>
        </div>
        {/* Quotes */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:20 }}>{t('abResTitle')}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:48 }}>
          {[['q1','q1a'],['q2','q2a']].map(([qk,ak]) => (
            <div key={qk} style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:26, position:'relative' }}>
              <Quote size={28} color={a2} style={{ opacity:0.25, position:'absolute', top:18, right:20 }} />
              <p style={{ fontStyle:'italic', color: TX, lineHeight:1.75, fontSize:'0.95rem', marginBottom:14 }}>"{t(qk as TKey)}"</p>
              <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color: TX3 }}>— {t(ak as TKey)}</p>
            </div>
          ))}
        </div>
        {/* Team */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:20 }}>{t('abTeam')}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:28 }}>
          <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:26 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color: a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{t('abResearcher')}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color: TX, marginBottom:4 }}>{t('abResearcherName') ?? 'Lead Researcher'}</div>
            <div style={{ fontSize:'0.82rem', color: TX2 }}>{t('ftInst')}</div>
          </div>
          <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:26 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color: a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{t('abAdvisor')}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color: TX, marginBottom:4 }}>Prof. Dr. Agostinho</div>
            <div style={{ fontSize:'0.82rem', color: TX2 }}>{t('ftInst')}</div>
          </div>
          <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:26 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color: a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{t('abGroup')}</div>
            <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color: TX, marginBottom:4 }}>CIAGE</div>
            <div style={{ fontSize:'0.82rem', color: TX2 }}>Universidade de Caxias do Sul</div>
          </div>
        </div>
        {/* Stack */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:16 }}>{t('abStack')}</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:56 }}>
          {['Node.js','TypeScript','React','PostgreSQL','Drizzle ORM','Claude (Anthropic)','Gemini (Google)','Tailwind CSS','Vite','Docker'].map(s => (
            <span key={s} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', padding:'7px 13px', border:`1px solid ${LINE}`, borderRadius:8, color: TX2 }}>{s}</span>
          ))}
        </div>
        {/* Researchers CTA */}
        <div style={{ borderTop:`1px solid ${LINE}`, paddingTop:48, textAlign:'center' }}>
          <p style={{ color: TX2, maxWidth:580, margin:'0 auto 24px', lineHeight:1.75, fontSize:'0.97rem' }}>
            {lang==='pt' ? 'Quer conhecer a fundamentação teórica completa, os eixos de pesquisa, os dados do estudo piloto e a produção científica em desenvolvimento?' : lang==='en' ? 'Want to explore the full theoretical framework, research axes, pilot study data and scientific output in development?' : '¿Quieres conocer el marco teórico completo, los ejes de investigación, los datos del estudio piloto y la producción científica en desarrollo?'}
          </p>
          <button onClick={() => go('researchers')} style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'14px 32px', borderRadius:14, background: GRAD, color: btnTx, fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.97rem', border:'none', cursor:'pointer', boxShadow:`0 8px 28px ${a2}45` }}>
            {lang==='pt' ? 'Para Pesquisadores' : lang==='en' ? 'For Researchers' : 'Para Investigadores'} <ArrowRight size={18} />
          </button>
        </div>
      </SectionWrap>
    </>
  );

  /* ── SELF PAGE ── */
  const SelfPage = () => (
    <>
      <div style={{ paddingTop:80, background: BG }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'80px 24px 40px' }}>
          <Kicker text={t('slKicker')} color={a2} />
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(2rem,4vw,3.2rem)', color: TX, marginBottom:16 }}>{t('slTitle')}</h1>
          <p style={{ color: TX2, maxWidth:640, lineHeight:1.7 }}>{t('slLead')}</p>
        </div>
      </div>
      <SectionWrap bg={BG2}>
        {/* Why */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:56 }}>
          {([['slW1T','slW1D',Shield],['slW2T','slW2D',Sliders],['slW3T','slW3D',DollarSign]] as [TKey,TKey,React.ElementType][]).map(([tit,desc,Icon]) => (
            <div key={tit} style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:26 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${a2}14`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                <Icon size={18} color={a2} />
              </div>
              <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1rem', color: TX, marginBottom:8 }}>{t(tit)}</h3>
              <p style={{ fontSize:'0.88rem', color: TX2, lineHeight:1.65, margin:0 }}>{t(desc)}</p>
            </div>
          ))}
        </div>
        {/* Requirements */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:16 }}>{t('slReq')}</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:48 }}>
          {['Node.js 20+','PostgreSQL 15+','Anthropic API Key','Gemini API Key','Linux / macOS / WSL2'].map(r => (
            <span key={r} style={{ display:'inline-flex', alignItems:'center', gap:7, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', padding:'7px 13px', border:`1px solid ${LINE}`, borderRadius:8, color: TX2 }}>
              <Check size={12} color={a2} /> {r}
            </span>
          ))}
        </div>
        {/* Docker */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:16 }}>{t('slDocker')}</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:48 }}>
          <Term title="docker-compose.yml">
            <span style={{ color:'#64748B' }}># docker-compose.yml{'\n'}</span>
            <span style={{ color:'#60A5FA' }}>version</span>: <span style={{ color:'#86EFAC' }}>'3.9'</span>{'\n'}
            <span style={{ color:'#60A5FA' }}>services</span>:{'\n'}
            {'  '}<span style={{ color: a2 }}>scaffl</span>:{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>image</span>: ghcr.io/pedbender123/scaffl:latest{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>ports</span>: [<span style={{ color:'#86EFAC' }}>"3000:3000"</span>]{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>env_file</span>: .env{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>depends_on</span>: [db]{'\n'}
            {'  '}<span style={{ color: a2 }}>db</span>:{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>image</span>: postgres:16-alpine{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>environment</span>:{'\n'}
            {'      POSTGRES_USER'}: scaffl{'\n'}
            {'      POSTGRES_PASSWORD'}: {'${DB_PASSWORD}'}{'\n'}
            {'      POSTGRES_DB'}: scaffl{'\n'}
            {'    '}<span style={{ color:'#60A5FA' }}>volumes</span>: [pgdata:/var/lib/postgresql/data]{'\n'}
            <span style={{ color:'#60A5FA' }}>volumes</span>:{'\n'}
            {'  '}pgdata:
          </Term>
          <Term title=".env">
            <span style={{ color:'#64748B' }}># Obrigatório{'\n'}</span>
            <span style={{ color: a2 }}>ANTHROPIC_API_KEY</span>=sk-ant-...{'\n'}
            <span style={{ color: a2 }}>GEMINI_API_KEY</span>=AIza...{'\n'}
            <span style={{ color: a2 }}>DATABASE_URL</span>=postgresql://scaffl:{'\n'}  pass@db:5432/scaffl{'\n'}
            <span style={{ color: a2 }}>JWT_SECRET</span>={'<'}32-char-random{'>'}{'\n\n'}
            <span style={{ color:'#64748B' }}># Opcional{'\n'}</span>
            <span style={{ color: a2 }}>PORT</span>=3000{'\n'}
            <span style={{ color: a2 }}>NODE_ENV</span>=production
          </Term>
        </div>
        <Term title="bash">
          <span style={{ color:'#64748B' }}># Subir a plataforma{'\n'}</span>
          <span style={{ color: a2 }}>$</span> docker compose up -d{'\n\n'}
          <span style={{ color:'#64748B' }}># Verificar logs{'\n'}</span>
          <span style={{ color: a2 }}>$</span> docker compose logs -f scaffl
        </Term>
        <div style={{ height:48 }} />
        {/* Manual */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:16 }}>{t('slManual')}</h3>
        <Term title="bash">
          <span style={{ color: a2 }}>$</span> git clone https://github.com/pedbender123/scaffl.git{'\n'}
          <span style={{ color: a2 }}>$</span> cd scaffl{'\n'}
          <span style={{ color: a2 }}>$</span> npm install{'\n'}
          <span style={{ color: a2 }}>$</span> cp .env.example .env{'\n'}
          <span style={{ color:'#64748B' }}># edite .env com suas chaves{'\n'}</span>
          <span style={{ color: a2 }}>$</span> npm run db:push{'\n'}
          <span style={{ color: a2 }}>$</span> npm run build{'\n'}
          <span style={{ color: a2 }}>$</span> npm start
        </Term>
        <div style={{ height:48 }} />
        {/* Downloads */}
        <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:20 }}>{t('slDlTitle')}</h3>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
          {[
            { label: t('slGit'), icon: ExternalLink },
            { label: t('slDockerHub'), icon: Server },
            { label: t('slVideo'), icon: Book, disabled: true },
          ].map(({ label, icon: Icon, disabled }) => (
            <button key={label} disabled={disabled} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'12px 22px', borderRadius:12, border:`1px solid ${disabled ? LINE : a2}`, background: disabled ? 'transparent' : `${a2}14`, color: disabled ? TX3 : a2, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:'0.9rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      </SectionWrap>
    </>
  );

  /* ── DOCS PAGE ── */
  const DocsPage = () => {
    const endpoints = [
      ['POST',  '/api/auth/login',          'Autenticar e receber JWT'],
      ['POST',  '/api/auth/register',        'Registrar via invite code'],
      ['GET',   '/api/auth/me',              'Dados do usuário autenticado'],
      ['GET',   '/api/chats',               'Listar sessões de chat'],
      ['POST',  '/api/chats',               'Criar nova sessão'],
      ['POST',  '/api/chats/:id/message',   'Enviar mensagem ao Petrus (streaming)'],
      ['GET',   '/api/lab/projects',        'Listar projetos do usuário'],
      ['POST',  '/api/lab/projects',        'Criar projeto no Lab'],
      ['POST',  '/api/lab/projects/:id/turn','Enviar prompt ao Lab Agent'],
      ['GET',   '/api/classrooms',          'Listar salas (admin)'],
    ];
    const methodColor: Record<string, string> = { GET:'#10B981', POST:a2, PUT:'#F59E0B', DELETE:'#EF4444' };
    return (
      <>
        <div style={{ paddingTop:80, background: BG }}>
          <div style={{ maxWidth:1160, margin:'0 auto', padding:'80px 24px 40px' }}>
            <Kicker text={t('dcKicker')} color={a2} />
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(2rem,4vw,3.2rem)', color: TX, marginBottom:16 }}>{t('dcTitle')}</h1>
            <p style={{ color: TX2, maxWidth:640, lineHeight:1.7 }}>{t('dcLead')}</p>
          </div>
        </div>
        <SectionWrap bg={BG2}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:48 }}>
            {([
              ['dcOvTitle','dcOvDesc', Cpu],
              ['dcPtTitle','dcPtDesc', MessageSquare],
              ['dcLbTitle','dcLbDesc', Code2],
              ['dcCfgTitle','dcCfgDesc', Sliders],
            ] as [TKey,TKey,React.ElementType][]).map(([tit,desc,Icon]) => (
              <div key={tit} style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:26 }}>
                <div style={{ width:38, height:38, borderRadius:10, background:`${a2}14`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                  <Icon size={17} color={a2} />
                </div>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color: TX, marginBottom:8 }}>{t(tit)}</h3>
                <p style={{ fontSize:'0.88rem', color: TX2, lineHeight:1.65, margin:0 }}>{t(desc)}</p>
              </div>
            ))}
          </div>
          <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:20 }}>{t('dcApiTitle')} — {t('dcEndpoints')}</h3>
          <div style={{ border:`1px solid ${LINE}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ background: dark ? '#0D1526' : '#F1F5F9', padding:'11px 18px', borderBottom:`1px solid ${LINE}`, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color: TX3 }}>
              Base URL: <span style={{ color: a2 }}>https://app.scaffl.com.br</span> · Bearer JWT obrigatório
            </div>
            {endpoints.map(([method, path, desc], i) => (
              <div key={path} style={{ display:'grid', gridTemplateColumns:'70px 1fr 1fr', gap:0, borderBottom: i < endpoints.length - 1 ? `1px solid ${LINE}` : 'none', padding:'12px 18px', alignItems:'center', background: i % 2 === 0 ? 'transparent' : (dark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)') }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', fontWeight:600, color: methodColor[method] ?? TX3 }}>{method}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.78rem', color: TX2 }}>{path}</span>
                <span style={{ fontSize:'0.82rem', color: TX3 }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ height:40 }} />
          <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.3rem', color: TX, marginBottom:16 }}>{t('dcCfgTitle')}</h3>
          <Term title=".env reference">
            <span style={{ color:'#64748B' }}># === Obrigatórias ==={'\n'}</span>
            <span style={{ color: a2 }}>ANTHROPIC_API_KEY</span>     <span style={{ color:'#64748B' }}># Claude (Petrus){'\n'}</span>
            <span style={{ color: a2 }}>GEMINI_API_KEY</span>        <span style={{ color:'#64748B' }}># Gemini (Lab Agent){'\n'}</span>
            <span style={{ color: a2 }}>DATABASE_URL</span>          <span style={{ color:'#64748B' }}># PostgreSQL connection string{'\n'}</span>
            <span style={{ color: a2 }}>JWT_SECRET</span>            <span style={{ color:'#64748B' }}># ≥32 caracteres aleatórios{'\n\n'}</span>
            <span style={{ color:'#64748B' }}># === Opcionais ==={'\n'}</span>
            <span style={{ color: a2 }}>PORT</span>                  <span style={{ color:'#64748B' }}># default: 3001{'\n'}</span>
            <span style={{ color: a2 }}>NODE_ENV</span>              <span style={{ color:'#64748B' }}># production | development{'\n'}</span>
            <span style={{ color: a2 }}>MAX_TOKENS_TUTOR</span>      <span style={{ color:'#64748B' }}># limite mensal por aluno (Petrus){'\n'}</span>
            <span style={{ color: a2 }}>MAX_TOKENS_LAB</span>        <span style={{ color:'#64748B' }}># limite mensal por aluno (Lab){'\n'}</span>
            <span style={{ color: a2 }}>INVITE_ONLY</span>           <span style={{ color:'#64748B' }}># true = cadastro só por convite</span>
          </Term>

          {/* ── SELF-HOSTED TUTORIAL ── */}
          <div style={{ height:56 }} />
          <div style={{ borderTop:`1px solid ${LINE}`, paddingTop:48 }}>
            <Kicker text={lang==='pt' ? 'Instalação própria' : lang==='en' ? 'Self-Hosted' : 'Instalación propia'} color={a2} />
            <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.6rem,3vw,2.2rem)', color: TX, marginBottom:14 }}>
              {lang==='pt' ? 'Rode a SCAFFL na sua infraestrutura' : lang==='en' ? 'Run SCAFFL on your own infrastructure' : 'Ejecuta SCAFFL en tu propia infraestructura'}
            </h2>
            <p style={{ color: TX2, maxWidth:680, lineHeight:1.75, marginBottom:32 }}>
              {lang==='pt' ? 'A SCAFFL é open-source e auto-hospedável. Você mantém controle total dos dados dos seus estudantes — nenhuma interação sai para terceiros além das APIs de IA. Este tutorial guia você do zero até a plataforma funcionando, mesmo sem experiência prévia com servidores.' : lang==='en' ? 'SCAFFL is open-source and self-hostable. You maintain full control of your students\' data — no interaction leaves your server beyond the AI API calls. This tutorial guides you from zero to a running platform, even without prior server experience.' : 'SCAFFL es open-source y autoalojable. Mantienes el control total de los datos de tus estudiantes. Este tutorial te guía desde cero hasta la plataforma funcionando, incluso sin experiencia previa con servidores.'}
            </p>

            {/* Why block */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:40 }}>
              {([
                [Shield, lang==='pt' ? 'Privacidade total' : lang==='en' ? 'Full privacy' : 'Privacidad total', lang==='pt' ? 'Dados dos alunos ficam no seu servidor. Zero vazamento para plataformas externas.' : lang==='en' ? 'Student data stays on your server. No leakage to external platforms.' : 'Los datos de los alumnos permanecen en tu servidor.'],
                [DollarSign, lang==='pt' ? 'Sem mensalidade' : lang==='en' ? 'No monthly fee' : 'Sin mensualidad', lang==='pt' ? 'Você paga só pelas chamadas de API (Anthropic + Gemini). A plataforma é gratuita.' : lang==='en' ? 'You only pay for API calls (Anthropic + Gemini). The platform itself is free.' : 'Solo pagas las llamadas de API. La plataforma es gratuita.'],
                [Sliders, lang==='pt' ? 'Customizável' : lang==='en' ? 'Customizable' : 'Personalizable', lang==='pt' ? 'Modifique o prompt do Petrus, ajuste o Lab Agent, personalize para sua instituição.' : lang==='en' ? 'Modify Petrus\'s prompt, adjust Lab Agent, personalize for your institution.' : 'Modifica el prompt de Petrus y personaliza para tu institución.'],
              ] as [React.ElementType, string, string][]).map(([Icon, title, desc]) => (
                <div key={title} style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:22 }}>
                  <div style={{ width:36, height:36, borderRadius:9, background:`${a2}14`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}><Icon size={16} color={a2} /></div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.95rem', color: TX, marginBottom:6 }}>{title}</div>
                  <p style={{ fontSize:'0.85rem', color: TX2, lineHeight:1.65, margin:0 }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* VPS recommendation */}
            <div style={{ border:`1px solid ${a2}30`, borderRadius:14, padding:'20px 24px', background:`${a2}08`, marginBottom:36 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                {lang==='pt' ? 'Não tem um servidor? Use uma VPS' : lang==='en' ? 'No server? Use a VPS' : '¿Sin servidor? Usa una VPS'}
              </div>
              <p style={{ color: TX2, fontSize:'0.9rem', lineHeight:1.75, margin:0 }}>
                {lang==='pt'
                  ? 'Uma VPS (Servidor Privado Virtual) é um computador alugado na nuvem que fica ligado 24h. Provedores como DigitalOcean, Hetzner ou Hostinger oferecem planos a partir de ~US$ 4–6/mês com Ubuntu 22 LTS pré-instalado. Você acessa via SSH (um terminal remoto) e executa os comandos abaixo. Escolha um plano com pelo menos 1 GB de RAM e 10 GB de disco.'
                  : lang==='en'
                  ? 'A VPS (Virtual Private Server) is a rented cloud computer that stays on 24/7. Providers like DigitalOcean, Hetzner or Hostinger offer plans from ~US$ 4–6/month with Ubuntu 22 LTS pre-installed. You access it via SSH (a remote terminal) and run the commands below. Choose a plan with at least 1 GB RAM and 10 GB disk.'
                  : 'Una VPS es un computador alquilado en la nube que permanece encendido 24/7. Proveedores como DigitalOcean, Hetzner u Hostinger ofrecen planes desde ~US$ 4–6/mes con Ubuntu 22 LTS preinstalado. Accedes vía SSH y ejecutas los comandos de abajo.'}
              </p>
            </div>

            {/* Step 1 */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background: GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:700, color: btnTx, flexShrink:0 }}>1</span>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, margin:0 }}>
                  {lang==='pt' ? 'Prepare o servidor' : lang==='en' ? 'Prepare the server' : 'Prepara el servidor'}
                </h3>
              </div>
              <p style={{ color: TX2, fontSize:'0.9rem', lineHeight:1.72, marginBottom:14, paddingLeft:40 }}>
                {lang==='pt' ? 'Conecte-se ao servidor via SSH e execute:' : lang==='en' ? 'Connect to the server via SSH and run:' : 'Conéctate al servidor vía SSH y ejecuta:'}
              </p>
              <Term title="bash — preparar servidor">
                <span style={{ color:'#64748B' }}># Atualizar o sistema{'\n'}</span>
                <span style={{ color: a2 }}>$</span> sudo apt update && sudo apt upgrade -y{'\n\n'}
                <span style={{ color:'#64748B' }}># Instalar Node.js 20 (via nvm — recomendado){'\n'}</span>
                <span style={{ color: a2 }}>$</span> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash{'\n'}
                <span style={{ color: a2 }}>$</span> source ~/.bashrc{'\n'}
                <span style={{ color: a2 }}>$</span> nvm install 20{'\n'}
                <span style={{ color: a2 }}>$</span> node -v   <span style={{ color:'#64748B' }}># deve mostrar v20.x.x</span>
              </Term>
            </div>

            {/* Step 2 */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background: GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:700, color: btnTx, flexShrink:0 }}>2</span>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, margin:0 }}>
                  {lang==='pt' ? 'Instale o PostgreSQL' : lang==='en' ? 'Install PostgreSQL' : 'Instala PostgreSQL'}
                </h3>
              </div>
              <p style={{ color: TX2, fontSize:'0.9rem', lineHeight:1.72, marginBottom:14, paddingLeft:40 }}>
                {lang==='pt' ? 'PostgreSQL é o banco de dados que armazena usuários, conversas e simuladores.' : lang==='en' ? 'PostgreSQL is the database that stores users, conversations and simulators.' : 'PostgreSQL es la base de datos que almacena usuarios, conversaciones y simuladores.'}
              </p>
              <Term title="bash — instalar PostgreSQL">
                <span style={{ color: a2 }}>$</span> sudo apt install -y postgresql postgresql-contrib{'\n'}
                <span style={{ color: a2 }}>$</span> sudo systemctl start postgresql{'\n'}
                <span style={{ color: a2 }}>$</span> sudo systemctl enable postgresql{'\n\n'}
                <span style={{ color:'#64748B' }}># Criar banco e usuário{'\n'}</span>
                <span style={{ color: a2 }}>$</span> sudo -u postgres psql -c "CREATE USER scaffl WITH PASSWORD 'senha_segura';"{'\n'}
                <span style={{ color: a2 }}>$</span> sudo -u postgres psql -c "CREATE DATABASE scaffl OWNER scaffl;"
              </Term>
            </div>

            {/* Step 3 */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background: GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:700, color: btnTx, flexShrink:0 }}>3</span>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, margin:0 }}>
                  {lang==='pt' ? 'Baixe o código da plataforma' : lang==='en' ? 'Download the platform code' : 'Descarga el código de la plataforma'}
                </h3>
              </div>
              <Term title="bash — clonar repositório">
                <span style={{ color: a2 }}>$</span> git clone https://github.com/pedbender123/scaffl.git{'\n'}
                <span style={{ color: a2 }}>$</span> cd scaffl{'\n'}
                <span style={{ color: a2 }}>$</span> npm install{'\n'}
                <span style={{ color:'#64748B' }}>{'\n'}# Isso instala todas as dependências. Pode demorar 1–2 minutos.</span>
              </Term>
            </div>

            {/* Step 4 */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background: GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:700, color: btnTx, flexShrink:0 }}>4</span>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, margin:0 }}>
                  {lang==='pt' ? 'Configure as variáveis de ambiente' : lang==='en' ? 'Configure environment variables' : 'Configura las variables de entorno'}
                </h3>
              </div>
              <p style={{ color: TX2, fontSize:'0.9rem', lineHeight:1.72, marginBottom:14, paddingLeft:40 }}>
                {lang==='pt'
                  ? 'O arquivo .env guarda as chaves de API e as configurações do servidor. Você precisará criar uma chave na Anthropic (para o Petrus) e outra no Google AI Studio (para o Lab Agent). Ambos têm planos gratuitos para começar.'
                  : lang==='en'
                  ? 'The .env file holds API keys and server settings. You will need to create a key at Anthropic (for Petrus) and another at Google AI Studio (for Lab Agent). Both have free tiers to get started.'
                  : 'El archivo .env contiene las claves de API y la configuración del servidor. Necesitarás crear una clave en Anthropic (para Petrus) y otra en Google AI Studio (para el Lab Agent).'}
              </p>
              <Term title="bash — criar .env">
                <span style={{ color: a2 }}>$</span> cp .env.example .env{'\n'}
                <span style={{ color: a2 }}>$</span> nano .env   <span style={{ color:'#64748B' }}># editor de texto no terminal</span>
              </Term>
              <div style={{ height:12 }} />
              <Term title=".env — preencher">
                <span style={{ color:'#64748B' }}># Chaves de IA — obtenha em platform.openai.com e aistudio.google.com{'\n'}</span>
                <span style={{ color: a2 }}>ANTHROPIC_API_KEY</span>=sk-ant-...{'\n'}
                <span style={{ color: a2 }}>GEMINI_API_KEY</span>=AIza...{'\n\n'}
                <span style={{ color:'#64748B' }}># Banco de dados (use a senha criada no passo 2){'\n'}</span>
                <span style={{ color: a2 }}>DATABASE_URL</span>=postgresql://scaffl:senha_segura@localhost:5432/scaffl{'\n\n'}
                <span style={{ color:'#64748B' }}># Gerar com: openssl rand -base64 32{'\n'}</span>
                <span style={{ color: a2 }}>JWT_SECRET</span>={"<string aleatória com 32+ caracteres>"}{'\n\n'}
                <span style={{ color: a2 }}>PORT</span>=3000{'\n'}
                <span style={{ color: a2 }}>NODE_ENV</span>=production
              </Term>
            </div>

            {/* Step 5 */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background: GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:700, color: btnTx, flexShrink:0 }}>5</span>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, margin:0 }}>
                  {lang==='pt' ? 'Inicialize o banco e inicie a plataforma' : lang==='en' ? 'Initialize the database and start the platform' : 'Inicializa la base de datos e inicia la plataforma'}
                </h3>
              </div>
              <Term title="bash — iniciar">
                <span style={{ color:'#64748B' }}># Criar as tabelas no banco{'\n'}</span>
                <span style={{ color: a2 }}>$</span> npm run db:push{'\n\n'}
                <span style={{ color:'#64748B' }}># Compilar o frontend{'\n'}</span>
                <span style={{ color: a2 }}>$</span> npm run build{'\n\n'}
                <span style={{ color:'#64748B' }}># Iniciar em modo produção{'\n'}</span>
                <span style={{ color: a2 }}>$</span> npm start{'\n\n'}
                <span style={{ color:'#64748B' }}># Para manter rodando mesmo após fechar o terminal:{'\n'}</span>
                <span style={{ color: a2 }}>$</span> npm install -g pm2{'\n'}
                <span style={{ color: a2 }}>$</span> pm2 start "npm start" --name scaffl{'\n'}
                <span style={{ color: a2 }}>$</span> pm2 save
              </Term>
            </div>

            {/* Step 6 */}
            <div style={{ marginBottom:40 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                <span style={{ width:28, height:28, borderRadius:'50%', background: GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', fontWeight:700, color: btnTx, flexShrink:0 }}>6</span>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.1rem', color: TX, margin:0 }}>
                  {lang==='pt' ? 'Aponte um domínio para a plataforma (opcional mas recomendado)' : lang==='en' ? 'Point a domain to the platform (optional but recommended)' : 'Apunta un dominio a la plataforma (opcional pero recomendado)'}
                </h3>
              </div>
              <p style={{ color: TX2, fontSize:'0.9rem', lineHeight:1.72, marginBottom:14, paddingLeft:40 }}>
                {lang==='pt'
                  ? 'Com um domínio próprio você acessa via endereço.com em vez de IP:porta. Use o Nginx como proxy reverso — ele recebe as requisições na porta 80/443 e as repassa para a aplicação na porta 3000. O Certbot instala SSL (HTTPS) gratuitamente.'
                  : lang==='en'
                  ? 'With your own domain you access via youraddress.com instead of IP:port. Use Nginx as a reverse proxy — it receives requests on port 80/443 and forwards them to the application on port 3000. Certbot installs free SSL (HTTPS).'
                  : 'Con tu propio dominio accedes por dirección.com en vez de IP:puerto. Usa Nginx como proxy inverso y Certbot para SSL gratuito.'}
              </p>
              <Term title="bash — Nginx + SSL">
                <span style={{ color: a2 }}>$</span> sudo apt install -y nginx certbot python3-certbot-nginx{'\n\n'}
                <span style={{ color:'#64748B' }}># Criar arquivo de configuração (substitua seu-dominio.com){'\n'}</span>
                <span style={{ color: a2 }}>$</span> sudo nano /etc/nginx/sites-available/scaffl{'\n\n'}
                <span style={{ color:'#64748B' }}># Cole o conteúdo abaixo no arquivo:{'\n'}</span>
                server {'{'}{'\n'}
                {'  '}server_name seu-dominio.com;{'\n'}
                {'  '}location / {'{'}{'\n'}
                {'    '}proxy_pass http://localhost:3000;{'\n'}
                {'    '}proxy_http_version 1.1;{'\n'}
                {'    '}proxy_set_header Upgrade $http_upgrade;{'\n'}
                {'    '}proxy_set_header Connection 'upgrade';{'\n'}
                {'    '}proxy_set_header Host $host;{'\n'}
                {'  '}{'}'}{'\n'}
                {'}'}{'\n\n'}
                <span style={{ color: a2 }}>$</span> sudo ln -s /etc/nginx/sites-available/scaffl /etc/nginx/sites-enabled/{'\n'}
                <span style={{ color: a2 }}>$</span> sudo nginx -t && sudo systemctl reload nginx{'\n'}
                <span style={{ color: a2 }}>$</span> sudo certbot --nginx -d seu-dominio.com
              </Term>
            </div>

            {/* Docker alternative */}
            <div style={{ background: PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:24, marginBottom:32 }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
                {lang==='pt' ? 'Alternativa: via Docker' : lang==='en' ? 'Alternative: via Docker' : 'Alternativa: con Docker'}
              </div>
              <p style={{ color: TX2, fontSize:'0.88rem', lineHeight:1.72, marginBottom:14 }}>
                {lang==='pt' ? 'Docker empacota toda a aplicação num contêiner — dispensa instalar Node.js e PostgreSQL separadamente. Se o servidor já tiver Docker, use:' : lang==='en' ? 'Docker packages the entire application in a container — no need to install Node.js and PostgreSQL separately. If the server already has Docker, use:' : 'Docker empaqueta toda la aplicación en un contenedor. Si el servidor ya tiene Docker instalado, usa:'}
              </p>
              <Term title="bash — Docker">
                <span style={{ color: a2 }}>$</span> sudo apt install -y docker.io docker-compose{'\n'}
                <span style={{ color: a2 }}>$</span> git clone https://github.com/pedbender123/scaffl.git && cd scaffl{'\n'}
                <span style={{ color: a2 }}>$</span> cp .env.example .env && nano .env{'\n'}
                <span style={{ color: a2 }}>$</span> docker compose up -d{'\n\n'}
                <span style={{ color:'#64748B' }}># Verificar status{'\n'}</span>
                <span style={{ color: a2 }}>$</span> docker compose logs -f scaffl
              </Term>
            </div>

            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <button style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:11, border:`1px solid ${a2}`, background:`${a2}14`, color: a2, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:'0.88rem', cursor:'pointer' }}>
                <ExternalLink size={15} /> {lang==='pt' ? 'GitHub — Código-fonte' : lang==='en' ? 'GitHub — Source code' : 'GitHub — Código fuente'}
              </button>
              <button style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 20px', borderRadius:11, border:`1px solid ${LINE}`, background:'transparent', color: TX3, fontFamily:"'Space Grotesk',sans-serif", fontWeight:600, fontSize:'0.88rem', cursor:'default', opacity:0.5 }}>
                <Book size={15} /> {lang==='pt' ? 'Tutorial em vídeo (em breve)' : lang==='en' ? 'Video tutorial (coming soon)' : 'Tutorial en video (próximamente)'}
              </button>
            </div>
          </div>
        </SectionWrap>
      </>
    );
  };

  /* ── RESEARCHERS PAGE ── */
  const rTabs: { id: RTab; label: [string,string,string]; num: string }[] = [
    { id:'abstract',   label:['Resumo','Abstract','Resumen'],                         num:'0' },
    { id:'motivation', label:['Motivação','Motivation','Motivación'],                  num:'1' },
    { id:'agents',     label:['Agentes da Plataforma','Platform Agents','Agentes'],    num:'2' },
    { id:'axes',       label:['Eixos de Pesquisa','Research Axes','Ejes'],             num:'3' },
    { id:'theory',     label:['Fundamentação Teórica','Theory','Fundamentación'],      num:'4' },
    { id:'corpus',     label:['Corpus & Dados','Corpus & Data','Corpus & Datos'],      num:'5' },
    { id:'output',     label:['Produção Científica','Scientific Output','Producción'], num:'6' },
    { id:'method',     label:['Metodologia','Methodology','Metodología'],              num:'7' },
    { id:'collab',     label:['Colaboração','Collaboration','Colaboración'],           num:'8' },
  ];
  const rLangIdx = lang==='pt' ? 0 : lang==='en' ? 1 : 2;

  const ArticleH2 = ({ n, children }: { n:string; children:React.ReactNode }) => (
    <h2 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'1.55rem', color:TX, marginBottom:20, display:'flex', alignItems:'baseline', gap:12 }}>
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.8rem', color:a2, opacity:0.7, flexShrink:0 }}>{n}.</span>
      {children}
    </h2>
  );
  const Pull = ({ children }: { children:React.ReactNode }) => (
    <div style={{ borderLeft:`3px solid ${a2}`, paddingLeft:20, margin:'24px 0', fontStyle:'italic', color:TX2, lineHeight:1.8, fontSize:'1.02rem' }}>{children}</div>
  );
  const P = ({ children }: { children:React.ReactNode }) => (
    <p style={{ color:TX2, lineHeight:1.82, marginBottom:18, fontSize:'0.95rem' }}>{children}</p>
  );

  const ResearchersPage = () => (
    <>
      {/* Header */}
      <div style={{ paddingTop:80, background: BG }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'64px 24px 32px' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:9, padding:'7px 14px', borderRadius:999, border:`1px solid ${a2}38`, background:`${a2}0e`, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color: a2, marginBottom:20 }}>
            <GraduationCap size={13} /> {lang==='pt' ? 'Iniciação Científica · PPGECiMa / UCS · 2026' : lang==='en' ? 'Undergraduate Research · PPGECiMa / UCS · 2026' : 'Iniciación Científica · PPGECiMa / UCS · 2026'}
          </div>
          <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'clamp(1.9rem,4vw,3rem)', color:TX, marginBottom:14, lineHeight:1.1 }}>
            {lang==='pt' ? 'SCAFFL como Instrumento de Pesquisa' : lang==='en' ? 'SCAFFL as a Research Instrument' : 'SCAFFL como Instrumento de Investigación'}
          </h1>
          <p style={{ color:TX2, fontSize:'0.92rem', fontFamily:"'JetBrains Mono',monospace" }}>
            Prof. Dr. Agostinho Serrano de Andrade Neto · CIAGE / UCS
          </p>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div style={{ background:BG2, minHeight:'80vh' }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 24px 80px', display:'grid', gridTemplateColumns:'240px 1fr', gap:40, alignItems:'start' }}>

          {/* Sidebar */}
          <div style={{ position:'sticky', top:80, paddingTop:40 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.63rem', color:TX3, textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:12, paddingLeft:12 }}>
              {lang==='pt' ? 'Índice' : lang==='en' ? 'Contents' : 'Índice'}
            </div>
            <nav style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {rTabs.map(tab => (
                <button key={tab.id} onClick={() => setRTab(tab.id)} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:9, border:'none',
                  background: rTab===tab.id ? `${a2}16` : 'transparent',
                  color: rTab===tab.id ? a2 : TX3,
                  fontFamily:"'Space Grotesk',sans-serif", fontWeight: rTab===tab.id ? 700 : 400,
                  fontSize:'0.85rem', cursor:'pointer', textAlign:'left', transition:'all .15s',
                  borderLeft: rTab===tab.id ? `2px solid ${a2}` : '2px solid transparent',
                }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.65rem', color: rTab===tab.id ? a2 : TX3, opacity:0.6, flexShrink:0, width:14 }}>{tab.num}</span>
                  {tab.label[rLangIdx]}
                </button>
              ))}
            </nav>
            <div style={{ marginTop:32, padding:'16px 12px', borderRadius:10, background:PANEL, border:`1px solid ${LINE}` }}>
              <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.62rem', color:TX3, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Status</div>
              <div style={{ fontSize:'0.8rem', color:a2, fontWeight:700, marginBottom:4 }}>
                {lang==='pt' ? 'Em desenvolvimento' : lang==='en' ? 'In development' : 'En desarrollo'}
              </div>
              <div style={{ fontSize:'0.75rem', color:TX3 }}>FAPERGS · PROBIC · 2025–2026</div>
            </div>
          </div>

          {/* Main content */}
          <div style={{ paddingTop:40 }}>

            {/* ── 0. ABSTRACT ── */}
            {rTab==='abstract' && (
              <div>
                <ArticleH2 n="0">{lang==='pt' ? 'Resumo' : lang==='en' ? 'Abstract' : 'Resumen'}</ArticleH2>
                <div style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:'24px 28px', marginBottom:28 }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
                    {lang==='pt' ? 'Pergunta central' : lang==='en' ? 'Central question' : 'Pregunta central'}
                  </div>
                  <p style={{ fontStyle:'italic', color:TX, lineHeight:1.85, fontSize:'1.02rem', margin:0 }}>
                    {lang==='pt'
                      ? '"De que modo ambientes educacionais baseados em IA Generativa, simuladores interativos e arquiteturas multiagente podem apoiar a aprendizagem de Ciências e Matemática quando desenvolvidos, aplicados e analisados em contexto real de sala de aula?"'
                      : lang==='en'
                      ? '"In what ways can educational environments based on Generative AI, interactive simulations and multi-agent architectures support learning in Science and Mathematics when developed, implemented and analyzed in real classroom contexts?"'
                      : '"¿De qué modo los entornos educativos basados en IA Generativa, simuladores interactivos y arquitecturas multiagente pueden apoyar el aprendizaje de Ciencias y Matemáticas en contextos reales de aula?"'}
                  </p>
                </div>
                <P>{lang==='pt'
                  ? 'A SCAFFL nasceu como instrumento de uma Iniciação Científica financiada pela FAPERGS/PROBIC no âmbito do Programa de Pós-Graduação em Ensino de Ciências e Matemática (PPGECiMa) da UCS, vinculada ao projeto guarda-chuva IAGENEduc, coordenado pelo Prof. Dr. Agostinho Serrano de Andrade Neto. O campo de aplicação é o ensino médio de Química no CETEC/UCS.'
                  : lang==='en'
                  ? 'SCAFFL was born as an instrument for an undergraduate research project funded by FAPERGS/PROBIC within the Graduate Program in Science and Mathematics Education (PPGECiMa) at UCS, linked to the IAGENEduc umbrella project coordinated by Prof. Dr. Agostinho Serrano de Andrade Neto. The application field is secondary Chemistry education at CETEC/UCS.'
                  : 'SCAFFL nació como instrumento de una investigación financiada por FAPERGS/PROBIC en el marco del Programa de Posgrado en Enseñanza de Ciencias y Matemáticas (PPGECiMa) de la UCS, vinculada al proyecto IAGENEduc coordinado por el Prof. Dr. Agostinho Serrano de Andrade Neto.'}
                </P>
                <P>{lang==='pt'
                  ? 'O delineamento é de Design-Based Research (DBR): a intervenção e a investigação são co-desenvolvidas, iterando entre o design da plataforma e a coleta/análise de dados em sala de aula real. O corpus piloto — 164 interações com 19 estudantes do CETEC (Sala Delta 2, 27 mai–06 jun 2026) — inaugura a fase empírica do projeto.'
                  : lang==='en'
                  ? 'The design is Design-Based Research (DBR): the intervention and research are co-developed, iterating between platform design and data collection/analysis in a real classroom. The pilot corpus — 164 interactions with 19 CETEC students (Delta 2, May 27–Jun 6, 2026) — inaugurates the empirical phase of the project.'
                  : 'El diseño es Investigación Basada en el Diseño (DBR): la intervención y la investigación se co-desarrollan, iterando entre el diseño de la plataforma y la recopilación/análisis de datos en un aula real.'}
                </P>
                <h3 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color:TX, marginBottom:14, marginTop:28 }}>
                  {lang==='pt' ? 'Contribuições esperadas' : lang==='en' ? 'Expected contributions' : 'Contribuciones esperadas'}
                </h3>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {(lang==='pt' ? [
                    'Plataforma open-source de tutoria dupla (socrática + executora) para o ensino de Ciências',
                    'Método de captura total da mediação IA–estudante como corpus discursivo analisável',
                    'Evidências empíricas do prompt como externalização do perfil conceitual (Mortimer)',
                    'Protocolo replicável para pesquisa de campo com IA generativa no ensino médio',
                    'Série de manuscritos em 4 frentes: aplicada, discursiva, teórica e de revisão'
                  ] : lang==='en' ? [
                    'Open-source dual-tutor platform (Socratic + executor) for Science education',
                    'Method for total capture of AI–student mediation as an analyzable discursive corpus',
                    'Empirical evidence of the prompt as externalization of the conceptual profile (Mortimer)',
                    'Replicable protocol for field research with generative AI in secondary education',
                    'Series of manuscripts across 4 fronts: applied, discursive, theoretical and review'
                  ] : [
                    'Plataforma open-source de tutoría dual (socrática + ejecutora) para la enseñanza de Ciencias',
                    'Método de captura total de la mediación IA–estudiante como corpus discursivo analizable',
                    'Evidencias empíricas del prompt como externalización del perfil conceptual (Mortimer)',
                    'Protocolo replicable para investigación de campo con IA generativa en enseñanza media',
                    'Serie de manuscritos en 4 frentes: aplicado, discursivo, teórico y de revisión'
                  ]).map((item, i) => (
                    <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'12px 16px', background:PANEL, borderRadius:10, border:`1px solid ${LINE}` }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background:`${a2}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        <Check size={11} color={a2} />
                      </span>
                      <span style={{ fontSize:'0.9rem', color:TX2, lineHeight:1.6 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 1. MOTIVATION ── */}
            {rTab==='motivation' && (
              <div>
                <ArticleH2 n="1">{lang==='pt' ? 'Por que simuladores? Por que IA mediadora?' : lang==='en' ? 'Why simulations? Why AI as mediator?' : '¿Por qué simuladores? ¿Por qué IA mediadora?'}</ArticleH2>
                <P>{lang==='pt'
                  ? 'A Química é uma ciência das três camadas. Alex Johnstone identificou que o pensamento químico transita entre o macroscópico (o que se vê e mede), o submicroscópico (o que acontece entre átomos e moléculas, invisível a olho nu) e o simbólico (equações, fórmulas, modelos). O ensino tradicional habita quase exclusivamente o nível simbólico — os estudantes memorizam equações sem construir uma imagem mental do fenômeno.'
                  : lang==='en'
                  ? 'Chemistry is a three-layer science. Alex Johnstone identified that chemical thinking moves between the macroscopic (what is seen and measured), the submicroscopic (what happens between atoms and molecules, invisible to the naked eye) and the symbolic (equations, formulas, models). Traditional teaching inhabits almost exclusively the symbolic level — students memorize equations without building a mental image of the phenomenon.'
                  : 'La Química es una ciencia de tres capas. Alex Johnstone identificó que el pensamiento químico transita entre el macroscópico (lo que se ve y mide), el submicroscópico (lo que ocurre entre átomos y moléculas, invisible a simple vista) y el simbólico (ecuaciones, fórmulas, modelos). La enseñanza tradicional habita casi exclusivamente el nivel simbólico.'}
                </P>
                <Pull>{lang==='pt'
                  ? 'Simuladores interativos são a ponte natural entre o símbolo e o fenômeno. Quando um estudante move um controle deslizante de temperatura e vê as moléculas acelerarem na tela, a equação de Arrhenius deixa de ser uma fórmula e passa a ser a descrição de algo real.'
                  : lang==='en'
                  ? 'Interactive simulations are the natural bridge between the symbol and the phenomenon. When a student moves a temperature slider and sees molecules accelerating on screen, the Arrhenius equation stops being a formula and becomes the description of something real.'
                  : 'Los simuladores interactivos son el puente natural entre el símbolo y el fenómeno. Cuando un estudiante mueve un control de temperatura y ve las moléculas acelerar en pantalla, la ecuación de Arrhenius deja de ser una fórmula.'}
                </Pull>
                <P>{lang==='pt'
                  ? 'Mas o que acontece quando o próprio estudante constrói o simulador? Quando ele precisa descrever em linguagem natural — para uma IA — exatamente o que quer ver acontecer? Essa exigência de descrição é o ponto central da pesquisa. Ela força o estudante a nomear o mecanismo: não é suficiente "fazer uma simulação de ácido-base". É preciso dizer o que muda, o que permanece, quais variáveis estão acopladas e como.'
                  : lang==='en'
                  ? 'But what happens when the student themselves builds the simulation? When they need to describe in natural language — to an AI — exactly what they want to see happen? This requirement for description is the central point of the research. It forces the student to name the mechanism: it is not enough to "make an acid-base simulation". They must say what changes, what stays constant, which variables are coupled and how.'
                  : 'Pero ¿qué ocurre cuando el propio estudiante construye el simulador? Cuando necesita describir en lenguaje natural —a una IA— exactamente lo que quiere ver que ocurra. Esta exigencia de descripción es el punto central de la investigación.'}
                </P>
                <div style={{ background:PANEL, border:`1px solid ${a2}28`, borderRadius:14, padding:'22px 26px', marginBottom:24, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:GRAD }} />
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                    {lang==='pt' ? 'O prompt como instrumento de pesquisa' : lang==='en' ? 'The prompt as a research instrument' : 'El prompt como instrumento de investigación'}
                  </div>
                  <P>{lang==='pt'
                    ? 'O prompt que o estudante envia ao Lab Agent é um registro direto da zona conceitual mobilizada naquele instante. Diferente de um teste ou de uma redação, ele não foi produzido para ser avaliado — foi produzido para funcionar. Isso elimina o viés de desejabilidade social e revela o modelo mental genuíno do estudante, incluindo suas lacunas, seus obstáculos epistemológicos (Bachelard) e seus perfis conceituais em ação (Mortimer).'
                    : lang==='en'
                    ? 'The prompt the student sends to Lab Agent is a direct record of the conceptual zone mobilized at that moment. Unlike a test or an essay, it was not produced to be evaluated — it was produced to work. This eliminates social desirability bias and reveals the student\'s genuine mental model, including their gaps, their epistemological obstacles (Bachelard) and their conceptual profiles in action (Mortimer).'
                    : 'El prompt que el estudiante envía al Lab Agent es un registro directo de la zona conceptual movilizada en ese momento. A diferencia de un test o una redacción, no fue producido para ser evaluado — fue producido para funcionar.'}
                  </P>
                </div>
                <P>{lang==='pt'
                  ? 'O segundo problema que motivou a SCAFFL é a invisibilidade do pensamento do estudante para o professor. Em uma sala de aula tradicional, o professor vê o resultado (a nota, o exercício resolvido) mas não o processo. Com a SCAFFL, o professor acompanha em tempo real cada conversa com o Petrus, cada prompt enviado ao Lab Agent, cada iteração do simulador. A mediação inteira fica registrada e acessível.'
                  : lang==='en'
                  ? 'The second problem that motivated SCAFFL is the invisibility of student thinking to the teacher. In a traditional classroom, the teacher sees the result (the grade, the solved exercise) but not the process. With SCAFFL, the teacher monitors in real time each conversation with Petrus, each prompt sent to Lab Agent, each iteration of the simulator. The entire mediation is recorded and accessible.'
                  : 'El segundo problema que motivó SCAFFL es la invisibilidad del pensamiento del estudiante para el docente. En un aula tradicional, el docente ve el resultado pero no el proceso. Con SCAFFL, el docente monitorea en tiempo real cada conversación con Petrus, cada prompt enviado al Lab Agent, cada iteración del simulador.'}
                </P>
                <P>{lang==='pt'
                  ? 'Por fim, por que uma IA que medeia em vez de uma IA que responde? A diferença é fundamental. Uma IA que entrega respostas prontas elimina o trabalho cognitivo — a zona de desenvolvimento proximal (Vygotsky) é cortocircuitada. O estudante obtém o artefato sem ter construído o entendimento que deveria precedê-lo. O Petrus existe exatamente para impedir isso: ele opera na ZDP, induz o estudante a avançar além do que conseguiria sozinho, mas nunca entrega o destino — só o andaime.'
                  : lang==='en'
                  ? 'Finally, why an AI that mediates instead of an AI that answers? The difference is fundamental. An AI that delivers ready-made answers eliminates cognitive work — the zone of proximal development (Vygotsky) is short-circuited. The student obtains the artifact without having built the understanding that should precede it. Petrus exists precisely to prevent this: it operates in the ZPD, pushes the student one step beyond what they could achieve alone, but never delivers the destination — only the scaffolding.'
                  : 'Finalmente, ¿por qué una IA que media en lugar de una IA que responde? La diferencia es fundamental. Una IA que entrega respuestas listas elimina el trabajo cognitivo. Petrus existe precisamente para evitar esto: opera en la ZDP, induce al estudiante a avanzar más allá de lo que podría lograr solo, pero nunca entrega el destino — solo el andamio.'}
                </P>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginTop:28 }}>
                  {(lang==='pt' ? [
                    { n:'Problema 1', t:'O invisível do currículo', d:'Estudantes memorizam equações sem construir imagem mental do fenômeno submicroscópico.' },
                    { n:'Problema 2', t:'A opacidade do processo', d:'Professores veem resultados mas não o processo cognitivo que os gerou.' },
                    { n:'Problema 3', t:'A IA que substitui em vez de mediar', d:'Ferramentas de IA entregam a resposta sem exigir que o estudante a construa.' },
                  ] : lang==='en' ? [
                    { n:'Problem 1', t:'The invisible in the curriculum', d:'Students memorize equations without building a mental image of the submicroscopic phenomenon.' },
                    { n:'Problem 2', t:'The opacity of the process', d:'Teachers see results but not the cognitive process that generated them.' },
                    { n:'Problem 3', t:'The AI that replaces instead of mediates', d:'AI tools deliver the answer without requiring the student to construct it.' },
                  ] : [
                    { n:'Problema 1', t:'Lo invisible del currículo', d:'Los estudiantes memorizan ecuaciones sin construir imagen mental del fenómeno submicroscópico.' },
                    { n:'Problema 2', t:'La opacidad del proceso', d:'Los docentes ven resultados pero no el proceso cognitivo que los generó.' },
                    { n:'Problema 3', t:'La IA que reemplaza en vez de mediar', d:'Las herramientas de IA entregan la respuesta sin exigir que el estudiante la construya.' },
                  ]).map(({ n, t: title, d }) => (
                    <div key={n} style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:12, padding:'18px 16px' }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.65rem', color:a2, marginBottom:8 }}>{n}</div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.9rem', color:TX, marginBottom:8 }}>{title}</div>
                      <div style={{ fontSize:'0.83rem', color:TX2, lineHeight:1.65 }}>{d}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 2. AGENTS ── */}
            {rTab==='agents' && (
              <div>
                <ArticleH2 n="2">{lang==='pt' ? 'Os Agentes da Plataforma' : lang==='en' ? 'The Platform Agents' : 'Los Agentes de la Plataforma'}</ArticleH2>
                <P>{lang==='pt'
                  ? 'A SCAFFL opera com dois agentes de naturezas comunicativas radicalmente distintas. Essa separação não é acidental — é a tese central do design. Um agente medeia; o outro executa. A tensão entre os dois é onde a aprendizagem acontece.'
                  : lang==='en'
                  ? 'SCAFFL operates with two agents of radically distinct communicative natures. This separation is not accidental — it is the central thesis of the design. One agent mediates; the other executes. The tension between them is where learning happens.'
                  : 'SCAFFL opera con dos agentes de naturalezas comunicativas radicalmente distintas. Esta separación no es accidental — es la tesis central del diseño. Un agente media; el otro ejecuta.'}
                </P>

                {/* Petrus */}
                <div style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:28, marginBottom:22, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:GRAD }} />
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:`${a2}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <MessageSquare size={20} color={a2} />
                    </div>
                    <div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                        {lang==='pt' ? 'Tutor socrático' : lang==='en' ? 'Socratic tutor' : 'Tutor socrático'}
                      </div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'1.4rem', color:TX }}>Petrus</div>
                    </div>
                  </div>
                  <h4 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1rem', color:TX, marginBottom:10 }}>
                    {lang==='pt' ? 'O que é ser um tutor socrático?' : lang==='en' ? 'What does it mean to be a Socratic tutor?' : '¿Qué significa ser un tutor socrático?'}
                  </h4>
                  <P>{lang==='pt'
                    ? 'O método socrático não é um estilo de conversa — é uma epistemologia. Sócrates não transmitia conhecimento; ele operava como parteira do conhecimento alheio. A premissa é que o aprendiz já carrega, em estado latente, os elementos necessários para construir o entendimento — cabe ao interlocutor criar as condições para que esse entendimento emerja.'
                    : lang==='en'
                    ? 'The Socratic method is not a conversational style — it is an epistemology. Socrates did not transmit knowledge; he acted as a midwife for others\' knowledge. The premise is that the learner already carries, in latent form, the elements necessary to construct understanding — the interlocutor\'s role is to create the conditions for that understanding to emerge.'
                    : 'El método socrático no es un estilo de conversación — es una epistemología. Sócrates no transmitía conocimiento; actuaba como partera del conocimiento ajeno. La premisa es que el aprendiz ya porta, en estado latente, los elementos necesarios para construir el entendimiento.'}
                  </P>
                  <P>{lang==='pt'
                    ? 'Petrus opera sobre esse princípio: cada turno de conversa é uma oportunidade de induzir o estudante a avançar além do que conseguiria sozinho — operar na Zona de Desenvolvimento Proximal de Vygotsky. Petrus nunca entrega a resposta, mesmo quando poderia. Ele devolve a pergunta ao estudante, sob um ângulo diferente, com mais precisão conceitual, até que o estudante nomeie o mecanismo por conta própria.'
                    : lang==='en'
                    ? 'Petrus operates on this principle: each conversational turn is an opportunity to push the student one step beyond what they could achieve alone — to operate in Vygotsky\'s Zone of Proximal Development. Petrus never delivers the answer, even when it could. It returns the question to the student, from a different angle, with greater conceptual precision, until the student names the mechanism on their own.'
                    : 'Petrus opera sobre este principio: cada turno de conversación es una oportunidad de inducir al estudiante a avanzar más allá de lo que podría lograr solo — operar en la Zona de Desarrollo Próximo de Vygotsky. Petrus nunca entrega la respuesta, incluso cuando podría.'}
                  </P>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:18 }}>
                    <div style={{ background: dark ? '#080C18' : '#F1F5F9', borderRadius:10, padding:'14px 16px' }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.65rem', color:'#EF4444', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        {lang==='pt' ? 'O que Petrus NÃO faz' : lang==='en' ? 'What Petrus does NOT do' : 'Lo que Petrus NO hace'}
                      </div>
                      {(lang==='pt' ? ['Escrever código', 'Dar a resposta diretamente', 'Confirmar se o estudante está "certo"', 'Substituir o raciocínio do estudante'] : lang==='en' ? ['Write code', 'Give the answer directly', 'Confirm if the student is "right"', 'Replace student reasoning'] : ['Escribir código', 'Dar la respuesta directamente', 'Confirmar si el estudiante tiene "razón"', 'Reemplazar el razonamiento del estudiante']).map(item => (
                        <div key={item} style={{ fontSize:'0.83rem', color:TX2, padding:'5px 0', borderBottom:`1px solid ${LINE}`, display:'flex', alignItems:'center', gap:8 }}>
                          <X size={11} color="#EF4444" style={{ flexShrink:0 }} /> {item}
                        </div>
                      ))}
                    </div>
                    <div style={{ background: dark ? '#080C18' : '#F1F5F9', borderRadius:10, padding:'14px 16px' }}>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.65rem', color:a2, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        {lang==='pt' ? 'O que Petrus FAZ' : lang==='en' ? 'What Petrus DOES' : 'Lo que Petrus SÍ hace'}
                      </div>
                      {(lang==='pt' ? ['Devolver a pergunta sob novo ângulo', 'Propor decomposições do problema', 'Nomear o obstáculo epistemológico', 'Induzir o estudante a externalizar o modelo mental', 'Registrar tudo para análise'] : lang==='en' ? ['Return the question from a new angle', 'Propose decompositions of the problem', 'Name the epistemological obstacle', 'Push the student to externalize their mental model', 'Record everything for analysis'] : ['Devolver la pregunta desde un nuevo ángulo', 'Proponer descomposiciones del problema', 'Nombrar el obstáculo epistemológico', 'Inducir al estudiante a externalizar el modelo mental', 'Registrar todo para análisis']).map(item => (
                        <div key={item} style={{ fontSize:'0.83rem', color:TX2, padding:'5px 0', borderBottom:`1px solid ${LINE}`, display:'flex', alignItems:'center', gap:8 }}>
                          <Check size={11} color={a2} style={{ flexShrink:0 }} /> {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Pull>{lang==='pt'
                    ? 'Petrus é implementado via chamada streaming a um LLM configurável — por padrão, Gemini 2.5 Flash (Google). O system prompt define o contrato socrático: ele opera como mediador, nunca como oráculo. A instrução central é recusar a entrega direta de código ou soluções e substituí-las sempre por perguntas que expandem o perfil conceitual ativo.'
                    : lang==='en'
                    ? 'Petrus is implemented via streaming calls to a configurable LLM — by default, Gemini 2.5 Flash (Google). The system prompt defines the Socratic contract: it operates as a mediator, never as an oracle. The central instruction is to refuse the direct delivery of code or solutions and always replace them with questions that expand the active conceptual profile.'
                    : 'Petrus está implementado mediante llamadas en streaming a un LLM configurable — por defecto, Gemini 2.5 Flash (Google). El system prompt define el contrato socrático: opera como mediador, nunca como oráculo.'}
                  </Pull>
                </div>

                {/* Lab Agent */}
                <div style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:16, padding:28, marginBottom:28, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:GRAD }} />
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:`${a2}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Code2 size={20} color={a2} />
                    </div>
                    <div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em' }}>
                        {lang==='pt' ? 'Agente executor' : lang==='en' ? 'Executor agent' : 'Agente ejecutor'}
                      </div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'1.4rem', color:TX }}>Lab Agent</div>
                    </div>
                  </div>
                  <h4 style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1rem', color:TX, marginBottom:10 }}>
                    {lang==='pt' ? 'O que é ser um executor?' : lang==='en' ? 'What does it mean to be an executor?' : '¿Qué significa ser un ejecutor?'}
                  </h4>
                  <P>{lang==='pt'
                    ? 'O Lab Agent é o oposto deliberado do Petrus. Onde Petrus recusa e devolve, o Lab Agent aceita e entrega. Sua natureza comunicativa é executiva: recebe uma descrição em linguagem natural e a traduz para um artefato funcional em HTML/JS, renderizável imediatamente no navegador. Não há mediação, não há andaimamento — há execução direta.'
                    : lang==='en'
                    ? 'Lab Agent is the deliberate opposite of Petrus. Where Petrus refuses and returns, Lab Agent accepts and delivers. Its communicative nature is executive: it receives a description in natural language and translates it into a functional HTML/JS artifact, immediately renderable in the browser. There is no mediation, no scaffolding — there is direct execution.'
                    : 'El Lab Agent es el opuesto deliberado de Petrus. Donde Petrus rechaza y devuelve, el Lab Agent acepta y entrega. Su naturaleza comunicativa es ejecutiva: recibe una descripción en lenguaje natural y la traduce en un artefacto funcional en HTML/JS, renderizable inmediatamente en el navegador.'}
                  </P>
                  <P>{lang==='pt'
                    ? 'Mas o Lab Agent não é apenas uma ferramenta de código — ele é também um instrumento de pesquisa. O prompt que o estudante envia a ele é o ponto de maior valor analítico de todo o sistema: é o momento em que o estudante traduz seu entendimento em linguagem natural sem filtros avaliativos. Esse prompt bruto é tratado como dado primário da investigação discursiva.'
                    : lang==='en'
                    ? 'But Lab Agent is not just a coding tool — it is also a research instrument. The prompt the student sends to it is the point of greatest analytical value in the entire system: it is the moment when the student translates their understanding into natural language without evaluative filters. This raw prompt is treated as primary data for the discursive investigation.'
                    : 'Pero el Lab Agent no es solo una herramienta de código — es también un instrumento de investigación. El prompt que el estudiante le envía es el punto de mayor valor analítico de todo el sistema: es el momento en que el estudiante traduce su entendimiento en lenguaje natural sin filtros evaluativos.'}
                  </P>
                  <div style={{ background: dark ? '#080C18' : '#F1F5F9', borderRadius:10, padding:'16px 18px' }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.65rem', color:a2, marginBottom:12, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                      {lang==='pt' ? 'Ciclo de trabalho do Lab Agent' : lang==='en' ? 'Lab Agent work cycle' : 'Ciclo de trabajo del Lab Agent'}
                    </div>
                    <div style={{ display:'flex', gap:0, alignItems:'center', flexWrap:'wrap' }}>
                      {(lang==='pt' ? ['Descrever em português', 'Lab Agent gera HTML/JS', 'Executar no navegador', 'Refinar o prompt', 'Iterar'] : lang==='en' ? ['Describe in plain language', 'Lab Agent generates HTML/JS', 'Run in browser', 'Refine the prompt', 'Iterate'] : ['Describir en lenguaje natural', 'Lab Agent genera HTML/JS', 'Ejecutar en navegador', 'Refinar el prompt', 'Iterar']).map((step, i, arr) => (
                        <React.Fragment key={step}>
                          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.75rem', color:TX2, padding:'6px 12px', background:`${a2}10`, borderRadius:8, border:`1px solid ${a2}25` }}>{step}</span>
                          {i < arr.length - 1 && <ArrowRight size={13} color={TX3} style={{ margin:'0 6px', flexShrink:0 }} />}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* The design tension */}
                <div style={{ background:`${a2}09`, border:`1px solid ${a2}28`, borderRadius:14, padding:'22px 26px' }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
                    {lang==='pt' ? 'Por que dois agentes separados?' : lang==='en' ? 'Why two separate agents?' : '¿Por qué dos agentes separados?'}
                  </div>
                  <P>{lang==='pt'
                    ? 'A separação é intencional e é a decisão de design mais importante da plataforma. Se um único agente fosse responsável por mediar E executar, o estudante usaria o caminho de menor resistência: "faça o simulador para mim". A barreira entre o Petrus e o Lab Agent é a que força o estudante a primeiro construir o entendimento (com o Petrus) e depois traduzi-lo em linguagem natural para o Lab Agent. A qualidade do prompt ao Lab Agent é o indicador direto da qualidade da mediação anterior com o Petrus.'
                    : lang==='en'
                    ? 'The separation is intentional and is the most important design decision in the platform. If a single agent were responsible for mediating AND executing, the student would use the path of least resistance: "make the simulator for me." The barrier between Petrus and Lab Agent is what forces the student to first build understanding (with Petrus) and then translate it into natural language for Lab Agent. The quality of the Lab Agent prompt is the direct indicator of the quality of the prior Petrus mediation.'
                    : 'La separación es intencional y es la decisión de diseño más importante de la plataforma. Si un único agente fuera responsable de mediar Y ejecutar, el estudiante usaría el camino de menor resistencia. La calidad del prompt al Lab Agent es el indicador directo de la calidad de la mediación previa con Petrus.'}
                  </P>
                </div>
              </div>
            )}

            {/* ── 3. AXES ── */}
            {rTab==='axes' && (
              <div>
                <ArticleH2 n="3">{lang==='pt' ? 'Eixos de Pesquisa' : lang==='en' ? 'Research Axes' : 'Ejes de Investigación'}</ArticleH2>
                <P>{lang==='pt' ? 'O programa de pesquisa está organizado em quatro frentes investigativas semi-independentes, conectadas pela plataforma SCAFFL como artefato comum.' : lang==='en' ? 'The research program is organized into four semi-independent investigative fronts, connected by the SCAFFL platform as a common artifact.' : 'El programa de investigación está organizado en cuatro frentes investigativos semi-independientes, conectados por la plataforma SCAFFL como artefacto común.'}</P>
                {[
                  { n:'4.1', Icon:GraduationCap,
                    title: lang==='pt' ? 'Perfis didático-pedagógicos e clones de professores' : lang==='en' ? 'Didactic-pedagogical profiles and teacher clones' : 'Perfiles didáctico-pedagógicos y clones de docentes',
                    desc: lang==='pt' ? 'Investiga se o método de ensino pode ser desacoplado do conteúdo disciplinar e transferido para domínios inéditos via meta-prompts e RAG. A hipótese central é que o estilo didático de um professor — sua forma de questionar, de encadear explicações, de eleger exemplos — é uma estrutura transferível independentemente do conteúdo que ele ensina. Resultado preliminar: uma persona de professor de Física preservou traços do estilo didático ao explicar Química — evidência inicial do desacoplamento forma–conteúdo.' : lang==='en' ? 'Investigates whether teaching method can be decoupled from disciplinary content and transferred to novel domains via meta-prompts and RAG. The central hypothesis is that a teacher\'s didactic style — their way of questioning, chaining explanations, and choosing examples — is a transferable structure independent of the content they teach. Preliminary result: a Physics teacher persona preserved stylistic traits when explaining Chemistry — initial evidence of form–content decoupling.' : 'Investiga si el método de enseñanza puede desacoplarse del contenido disciplinar y transferirse a nuevos dominios mediante meta-prompts y RAG. Resultado preliminar: una persona de docente de Física preservó rasgos de estilo al explicar Química.' },
                  { n:'4.2', Icon:Network,
                    title: lang==='pt' ? 'Atomicidade cognitiva em grafos para SLMs' : lang==='en' ? 'Cognitive atomicity in graphs for SLMs' : 'Atomicidad cognitiva en grafos para SLMs',
                    desc: lang==='pt' ? 'Frente teórica que busca formalizar o conceito de atomicidade cognitiva como critério de granularidade ótima dos nós em grafos de conhecimento manipuláveis por modelos de linguagem de pequeno porte (SLMs, < 7B parâmetros). A questão central é: qual é o tamanho ideal de um chunk de conhecimento para que um SLM possa raciocinar sobre ele sem perder coerência semântica? Resultado preliminar: um modelo de 7B com banco vetorial apresentou desempenho qualitativamente comparável a um de 32B em tarefas selecionadas.' : lang==='en' ? 'Theoretical strand formalizing "cognitive atomicity" as an optimal granularity criterion for knowledge graph nodes manipulable by small language models (SLMs, < 7B parameters). The central question is: what is the ideal size of a knowledge chunk for an SLM to reason about without losing semantic coherence? Preliminary result: a 7B model with vector retrieval showed qualitatively comparable performance to a 32B model on selected tasks.' : 'Frente teórica que busca formalizar la "atomicidad cognitiva" como criterio de granularidad óptima de nodos en grafos manipulables por modelos de lenguaje pequeños (SLMs < 7B parámetros).' },
                  { n:'4.3', Icon:Atom,
                    title: lang==='pt' ? 'Simuladores de Química mediados por IA — plataforma SCAFFL' : lang==='en' ? 'AI-mediated Chemistry simulations — SCAFFL platform' : 'Simuladores de Química mediados por IA — plataforma SCAFFL',
                    desc: lang==='pt' ? 'Frente aplicada central. Estudantes constroem simuladores que articulam os três níveis de Johnstone (macroscópico, submicroscópico, simbólico) em sequência didática que parte da experimentação prática como organizador prévio ausubeliano. O processo é mediado pelo Petrus (fase conceitual) e executado pelo Lab Agent (fase de construção). Toda a cadeia é registrada para análise discursiva.' : lang==='en' ? 'Central applied strand. Students build simulations articulating Johnstone\'s three levels (macroscopic, submicroscopic, symbolic) in a didactic sequence starting from hands-on experimentation as an Ausbelian advance organizer. The process is mediated by Petrus (conceptual phase) and executed by Lab Agent (construction phase). The entire chain is recorded for discursive analysis.' : 'Frente aplicada central. Los estudiantes construyen simuladores que articulan los tres niveles de Johnstone en una secuencia didáctica que parte de la experimentación práctica. El proceso es mediado por Petrus y ejecutado por el Lab Agent.' },
                  { n:'4.4', Icon:Layers,
                    title: lang==='pt' ? 'Projeto Petrus — orquestração multiagente e modelos compactos' : lang==='en' ? 'Project Petrus — multi-agent orchestration and compact models' : 'Proyecto Petrus — orquestación multiagente y modelos compactos',
                    desc: lang==='pt' ? 'Sistema de orquestração multiagente de inspiração biológica onde agentes especializados de pequeno porte colaboram para realizar tarefas que normalmente exigiriam modelos de grande escala. A arquitetura segue o princípio da "prova com consulta": assim como um estudante com notas de aula tem desempenho comparável a um sem notas em uma prova de alto nível, um SLM com banco vetorial estruturado supera modelos maiores em domínios bem definidos.' : lang==='en' ? 'Biologically inspired multi-agent orchestration system where specialized small agents collaborate to perform tasks that would normally require large-scale models. The architecture follows the "open-book exam" principle: just as a student with notes performs comparably to one without notes on a higher-level exam, an SLM with a structured vector bank outperforms larger models in well-defined domains.' : 'Sistema de orquestación multiagente de inspiración biológica donde agentes especializados pequeños colaboran para realizar tareas que normalmente requerirían modelos de gran escala.' },
                ].map(({ n, Icon, title, desc }) => (
                  <div key={n} style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:26, marginBottom:16, position:'relative' }}>
                    <div style={{ position:'absolute', top:18, right:20, fontFamily:"'JetBrains Mono',monospace", fontSize:'0.85rem', color:TX3, opacity:0.3 }}>{n}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`${a2}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon size={16} color={a2} />
                      </div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1rem', color:TX }}>{title}</div>
                    </div>
                    <p style={{ fontSize:'0.88rem', color:TX2, lineHeight:1.75, margin:0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── 4. THEORY ── */}
            {rTab==='theory' && (
              <div>
                <ArticleH2 n="4">{lang==='pt' ? 'Fundamentação Teórica' : lang==='en' ? 'Theoretical Framework' : 'Fundamentación Teórica'}</ArticleH2>
                <P>{lang==='pt' ? 'A SCAFFL é sustentada por um conjunto de teorias da educação em ciências, da psicologia do desenvolvimento e da didática. Cada autor listado abaixo não é apenas uma referência bibliográfica — é um critério de design.' : lang==='en' ? 'SCAFFL is sustained by a set of theories from science education, developmental psychology and didactics. Each author listed below is not merely a bibliographic reference — they are a design criterion.' : 'SCAFFL se sustenta en un conjunto de teorías de la educación en ciencias, la psicología del desarrollo y la didáctica. Cada autor no es solo una referencia bibliográfica — es un criterio de diseño.'}</P>
                {[
                  { Icon:GraduationCap, author:'Eduardo Mortimer', ref:'Perfis Conceituais, 2000', color:'#10B981',
                    desc: lang==='pt' ? 'O perfil conceitual de um indivíduo é o conjunto de formas de pensar sobre um conceito que coexistem — não em conflito, mas em zonas de aplicabilidade diferentes. Um estudante pode operar simultaneamente com uma concepção cotidiana (a temperatura "queima") e uma científica (energia cinética média). O Petrus é projetado para identificar qual zona conceitual está ativa em cada turno e expandi-la.' : lang==='en' ? 'The conceptual profile of an individual is the set of ways of thinking about a concept that coexist — not in conflict, but in different zones of applicability. A student can simultaneously operate with an everyday conception (temperature "burns") and a scientific one (average kinetic energy). Petrus is designed to identify which conceptual zone is active in each turn and expand it.' : 'El perfil conceptual de un individuo es el conjunto de formas de pensar sobre un concepto que coexisten — no en conflicto, sino en zonas de aplicabilidad diferentes.' },
                  { Icon:Atom, author:'Gaston Bachelard', ref:'La Formation de l\'Esprit Scientifique, 1938', color:'#8B5CF6',
                    desc: lang==='pt' ? 'O obstáculo epistemológico não está no objeto a conhecer, mas no ato de conhecer. O pensamento cotidiano não é simplesmente incompleto — ele ativamente resiste ao conhecimento científico porque oferece explicações que "funcionam" no cotidiano. A animismo ("o calor quer escapar"), o substancialismo ("o frio entra pelo buraco"), o verbalismo — são formas de pensamento que o ensino precisa diagnosticar antes de tratar. O Petrus é instruído a identificar e nomear esses obstáculos.' : lang==='en' ? 'The epistemological obstacle does not lie in the object to be known, but in the act of knowing. Everyday thought is not simply incomplete — it actively resists scientific knowledge because it offers explanations that "work" in daily life. Animism ("heat wants to escape"), substantialism ("cold enters through the gap"), verbalism — these are forms of thought that teaching needs to diagnose before treating. Petrus is instructed to identify and name these obstacles.' : 'El obstáculo epistemológico no está en el objeto a conocer, sino en el acto de conocer. El pensamiento cotidiano no es simplemente incompleto — resiste activamente el conocimiento científico.' },
                  { Icon:Layers, author:'L. S. Vygotsky', ref:'Mind in Society, 1978', color:'#60A5FA',
                    desc: lang==='pt' ? 'A Zona de Desenvolvimento Proximal é a distância entre o que o aprendiz consegue fazer sozinho e o que consegue fazer com auxílio de um interlocutor mais capaz. O scaffolding — o andaimamento — é o processo de oferecer suporte temporário e decrescente exatamente nessa zona. O Petrus não resolve o problema do estudante: ele provê andaime. A SCAFFL (e seu nome) é uma homenagem direta a esse conceito.' : lang==='en' ? 'The Zone of Proximal Development is the distance between what the learner can do alone and what they can do with the help of a more capable interlocutor. Scaffolding is the process of providing temporary and decreasing support precisely in that zone. Petrus does not solve the student\'s problem: it provides scaffolding. SCAFFL (and its name) is a direct tribute to this concept.' : 'La Zona de Desarrollo Próximo es la distancia entre lo que el aprendiz puede hacer solo y lo que puede hacer con ayuda de un interlocutor más capaz. Petrus no resuelve el problema del estudiante: provee andamiaje. SCAFFL (y su nombre) es un homenaje directo a este concepto.' },
                  { Icon:Network, author:'TMCR · Sophotechnia', ref:'Teoria da Mediação Cognitiva em Redes', color:'#F59E0B',
                    desc: lang==='pt' ? 'Instrumental teórico desenvolvido por Agostinho Serrano de Andrade Neto para análise das redes de mediação que emergem quando humanos, tecnologias e instituições interagem em processos de construção de conhecimento. Na SCAFFL, permite mapear como a mediação do Petrus, a execução do Lab Agent e a supervisão do professor formam uma rede de agentes cognitivos com funções distintas e complementares.' : lang==='en' ? 'Theoretical framework developed by Agostinho Serrano de Andrade Neto for analyzing the mediation networks that emerge when humans, technologies and institutions interact in knowledge construction processes. In SCAFFL, it allows mapping how Petrus\' mediation, Lab Agent\'s execution and the teacher\'s supervision form a network of cognitive agents with distinct and complementary functions.' : 'Marco teórico para analizar las redes de mediación que emergen cuando humanos, tecnologías e instituciones interactúan en procesos de construcción de conocimiento.' },
                  { Icon:Cpu, author:'Alex Johnstone', ref:'Why is science difficult to learn?, 1991', color:'#14B8A6',
                    desc: lang==='pt' ? 'Os três níveis de representação em Química — macroscópico (observável), submicroscópico (partículas) e simbólico (fórmulas e equações) — formam o "triângulo de Johnstone". A dificuldade do ensino de Química deriva em grande parte da exigência de transitar entre esses níveis simultaneamente. Os simuladores da SCAFFL são projetados explicitamente para articular os três níveis num único artefato interativo.' : lang==='en' ? 'The three levels of representation in Chemistry — macroscopic (observable), submicroscopic (particles) and symbolic (formulas and equations) — form the "Johnstone triangle". The difficulty of Chemistry teaching derives largely from the requirement to move between these levels simultaneously. SCAFFL simulations are explicitly designed to articulate all three levels in a single interactive artifact.' : 'Los tres niveles de representación en Química — macroscópico, submicroscópico y simbólico — forman el "triángulo de Johnstone". Los simuladores de SCAFFL están diseñados explícitamente para articular los tres niveles en un único artefacto interactivo.' },
                  { Icon:BookOpen, author:'David Ausubel', ref:'Educational Psychology, 1968', color:'#EC4899',
                    desc: lang==='pt' ? 'A aprendizagem significativa ocorre quando o novo conhecimento ancora em estruturas cognitivas preexistentes. O organizador prévio — uma experiência ou apresentação introdutória que cria pontos de ancoragem — é o mecanismo didático central. Na sequência da SCAFFL, a experimentação prática (o experimento físico de Química) precede sempre a construção do simulador, funcionando como organizador prévio ausubeliano.' : lang==='en' ? 'Meaningful learning occurs when new knowledge anchors in pre-existing cognitive structures. The advance organizer — an introductory experience or presentation that creates anchor points — is the central didactic mechanism. In the SCAFFL sequence, hands-on experimentation (the physical Chemistry experiment) always precedes simulator construction, functioning as an Ausbelian advance organizer.' : 'El aprendizaje significativo ocurre cuando el nuevo conocimiento ancla en estructuras cognitivas preexistentes. En la secuencia de SCAFFL, la experimentación práctica precede siempre a la construcción del simulador, funcionando como organizador previo ausubeliano.' },
                ].map(({ Icon, author, ref, color, desc }) => (
                  <div key={author} style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:24, marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Icon size={16} color={color} />
                      </div>
                      <div>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.97rem', color:TX }}>{author}</div>
                        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color, marginTop:2 }}>{ref}</div>
                      </div>
                    </div>
                    <p style={{ fontSize:'0.87rem', color:TX2, lineHeight:1.75, margin:0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── 5. CORPUS ── */}
            {rTab==='corpus' && (
              <div>
                <ArticleH2 n="5">{lang==='pt' ? 'Corpus & Dados' : lang==='en' ? 'Corpus & Data' : 'Corpus & Datos'}</ArticleH2>
                <P>{lang==='pt' ? 'O estudo piloto foi conduzido no CETEC/UCS (Sala Delta 2) entre 27 de maio e 06 de junho de 2026. Os sujeitos são pseudonimizados (E1–E19) e o protocolo de ética está em tramitação no CEP/UCS.' : lang==='en' ? 'The pilot study was conducted at CETEC/UCS (Delta 2 Class) between May 27 and June 6, 2026. Subjects are pseudonymized (E1–E19) and the ethics protocol is under review at CEP/UCS.' : 'El estudio piloto fue realizado en CETEC/UCS (Sala Delta 2) entre el 27 de mayo y el 6 de junio de 2026. Los sujetos están seudonimizados (E1–E19) y el protocolo ético está en trámite en el CEP/UCS.'}</P>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
                  {[
                    { n:'19', l: lang==='pt' ? 'estudantes · E1–E19' : lang==='en' ? 'students · E1–E19' : 'estudiantes · E1–E19' },
                    { n:'164', l: lang==='pt' ? 'turnos de interação' : lang==='en' ? 'interaction turns' : 'turnos de interacción' },
                    { n:'89', l: lang==='pt' ? 'turnos com Petrus' : lang==='en' ? 'turns with Petrus' : 'turnos con Petrus' },
                    { n:'75', l: lang==='pt' ? 'turnos com Lab Agent' : lang==='en' ? 'turns with Lab Agent' : 'turnos con Lab Agent' },
                    { n:'20', l: lang==='pt' ? 'simuladores produzidos' : lang==='en' ? 'simulations produced' : 'simuladores producidos' },
                    { n:'10', l: lang==='pt' ? 'dias de coleta' : lang==='en' ? 'collection days' : 'días de recolección' },
                  ].map(({ n, l }) => (
                    <div key={l} style={{ border:`1px solid ${LINE}`, borderRadius:12, padding:'18px 16px', background:PANEL }}>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'2rem', background:GRAD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{n}</div>
                      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color:TX3, marginTop:6 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <P>{lang==='pt' ? 'O corpus é composto por: (a) logs completos das interações Petrus–estudante (texto integral dos prompts e respostas); (b) logs completos das interações Lab Agent–estudante (prompt bruto + código gerado + versão do simulador); (c) registros de tela dos simuladores em cada iteração; (d) notas de campo do pesquisador; (e) entrevistas semiestruturadas pós-atividade com amostra de estudantes.' : lang==='en' ? 'The corpus consists of: (a) complete logs of Petrus–student interactions (full text of prompts and responses); (b) complete logs of Lab Agent–student interactions (raw prompt + generated code + simulator version); (c) screen recordings of simulators at each iteration; (d) researcher field notes; (e) semi-structured post-activity interviews with a sample of students.' : 'El corpus se compone de: (a) logs completos de interacciones Petrus–estudiante; (b) logs de Lab Agent–estudiante (prompt bruto + código generado + versión del simulador); (c) grabaciones de pantalla de los simuladores; (d) notas de campo; (e) entrevistas semiestructuradas.'}</P>
                <div style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:12, padding:'16px 20px' }}>
                  <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
                    {lang==='pt' ? 'Temas dos simuladores produzidos (amostra)' : lang==='en' ? 'Themes of produced simulations (sample)' : 'Temas de los simuladores producidos (muestra)'}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {['Equilíbrio Ácido-Base', 'Cinética Química · Arrhenius', 'Eletroquímica · Pilha de Daniell', 'Gases Ideais · PV=nRT', 'Soluções · Concentração Molar', 'Termoquímica · ΔH', 'Reações de Oxi-Redução'].map(t => (
                      <span key={t} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', border:`1px solid ${LINE}`, color:TX3, padding:'5px 11px', borderRadius:8 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── 6. OUTPUT ── */}
            {rTab==='output' && (
              <div>
                <ArticleH2 n="6">{lang==='pt' ? 'Produção Científica' : lang==='en' ? 'Scientific Output' : 'Producción Científica'}</ArticleH2>
                <P>{lang==='pt' ? 'Cinco manuscritos em diferentes estágios de desenvolvimento, cobrindo as quatro frentes do programa de pesquisa.' : lang==='en' ? 'Five manuscripts at different stages of development, covering the four fronts of the research program.' : 'Cinco manuscritos en diferentes etapas de desarrollo, cubriendo los cuatro frentes del programa de investigación.'}</P>
                {[
                  { n:'MS-1', tag: lang==='pt' ? 'Prática aplicada' : lang==='en' ? 'Applied practice' : 'Práctica aplicada', venue:'QNEsc · Quím. Nova Esc.',
                    title: lang==='pt' ? 'Sequência didática de construção de simuladores de química mediados por IA: da experimentação ao artefato' : lang==='en' ? 'Didactic sequence for AI-mediated chemistry simulator construction: from experimentation to artifact' : 'Secuencia didáctica para construcción de simuladores mediados por IA: de la experimentación al artefacto',
                    refs:'Ausubel · Papert · Johnstone', status: lang==='pt' ? 'Em escrita' : lang==='en' ? 'In writing' : 'En escritura' },
                  { n:'MS-2', tag: lang==='pt' ? 'Análise discursiva' : lang==='en' ? 'Discursive analysis' : 'Análisis discursivo', venue: lang==='pt' ? 'Revista teórica (a definir)' : lang==='en' ? 'Theory journal (TBD)' : 'Revista teórica (a definir)',
                    title: lang==='pt' ? 'A SCAFFL como instrumento de pesquisa: construção conceitual na interação aluno–IA e a instalação do driver cognitivo' : lang==='en' ? 'SCAFFL as a research instrument: conceptual construction in student–AI interaction and the installation of the cognitive driver' : 'SCAFFL como instrumento de investigación: construcción conceptual en la interacción alumno–IA',
                    refs:'Bachelard · Mortimer · TMCR · Bakhtin · Vygotsky', status: lang==='pt' ? 'Planejado — pós-corpus' : lang==='en' ? 'Planned — post-corpus' : 'Planificado — post-corpus' },
                  { n:'MS-3', tag: lang==='pt' ? 'Clones de professores' : lang==='en' ? 'Teacher clones' : 'Clones de docentes', venue: lang==='pt' ? 'A definir' : lang==='en' ? 'TBD' : 'A definir',
                    title: lang==='pt' ? 'Extração de perfis didático-pedagógicos via meta-prompt: metodologia em três fases e evidências de desacoplamento forma–conteúdo' : lang==='en' ? 'Extraction of didactic-pedagogical profiles via meta-prompt: three-phase methodology and evidence of form–content decoupling' : 'Extracción de perfiles didáctico-pedagógicos vía meta-prompt: metodología en tres fases',
                    refs:'Style transfer · RAG · LLMs · Meta-prompting', status: lang==='pt' ? 'Em planejamento' : lang==='en' ? 'In planning' : 'En planificación' },
                  { n:'MS-4', tag: lang==='pt' ? 'Teoria' : lang==='en' ? 'Theory' : 'Teoría', venue: lang==='pt' ? 'A definir' : lang==='en' ? 'TBD' : 'A definir',
                    title: lang==='pt' ? 'Atomicidade cognitiva em grafos: critério de granularidade ótima para SLMs em contextos educacionais' : lang==='en' ? 'Cognitive atomicity in graphs: optimal granularity criterion for SLMs in educational contexts' : 'Atomicidad cognitiva en grafos: criterio de granularidad óptima para SLMs',
                    refs:'SLMs · Knowledge graphs · Vector retrieval · Open-book principle', status: lang==='pt' ? 'Em planejamento' : lang==='en' ? 'In planning' : 'En planificación' },
                  { n:'MS-5', tag: lang==='pt' ? 'Revisão sistemática' : lang==='en' ? 'Systematic review' : 'Revisión sistemática', venue: lang==='pt' ? 'A definir' : lang==='en' ? 'TBD' : 'A definir',
                    title: lang==='pt' ? 'LLMs, modelagem docente e personalização do ensino (2020–2025): revisão crítica do campo em transição' : lang==='en' ? 'LLMs, teacher modeling and instructional personalization (2020–2025): critical review of a transitioning field' : 'LLMs, modelado docente y personalización de la enseñanza (2020–2025): revisión crítica',
                    refs:'Ruffle&Riley · SocratiQ · SimClass · HiTA · Khanmigo', status: lang==='pt' ? 'Em planejamento' : lang==='en' ? 'In planning' : 'En planificación' },
                ].map(({ n, tag, venue, title, refs, status }) => (
                  <div key={n} style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:'20px 24px', marginBottom:14 }}>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:12 }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', fontWeight:700, color:a2, background:`${a2}12`, border:`1px solid ${a2}28`, padding:'4px 10px', borderRadius:999 }}>{n}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color:TX3, background:PANEL, border:`1px solid ${LINE}`, padding:'4px 10px', borderRadius:999 }}>{tag}</span>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color:TX3 }}>→ {venue}</span>
                      <span style={{ marginLeft:'auto', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.68rem', color: status.includes('scrit') || status.includes('ritin') ? a2 : TX3 }}>{status}</span>
                    </div>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.97rem', color:TX, marginBottom:8, lineHeight:1.45 }}>{title}</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', color:TX3 }}>{refs}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── 7. METHOD ── */}
            {rTab==='method' && (
              <div>
                <ArticleH2 n="7">{lang==='pt' ? 'Metodologia' : lang==='en' ? 'Methodology' : 'Metodología'}</ArticleH2>
                <P>{lang==='pt' ? 'Pesquisa qualitativa com delineamento de Design-Based Research (DBR), caracterizada pela co-evolução entre o desenvolvimento da intervenção (a plataforma SCAFFL) e a investigação sistemática de seus efeitos em contexto real de sala de aula. O ciclo DBR compreende: design → implementação → análise → redesign.' : lang==='en' ? 'Qualitative research with a Design-Based Research (DBR) design, characterized by the co-evolution between the intervention development (the SCAFFL platform) and systematic investigation of its effects in a real classroom context. The DBR cycle comprises: design → implementation → analysis → redesign.' : 'Investigación cualitativa con diseño de Investigación Basada en el Diseño (DBR), caracterizada por la co-evolución entre el desarrollo de la intervención (la plataforma SCAFFL) y la investigación sistemática de sus efectos.'}</P>
                {[
                  { n:'1', title: lang==='pt' ? 'Análise de Conteúdo · Bardin (1977)' : lang==='en' ? 'Content Analysis · Bardin (1977)' : 'Análisis de Contenido · Bardin (1977)',
                    desc: lang==='pt' ? 'Aplicada ao eixo empírico aplicado (eixo 4.3). Categorias emergem dos dados (análise categorial temática) e são validadas por triangulação entre pesquisador e orientador. Unidade de análise: o turno de interação.' : lang==='en' ? 'Applied to the applied empirical axis (4.3). Categories emerge from the data (thematic categorical analysis) and are validated by triangulation between researcher and advisor. Unit of analysis: the interaction turn.' : 'Aplicada al eje empírico aplicado (4.3). Las categorías emergen de los datos y son validadas por triangulación.' },
                  { n:'2', title: lang==='pt' ? 'Análise Textual Discursiva · Moraes & Galiazzi (2007)' : lang==='en' ? 'Discursive Textual Analysis · Moraes & Galiazzi (2007)' : 'Análisis Textual Discursivo · Moraes & Galiazzi (2007)',
                    desc: lang==='pt' ? 'Aplicada ao eixo discursivo. Processo de unitarização, categorização e elaboração de metatextos a partir dos logs completos das interações. Foco nas cadeias discursivas de mediação e nos momentos de instalação do driver cognitivo.' : lang==='en' ? 'Applied to the discursive axis. Process of unitarization, categorization and meta-text elaboration from the complete interaction logs. Focus on the discursive chains of mediation and moments of cognitive driver installation.' : 'Aplicada al eje discursivo. Proceso de unitarización, categorización y elaboración de metatextos a partir de los logs completos.' },
                  { n:'3', title: lang==='pt' ? 'Rubrica baseada em Johnstone' : lang==='en' ? 'Johnstone-based rubric' : 'Rúbrica basada en Johnstone',
                    desc: lang==='pt' ? 'Instrumento quantitativo-qualitativo para avaliar o nível de articulação dos três níveis de Johnstone nos simuladores produzidos. Critérios: presença do nível macroscópico (fenômeno observável), submicroscópico (partículas) e simbólico (equações), além de coerência e funcionalidade.' : lang==='en' ? 'Quantitative-qualitative instrument to assess the level of articulation of Johnstone\'s three levels in produced simulations. Criteria: presence of macroscopic (observable phenomenon), submicroscopic (particles) and symbolic (equations) levels, plus coherence and functionality.' : 'Instrumento cuantitativo-cualitativo para evaluar el nivel de articulación de los tres niveles de Johnstone en los simuladores producidos.' },
                ].map(({ n, title, desc }) => (
                  <div key={n} style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:12, padding:22, marginBottom:14 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                      <span style={{ width:24, height:24, borderRadius:'50%', background:GRAD, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.7rem', fontWeight:700, color:btnTx, flexShrink:0 }}>{n}</span>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.97rem', color:TX }}>{title}</div>
                    </div>
                    <p style={{ fontSize:'0.87rem', color:TX2, lineHeight:1.75, margin:0 }}>{desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── 8. COLLAB ── */}
            {rTab==='collab' && (
              <div>
                <ArticleH2 n="8">{lang==='pt' ? 'Colaboração' : lang==='en' ? 'Collaboration' : 'Colaboración'}</ArticleH2>
                <P>{lang==='pt' ? 'A plataforma SCAFFL é open-source e o protocolo de pesquisa foi projetado para replicabilidade. Pesquisadores e instituições interessados em colaborar, replicar a metodologia em outros contextos ou adaptar a plataforma para outras disciplinas são bem-vindos.' : lang==='en' ? 'The SCAFFL platform is open-source and the research protocol was designed for replicability. Researchers and institutions interested in collaborating, replicating the methodology in other contexts or adapting the platform for other subjects are welcome.' : 'La plataforma SCAFFL es open-source y el protocolo de investigación fue diseñado para replicabilidad. Investigadores e instituciones interesados en colaborar, replicar la metodología en otros contextos o adaptar la plataforma son bienvenidos.'}</P>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:28 }}>
                  <div style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:24 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>
                      {lang==='pt' ? 'Pesquisador Principal' : lang==='en' ? 'Lead Researcher' : 'Investigador Principal'}
                    </div>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color:TX, marginBottom:4 }}>{t('abResearcherName') ?? 'Lead Researcher'}</div>
                    <div style={{ fontSize:'0.83rem', color:TX2, marginBottom:12 }}>CIAGE · PPGECiMa · UCS</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:TX3 }}>FAPERGS · PROBIC · 2025–2026</div>
                  </div>
                  <div style={{ background:PANEL, border:`1px solid ${LINE}`, borderRadius:14, padding:24 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color:a2, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>
                      {lang==='pt' ? 'Orientador' : lang==='en' ? 'Advisor' : 'Director'}
                    </div>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'1.05rem', color:TX, marginBottom:4 }}>Prof. Dr. Agostinho Serrano de Andrade Neto</div>
                    <div style={{ fontSize:'0.83rem', color:TX2, marginBottom:12 }}>CIAGE · PPGECiMa · UCS</div>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color:TX3 }}>IAGENEduc · Coord.</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {(lang==='pt' ? [
                    'Replicar o protocolo em outras disciplinas',
                    'Adaptar a plataforma para outras línguas',
                    'Colaborar na revisão sistemática (MS-5)',
                    'Compartilhar dados de outras pesquisas com IA educacional',
                  ] : lang==='en' ? [
                    'Replicate the protocol in other subjects',
                    'Adapt the platform for other languages',
                    'Collaborate on the systematic review (MS-5)',
                    'Share data from other educational AI research',
                  ] : [
                    'Replicar el protocolo en otras disciplinas',
                    'Adaptar la plataforma para otros idiomas',
                    'Colaborar en la revisión sistemática (MS-5)',
                    'Compartir datos de otras investigaciones con IA educativa',
                  ]).map(item => (
                    <div key={item} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', background:PANEL, borderRadius:10, border:`1px solid ${LINE}`, fontSize:'0.88rem', color:TX2 }}>
                      <ArrowRight size={13} color={a2} style={{ flexShrink:0 }} /> {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end main content */}
        </div>{/* end grid */}
      </div>{/* end body */}
    </>
  );

  /* ─── render ─── */
  return (
    <div style={{ minHeight:'100vh', fontFamily:"'Space Grotesk',sans-serif", background: BG, color: TX }}>
      {/* Corner marks */}
      <Reg pos="tl" /><Reg pos="tr" /><Reg pos="bl" /><Reg pos="br" />

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', background: dark ? 'rgba(8,12,24,0.82)' : 'rgba(246,248,252,0.85)', borderBottom:`1px solid ${LINE}` }}>
        <div style={{ maxWidth:1160, margin:'0 auto', padding:'0 24px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          {/* Logo */}
          <button onClick={() => go('home')} style={{ display:'flex', alignItems:'center', gap:10, background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:`${a2}1a`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FlaskConical size={16} color={a2} />
            </div>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'1.18rem', letterSpacing:'.01em', background:'linear-gradient(135deg,#047857 0%,#10b981 25%,#06b6d4 50%,#3b82f6 75%,#8b5cf6 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>SCAFFL</span>
          </button>

          {/* Desktop nav */}
          <div style={{ display:'flex', alignItems:'center', gap:2 }}>
            {navPages.map(({ id, key }) => (
              <button key={id} onClick={() => go(id)}
                style={{ padding:'7px 14px', borderRadius:10, border:'none', cursor:'pointer', fontFamily:"'Space Grotesk',sans-serif", fontWeight:500, fontSize:'0.9rem', background: page === id ? `${a2}18` : 'transparent', color: page === id ? a2 : TX2, transition:'all .15s' }}>
                {t(key)}
              </button>
            ))}
          </div>

          {/* Controls */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Lang */}
            <div style={{ display:'flex', border:`1px solid ${LINE}`, borderRadius:9, overflow:'hidden', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem' }}>
              {(['pt','en','es'] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding:'6px 9px', border:'none', cursor:'pointer', textTransform:'uppercase', fontWeight: lang===l ? 700 : 400, background: lang===l ? a2 : 'transparent', color: lang===l ? btnTx : TX3, transition:'all .15s' }}>{l}</button>
              ))}
            </div>
            {/* Colors */}
            <div style={{ display:'flex', gap:5, alignItems:'center' }}>
              {(Object.keys(THEMES) as ThemeName[]).map(c => {
                const swatchColor = c === 'neutral'
                  ? `linear-gradient(135deg, #0F172A 50%, #FFFFFF 50%)`
                  : THEMES[c].a2;
                const isNeutral = c === 'neutral';
                return (
                  <button key={c} onClick={() => setColor(c)} title={c}
                    style={{ width:16, height:16, borderRadius:'50%', border: color===c ? '2px solid #fff' : '2px solid transparent', cursor:'pointer', background: isNeutral ? undefined : THEMES[c].a2, backgroundImage: isNeutral ? swatchColor : undefined, transform: color===c ? 'scale(1.25)' : 'scale(1)', transition:'all .15s', boxShadow: color===c ? `0 0 0 2px ${isNeutral ? '#64748B' : THEMES[c].a2}` : 'none' }} />
                );
              })}
            </div>
            {/* Mode */}
            <button onClick={() => setMode(dark ? 'light' : 'dark')} style={{ width:34, height:34, borderRadius:9, border:`1px solid ${LINE}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color: TX2 }}>
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {/* Login */}
            <button onClick={() => navigate('/login')} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px', borderRadius:10, border:'none', cursor:'pointer', background: GRAD, color: btnTx, fontFamily:"'Space Grotesk',sans-serif", fontWeight:700, fontSize:'0.88rem', boxShadow:`0 4px 16px ${a2}45` }}>
              {t('navLogin')} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </nav>

      {/* Pages */}
      {page === 'home'        && <HomePage />}
      {page === 'examples'    && <ExamplesPage />}
      {page === 'about'       && <AboutPage />}
      {page === 'self'        && <SelfPage />}
      {page === 'docs'        && <DocsPage />}
      {page === 'researchers' && <ResearchersPage />}

      {/* Footer */}
      <footer style={{ background: dark ? '#060A14' : '#EEF2F8', borderTop:`1px solid ${LINE}`, padding:'56px 24px 36px' }}>
        <div style={{ maxWidth:1160, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:32, flexWrap:'wrap', marginBottom:40 }}>
            <div style={{ maxWidth:280 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <FlaskConical size={16} color={a2} />
                <span style={{ fontFamily:"'Space Grotesk',sans-serif", fontWeight:800, fontSize:'1.05rem', background:'linear-gradient(135deg,#047857 0%,#10b981 25%,#06b6d4 50%,#3b82f6 75%,#8b5cf6 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>SCAFFL</span>
              </div>
              <p style={{ fontSize:'0.88rem', color: TX2, lineHeight:1.7, margin:0 }}>{t('ftTagline')}</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color: TX3, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{t('ftResearcher')}</div>
                <div style={{ fontWeight:700, color: TX, marginBottom:4 }}>{t('abResearcherName') ?? 'Lead Researcher'}</div>
                <div style={{ fontSize:'0.82rem', color: TX2 }}>{t('ftInst')}</div>
              </div>
              <div>
                <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'0.67rem', color: TX3, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>{t('ftAdvisor')}</div>
                <div style={{ fontWeight:700, color: TX, marginBottom:4 }}>Prof. Dr. Agostinho</div>
                <div style={{ fontSize:'0.82rem', color: TX2 }}>{t('ftInst')}</div>
              </div>
            </div>
          </div>
          <div style={{ paddingTop:24, borderTop:`1px solid ${LINE}`, display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap', fontFamily:"'JetBrains Mono',monospace", fontSize:'0.72rem', color: TX3 }}>
            <span>© 2026 SCAFFL Platform · {t('ftRights')}</span>
            <span>{t('ftVersion')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
