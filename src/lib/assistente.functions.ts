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
  quantidade_estoque: number;
  unidade_estoque: string;
};

export type RespostaAssistente = {
  resposta: string;
  sugestao: Sugestao | null;
};

const SISTEMA = `Você é a assistente do AICare, um aplicativo de lembretes de medicamentos usado por pessoas idosas e por cuidadores no Brasil.
Fale sempre em português do Brasil, com frases curtas, gentis e simples.
Seu trabalho é entender o medicamento que a pessoa descreve e preencher a ficha dele.
Pergunte apenas o que faltar: nome do remédio, dosagem, de quantas em quantas horas, horário da primeira dose do dia, se o uso é contínuo ou até uma data, e quanto do medicamento o cuidador tem atualmente em posse.
Para o estoque, pergunte a quantidade e a unidade correspondente, por exemplo: 30 comprimidos, 2 frascos, 100 mL ou 20 doses. A quantidade disponível é obrigatória para cadastrar o medicamento.
A informação de estoque será usada posteriormente para calcular por quanto tempo o medicamento deve durar e alertar quando estiver acabando.
Quando tiver todas as informações, chame a função registrar_medicamento e escreva uma frase pedindo a confirmação.
Nunca dê conselhos médicos, não sugira doses e não mude o que foi receitado. Se perguntarem sobre saúde, oriente a falar com o médico ou farmacêutico.`;

export const conversarComAssistente = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entradaSchema.parse(data))
  .handler(async ({ data }): Promise<RespostaAssistente> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return respostaLocal(data.mensagens);
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
              description: "Registra a ficha do medicamento, incluindo o estoque atualmente disponível.",
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
                  quantidade_estoque: {
                    type: "number",
                    description: "Quantidade do medicamento que o cuidador possui atualmente",
                  },
                  unidade_estoque: {
                    type: "string",
                    description: "Unidade da quantidade em estoque, ex.: comprimidos, cápsulas, gotas, mL, doses ou frascos",
                  },
                },
                required: [
                  "nome",
                  "dosagem",
                  "intervalo_horas",
                  "primeiro_horario",
                  "continuo",
                  "quantidade_estoque",
                  "unidade_estoque",
                ],
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

    // Se o cuidador acabou de informar o estoque diretamente (ex.: "60 comprimidos"),
    // não deixe o modelo voltar a perguntar a mesma coisa. O dado já está na conversa.
    const ultimaMensagemUsuario =
      [...data.mensagens].reverse().find((mensagem) => mensagem.role === "user")?.content ?? "";
    const estoqueInformadoDiretamente =
      /^\s*\d+(?:[.,]\d+)?\s*(comprimidos?|cápsulas?|capsulas?|frascos?|ml|mL|gotas?|doses?|ampolas?|unidades?)\s*[.!]?\s*$/i.test(
        ultimaMensagemUsuario,
      );
    const chamada = message?.tool_calls?.find((t) => t.function?.name === "registrar_medicamento");
    if (chamada?.function?.arguments) {
      try {
        const bruto = JSON.parse(chamada.function.arguments) as Record<string, unknown>;
        const quantidade = Number(bruto["quantidade_estoque"]);
        const unidade = String(bruto["unidade_estoque"] ?? "unidade").trim();

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
          quantidade_estoque: Number.isFinite(quantidade) ? Math.max(0, quantidade) : 0,
          unidade_estoque: unidade.slice(0, 40) || "unidade",
        };
        if (sugestao.continuo) sugestao.data_fim = null;
      } catch (erro) {
        console.error("Não foi possível ler a ficha sugerida", erro);
      }
    }

    if (!sugestao && estoqueInformadoDiretamente) {
      const respostaLocal = respostaLocal(data.mensagens);
      if (respostaLocal.sugestao) {
        return respostaLocal;
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


function respostaLocal(mensagens: Array<{ role: "user" | "assistant"; content: string }>): RespostaAssistente {
  const texto = mensagens
    .filter((mensagem) => mensagem.role === "user")
    .map((mensagem) => mensagem.content)
    .join(" ");

  const ultimo = mensagens[mensagens.length - 1]?.content ?? "";
  const nomeMatch = texto.match(/(?:^|[,.;])\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 -]{1,60}?)(?=,|\s+\d+(?:[.,]\d+)?\s*(?:mg|mcg|g|ml|mL|%|ui|UI)|\s+de\s+\d+\s*(?:em\s+\d+)?\s*h)/i);
  const dosagemMatch = texto.match(/\b(\d+(?:[.,]\d+)?)\s*(mg|mcg|g|ml|mL|%|ui|UI)\b/i);
  const intervaloMatch = texto.match(/(?:de\s*)?(\d{1,2})\s*(?:em\s*\s*\d{1,2}\s*)?h(?:oras)?/i);
  const horarioMatch =
    texto.match(/(?:primeira dose|primeiro horário|horário|às|as)\D{0,20}(\d{1,2})(?::|h)(\d{2})?/i) ||
    ultimo.match(/\b(\d{1,2})(?::|h)(\d{2})?\b/i);
  const estoqueMatch =
    texto.match(/(?:tenho|possuo|estoque|em posse|restam?|restante)\D{0,15}(\d+(?:[.,]\d+)?)\s*(comprimidos?|cápsulas?|capsulas?|frascos?|ml|mL|gotas?|doses?|ampolas?|unidades?)/i) ||
    ultimo.match(/\b(\d+(?:[.,]\d+)?)\s*(comprimidos?|cápsulas?|capsulas?|frascos?|ml|mL|gotas?|doses?|ampolas?|unidades?)\b/i);

  const nome = nomeMatch?.[1]?.trim() || "";
  const dosagem = dosagemMatch ? `${dosagemMatch[1]} ${dosagemMatch[2]}` : "";
  const intervalo_horas = intervaloMatch ? Number(intervaloMatch[1]) : 0;
  const primeiro_horario = horarioMatch
    ? `${horarioMatch[1].padStart(2, "0")}:${(horarioMatch[2] ?? "00").padStart(2, "0")}`
    : "";
  const quantidade_estoque = estoqueMatch ? Number(estoqueMatch[1].replace(",", ".")) : 0;
  const unidade_estoque = estoqueMatch?.[2] ?? "";

  if (!nome || !dosagem || !intervalo_horas) {
    return {
      resposta: "Me passe o nome do remédio, a dosagem e de quantas em quantas horas ele deve ser tomado.",
      sugestao: null,
    };
  }

  if (!primeiro_horario) {
    return {
      resposta: `Entendi: ${nome}, ${dosagem}, a cada ${intervalo_horas} horas. Qual é o horário da primeira dose do dia?`,
      sugestao: null,
    };
  }

  if (!estoqueMatch) {
    return {
      resposta: "Qual é a quantidade que você tem em estoque e qual é a unidade? Ex.: 30 comprimidos, 2 frascos ou 60 mL.",
      sugestao: null,
    };
  }

  const sugestao: Sugestao = {
    nome,
    dosagem,
    intervalo_horas: Math.min(72, Math.max(1, intervalo_horas)),
    primeiro_horario,
    continuo: true,
    data_fim: null,
    instrucoes: null,
    quantidade_estoque: Math.max(0, quantidade_estoque),
    unidade_estoque: unidade_estoque.slice(0, 40),
  };

  return {
    resposta: `Anotei ${nome}. Confira os dados abaixo e confirme para cadastrar.`,
    sugestao,
  };
}
