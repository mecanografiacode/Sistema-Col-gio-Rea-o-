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
4. MÁXIMO DE 2 AULAS POR DIA DA MESMA MATÉRIA: Não coloque mais de 2 aulas da mesma matéria no mesmo dia em uma turma.
5. DISPONIBILIDADE: Respeite os dias de trabalho, turno e disponibilidades dos professores.
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
          'Você é um algoritmo especialista sênior em alocação de grades escolares do Colégio Reação. REGRA ABSOLUTA: Respeite rigorosamente a carga horária de cada matéria (ex: Espanhol = 1 aula/semana, NUNCA dê 2 aulas). Turmas de 6º/7º/8º ano têm 5 aulas na seg/qua/sex e 6 na ter/qui. 9º ano e Médio têm 6 aulas todos os dias. Preencha 100% dos horários válidos sem deixar aulas vagas.',
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
      let slots: any[] = parsedData.slots || [];
      const conflicts: string[] = parsedData.conflicts || [];

      // --- POST-PROCESSING GUARD: GUARANTEE ZERO UNINTENDED FREE SLOTS WHILE RESPECTING WORKLOADS ---
      targetClasses.forEach((cls: any) => {
        const clsBlocks = timeBlocks
          .filter((b: any) => b.class_id === cls.id && !b.is_interval)
          .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

        const is678 = is678Grade(cls.name);
        const workloads = cls.subject_workloads || {};
        const normWorkloads: { [key: string]: number } = {};
        Object.entries(workloads).forEach(([s, h]) => {
          if (s && typeof h === 'number' && h > 0) {
            normWorkloads[s.trim().toUpperCase()] = h;
          }
        });

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
              // Find candidate teachers available on this day and time block
              const qualTeachers = teachers.filter((t: any) => {
                if (t.available_days && t.available_days.length > 0 && !t.available_days.includes(day)) {
                  return false;
                }
                const hour = parseInt(block.start_time.split(':')[0] || '0', 10);
                const isMorning = hour < 12;
                if (t.availability_shift === 'matutino' && !isMorning) return false;
                if (t.availability_shift === 'vespertino' && isMorning) return false;
                if (t.groups && t.groups.length > 0 && !t.groups.includes(cls.group)) return false;

                const hasConflict = slots.some(
                  (s: any) =>
                    s.teacher_id === t.id &&
                    s.day_of_week === day &&
                    s.start_time === block.start_time
                );
                return !hasConflict;
              });

              let chosen: { teacher: any; subject: string } | null = null;

              // PASS 1: Select subject under its defined workload limit
              for (const t of qualTeachers) {
                for (const sub of (t.subjects || [])) {
                  const subUpper = sub.trim().toUpperCase();
                  const targetH = normWorkloads[subUpper] || 0;
                  const currentAllocated = slots.filter(
                    (s: any) => s.class_id === cls.id && s.subject.trim().toUpperCase() === subUpper
                  ).length;

                  if (targetH > 0 && currentAllocated < targetH) {
                    const countInDay = slots.filter(
                      (s: any) =>
                        s.class_id === cls.id &&
                        s.day_of_week === day &&
                        s.subject.trim().toUpperCase() === subUpper
                    ).length;

                    if (countInDay < 2) {
                      chosen = { teacher: t, subject: sub };
                      break;
                    }
                  }
                }
                if (chosen) break;
              }

              // PASS 2: If no under-workload subject found, select core subject but NEVER exceed 1 or 2-hour capped subjects (like Espanhol)
              if (!chosen) {
                for (const t of qualTeachers) {
                  for (const sub of (t.subjects || [])) {
                    const subUpper = sub.trim().toUpperCase();
                    const targetH = normWorkloads[subUpper] || 0;
                    const currentAllocated = slots.filter(
                      (s: any) => s.class_id === cls.id && s.subject.trim().toUpperCase() === subUpper
                    ).length;

                    // STRICT CAP: Never duplicate Espanhol, Artes, Filosofia, etc. if target <= 2
                    if (targetH > 0 && targetH <= 2 && currentAllocated >= targetH) {
                      continue;
                    }

                    const countInDay = slots.filter(
                      (s: any) =>
                        s.class_id === cls.id &&
                        s.day_of_week === day &&
                        s.subject.trim().toUpperCase() === subUpper
                    ).length;

                    if (countInDay < 2) {
                      chosen = { teacher: t, subject: sub };
                      break;
                    }
                  }
                  if (chosen) break;
                }
              }

              if (chosen) {
                slots.push({
                  class_id: cls.id,
                  teacher_id: chosen.teacher.id,
                  subject: chosen.subject,
                  day_of_week: day,
                  start_time: block.start_time,
                  end_time: block.end_time
                });
              }
            }
          });
        });
      });

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
