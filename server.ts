import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// --- API ENDPOINT: AI Marketing Content Generator ---
app.post('/api/marketing/generate-ideas', async (req, res) => {
  try {
    const { objective, targetAudience, contentType, quantity, customNotes } = req.body;

    const ai = getGeminiClient();

    const promptText = `
Gere ${quantity || 3} ideias inéditas de conteúdo estratégico para o Instagram do Colégio Reação (Escola em Brasília/DF).

Parâmetros solicitados:
- Objetivo Principal: ${objective || 'Captação de Matrículas e Destaque Pedagógico'}
- Público-Alvo: ${targetAudience || 'Pais de Alunos e Comunidade Escolar'}
- Formato Desejado: ${contentType || 'Mistura equilibrada de Reels e Carrosséis'}
- Instruções Específicas / Observações: ${customNotes || 'Nenhuma'}

Dicas Específicas para o Colégio Reação:
- Inclua elementos de humanização, orgulho da comunidade escolar e excelência acadêmica.
- Para REELS: crie um gancho irresistível nos primeiros 3 segundos e um roteiro dinâmico com indicações visuais de corte.
- Para CARROSSEL: forneça a estrutura detalhada de cada slide (Slide 1: Capa com gancho, Slide 2-4: Conteúdo, Slide Final: Chamada para Ação).
- Para LEGENDAS: escreva textos envolventes com emojis e hashtags regionais (#ColegioReacao #EducacaoDF #RecantoDasEmas).
`;

    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: promptText,
        config: {
          systemInstruction:
            'Você é um estrategista sênior de marketing digital educacional especializado em redes sociais para escolas particulares do Colégio Reação. Crie planos de conteúdo altamente engajantes para o Instagram, focados em retenção de alunos, autoridade pedagógica, engajamento das famílias e captação de novas matrículas. Retorne estritamente em formato JSON conforme o schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Título chamativo e direto do conteúdo' },
                content_type: {
                  type: Type.STRING,
                  description: 'Formato exato: reels, carrossel, story ou post_estatico'
                },
                category: {
                  type: Type.STRING,
                  description: 'Pilar: Captação de Alunos, Vida Escolar, Pedagógico, Esportes, Depoimentos ou Bastidores'
                },
                hook: { type: Type.STRING, description: 'Gancho inicial de 3 segundos para prender a atenção do usuário' },
                script: {
                  type: Type.STRING,
                  description: 'Roteiro cena a cena do Reels ou sequência detalhada de slides do Carrossel'
                },
                caption: { type: Type.STRING, description: 'Legenda pronta para o Instagram com emojis e CTA' },
                hashtags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Array de hashtags estratégicas'
                },
                target_audience: { type: Type.STRING, description: 'Público-alvo sugerido' },
                audio_suggestion: { type: Type.STRING, description: 'Trilha sonora ou estilo de áudio sugerido' },
                has_image_authorization: {
                  type: Type.BOOLEAN,
                  description: 'true se envolver imagens/vídeos de alunos exigindo autorização LGPD/ECA'
                },
                notes: { type: Type.STRING, description: 'Dicas de gravação e edição para a equipe' }
              },
              required: [
                'title',
                'content_type',
                'category',
                'hook',
                'script',
                'caption',
                'hashtags',
                'target_audience',
                'has_image_authorization'
              ]
            }
          }
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({ success: true, ideas: parsed, source: 'gemini' });
      }
    }

    // Fallback template ideas if Gemini API key is missing or transient error
    const fallbackIdeas = [
      {
        title: '5 Coisas que os Alunos Aprendem no Laboratório de Robótica',
        content_type: 'reels',
        category: 'Pedagógico',
        hook: 'Sua escola ensina o aluno a criar tecnologia ou só a consumir?',
        script:
          '00:00 - Close na mão de um aluno programando um robô lego/arduino.\n00:03 - Corte rápido para o teste do robô funcionando.\n00:06 - Texto na tela: "1. Raciocínio Lógico Proativo"\n00:09 - Texto: "2. Trabalho em Equipe Real"\n00:12 - Texto: "3. Solução de Problemas do Mundo Real"\n00:15 - Gravação do professor orientando os grupos.\n00:18 - Chamada final: Venha conhecer nosso laboratório!',
        caption:
          'Na era da inteligência artificial, formar mentes criativas e preparadas para o futuro é o compromisso do Colégio Reação! 🤖✨ No nosso laboratório de tecnologia, a teoria vira prática de verdade. Quer conhecer nosso espaço maker de perto? Agende uma visita com nossa equipe pedagógica! #ColegioReacao #RoboticaEducacional #EducacaoDF #TecnologiaEInovacao',
        hashtags: ['#ColegioReacao', '#RoboticaEducacional', '#EducacaoDF', '#TecnologiaNaEscola'],
        target_audience: 'Pais de alunos do Ensino Fundamental II e Médio',
        audio_suggestion: 'Áudio dinâmico e inspirador no estilo tech/synthwave',
        has_image_authorization: true,
        notes: 'Filmar em luz natural durante a aula de robótica. Focar nos rostos concentrados dos alunos e nos professores apoiando.'
      },
      {
        title: 'Um Dia no Colégio Reação: Do Acolhimento à Saída',
        content_type: 'carrossel',
        category: 'Vida Escolar',
        hook: 'O que acontece entre o primeiro "bom dia" e o final das aulas no Colégio Reação?',
        script:
          'Slide 1 (Capa): Foto acolhedora dos portões do colégio - "Como é a rotina de um aluno do Colégio Reação?"\nSlide 2: Acolhida da manhã na entrada com a coordenação.\nSlide 3: Aulas práticas e interativas nas salas climatizadas.\nSlide 4: Intervalo saudável, esportes e convivência na quadra.\nSlide 5: Suporte aos deveres e orientação pedagógica individual.\nSlide 6 (CTA): Agende sua visita e garanta a vaga do seu filho para 2027!',
        caption:
          'Segurança, afeto e excelência em cada hora do dia! 💙 No Colégio Reação, a rotina escolar é planejada com muito carinho para que cada aluno se sinta motivado, acolhido e desafiado a ir além. Deslize para o lado para ver nossa rotina e comente "VISITA" para agendar seu tour! #ColegioReacao #VidaEscolar #EducacaoComAmor #RecantoDasEmas',
        hashtags: ['#ColegioReacao', '#VidaEscolar', '#EducacaoComAmor', '#RecantoDasEmasDF'],
        target_audience: 'Mães e pais de Educação Infantil e Fundamental I',
        audio_suggestion: 'Acoustic indie pop leve',
        has_image_authorization: true,
        notes: 'Usar fotos em alta resolução no Canva com o padrão visual do colégio (azul e vermelho).'
      },
      {
        title: 'Perguntas Frequentes de Pais Sobre Matrículas 2027',
        content_type: 'story',
        category: 'Captação de Alunos',
        hook: 'Pensando em mudar seu filho de escola para 2027? Respondemos tudo!',
        script:
          'Story 1: Caixa de perguntas "Quais suas dúvidas sobre o ano letivo de 2027?"\nStory 2: Vídeo curto da diretora respondendo sobre horário integral e bolsas.\nStory 3: Enquete "Você valoriza mais: 1) Robótica & TI ou 2) Esportes & Valores?"\nStory 4: Link direto para o WhatsApp do setor de atendimento ao aluno.',
        caption: 'Tire suas dúvidas nos nossos Stories de hoje! 📲',
        hashtags: ['#Matriculas2027', '#ColegioReacao'],
        target_audience: 'Famílias procurando nova escola em Brasília',
        audio_suggestion: 'Voz limpa com fundo instrumental calmo',
        has_image_authorization: false,
        notes: 'Usar adesivos interativos do Instagram para aumentar o engajamento e obter contatos.'
      }
    ];

    return res.json({ success: true, ideas: fallbackIdeas, source: 'fallback' });
  } catch (error: any) {
    console.error('Error generating marketing ideas:', error);
    return res.status(500).json({ error: error.message || 'Falha ao gerar ideias com IA' });
  }
});

