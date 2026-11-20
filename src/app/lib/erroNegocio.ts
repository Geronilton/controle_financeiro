// Erro esperado, com mensagem segura para mostrar ao usuário.
// Qualquer outro erro continua sendo lançado normalmente.
export class ErroNegocio extends Error {}

export type ResultadoAcao = { erro?: string };