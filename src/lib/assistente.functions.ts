import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mensagemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const entradaSchema = z.object({
  mensagens: z.array(mensagemSchema).min(1).max(30),
  pacienteNome: z.string().max(120).default(""),
});

export type Sugestao = {
  nome: string;
  dosagem: string;
  intervalo_horas: number;
  primeiro_horario: string;
  continuo: boolean;
  data_fim: string | null;
  instrucoes: string | null;
};

export type RespostaAssistente = {
  resposta: string;
  sugestao: Sugestao | null;
};

const SISTEMA = `Você é a assistente do AICare, um aplicativo de lembretes de medicamentos usado por pessoas idosas e por cuidadores no Brasil.
Fale sempre em português do Brasil, com frases curtas, gentis e simples.
Seu trabalho é entender o medicamento que a pessoa descreve e preencher a ficha dele.
Pergunte apenas o que faltar: nome do remédio, dosagem, de quantas em quantas horas, horário da primeira dose do dia, e se o uso é contínuo ou até uma data.
Quando tiver todas as informações, chame a função registrar_medicamento e escreva uma frase pedindo a confirmação.
Nunca dê conselhos médicos, não sugira doses e não mude o que foi receitado. Se perguntarem sobre saúde, oriente a falar com o médico ou farmacêutico.`;

export const conversarComAssistente = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entradaSchema.parse(data))
  .handler(async ({ data }): Promise<RespostaAssistente> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return {
        resposta: "A assistente está indisponível agora. Tente novamente em alguns instantes.",
        sugestao: null,
      };
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const contexto = `Data de hoje: ${hoje}.${
      data.pacienteNome ? ` Os remédios são para: ${data.pacienteNome}.` : ""
    }`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: `${SISTEMA}\n${contexto}` },
          ...data.mensagens,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "registrar_medicamento",
              description: "Registra a ficha do medicamento descrito pela pessoa.",
              parameters: {
                type: "object",
                properties: {
                  nome: { type: "string", description: "Nome do medicamento" },
                  dosagem: { type: "string", description: "Ex.: 50 mg, 1 comprimido, 10 gotas" },
                  intervalo_horas: {
                    type: "integer",
                    description: "De quantas em quantas horas (24 = uma vez por dia)",
                  },
                  primeiro_horario: {
                    type: "string",
                    description: "Horário da primeira dose do dia no formato HH:MM",
                  },
                  continuo: { type: "boolean", description: "true se o uso for contínuo" },
                  data_fim: {
                    type: "string",
                    description: "Data final no formato AAAA-MM-DD quando não for contínuo",
                  },
                  instrucoes: {
                    type: "string",
                    description: "Observação curta, ex.: tomar com água, após o almoço",
                  },
                },
                required: ["nome", "dosagem", "intervalo_horas", "primeiro_horario", "continuo"],
              },
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const detalhe = await res.text();
      console.error("Falha na assistente", res.status, detalhe);
      return {
        resposta:
          res.status === 429
            ? "Muitas pessoas conversando agora. Espere um instante e mande de novo, por favor."
            : "Não consegui entender agora. Pode repetir com outras palavras?",
        sugestao: null,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
        };
      }>;
    };

    const message = json.choices?.[0]?.message;
    let sugestao: Sugestao | null = null;
    const chamada = message?.tool_calls?.find((t) => t.function?.name === "registrar_medicamento");
    if (chamada?.function?.arguments) {
      try {
        const bruto = JSON.parse(chamada.function.arguments) as Record<string, unknown>;
        sugestao = {
          nome: String(bruto["nome"] ?? "").slice(0, 120),
          dosagem: String(bruto["dosagem"] ?? "").slice(0, 80),
          intervalo_horas: Math.min(72, Math.max(1, Number(bruto["intervalo_horas"]) || 24)),
          primeiro_horario: /^\d{2}:\d{2}$/.test(String(bruto["primeiro_horario"]))
            ? String(bruto["primeiro_horario"])
            : "08:00",
          continuo: Boolean(bruto["continuo"]),
          data_fim:
            typeof bruto["data_fim"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(bruto["data_fim"])
              ? bruto["data_fim"]
              : null,
          instrucoes:
            typeof bruto["instrucoes"] === "string" && bruto["instrucoes"].trim()
              ? bruto["instrucoes"].slice(0, 200)
              : null,
        };
        if (sugestao.continuo) sugestao.data_fim = null;
      } catch (erro) {
        console.error("Não foi possível ler a ficha sugerida", erro);
      }
    }

    return {
      resposta:
        message?.content?.trim() ||
        (sugestao
          ? "Anotei assim. Pode confirmar os dados abaixo?"
          : "Me conte o nome do remédio, a dosagem e de quantas em quantas horas."),
      sugestao,
    };
  });