// --- API ENDPOINT: AI Marketing Image Generator ---
app.post('/api/marketing/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'Design Gráfico para Instagram', attachments = [] } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'O prompt é obrigatório para gerar a imagem.' });
    }

    const ai = getGeminiClient();

    if (!ai) {
      return res.status(400).json({ error: 'Chave da API Gemini não configurada no servidor.' });
    }

    const parts: any[] = [];

    // Include attached images if provided
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att && att.data) {
          let base64Data = att.data;
          let mimeType = att.mimeType || 'image/jpeg';

          if (base64Data.includes(';base64,')) {
            const splitArr = base64Data.split(';base64,');
            mimeType = splitArr[0].replace('data:', '') || mimeType;
            base64Data = splitArr[1];
          }

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          });
        }
      }
    }

    const fullPrompt = `Crie uma imagem/arte visual de alta qualidade para o Instagram do Colégio Reação (Escola em Brasília/DF).
Estilo visual: ${style}.
Descrição do prompt e diretrizes: ${prompt}.
Cores institucionais se aplicável: azul, vermelho e branco, transmitindo educação, segurança e inovação.`;

    parts.push({ text: fullPrompt });

    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const selectedRatio = validRatios.includes(aspectRatio) ? aspectRatio : '1:1';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: selectedRatio
        }
      }
    });

    let imageUrl: string | null = null;
    let description: string | null = null;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          description = (description ? description + '\n' : '') + part.text;
        }
      }
    }

    if (imageUrl) {
      return res.json({
        success: true,
        imageUrl,
        description: description || 'Imagem gerada com sucesso pela IA Gemini.'
      });
    }

    return res.status(500).json({ error: 'Não foi possível extrair a imagem gerada pela IA.' });
  } catch (error: any) {
    console.error('Error generating marketing image:', error);
    return res.status(500).json({ error: error.message || 'Falha ao gerar imagem com IA' });
  }
});

