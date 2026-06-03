export default {
  async fetch(request, env) {
    // # CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.FRONTEND_URL || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, message: "Método não permitido." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const { nome, email, telefone, tipo_contacto, mensagem, botcheck } = await request.json();

      // # Honeypot
      if (botcheck) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // # Validação
      if (!nome || !email || !mensagem) {
        return new Response(JSON.stringify({ ok: false, message: "Preenche os campos obrigatórios." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(JSON.stringify({ ok: false, message: "Email inválido." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // # Enviar via Resend
      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Site Contactos <onboarding@resend.dev>",
          to: env.EMAIL_DESTINO,
          reply_to: email,
          subject: `Nova mensagem de ${nome} — ${tipo_contacto || "sem tipo"}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2>Nova mensagem do site</h2>
              <p><strong>Nome:</strong> ${nome}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Telefone:</strong> ${telefone || "—"}</p>
              <p><strong>Tipo de contacto:</strong> ${tipo_contacto || "—"}</p>
              <hr>
              <p><strong>Mensagem:</strong></p>
              <p>${mensagem.replace(/\n/g, "<br>")}</p>
            </div>
          `,
        }),
      });

      if (!resendRes.ok) {
        const err = await resendRes.json();
        console.error("Resend error:", err);
        return new Response(JSON.stringify({ ok: false, message: "Erro ao enviar email." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, message: "Mensagem enviada com sucesso." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err) {
      console.error("Worker error:", err);
      return new Response(JSON.stringify({ ok: false, message: "Erro interno." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};