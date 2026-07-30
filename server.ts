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

// --- API ENDPOINT: AI Schedule Generator ---
app.post('/api/schedule/generate-ai', async (req, res) => {
  try {
    const { teachers, classes, timeBlocks, targetClassIds, subjects } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(400).json({ error: 'Chave da API Gemini não configurada no servidor.' });
    }

    const targetClasses = classes.filter((c: any) => targetClassIds.includes(c.id));

    const promptText = `
Você é um especialista e algoritmo sênior de inteligência artificial em planejamento e otimização de grades horárias escolares para o Colégio Reação em Brasília/DF.
Sua tarefa é organizar automaticamente todas as aulas das turmas solicitadas com o modelo Gemini 3.1 Flash Lite.

DIRETRIZES E REGRAS ABSOLUTAS DA ESCOLA:
1. NÃO PODE TER HORÁRIOS LIVRES (AULAS VAGAS): Todos os blocos de horário que não forem recreio/intervalo das turmas DEVEM ser obrigatoriamente preenchidos com disciplinas e professores correspondentes.
2. RIGOR NA CARGA HORÁRIA: Obedeça estritamente à carga horária semanal de cada disciplina cadastrada para cada turma (subject_workloads). Se a disciplina tem carga de 2 aulas na semana para aquela turma, você DEVE alocar EXATAMENTE 2 aulas (jamais coloque 3 ou 4 aulas).
3. ZERO CONFLITOS DE PROFESSOR: Um professor (ou professores com nomes similares como 'Priscylla' e 'Priscylla Gramática') JAMAIS pode estar alocado em duas turmas no mesmo dia e mesmo horário.
4. MÁXIMO DE 2 AULAS DA MESMA DISCIPLINA POR DIA EM UMA TURMA: Não coloque mais de 2 aulas da mesma disciplina no mesmo dia para uma turma.
5. DISPONIBILIDADE DO PROFESSOR: Respeite os dias de trabalho, turno (matutino/vespertino) e disponibilidade de cada docente.
6. EXPLICAÇÃO DETALHADA DE CONFLITOS: Se houver qualquer conflito, incompatibilidade de horário de professor ou falta de carga horária habilitada de professores para cobrir as turmas, descreva de forma clara na propriedade 'conflicts' POR QUE o conflito aconteceu (ex: "Turma 8º Ano A: Faltam aulas para preencher a quinta-feira porque a professora Elizandra de Literatura não atende no turno matutino").

Dados da Escola:
- Turmas Alvo e Cargas Horárias: ${JSON.stringify(targetClasses)}
- Professores e Disciplinas Habilitadas: ${JSON.stringify(teachers)}
- Blocos de Tempo (Aulas e Recreios): ${JSON.stringify(timeBlocks)}
- Lista Completa de Disciplinas: ${JSON.stringify(subjects || [])}

Retorne um objeto JSON estrito com:
- slots: Array de ScheduleSlot contendo: class_id, teacher_id, subject, day_of_week ('segunda'|'terca'|'quarta'|'quinta'|'sexta'), start_time, end_time.
- conflicts: Array de strings contendo explicações detalhadas de qualquer conflito, imprevisto ou restrição de professor encontrado.
- summary: String com um resumo explicativo da grade gerada e taxa de ocupação das turmas.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: promptText,
      config: {
        systemInstruction:
          'Você é um algoritmo e assistente sênior especialista do Colégio Reação utilizando o modelo Gemini 3.1 Flash Lite. REGRA ABSOLUTA: Não deixe horários vagos, respeite rigorosamente as cargas horárias das turmas e informe claramente qualquer motivo de conflito se houver.',
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
      return res.json({
        success: true,
        slots: parsedData.slots || [],
        conflicts: parsedData.conflicts || [],
        summary: parsedData.summary || 'Grade organizada pelo Gemini 3.1 Flash Lite.',
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