const is678Grade = (className: string) => {
  const norm = (className || '').toLowerCase();
  if (norm.includes('9º') || norm.includes('9°') || norm.includes('9 ano') || norm.includes('médio') || norm.includes('medio') || norm.includes('9a') || norm.includes('9b')) {
    return false;
  }
  return norm.includes('6º') || norm.includes('6°') || norm.includes('6 ano') || norm.includes('6a') || norm.includes('6b') ||
         norm.includes('7º') || norm.includes('7°') || norm.includes('7 ano') || norm.includes('7a') || norm.includes('7b') ||
         norm.includes('8º') || norm.includes('8°') || norm.includes('8 ano') || norm.includes('8a') || norm.includes('8b') ||
         /\b(6|7|8)\b/.test(norm);
};

const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

const normalizeSubjectName = (s: string): string => {
  if (!s) return '';
  const clean = s.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
  
  if (clean === 'dg' || clean === 'desenhogeometrico' || clean === 'desenhogeometria' || clean === 'desgeometria') return 'dg';
  if (clean === 'edfisica' || clean === 'educacaofisica' || clean === 'edfis' || clean === 'educacaofis') return 'edfisica';
  if (clean === 'portugues' || clean === 'linguaportuguesa' || clean === 'port' || clean === 'lportuguesa') return 'portugues';
  if (clean === 'matematica' || clean === 'mat') return 'matematica';
  if (clean === 'historia' || clean === 'hist') return 'historia';
  if (clean === 'geografia' || clean === 'geo') return 'geografia';
  if (clean === 'ciencias' || clean === 'cien') return 'ciencias';
  if (clean === 'biologia' || clean === 'bio') return 'biologia';
  if (clean === 'fisica' || clean === 'fis') return 'fisica';
  if (clean === 'quimica' || clean === 'quim') return 'quimica';
  if (clean === 'artes' || clean === 'arte') return 'artes';
  if (clean === 'ingles' || clean === 'linguainglesa' || clean === 'linginglesa') return 'ingles';
  if (clean === 'espanhol' || clean === 'linguaespanhola' || clean === 'lingespanhola') return 'espanhol';
  if (clean === 'filosofia' || clean === 'filo') return 'filosofia';
  if (clean === 'sociologia' || clean === 'soc') return 'sociologia';
  if (clean === 'redacao' || clean === 'producaodetexto' || clean === 'prod' || clean === 'prodtexto') return 'redacao';
  return clean;
};

const isSameSubject = (s1?: string, s2?: string): boolean => {
  if (!s1 || !s2) return false;
  return normalizeSubjectName(s1) === normalizeSubjectName(s2);
};

const countWeeklySlotsForSubject = (classId: string, subject: string, slotsList: any[]): number => {
  return slotsList.filter((s: any) => s.class_id === classId && isSameSubject(s.subject, subject)).length;
};

const countDaySlotsForSubject = (classId: string, day: string, subject: string, slotsList: any[]): number => {
  return slotsList.filter((s: any) => s.class_id === classId && s.day_of_week === day && isSameSubject(s.subject, subject)).length;
};

