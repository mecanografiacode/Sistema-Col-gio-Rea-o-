import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { objective, targetAudience, contentType, quantity, customNotes } = req.body || {};

    const apiKey = process.env.GEMINI_API_KEY;
    const ai = apiKey
      ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        })
      : null;

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
        return res.status(200).json({ success: true, ideas: parsed, source: 'gemini' });
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
      }
    ];

    return res.status(200).json({ success: true, ideas: fallbackIdeas, source: 'fallback' });
  } catch (error: any) {
    console.error('Error generating marketing ideas:', error);
    return res.status(500).json({ error: error.message || 'Falha ao gerar ideias com IA' });
  }
}
