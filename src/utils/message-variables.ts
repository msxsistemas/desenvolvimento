/**
 * Message variables system for WhatsApp templates.
 * Maps template variables to actual client/system data.
 */

export interface MessageVariable {
  key: string;
  label: string;
  description: string;
  sampleValue: string;
}

/**
 * All available message variables mapped to real system data.
 * Only includes variables that have corresponding data in the database.
 */
export const messageVariables: MessageVariable[] = [
  { key: "{saudacao}", label: "Saudação", description: "Saudação baseada no horário (Bom dia/Boa tarde/Boa noite)", sampleValue: "Bom dia" },
  { key: "{nome_cliente}", label: "Nome do Cliente", description: "Nome completo do cliente", sampleValue: "Fulano da Silva" },
  { key: "{sobrenome}", label: "Sobrenome", description: "Último nome do cliente", sampleValue: "Silva" },
  { key: "{whatsapp}", label: "WhatsApp", description: "Número do WhatsApp do cliente", sampleValue: "11999999999" },
  { key: "{email}", label: "E-mail", description: "E-mail do cliente", sampleValue: "fulano@email.com" },
  { key: "{usuario}", label: "Usuário", description: "Usuário de acesso do cliente", sampleValue: "usuario123" },
  { key: "{senha}", label: "Senha", description: "Senha de acesso do cliente", sampleValue: "****" },
  { key: "{vencimento}", label: "Vencimento", description: "Data de vencimento do cliente", sampleValue: "10/10/2025" },
  { key: "{nome_plano}", label: "Nome do Plano", description: "Nome do plano do cliente", sampleValue: "Plano Completo" },
  { key: "{valor_plano}", label: "Valor do Plano", description: "Valor do plano do cliente", sampleValue: "R$ 40,00" },
  { key: "{desconto}", label: "Desconto", description: "Valor do desconto aplicado", sampleValue: "R$ 5,00" },
  { key: "{pix}", label: "Chave PIX", description: "Chave PIX para pagamento", sampleValue: "pix@techplay.com" },
  { key: "{obs}", label: "Observação", description: "Observação do cliente", sampleValue: "Cliente VIP" },
  { key: "{app}", label: "Aplicativo", description: "Aplicativo do cliente", sampleValue: "App Premium" },
  { key: "{dispositivo}", label: "Dispositivo", description: "Dispositivo do cliente", sampleValue: "Smart TV" },
  { key: "{telas}", label: "Telas", description: "Quantidade de telas do cliente", sampleValue: "2" },
  { key: "{mac}", label: "MAC", description: "Endereço MAC do dispositivo", sampleValue: "AA:BB:CC:DD:EE:FF" },
  { key: "{link_fatura}", label: "Link da Fatura", description: "Link de pagamento da fatura do cliente", sampleValue: "https://seusite.com/fatura/abc123" },
  { key: "{fatura_pdf}", label: "Fatura PDF", description: "Link para download da fatura em PDF", sampleValue: "https://seusite.com/fatura/abc123/pdf" },
];

/** List of variable keys for display */
export const availableVariableKeys = messageVariables.map(v => v.key);

/** Sample data map for preview rendering */
export const sampleDataMap: Record<string, string> = Object.fromEntries(
  messageVariables.map(v => [v.key, v.sampleValue])
);

/**
 * Generate a greeting based on the current hour.
 */
export function getSaudacao(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Replace template variables in a message with actual client data.
 * @param template - The message template containing {variables}
 * @param clientData - Object with client data from the database
 * @param extraData - Additional data (e.g., pix key from config)
 * @returns The processed message with variables replaced
 */
export function replaceMessageVariables(
  template: string,
  clientData: {
    nome?: string;
    whatsapp?: string;
    email?: string;
    usuario?: string;
    senha?: string;
    data_vencimento?: string;
    plano?: string;
    produto?: string;
    desconto?: string;
    observacao?: string;
    app?: string;
    dispositivo?: string;
    telas?: number;
    mac?: string;
  },
  extraData?: {
    pix?: string;
    valor_plano?: string;
    total?: string;
    link_fatura?: string;
    fatura_pdf?: string;
  }
): string {
  if (!template) return "";

  let result = template;

  // Extract first and last name
  const nomeCompleto = clientData.nome || "";
  const partes = nomeCompleto.trim().split(" ");
  const primeiroNome = partes[0] || "";
  const sobrenome = partes.length > 1 ? partes.slice(1).join(" ") : "";

  // Format date
  let vencimentoFormatado = "";
  if (clientData.data_vencimento) {
    try {
      const date = new Date(clientData.data_vencimento);
      vencimentoFormatado = date.toLocaleDateString("pt-BR");
    } catch {
      vencimentoFormatado = clientData.data_vencimento;
    }
  }

  const replacements: Record<string, string> = {
    "{saudacao}": getSaudacao(),
    "{nome_cliente}": nomeCompleto,
    "{nome}": primeiroNome,
    "{cliente}": nomeCompleto,
    "{sobrenome}": sobrenome,
    "{whatsapp}": clientData.whatsapp || "",
    "{email}": clientData.email || "",
    "{usuario}": clientData.usuario || "",
    "{senha}": clientData.senha || "",
    "{vencimento}": vencimentoFormatado,
    "{data_vencimento}": vencimentoFormatado,
    "{nome_plano}": clientData.plano || "",
    "{plano}": clientData.plano || "",
    "{valor_plano}": extraData?.valor_plano || "",
    "{valor}": extraData?.valor_plano || "",
    "{desconto}": clientData.desconto || "",
    "{total}": extraData?.total || "",
    "{pix}": extraData?.pix || "",
    "{obs}": clientData.observacao || "",
    "{app}": clientData.app || "",
    "{dispositivo}": clientData.dispositivo || "",
    "{telas}": clientData.telas?.toString() || "",
    "{mac}": clientData.mac || "",
    "{link_fatura}": extraData?.link_fatura || "",
    "{fatura_pdf}": extraData?.fatura_pdf || "",
  };

  Object.entries(replacements).forEach(([key, value]) => {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  // Replace {br} with line breaks
  result = result.replace(/{br}/g, '\n');

  return result;
}