const getNormalizedTeacherFirstName = (name?: string): string => {
  if (!name) return '';
  const clean = name.trim().toLowerCase()
    .replace(/^profª?\.?\s+/i, '')
    .replace(/^professor[a]?\s+/i, '')
    .replace(/^tio|tia\s+/i, '')
    .trim();
  const firstWord = clean.split(/[\s\-_]+/)[0] || '';
  return firstWord;
};

const isSameTeacher = (t1Id?: string, t1Name?: string, t2Id?: string, t2Name?: string): boolean => {
  if (t1Id && t2Id && t1Id === t2Id) return true;
  if (!t1Name || !t2Name) return false;

  const clean1 = t1Name.trim().toLowerCase();
  const clean2 = t2Name.trim().toLowerCase();
  if (clean1 === clean2) return true;

  const fn1 = getNormalizedTeacherFirstName(t1Name);
  const fn2 = getNormalizedTeacherFirstName(t2Name);

  if (fn1.length >= 3 && fn1 === fn2) {
    return true; // Recognizes "Gilva Matemática" and "Gilva DG" as the same physical teacher
  }

  return false;
};

const isTeacherAvailable = (
  teacher: any,
  day: string,
  block: { start_time: string; end_time?: string },
  blockIdx: number
): boolean => {
  if (!teacher) return false;

  // 1. Available days
  if (teacher.available_days && Array.isArray(teacher.available_days) && teacher.available_days.length > 0) {
    if (!teacher.available_days.includes(day)) return false;
  }

  // 2. Availability shift
  const startMin = timeToMinutes(block.start_time);
  const isMorning = startMin < 780; // Before 13:00 is morning
  if (teacher.availability_shift === 'matutino' && !isMorning) return false;
  if (teacher.availability_shift === 'vespertino' && isMorning) return false;

  // 3. Available slots (1-based index)
  const slotNum = blockIdx + 1;
  if (teacher.available_slots && Array.isArray(teacher.available_slots) && teacher.available_slots.length > 0) {
    if (!teacher.available_slots.includes(slotNum)) return false;
  }

  // 4. Availability grid
  if (teacher.availability_grid && typeof teacher.availability_grid === 'object') {
    const keyDash = `${day}-${slotNum}`;
    const keyUnderscore = `${day}_${slotNum}`;
    const keyTime = `${day}-${block.start_time}`;
    if (teacher.availability_grid[keyDash] === false || 
        teacher.availability_grid[keyUnderscore] === false || 
        teacher.availability_grid[keyTime] === false) {
      return false;
    }
  }

  return true;
};

