export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, title, body } = req.body || {};
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
}
