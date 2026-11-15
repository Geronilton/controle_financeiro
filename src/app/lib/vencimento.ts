function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate(); // mes de 1 a 12
}

function somarMeses(ano: number, mes: number, quantidade: number) {
  const total = ano * 12 + (mes - 1) + quantidade;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

/**
 * Vencimento da fatura em que a compra cai.
 * Recebe e devolve "AAAA-MM-DD" (formato do input type="date").
 */
export function calcularVencimento(
  dataMovimentacao: string,
  diaFechamento: number,
  diaVencimento: number
): string {
  const [ano, mes, dia] = dataMovimentacao.split("-").map(Number);

  // 1) Em qual fatura a compra cai: até o fechamento (inclusive),
  //    na fatura que fecha neste mês; depois, na do mês seguinte.
  const fechamentoDoMes = Math.min(diaFechamento, ultimoDiaDoMes(ano, mes));
  const mesesAteFechar = dia <= fechamentoDoMes ? 0 : 1;
  const fechamento = somarMeses(ano, mes, mesesAteFechar);

  // 2) Quando essa fatura vence: vencimento depois do fechamento
  //    é no mesmo mês; senão, no mês seguinte.
  const mesesAteVencer = diaVencimento > diaFechamento ? 0 : 1;
  const vencimento = somarMeses(fechamento.ano, fechamento.mes, mesesAteVencer);

  // Meses curtos usam o último dia (ex.: dia 31 em fevereiro vira 28)
  const diaFinal = Math.min(
    diaVencimento,
    ultimoDiaDoMes(vencimento.ano, vencimento.mes)
  );

  return `${vencimento.ano}-${String(vencimento.mes).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`;
}

function lerDiaDoMes(
  valor: FormDataEntryValue | null,
  nome: string
): number | null {
  const texto = valor?.toString().trim();
  if (!texto) return null;

  const dia = Number(texto);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
    throw new Error(`O dia de ${nome} deve ser entre 1 e 31.`);
  }
  return dia;
}

export function lerDiasDaFatura(formData: FormData) {
  const diaFechamento = lerDiaDoMes(formData.get("diaFechamento"), "fechamento");
  const diaVencimento = lerDiaDoMes(formData.get("diaVencimento"), "vencimento");

  if ((diaFechamento === null) !== (diaVencimento === null)) {
    throw new Error(
      "Informe o dia de fechamento e o de vencimento, ou deixe os dois em branco."
    );
  }

  return { diaFechamento, diaVencimento };
}