const makeDoubleLessonsConsecutive = (
  inputSlots: any[],
  targetClasses: any[],
  teachers: any[],
  timeBlocks: any[]
): any[] => {
  let slots = [...inputSlots];
  const daysList = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  targetClasses.forEach((cls: any) => {
    const clsBlocks = timeBlocks
      .filter((b: any) => b.class_id === cls.id && !b.is_interval)
      .sort((a: any, b: any) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

    daysList.forEach((day) => {
      // Find subjects that have 2 lessons on this day for this class
      const subjectSlotsMap: { [subKey: string]: any[] } = {};
      slots.forEach((s: any) => {
        if (s.class_id === cls.id && s.day_of_week === day) {
          const subKey = normalizeSubjectName(s.subject);
          if (!subjectSlotsMap[subKey]) subjectSlotsMap[subKey] = [];
          subjectSlotsMap[subKey].push(s);
        }
      });

      Object.entries(subjectSlotsMap).forEach(([_subKey, subSlots]) => {
        if (subSlots.length !== 2) return;

        const getBlockIdx = (s: any) =>
          clsBlocks.findIndex((b: any) => b.start_time === s.start_time);

        let idx1 = getBlockIdx(subSlots[0]);
        let idx2 = getBlockIdx(subSlots[1]);

        if (idx1 < 0 || idx2 < 0) return;

        if (idx1 > idx2) {
          const temp = idx1;
          idx1 = idx2;
          idx2 = temp;
        }

        // Check if already consecutive
        if (idx2 === idx1 + 1) return; // Already consecutive!

        // Not consecutive! Try to bring them together
        const candidateTargets = [idx1 + 1, idx2 - 1];

        for (const targetIdx of candidateTargets) {
          if (targetIdx < 0 || targetIdx >= clsBlocks.length) continue;
          if (targetIdx === idx1 || targetIdx === idx2) continue;

          const targetBlock = clsBlocks[targetIdx];
          const movingSlot = targetIdx === idx1 + 1
            ? subSlots.find((s: any) => getBlockIdx(s) === idx2)
            : subSlots.find((s: any) => getBlockIdx(s) === idx1);

          if (!movingSlot) continue;

          const movingSlotOriginalBlockIdx = getBlockIdx(movingSlot);

          const otherSlotIdx = slots.findIndex(
            (s: any) =>
              s.class_id === cls.id &&
              s.day_of_week === day &&
              s.start_time === targetBlock.start_time
          );

          if (otherSlotIdx < 0) {
            // Empty slot at targetIdx
            const movingTeacher = teachers.find((t: any) => t.id === movingSlot.teacher_id);
            const conflict = slots.some(
              (s: any) =>
                s.class_id !== cls.id &&
                s.day_of_week === day &&
                s.start_time === targetBlock.start_time &&
                isSameTeacher(
                  s.teacher_id,
                  teachers.find((t: any) => t.id === s.teacher_id)?.name,
                  movingSlot.teacher_id,
                  movingTeacher?.name
                )
            );

            if (!conflict) {
              movingSlot.start_time = targetBlock.start_time;
              movingSlot.end_time = targetBlock.end_time;
              break;
            }
          } else {
            // Swap with otherSlot if no conflicts
            const otherSlot = slots[otherSlotIdx];
            const movingTeacher = teachers.find((t: any) => t.id === movingSlot.teacher_id);
            const otherTeacher = teachers.find((t: any) => t.id === otherSlot.teacher_id);

            const movingSlotBlock = clsBlocks[movingSlotOriginalBlockIdx];

            const movingConflict = slots.some(
              (s: any) =>
                s.class_id !== cls.id &&
                s.day_of_week === day &&
                s.start_time === targetBlock.start_time &&
                isSameTeacher(
                  s.teacher_id,
                  teachers.find((t: any) => t.id === s.teacher_id)?.name,
                  movingSlot.teacher_id,
                  movingTeacher?.name
                )
            );

            const otherConflict = slots.some(
              (s: any) =>
                s.class_id !== cls.id &&
                s.day_of_week === day &&
                s.start_time === movingSlotBlock.start_time &&
                isSameTeacher(
                  s.teacher_id,
                  teachers.find((t: any) => t.id === s.teacher_id)?.name,
                  otherSlot.teacher_id,
                  otherTeacher?.name
                )
            );

            if (!movingConflict && !otherConflict) {
              const tmpStart = movingSlot.start_time;
              const tmpEnd = movingSlot.end_time;

              movingSlot.start_time = otherSlot.start_time;
              movingSlot.end_time = otherSlot.end_time;

              otherSlot.start_time = tmpStart;
              otherSlot.end_time = tmpEnd;
              break;
            }
          }
        }
      });
    });
  });

  return slots;
};

// --- API ENDPOINT: AI Schedule Generator ---
app.post('/api/schedule/generate-ai', async (req, res) => {
  try {
    const { teachers, classes, timeBlocks, targetClassIds, subjects } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(400).json({ error: 'Chave da API Gemini não configurada no servidor.' });
    }

    const targetClasses = classes.filter((c: any) => targetClassIds.includes(c.id));

    const daysList = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

    const promptText = `
Você é o algoritmo e especialista sênior de inteligência artificial em planejamento de grades horárias para o Colégio Reação em Brasília/DF.
Sua missão é organizar a grade horária AUTOMATICAMENTE utilizando o modelo Gemini 3.1 Flash Lite.

EXIGÊNCIAS RÍGIDAS DA DIREÇÃO DA ESCOLA (ZERO TOLERÂNCIA A ERROS):
1. REGRAS DE PREENCHIMENTO COMPLETO DA GRADE (SEM AULAS VAGAS ACIDENTAIS):
   - Turmas dos 6ºs, 7ºs e 8ºs Anos: Possuem REGRA OFICIAL DE HORÁRIO REDUZIDO de 5 aulas na Segunda, Quarta e Sexta (o 6º horário NÃO DEVE TER AULA) e 6 aulas na Terça e Quinta (total 27 aulas). Preencha 100% dos horários válidos dessas turmas sem deixar aulas vagas!
   - Turmas dos 9ºs Anos e Ensino Médio: Possuem 6 aulas TODOS os dias da semana (Segunda a Sexta, total 30 aulas). Preencha 100% das 30 aulas sem deixar aulas vagas!
2. RIGOR EXTREMO NA CARGA HORÁRIA (subject_workloads):
   - Cada turma possui o mapa de cargas horárias (subject_workloads) de cada disciplina (ex: Espanhol = 1 aula/semana, Matemática = 5 aulas/semana).
   - É ABSOLUTAMENTE PROIBIDO ULTRAPASSAR A CARGA HORÁRIA DEFINIDA! Se Espanhol é 1 aula por semana, aloque EXATAMENTE 1 AULA de Espanhol na semana inteira para aquela turma (JAMAIS aloque 2 ou mais aulas de Espanhol).
3. ZERO CONFLITOS DE PROFESSOR: Um professor não pode lecionar em 2 turmas no mesmo dia e mesmo horário.
4. MÁXIMO DE 2 AULAS POR DIA DA MESMA MATÉRIA E OBRIGATORIAMENTE CONSECUTIVAS (DOBRADINHA / SEGUIDAS): Se uma turma tiver 2 aulas da mesma matéria no mesmo dia, elas DEVEM OBRIGATORIAMENTE ser em horários seguidos/colados (ex: 1º e 2º horário, ou 3º e 4º horário). JAMAIS separe as 2 aulas da mesma matéria no mesmo dia (ex: NUNCA coloque no 1º e 5º horário).
5. DISPONIBILIDADE E NOMES COMPOSTOS: Respeite os dias de trabalho, turno e disponibilidades dos professores. Note que "Gilva - Matemática" e "Gilva - DG" representam a mesma pessoa física (professora Gilva) e NÃO podem ser alocadas no mesmo horário em turmas diferentes!
6. EXPLICAÇÃO MINUCIOSA DE CONFLITOS: Se houver qualquer restrição, indisponibilidade ou choque de horário, explique detalhadamente na propriedade 'conflicts' o motivo.

Dados Enviados:
- Turmas Alvo: ${JSON.stringify(targetClasses)}
- Professores Cadastrados e Habilitados: ${JSON.stringify(teachers)}
- Blocos de Horários das Turmas: ${JSON.stringify(timeBlocks)}
- Lista de Disciplinas: ${JSON.stringify(subjects || [])}

Retorne em JSON:
- slots: Array de ScheduleSlot (class_id, teacher_id, subject, day_of_week, start_time, end_time).
- conflicts: Array de strings contendo explicações claras de qualquer conflito de horário ou indisponibilidade de professor encontrada.
- summary: Resumo das aulas organizadas por turma respeitando rigorosamente as cargas horárias e o horário reduzido oficial.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: promptText,
      config: {
        systemInstruction:
          'Você é um algoritmo especialista sênior em alocação de grades escolares do Colégio Reação. REGRA ABSOLUTA: Respeite rigorosamente a carga horária de cada matéria (ex: Espanhol = 1 aula/semana, NUNCA dê 2 aulas). Se houver 2 aulas da mesma matéria no mesmo dia, coloque em horários CONSECUTIVOS (DOBRADINHA). Turmas de 6º/7º/8º ano têm 5 aulas na seg/qua/sex e 6 na ter/qui. 9º ano e Médio têm 6 aulas todos os dias. Preencha 100% dos horários válidos sem deixar aulas vagas.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slots: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  class_id: { type: Type.STRING },
                  teacher_id: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  day_of_week: { type: Type.STRING },
                  start_time: { type: Type.STRING },
                  end_time: { type: Type.STRING }
                },
                required: ['class_id', 'teacher_id', 'subject', 'day_of_week', 'start_time', 'end_time']
              }
            },
            conflicts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Explicativa minuciosa do porquê de conflitos ou restrições de horários encontradas'
            },
            summary: { type: Type.STRING, description: 'Resumo sobre a geração da grade horária' }
          },
          required: ['slots', 'conflicts', 'summary']
        }
      }
    });

    if (response.text) {
      const parsedData = JSON.parse(response.text);
      let rawSlots: any[] = parsedData.slots || [];
      const conflicts: string[] = parsedData.conflicts || [];

      // Step 1: Enforce MAX 2 LESSONS PER DAY PER SUBJECT PER CLASS
      targetClasses.forEach((cls: any) => {
        daysList.forEach((day) => {
          const subjectCounts: { [s: string]: number } = {};
          rawSlots = rawSlots.filter((s: any) => {
            if (s.class_id !== cls.id || s.day_of_week !== day) return true;
            const subKey = normalizeSubjectName(s.subject);
            subjectCounts[subKey] = (subjectCounts[subKey] || 0) + 1;
            return subjectCounts[subKey] <= 2; // Keep max 2
          });
        });
      });

      // Step 2: Enforce Weekly Capped Workload Limits (STRICT: e.g. Espanhol = 1h, Artes = 2h)
      targetClasses.forEach((cls: any) => {
        const workloads = cls.subject_workloads || {};
        Object.entries(workloads).forEach(([sub, h]: [string, any]) => {
          const targetH = typeof h === 'number' ? h : 0;
          if (targetH > 0) {
            let count = 0;
            rawSlots = rawSlots.filter((s: any) => {
              if (s.class_id !== cls.id) return true;
              if (!isSameSubject(s.subject, sub)) return true;
              count++;
              return count <= targetH; // STRICTLY CAPPED AT targetH
            });
          }
        });
      });

      // Step 3: Remove Teacher Time Conflicts (considering same physical teacher like Gilva)
      const teacherTimeMap = new Set<string>();
      rawSlots = rawSlots.filter((s: any) => {
        const teacher = teachers.find((t: any) => t.id === s.teacher_id);
        const normFirstName = teacher ? getNormalizedTeacherFirstName(teacher.name) : '';
        const teacherKey = normFirstName.length >= 3 ? normFirstName : (teacher?.name || s.teacher_id).trim().toUpperCase();
        const key = `${teacherKey}_${s.day_of_week}_${s.start_time}`;
        if (teacherTimeMap.has(key)) return false;
        teacherTimeMap.add(key);
        return true;
      });

      let slots: any[] = [...rawSlots];

      // Step 4: FILL EMPTY SLOTS ONLY IF A SUBJECT STILL HAS REMAINING WORKLOAD
      targetClasses.forEach((cls: any) => {
        const clsBlocks = timeBlocks
          .filter((b: any) => b.class_id === cls.id && !b.is_interval)
          .sort((a: any, b: any) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

        const is678 = is678Grade(cls.name);
        const workloads = cls.subject_workloads || {};

        daysList.forEach((day) => {
          const isShortDay = is678 && (day === 'segunda' || day === 'quarta' || day === 'sexta');

          clsBlocks.forEach((block: any, blockIdx: number) => {
            if (isShortDay && blockIdx >= 5) return; // 6º, 7º, 8º ano: 6º horário na Seg/Qua/Sex é saída antecipada

            const exists = slots.some(
              (s: any) =>
                s.class_id === cls.id &&
                s.day_of_week === day &&
                s.start_time === block.start_time
            );

            if (!exists) {
              // Candidate teachers available without time conflict and respecting availability
              const qualTeachers = teachers.filter((t: any) => {
                if (!isTeacherAvailable(t, day, block, blockIdx)) return false;

                const hasConflict = slots.some((s: any) => {
                  if (s.day_of_week !== day || s.start_time !== block.start_time) return false;
                  const sTeacher = teachers.find((tr: any) => tr.id === s.teacher_id);
                  return isSameTeacher(s.teacher_id, sTeacher?.name, t.id, t.name);
                });
                return !hasConflict;
              });

              let chosen: { teacher: any; subject: string } | null = null;

              // Priority 1: Group teachers with subject under target workload
              const groupTeachers = qualTeachers.filter((t: any) => !t.groups || t.groups.length === 0 || t.groups.includes(cls.group));
              for (const t of groupTeachers) {
                for (const sub of (t.subjects || [])) {
                  let targetH = 0;
                  for (const [wSub, h] of Object.entries(workloads)) {
                    if (isSameSubject(wSub, sub) && typeof h === 'number') {
                      targetH = h;
                      break;
                    }
                  }
                  const currentWeekly = countWeeklySlotsForSubject(cls.id, sub, slots);
                  const countInDay = countDaySlotsForSubject(cls.id, day, sub, slots);

                  if (targetH > 0 && currentWeekly < targetH && countInDay < 2) {
                    chosen = { teacher: t, subject: sub };
                    break;
                  }
                }
                if (chosen) break;
              }

              // Priority 2: Any available teacher with a subject that still needs weekly hours
              if (!chosen) {
                for (const t of qualTeachers) {
                  for (const sub of (t.subjects || [])) {
                    let targetH = 0;
                    for (const [wSub, h] of Object.entries(workloads)) {
                      if (isSameSubject(wSub, sub) && typeof h === 'number') {
                        targetH = h;
                        break;
                      }
                    }
                    const currentWeekly = countWeeklySlotsForSubject(cls.id, sub, slots);
                    const countInDay = countDaySlotsForSubject(cls.id, day, sub, slots);

                    if (targetH > 0 && currentWeekly < targetH && countInDay < 2) {
                      chosen = { teacher: t, subject: sub };
                      break;
                    }
                  }
                  if (chosen) break;
                }
              }

              // Priority 3: Any subject in workloads that still needs weekly hours
              if (!chosen) {
                for (const [wSub, h] of Object.entries(workloads)) {
                  if (typeof h !== 'number' || h <= 0) continue;
                  const currentWeekly = countWeeklySlotsForSubject(cls.id, wSub, slots);
                  if (currentWeekly < h) {
                    const countInDay = countDaySlotsForSubject(cls.id, day, wSub, slots);
                    if (countInDay < 2) {
                      const matchingTeacher = qualTeachers.find((t: any) =>
                        (t.subjects || []).some((ts: string) => isSameSubject(ts, wSub))
                      );
                      if (matchingTeacher) {
                        chosen = { teacher: matchingTeacher, subject: wSub };
                        break;
                      }
                    }
                  }
                }
              }

              // NOTE: WE DO NOT FORCE ANY UNQUALIFIED / OVER-WORKLOAD ASSIGNMENTS.
              // If no valid teacher/subject pair exists without breaking rules, the slot remains empty!
              if (chosen) {
                slots.push({
                  class_id: cls.id,
                  teacher_id: chosen.teacher.id,
                  subject: chosen.subject,
                  day_of_week: day,
                  start_time: block.start_time,
                  end_time: block.end_time
                });
              } else {
                conflicts.push(`Turma ${cls.name}: O horário de ${day} às ${block.start_time} não pôde ser preenchido sem violar a carga horária das disciplinas ou indisponibilidade dos professores.`);
              }
            }
          });
        });
      });

      // Step 5: Make all double lessons consecutive (dobradinhas coladas)
      slots = makeDoubleLessonsConsecutive(slots, targetClasses, teachers, timeBlocks);

      return res.json({
        success: true,
        slots,
        conflicts,
        summary: parsedData.summary || 'Grade organizada pelo Gemini 3.1 Flash Lite respeitando o horário reduzido oficial.',
        source: 'gemini-3.1-flash-lite'
      });
    }

    return res.status(500).json({ error: 'Falha ao gerar grade horária com a IA Gemini 3.1 Flash Lite.' });
  } catch (error: any) {
    console.error('Error in /api/schedule/generate-ai:', error);
    return res.status(500).json({ error: error.message || 'Erro ao processar IA de horários' });
  }
});


// --- API ENDPOINT: Send Email Notifications ---
app.post('/api/notifications/send-email', async (req, res) => {
  try {
    const { to, subject, title, body } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Destinatário (to) e assunto (subject) são obrigatórios.' });
    }

    const resendApiKey = process.env.RESEND_API_KEY || process.env.RESEND_APY_KEY;

    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'Colégio Reação <onboarding@resend.dev>',
          to: [to],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
              <div style="background-color: #D32F2F; color: #ffffff; padding: 16px; border-radius: 8px 8px 0 0; text-align: center;">
                <h2 style="margin: 0; font-size: 18px;">Colégio Reação - Gestão Escolar</h2>
              </div>
              <div style="padding: 20px;">
                <h3 style="color: #1e293b; margin-top: 0;">${title || subject}</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">${body}</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #94a3b8; font-size: 12px; text-align: center;">Esta é uma mensagem automática do sistema interno do Colégio Reação. Por favor, não responda diretamente a este e-mail.</p>
              </div>
            </div>
          `
        })
      });

      const responseText = await emailResponse.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        data = { raw: responseText };
      }

      if (!emailResponse.ok) {
        const errorMsg = data.message || data.error || (typeof data === 'string' ? data : JSON.stringify(data));
        throw new Error(`Resend Error (${emailResponse.status}): ${errorMsg}`);
      }

      return res.json({ success: true, provider: 'resend', data });
    }

    // Fallback if Resend API key is not configured: simulate success in dev and log
    console.log(`[Email Simulation] To: ${to} | Subject: ${subject} | Body: ${body}`);
    return res.json({
      success: true,
      provider: 'simulation',
      message: 'E-mail simulado com sucesso. Configure a variável RESEND_API_KEY no arquivo .env para envios reais.'
    });
  } catch (error: any) {
    console.error('Error sending email notification:', error);
    return res.status(500).json({ error: error.message || 'Falha ao enviar e-mail' });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
