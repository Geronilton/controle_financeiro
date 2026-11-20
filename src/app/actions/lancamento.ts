"use server";

import { prisma } from "@/app/lib/prisma";
import {
  TipoLancamento,
  StatusLancamento,
  StatusParcela,
  TipoPagamento,
  OrigemLancamento,
  Periodicidade,
  Prisma
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuarioId } from "../lib/auth";
import { ErroNegocio, type ResultadoAcao } from "../lib/erroNegocio";

type DadosLancamento = {
  descricao: string;
  valor: number;
  valorPago: number;
  tipo: TipoLancamento;
  status: StatusLancamento;
  formaPagamento: TipoPagamento | null;
  periodicidade: Periodicidade | null;
  quantidadeParcelas: number;
  dataLancamento: Date;
  dataVencimento: Date | null;
  usuarioId: number;
  categoriaId: number | null;
  contaFinanceiraId: number | null;
  participanteId: number | null;
};

type EstadoLancamento = {
  tipo: TipoLancamento;
  valorPago: number;
  contaFinanceiraId: number | null;
};

type LancamentoComParcelas = Prisma.LancamentoGetPayload<{
  include: {
    parcelas: true;
  };
}>;

type ParcelaLancamento = LancamentoComParcelas["parcelas"][number];

type PagamentoFatura =
  | {
      tipo: "LANCAMENTO";
      lancamentoId: LancamentoComParcelas["id"];
      valorCentavos: number;
      valorFinalCentavos: number;
      valorPagoAnteriorCentavos: number;
    }
  | {
      tipo: "PARCELA";
      lancamentoId: LancamentoComParcelas["id"];
      parcelaId: ParcelaLancamento["id"];
      valorCentavos: number;
    };

const emCentavos = (valor: number) =>
  Math.round(valor * 100);

const deCentavos = (valor: number) => valor / 100;

export async function Dados_dashboard() {
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }

  // Intervalo do mês atual
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const [
    contasFinanceiras,
    entradas,
    dividas,
    ultimosLancamentos,
  ] = await Promise.all([

    // Contas financeiras ativas
    prisma.contaFinanceira.findMany({
      where: {
        usuarioId,
        ativo: true,
      },
      select: {
        saldo: true,
      },
    }),

    // Entradas pagas vinculadas a contas ativas
    prisma.lancamento.aggregate({
      where: {
        usuarioId,
        tipo: "ENTRADA",
        status: "PAGO",
        contaFinanceira: {
          ativo: true,
        },
      },
      _sum: {
        valorPago: true,
      },
    }),

    // Dívidas pendentes com vencimento no mês atual (qualquer participante)
    prisma.lancamento.findMany({
      where: {
        usuarioId,
        tipo: "SAIDA",
        OR: [
          // Lançamento normal: status e vencimento próprios
          {
            quantidadeParcelas: { lte: 1 },
            status: "PENDENTE",
            dataVencimento: {
              gte: inicioMes,
              lt: fimMes,
            },
          },
          // Lançamento parcelado: considera só as parcelas pendentes do mês,
          // independente do status do lançamento pai
          {
            quantidadeParcelas: { gt: 1 },
            parcelas: {
              some: {
                status: "PENDENTE",
                vencimento: {
                  gte: inicioMes,
                  lt: fimMes,
                },
              },
            },
          },
        ],
      },
      include: {
        parcelas: {
          where: {
            status: "PENDENTE",
            vencimento: {
              gte: inicioMes,
              lt: fimMes,
            },
          },
        },
      },
    }),

    // Últimos lançamentos
    prisma.lancamento.findMany({
      where: {
        usuarioId,
      },
      orderBy: {
        dataLancamento: "desc",
      },
      take: 5,
    }),
  ]);

  const saldo = contasFinanceiras.reduce(
    (total, conta) => total + Number(conta.saldo),
    0
  );

  const totalEntradas = Number(entradas._sum.valorPago ?? 0);

  const totalDividas = dividas.reduce((total, lancamento) => {
    if (lancamento.quantidadeParcelas > 1) {
      const valorParcelasPendentes = lancamento.parcelas.reduce(
        (subtotal, parcela) => subtotal + Number(parcela.valorParcela),
        0
      );
      return total + valorParcelasPendentes;
    }

    const valorPendente =
      Number(lancamento.valor) - Number(lancamento.valorPago);

    return total + Math.max(valorPendente, 0);
  }, 0);

  return {
    saldo,
    totalEntradas,
    totalDividas,
    ultimosLancamentos,
  };
}


export async function Novo_lancamento(
  formData: FormData
) {

  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  const dados = obterDadosLancamento(formData, usuarioId);

  try {
    await prisma.$transaction(async (tx) => {
      if (!dados.contaFinanceiraId) {
        throw new ErroNegocio(
          "Todo lançamento deve estar vinculado a uma conta financeira."
        );
      }

      const conta = await tx.contaFinanceira.findFirst({
        where: { id: dados.contaFinanceiraId, usuarioId, ativo: true },
      });

      if (!conta) {
        throw new ErroNegocio("Conta financeira não encontrada.");
      }

      if (dados.periodicidade) {
        await criarRecorrencia(tx, dados);
        return;
      }

      const lancamento = await criarLancamento(tx, dados);
      await criarParcelas(tx, lancamento.id, dados);

    const movimentaAgora =
      dados.status === StatusLancamento.PAGO &&
      dados.quantidadeParcelas === 1 &&
      (
      dados.tipo === TipoLancamento.ENTRADA
        ? dados.formaPagamento !== TipoPagamento.CARTAO
        : dados.formaPagamento !== TipoPagamento.CARTAO
      );

      if (movimentaAgora) {
        await movimentarSaldo(tx, usuarioId, conta, dados.tipo, dados.valorPago);
      }
    });
  } catch (e) {
    if (e instanceof ErroNegocio) return { erro: e.message };
    throw e;
  }

  revalidatePath("/lancamento/listar");
  revalidatePath("/conta-financeira");

  redirect("/lancamento/listar");
}

export async function Listar_lancamento(
  limite?: number
) {
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  return await prisma.lancamento.findMany({
    where: {
      usuarioId,
    },
    orderBy: {
      dataLancamento: "desc",
    },
    ...(limite && {
      take: limite,
    }),
  });
}

export async function Listar_recorrencias(limite?: number) {
  const usuarioId = await exigirUsuarioId();

  return await prisma.recorrencia.findMany({
    where: {
      usuarioId,
    },
    include: {
      categoria: true,
      contaFinanceira: true,
    },
    orderBy: {
      vencimento: "asc",
    },
    ...(limite && {
      take: limite,
    }),
  });
}


export async function Excluir_lancamento(id: number): Promise<ResultadoAcao> {
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const lancamento = await tx.lancamento.findFirst({
        where: { id, usuarioId },
      });

      if (!lancamento) {
        throw new ErroNegocio("Lançamento não encontrado.");
      }

      const quantidadeParcelas = await tx.parcela.count({
        where: { lancamentoId: lancamento.id },
      });

      // mesma condição usada ao criar (movimentaAgora)
      const movimentouSaldo =
        lancamento.status === StatusLancamento.PAGO &&
        lancamento.contaFinanceiraId !== null &&
        (lancamento.tipo === TipoLancamento.ENTRADA || quantidadeParcelas <= 1);

      if (movimentouSaldo) {
        const contaId = lancamento.contaFinanceiraId!;
        const valor = Number(lancamento.valorPago);

        if (lancamento.tipo === TipoLancamento.ENTRADA) {
          // retirar a entrada do saldo, sem deixar a conta negativa
          const { count } = await tx.contaFinanceira.updateMany({
            where: { id: contaId, usuarioId, saldo: { gte: valor } },
            data: { saldo: { decrement: valor } },
          });

          if (count === 0) {
            throw new ErroNegocio(
              "Não é possível excluir: o saldo atual da conta é menor que o valor desta entrada."
            );
          }
        } else {
          // devolver a saída ao saldo
          await tx.contaFinanceira.update({
            where: { id: contaId, usuarioId },
            data: { saldo: { increment: valor } },
          });
        }
      }

      await tx.parcela.deleteMany({
        where: { lancamentoId: lancamento.id },
      });

      await tx.lancamento.delete({
        where: { id: lancamento.id },
      });
    });
  } catch (e) {
    if (e instanceof ErroNegocio) return { erro: e.message };
    throw e;
  }

  revalidatePath("/lancamento/listar");
  revalidatePath("/conta-financeira");
  revalidatePath("/");

  return {};
}

export async function Pausar_recorrencia(id: number) {
  const usuarioId = await exigirUsuarioId();

  const recorrencia = await prisma.recorrencia.findFirst({
    where: {
      id,
      usuarioId,
    },
  });

  if (!recorrencia) {
    throw new Error("Recorrência não encontrada.");
  }

  await prisma.recorrencia.update({
    where: {
      id: recorrencia.id,
    },
    data: {
      ativo: false,
    },
  });

  revalidatePath("/lancamento/listar");
}

export async function Ativar_recorrencia(id: number) {
  const usuarioId = await exigirUsuarioId();

  const recorrencia = await prisma.recorrencia.findFirst({
    where: {
      id,
      usuarioId,
    },
  });

  if (!recorrencia) {
    throw new Error("Recorrência não encontrada.");
  }

  await prisma.recorrencia.update({
    where: {
      id: recorrencia.id,
    },
    data: {
      ativo: true,
    },
  });

  revalidatePath("/recorrencias");
} 

export async function Editar_recorrencia(
  id: number,
  formData: FormData
) {
  const usuarioId = await exigirUsuarioId();
  const descricao =
    formData.get("descricao")?.toString() ?? "";

  const valor = Number(
    formData.get("valor")
  );

  const tipo =
    formData.get("tipo") as TipoLancamento;

  const status =
    formData.get("status") as StatusLancamento;

  const formaPagamento =
    formData.get("formaPagamento") as TipoPagamento;

  const periodicidade =
    formData.get("periodicidade") as Periodicidade;

  const valorPagoInformado = Number(
    formData.get("valorPago") ?? 0
  );

  const valorPago =
    formaPagamento === "PIX" ||
      formaPagamento === "DINHEIRO"
      ? valor
      : valorPagoInformado;

  const dataVencimento =
    formData.get("dataVencimento")
      ? new Date(
        formData
          .get("dataVencimento")!
          .toString()
      )
      : null;

  const categoriaId =
    formData.get("categoriaId")
      ? Number(formData.get("categoriaId"))
      : null;

  const contaFinanceiraId =
    formData.get("contaFinanceiraId")
      ? Number(
        formData.get("contaFinanceiraId")
      )
      : null;

  const participanteId =
    formData.get("participanteId")
      ? Number(
        formData.get("participanteId")
      )
      : null;

  if (!descricao) {
    throw new Error(
      "Descrição é obrigatória."
    );
  }

  if (!valor || valor <= 0) {
    throw new Error(
      "Valor deve ser maior que zero."
    );
  }

  if (!periodicidade) {
    throw new Error(
      "Informe a periodicidade."
    );
  }

  if (!dataVencimento) {
    throw new Error(
      "Informe o vencimento."
    );
  }

  await prisma.$transaction(async (tx) => {

    await tx.recorrencia.update({
      where: {
        id,
        usuarioId,
      },

      data: {
        descricao,
        valor,
        tipo,
        status,
        formaPagamento,
        periodicidade,
        vencimento: dataVencimento,
        categoriaId,
        contaFinanceiraId,
      },
    });

    /*
     * Atualiza somente o primeiro lançamento
     * da recorrência.
     *
     * Os lançamentos históricos não são alterados.
     */
    const primeiroLancamento =
      await tx.lancamento.findFirst({
        where: {
          recorrenciaId: id,
          usuarioId,

        },
        orderBy: {
          dataLancamento: "asc",
        },
      });

    if (primeiroLancamento) {
      await tx.lancamento.update({
        where: {
          id: primeiroLancamento.id,
        },

        data: {
          descricao,
          valor,
          valorPago,
          tipo,
          status,
          formaPagamento,
          dataVencimento,
          categoriaId,
          contaFinanceiraId,
          participanteId,
        },
      });
    }
  });

  revalidatePath("/lancamento/listar");

  redirect("/lancamento/listar");
}

export async function Editar_lancamento(
  id: number,
  formData: FormData
): Promise<ResultadoAcao> {
  const usuarioId = await exigirUsuarioId();

  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }

  let dados: DadosLancamento;

  // Reutiliza a mesma função de leitura e validação
  // utilizada na criação do lançamento.
  try {
    dados = obterDadosLancamento(formData, usuarioId);
  } catch (e) {
    if (e instanceof Error) {
      return { erro: e.message };
    }

    throw e;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const lancamento = await tx.lancamento.findFirst({
        where: {
          id,
          usuarioId,
        },
        include: {
          parcelas: {
            orderBy: {
              numeroParcela: "asc",
            },
          },
        },
      });

      if (!lancamento) {
        throw new ErroNegocio("Lançamento não encontrado.");
      }

      if (
        lancamento.contaFinanceiraId !== null &&
        lancamento.contaFinanceiraId !== dados.contaFinanceiraId
      ) {
        throw new ErroNegocio(
          "A conta financeira do lançamento não pode ser alterada."
        );
      }

      if (
        dados.tipo === TipoLancamento.SAIDA &&
        dados.contaFinanceiraId === null
      ) {
        throw new ErroNegocio(
          "Toda saída deve estar vinculada a uma conta financeira."
        );
      }

      const conta = dados.contaFinanceiraId
        ? await tx.contaFinanceira.findFirst({
            where: {
              id: dados.contaFinanceiraId,
              usuarioId,
            },
          })
        : null;

      if (dados.contaFinanceiraId !== null && !conta) {
        throw new ErroNegocio(
          "Conta financeira não encontrada."
        );
      }

      // 1. Calcula o efeito financeiro antigo.
      const efeitoAntigo = efeitoNoSaldo({
        tipo: lancamento.tipo,
        valorPago: Number(lancamento.valorPago),
        contaFinanceiraId: lancamento.contaFinanceiraId,
      });

      // 2. Sincroniza as parcelas e obtém o valor realmente pago.
      const resultadoParcelas = await sincronizarParcelas(
        tx,
        lancamento,
        dados
      );

      // 3. Calcula o efeito financeiro novo.
      const efeitoNovo = efeitoNoSaldo({
        tipo: dados.tipo,
        valorPago: resultadoParcelas.valorPago,
        contaFinanceiraId: dados.contaFinanceiraId,
      });

      // 4. Calcula a diferença em centavos.
      const ajusteCentavos = calcularAjusteSaldoCentavos(
        efeitoAntigo,
        efeitoNovo
      );

      // 5. Atualiza o lançamento.
      const { count } = await tx.lancamento.updateMany({
        where: {
          id: lancamento.id,
          usuarioId,
          tipo: lancamento.tipo,
          status: lancamento.status,
          valorPago: lancamento.valorPago,
          contaFinanceiraId: lancamento.contaFinanceiraId,
        },
        data: {
          descricao: dados.descricao,
          valor: dados.valor,
          valorPago: resultadoParcelas.valorPago,
          tipo: dados.tipo,
          status: resultadoParcelas.status,
          quantidadeParcelas: dados.quantidadeParcelas,
          formaPagamento: dados.formaPagamento,
          dataLancamento: dados.dataLancamento,
          dataVencimento: dados.dataVencimento,
          categoriaId: dados.categoriaId,
          contaFinanceiraId: dados.contaFinanceiraId,
          participanteId: dados.participanteId,
        },
      });

      if (count === 0) {
        throw new ErroNegocio(
          "Este lançamento foi alterado por outra operação. Recarregue a página e tente novamente."
        );
      }

      // 6. Ajusta o saldo da conta.
      // Não utiliza conta.cartaoCredito como bloqueio.
      if (ajusteCentavos !== 0 && conta) {
        await aplicarAjusteSaldo(
          tx,
          usuarioId,
          conta,
          ajusteCentavos
        );
      }
    });
  } catch (e) {
    if (e instanceof ErroNegocio) {
      return { erro: e.message };
    }

    throw e;
  }

  revalidatePath("/lancamento/listar");
  revalidatePath("/conta-financeira");
  revalidatePath("/fatura");
  revalidatePath("/");

  redirect("/lancamento/listar");
}

export async function Processar_recorrencias() {
  const agora = new Date();
  const usuarioId = await exigirUsuarioId();

  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }

  const limiteAntecipacao = new Date(agora);
  limiteAntecipacao.setDate(limiteAntecipacao.getDate() + 10);

  const recorrencias = await prisma.recorrencia.findMany({
    where: {
      ativo: true,
      usuarioId,
    },
  });

  for (const recorrencia of recorrencias) {
    await prisma.$transaction(
      async (tx) => {
        const ultimoLancamento = await tx.lancamento.findFirst({
          where: {
            recorrenciaId: recorrencia.id,
            origem: OrigemLancamento.RECORRENCIA,
          },
          orderBy: {
            dataVencimento: "desc",
          },
        });

        let vencimento = ultimoLancamento
          ? proximoVencimento(
              ultimoLancamento.dataVencimento!,
              recorrencia.periodicidade
            )
          : new Date(recorrencia.vencimento);

        while (vencimento <= limiteAntecipacao) {
          try {
            await tx.lancamento.create({
              data: {
                descricao: recorrencia.descricao,
                valor: recorrencia.valor,
                valorPago: 0,

                tipo: recorrencia.tipo,
                status: StatusLancamento.PENDENTE,
                formaPagamento: recorrencia.formaPagamento,

                dataLancamento: new Date(),
                dataVencimento: vencimento,

                origem: OrigemLancamento.RECORRENCIA,
                quantidadeParcelas: 1,

                usuarioId: recorrencia.usuarioId,
                categoriaId: recorrencia.categoriaId,
                contaFinanceiraId: recorrencia.contaFinanceiraId,
                participanteId: ultimoLancamento?.participanteId ?? null,

                recorrenciaId: recorrencia.id,
              },
            });
          } catch (erro) {
            if (
              erro instanceof Prisma.PrismaClientKnownRequestError &&
              erro.code === "P2002"
            ) {
              // já existe lançamento pra esse vencimento — segue o loop
            } else {
              throw erro;
            }
          }

          vencimento = proximoVencimento(vencimento, recorrencia.periodicidade);
        }
      },
      { timeout: 30000 }
    );
  }
}

function proximoVencimento(
  data: Date,
  periodicidade: Periodicidade
): Date {
  const proximo = new Date(data);

  switch (periodicidade) {
    case Periodicidade.DIARIA:
      proximo.setDate(proximo.getDate() + 1);
      break;

    case Periodicidade.SEMANAL:
      proximo.setDate(proximo.getDate() + 7);
      break;

    case Periodicidade.ANUAL:
      proximo.setFullYear(proximo.getFullYear() + 1);
      break;

    case Periodicidade.MENSAL:
    default: {
      const dia = proximo.getDate();
      proximo.setDate(1); 
      proximo.setMonth(proximo.getMonth() + 1);

      const ultimoDiaDoMes = new Date(
        proximo.getFullYear(),
        proximo.getMonth() + 1,
        0
      ).getDate();

      proximo.setDate(Math.min(dia, ultimoDiaDoMes));
      break;
    }
  }

  return proximo;
}

export async function Pagar_fatura(
  participanteId: number,
  formData: FormData
) {
  const usuarioId = await exigirUsuarioId();

  const contaFinanceiraId = Number(formData.get("contaFinanceiraId"));
  const mes = Number(formData.get("mes"));
  const ano = Number(formData.get("ano"));

  if (!Number.isInteger(participanteId) || participanteId <= 0) {
    throw new Error("Participante não informado.");
  }

  if (!Number.isInteger(contaFinanceiraId) || contaFinanceiraId <= 0) {
    throw new Error("Selecione a conta financeira.");
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error("Mês inválido.");
  }

  if (!Number.isInteger(ano) || ano < 1) {
    throw new Error("Ano inválido.");
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      const participante = await tx.participante.findFirst({
        where: {
          id: participanteId,
          usuarioId,
          ativo: true,
        },
        select: { id: true },
      });

      if (!participante) {
        throw new Error("Participante não encontrado.");
      }

      const conta = await tx.contaFinanceira.findFirst({
        where: {
          id: contaFinanceiraId,
          usuarioId,
          ativo: true,
        },
      });

      if (!conta) {
        throw new Error("Conta financeira não encontrada.");
      }

      const inicioMes = new Date(ano, mes - 1, 1);
      const inicioProximoMes = new Date(ano, mes, 1);

      const lancamentos = await tx.lancamento.findMany({
        where: {
          participanteId,
          usuarioId,
          tipo: TipoLancamento.SAIDA,
        },
        include: {
          parcelas: {
            orderBy: {
              numeroParcela: "asc",
            },
          },
        },
      });

      const pagamentos: PagamentoFatura[] = [];

      for (const lancamento of lancamentos) {
        // Lançamentos sem parcelamento
        if (lancamento.quantidadeParcelas <= 1) {
          if (!lancamento.dataVencimento) continue;

          const vencimento = new Date(lancamento.dataVencimento);

          const pertenceAoMes =
            vencimento >= inicioMes &&
            vencimento < inicioProximoMes;

          if (!pertenceAoMes) continue;

          const valorTotalCentavos = emCentavos(
            Number(lancamento.valor)
          );

          const valorPagoAnteriorCentavos = emCentavos(
            Number(lancamento.valorPago)
          );

          if (
            valorTotalCentavos <= 0 ||
            valorPagoAnteriorCentavos < 0 ||
            valorPagoAnteriorCentavos > valorTotalCentavos
          ) {
            throw new Error(
              `O lançamento "${lancamento.descricao}" possui valores inválidos.`
            );
          }

          if (
            lancamento.status === StatusLancamento.PAGO &&
            valorPagoAnteriorCentavos !== valorTotalCentavos
          ) {
            throw new Error(
              `O lançamento "${lancamento.descricao}" possui status incompatível com o valor pago.`
            );
          }

          const valorPendenteCentavos =
            valorTotalCentavos - valorPagoAnteriorCentavos;

          if (valorPendenteCentavos <= 0) continue;

          pagamentos.push({
            tipo: "LANCAMENTO",
            lancamentoId: lancamento.id,
            valorCentavos: valorPendenteCentavos,
            valorFinalCentavos: valorTotalCentavos,
            valorPagoAnteriorCentavos,
          });

          continue;
        }

        // Parcelas pendentes com vencimento no mês selecionado
        const parcelasDoMes = lancamento.parcelas.filter((parcela) => {
          const vencimento = new Date(parcela.vencimento);

          return (
            vencimento >= inicioMes &&
            vencimento < inicioProximoMes &&
            parcela.status === StatusParcela.PENDENTE
          );
        });

        for (const parcela of parcelasDoMes) {
          const valorCentavos = emCentavos(
            Number(parcela.valorParcela)
          );

          if (valorCentavos <= 0) {
            throw new Error(
              `A parcela ${parcela.numeroParcela} do lançamento "${lancamento.descricao}" possui valor inválido.`
            );
          }

          pagamentos.push({
            tipo: "PARCELA",
            lancamentoId: lancamento.id,
            parcelaId: parcela.id,
            valorCentavos,
          });
        }
      }

      if (pagamentos.length === 0) {
        throw new Error(
          "Nenhum gasto pendente encontrado nesta fatura."
        );
      }

      return executarPagamentosFatura(
        tx,
        usuarioId,
        conta,
        pagamentos
      );
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );

  revalidatePath("/fatura");
  revalidatePath("/lancamento");
  revalidatePath("/conta-financeira");
  revalidatePath("/");

  return {
    sucesso: true,
    mensagem:
      resultado.quantidadePagamentos === 1
        ? "Fatura paga com sucesso!"
        : `Fatura paga com sucesso! ${resultado.quantidadePagamentos} cobranças foram pagas.`,
    quantidadePagamentos: resultado.quantidadePagamentos,
    valorTotalPago: resultado.valorTotalPago,
    saldoRestante: resultado.saldoRestante,
  };
}

export async function Pagar_itens_fatura(
  participanteId: number,
  formData: FormData
) {
  const usuarioId = await exigirUsuarioId();

  const contaFinanceiraId = Number(formData.get("contaFinanceiraId"));

  const parcelaIds = [
    ...new Set(
      formData
        .getAll("parcelaIds")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  const lancamentoIds = [
    ...new Set(
      formData
        .getAll("lancamentoIds")
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  if (!Number.isInteger(participanteId) || participanteId <= 0) {
    throw new Error("Participante não informado.");
  }

  if (!Number.isInteger(contaFinanceiraId) || contaFinanceiraId <= 0) {
    throw new Error("Selecione a conta financeira.");
  }

  if (parcelaIds.length === 0 && lancamentoIds.length === 0) {
    throw new Error("Nenhum item foi selecionado para pagamento.");
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      const participante = await tx.participante.findFirst({
        where: {
          id: participanteId,
          usuarioId,
          ativo: true,
        },
        select: { id: true },
      });

      if (!participante) {
        throw new Error("Participante não encontrado.");
      }

      const conta = await tx.contaFinanceira.findFirst({
        where: {
          id: contaFinanceiraId,
          usuarioId,
          ativo: true,
        },
      });

      if (!conta) {
        throw new Error("Conta financeira não encontrada.");
      }

      const pagamentos: PagamentoFatura[] = [];

      // Parcelas selecionadas
      if (parcelaIds.length > 0) {
        const parcelas = await tx.parcela.findMany({
          where: {
            id: {
              in: parcelaIds,
            },
            status: StatusParcela.PENDENTE,
            lancamento: {
              usuarioId,
              participanteId,
              tipo: TipoLancamento.SAIDA,
            },
          },
        });

        if (parcelas.length !== parcelaIds.length) {
          throw new Error(
            "Uma ou mais parcelas não pertencem a esta fatura ou já foram pagas."
          );
        }

        for (const parcela of parcelas) {
          const valorCentavos = emCentavos(
            Number(parcela.valorParcela)
          );

          if (valorCentavos <= 0) {
            throw new Error("Uma parcela possui valor inválido.");
          }

          pagamentos.push({
            tipo: "PARCELA",
            lancamentoId: parcela.lancamentoId,
            parcelaId: parcela.id,
            valorCentavos,
          });
        }
      }

      // Lançamentos sem parcelamento
      if (lancamentoIds.length > 0) {
        const lancamentos = await tx.lancamento.findMany({
          where: {
            id: {
              in: lancamentoIds,
            },
            usuarioId,
            participanteId,
            tipo: TipoLancamento.SAIDA,
            quantidadeParcelas: {
              lte: 1,
            },
          },
        });

        if (lancamentos.length !== lancamentoIds.length) {
          throw new Error(
            "Um ou mais lançamentos não pertencem a esta fatura ou possuem parcelas."
          );
        }

        for (const lancamento of lancamentos) {
          const valorTotalCentavos = emCentavos(
            Number(lancamento.valor)
          );

          const valorPagoAnteriorCentavos = emCentavos(
            Number(lancamento.valorPago)
          );

          if (
            valorTotalCentavos <= 0 ||
            valorPagoAnteriorCentavos < 0 ||
            valorPagoAnteriorCentavos > valorTotalCentavos
          ) {
            throw new Error(
              `O lançamento "${lancamento.descricao}" possui valores inválidos.`
            );
          }

          if (
            lancamento.status === StatusLancamento.PAGO &&
            valorPagoAnteriorCentavos !== valorTotalCentavos
          ) {
            throw new Error(
              `O lançamento "${lancamento.descricao}" possui status incompatível com o valor pago.`
            );
          }

          const valorPendenteCentavos =
            valorTotalCentavos - valorPagoAnteriorCentavos;

          if (valorPendenteCentavos <= 0) {
            throw new Error(
              `O lançamento "${lancamento.descricao}" já está totalmente pago.`
            );
          }

          pagamentos.push({
            tipo: "LANCAMENTO",
            lancamentoId: lancamento.id,
            valorCentavos: valorPendenteCentavos,
            valorFinalCentavos: valorTotalCentavos,
            valorPagoAnteriorCentavos,
          });
        }
      }

      if (pagamentos.length === 0) {
        throw new Error("Nenhum item pendente foi encontrado.");
      }

      return executarPagamentosFatura(
        tx,
        usuarioId,
        conta,
        pagamentos
      );
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );

  revalidatePath("/fatura");
  revalidatePath("/lancamento");
  revalidatePath("/conta-financeira");
  revalidatePath("/");

  return {
    sucesso: true,
    mensagem:
      resultado.quantidadePagamentos === 1
        ? "Item pago com sucesso!"
        : `${resultado.quantidadePagamentos} itens foram pagos com sucesso.`,
    quantidadePagamentos: resultado.quantidadePagamentos,
    valorTotalPago: resultado.valorTotalPago,
    saldoRestante: resultado.saldoRestante,
  };
}



//Funções para action Novo lancamento

    //Obter dados
function obterDadosLancamento(
  formData: FormData,
  usuarioId: number
): DadosLancamento {
  const descricao =
    formData.get("descricao")?.toString().trim() ?? "";

  const valor = Number(formData.get("valor"));

  const tipo =
    formData.get("tipo") as TipoLancamento;

  const status =
    formData.get("status") as StatusLancamento;

  const formaPagamentoRaw =
    formData.get("formaPagamento")?.toString();

  const formaPagamento =
    formaPagamentoRaw
      ? (formaPagamentoRaw as TipoPagamento)
      : null;

  const valorPagoInformado = Number(
    formData.get("valorPago") ?? 0
  );

  const valorPago =
    status === StatusLancamento.PAGO
      ? valor
      : valorPagoInformado;

  const periodicidadeRaw =
    formData.get("periodicidade")?.toString();

  const periodicidade =
    periodicidadeRaw
      ? (periodicidadeRaw as Periodicidade)
      : null;

  const quantidadeParcelas = Number(
    formData.get("quantidadeParcelas") ?? 1
  );

  const dataLancamento = new Date(
    formData.get("dataLancamento")?.toString() ??
    new Date()
  );

  const dataVencimento = formData.get("dataVencimento")
    ? new Date(
      formData.get("dataVencimento")!.toString()
    )
    : null;

  const categoriaId = formData.get("categoriaId")
    ? Number(formData.get("categoriaId"))
    : null;

  const contaFinanceiraId =
    formData.get("contaFinanceiraId")
      ? Number(formData.get("contaFinanceiraId"))
      : null;

  const participanteId =
    formData.get("participanteId")
      ? Number(formData.get("participanteId"))
      : null;

  const FORMAS_QUE_EXIGEM_VENCIMENTO: TipoPagamento[] = [
    TipoPagamento.CARTAO,

  ];
  
  if (!descricao) {
    throw new Error(
      "Descrição é obrigatória."
    );
  }

  if (!valor || valor <= 0) {
    throw new Error(
      "Valor é obrigatório e deve ser maior que zero."
    );
  }

  if (!periodicidade) {
    if (
      !quantidadeParcelas ||
      quantidadeParcelas <= 0
    ) {
      throw new Error(
        "Quantidade de parcelas deve ser maior que zero."
      );
    }

    if (quantidadeParcelas > 1 && !dataVencimento) {
      throw new Error(
        "Informe o vencimento para lançamentos parcelados."
      );
    }
    if (
    formaPagamento &&
    FORMAS_QUE_EXIGEM_VENCIMENTO.includes(formaPagamento) &&
    !dataVencimento
    ) {
    throw new Error(
      "Informe o vencimento para pagamentos no cartão."
    );
  }
  }

  if (periodicidade && !dataVencimento) {
    throw new Error(
      "Informe o vencimento para lançamentos recorrentes."
    );
  }
  return {
    descricao,
    valor,
    valorPago,
    tipo,
    status,
    formaPagamento,
    periodicidade,
    quantidadeParcelas,
    dataLancamento,
    dataVencimento,
    usuarioId,
    categoriaId,
    contaFinanceiraId,
    participanteId,
  };
}

  //criar o Lançamento
async function criarLancamento(
  tx: any,
  dados: DadosLancamento
) {
  return await tx.lancamento.create({
    data: {
      descricao: dados.descricao,
      valor: dados.valor,
      valorPago: dados.valorPago,
      tipo: dados.tipo,
      status: dados.status,
      origem: OrigemLancamento.MANUAL,
      quantidadeParcelas: dados.quantidadeParcelas,
      formaPagamento: dados.formaPagamento,
      dataLancamento: dados.dataLancamento,
      dataVencimento: dados.dataVencimento,
      usuarioId: dados.usuarioId,
      categoriaId: dados.categoriaId,
      contaFinanceiraId: dados.contaFinanceiraId,
      participanteId: dados.participanteId,
    },
  });
}

//Criar parcela
async function criarParcelas(
  tx: any,
  lancamentoId: number,
  dados: DadosLancamento
) {
  if (
    dados.quantidadeParcelas <= 1 ||
    !dados.dataVencimento
  ) {
    return;
  }

  const valorCentavos =
    Math.round(dados.valor * 100);

  const valorBaseParcela = Math.floor(
    valorCentavos / dados.quantidadeParcelas
  );

  const resto =
    valorCentavos % dados.quantidadeParcelas;

  const parcelas = [];

  for (
    let i = 0;
    i < dados.quantidadeParcelas;
    i++
  ) {
    const valorParcelaCentavos =
      valorBaseParcela +
      (i < resto ? 1 : 0);

    const valorParcela =
      valorParcelaCentavos / 100;

    const vencimento =
      new Date(dados.dataVencimento);

    vencimento.setMonth(
      vencimento.getMonth() + i
    );

    parcelas.push({
      lancamentoId,
      numeroParcela: i + 1,
      valorParcela,
      vencimento,
      status: StatusParcela.PENDENTE,
    });
  }

  await tx.parcela.createMany({
    data: parcelas,
  });
}

//Criar Recorrencia
async function criarRecorrencia(
  tx: any,
  dados: DadosLancamento
) {
  if (
    !dados.periodicidade ||
    !dados.dataVencimento
  ) {
    throw new Error(
      "Dados insuficientes para criar recorrência."
    );
  }

  // =====================================================
  // VALIDA CONTA PARA ENTRADA
  // =====================================================

  if (dados.tipo === TipoLancamento.ENTRADA) {
    if (!dados.contaFinanceiraId) {
      throw new Error(
        "Toda entrada deve estar vinculada a uma conta financeira."
      );
    }

    const conta =
      await tx.contaFinanceira.findFirst({
        where: {
          id: dados.contaFinanceiraId,
          usuarioId: dados.usuarioId,
          ativo: true,
        },
      });

    if (!conta) {
      throw new Error(
        "Conta financeira não encontrada."
      );
    }
  }

  // =====================================================
  // CRIA RECORRÊNCIA
  // =====================================================

  const recorrencia =
    await tx.recorrencia.create({
      data: {
        descricao: dados.descricao,
        valor: dados.valor,
        tipo: dados.tipo,
        status: StatusLancamento.PENDENTE,
        formaPagamento: dados.formaPagamento,
        periodicidade: dados.periodicidade,
        vencimento: dados.dataVencimento,
        ativo: true,
        usuarioId: dados.usuarioId,
        categoriaId: dados.categoriaId,
        contaFinanceiraId:
          dados.contaFinanceiraId,
      },
    });

  // =====================================================
  // CRIA PRIMEIRO LANÇAMENTO
  // =====================================================

  await tx.lancamento.create({
    data: {
      descricao: dados.descricao,
      valor: dados.valor,
      valorPago: dados.valorPago,
      tipo: dados.tipo,
      status: dados.status,
      origem: OrigemLancamento.RECORRENCIA,
      periodicidade: dados.periodicidade,
      quantidadeParcelas: 1,
      formaPagamento: dados.formaPagamento,
      dataLancamento: dados.dataLancamento,
      dataVencimento: dados.dataVencimento,
      usuarioId: dados.usuarioId,
      categoriaId: dados.categoriaId,
      contaFinanceiraId:
        dados.contaFinanceiraId,
      participanteId:
        dados.participanteId,
      recorrenciaId: recorrencia.id,
    },
  });

  // =====================================================
  // ENTRADA PAGA → ADICIONA AO SALDO
  // =====================================================

  if (
    dados.tipo === TipoLancamento.ENTRADA &&
    dados.status === StatusLancamento.PAGO
  ) {
    await tx.contaFinanceira.update({
      where: {
        id: dados.contaFinanceiraId!,
      },
      data: {
        saldo: {
          increment: dados.valorPago,
        },
      },
    });
  }
}

//movimentar saldo
async function movimentarSaldo(
  tx: Prisma.TransactionClient,
  usuarioId: number,
  conta: { id: number; nome: string; saldo: unknown },
  tipo: TipoLancamento,
  valor: number
) {
  if (valor <= 0) return;

  if (tipo === TipoLancamento.ENTRADA) {
    await tx.contaFinanceira.updateMany({
      where: {
        id: conta.id,
        usuarioId,
        ativo: true,
      },
      data: {
        saldo: { increment: valor },
      },
    });

    return;
  }

  const { count } = await tx.contaFinanceira.updateMany({
    where: {
      id: conta.id,
      usuarioId,
      ativo: true,
      saldo: { gte: valor },
    },
    data: {
      saldo: { decrement: valor },
    },
  });

  if (count === 0) {
    const disponivel = Number(conta.saldo).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    throw new ErroNegocio(
      `Saldo insuficiente na conta "${conta.nome}" (disponível: ${disponivel}).`
    );
  }
}





// Calcula o efeito real do lançamento no saldo.
function efeitoNoSaldo(e: EstadoLancamento): number {
  if (e.contaFinanceiraId === null || e.valorPago <= 0) {
    return 0;
  }

  return e.tipo === TipoLancamento.ENTRADA
    ? e.valorPago
    : -e.valorPago;
}

// Calcula a diferença entre o efeito novo e o antigo.
function calcularAjusteSaldoCentavos(
  efeitoAntigo: number,
  efeitoNovo: number
): number {
  return emCentavos(efeitoNovo) - emCentavos(efeitoAntigo);
}

// Aplica a diferença no saldo da conta.
async function aplicarAjusteSaldo(
  tx: Prisma.TransactionClient,
  usuarioId: number,
  conta: { id: number; nome: string; saldo: unknown },
  ajusteCentavos: number
) {
  if (ajusteCentavos === 0) return;

  const ajuste = Math.abs(ajusteCentavos) / 100;

  if (ajusteCentavos > 0) {
    await tx.contaFinanceira.update({
      where: { id: conta.id, usuarioId },
      data: {
        saldo: { increment: ajuste },
      },
    });

    return;
  }

  const { count } = await tx.contaFinanceira.updateMany({
    where: {
      id: conta.id,
      usuarioId,
      saldo: { gte: ajuste },
    },
    data: {
      saldo: { decrement: ajuste },
    },
  });

  if (count === 0) {
    const disponivel = Number(conta.saldo).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    throw new ErroNegocio(
      `Saldo insuficiente na conta "${conta.nome}" para aplicar esta alteração (disponível: ${disponivel}).`
    );
  }
}

// Divide o valor total em parcelas sem perder centavos.
function calcularValoresParcelas(
  valor: number,
  quantidade: number
): number[] {
  const totalCentavos = emCentavos(valor);
  const valorBase = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos % quantidade;

  return Array.from({ length: quantidade }, (_, i) => {
    const centavos = valorBase + (i < resto ? 1 : 0);
    return centavos / 100;
  });
}

// Calcula o vencimento mensal sem avançar incorretamente
// quando o mês seguinte tem menos dias.
function calcularVencimento(
  dataBase: Date,
  meses: number
): Date {
  const diaOriginal = dataBase.getDate();

  const vencimento = new Date(dataBase);
  vencimento.setDate(1);
  vencimento.setMonth(vencimento.getMonth() + meses);

  const ultimoDia = new Date(
    vencimento.getFullYear(),
    vencimento.getMonth() + 1,
    0
  ).getDate();

  vencimento.setDate(Math.min(diaOriginal, ultimoDia));

  return vencimento;
}

async function sincronizarParcelas(
  tx: Prisma.TransactionClient,
  lancamento: {
    id: number;
    valor: unknown;
    quantidadeParcelas: number;
    dataVencimento: Date | null;
    dataLancamento: Date;
    parcelas: {
      id: number;
      numeroParcela: number;
      valorParcela: unknown;
      vencimento: Date;
      status: StatusParcela;
      dataPagamento: Date | null;
    }[];
  },
  dados: DadosLancamento
): Promise<{
  valorPago: number;
  status: StatusLancamento;
}> {
  const parcelasExistentes = lancamento.parcelas;

  const existeParcelaPaga = parcelasExistentes.some(
    (parcela) => parcela.status === StatusParcela.PAGO
  );

  const dataBaseNova = dados.dataVencimento ?? dados.dataLancamento;
  const dataBaseAntiga =
    lancamento.dataVencimento ?? lancamento.dataLancamento;

  const estruturaAlterada =
    dados.quantidadeParcelas !== lancamento.quantidadeParcelas ||
    emCentavos(dados.valor) !== emCentavos(Number(lancamento.valor)) ||
    dataBaseNova.getTime() !== dataBaseAntiga.getTime();

  // Preserva o histórico de parcelas já pagas.
  if (existeParcelaPaga && estruturaAlterada) {
    throw new ErroNegocio(
      "Não é possível alterar o valor, a quantidade ou os vencimentos porque existem parcelas pagas."
    );
  }

  // Lançamento sem parcelamento.
  if (dados.quantidadeParcelas === 1) {
    if (parcelasExistentes.length > 0) {
      await tx.parcela.deleteMany({
        where: { lancamentoId: lancamento.id },
      });
    }

    return {
      valorPago: dados.valorPago,
      status: dados.status,
    };
  }

  // Se já existem parcelas pagas, preserva todas.
  if (existeParcelaPaga) {
    const parcelasPagas = parcelasExistentes.filter(
      (parcela) => parcela.status === StatusParcela.PAGO
    );

    const valorPagoCentavos = parcelasPagas.reduce(
      (total, parcela) =>
        total + emCentavos(Number(parcela.valorParcela)),
      0
    );

    return {
      valorPago: valorPagoCentavos / 100,
      status:
        parcelasPagas.length === dados.quantidadeParcelas
          ? StatusLancamento.PAGO
          : StatusLancamento.PENDENTE,
    };
  }

  // Sem parcelas pagas: podemos recriar a estrutura.
  await tx.parcela.deleteMany({
    where: { lancamentoId: lancamento.id },
  });

  const valores = calcularValoresParcelas(
    dados.valor,
    dados.quantidadeParcelas
  );

  const parcelas = valores.map((valorParcela, index) => ({
    lancamentoId: lancamento.id,
    numeroParcela: index + 1,
    valorParcela,
    vencimento: calcularVencimento(dataBaseNova, index),
    status: StatusParcela.PENDENTE,
  }));

  await tx.parcela.createMany({
    data: parcelas,
  });

  return {
    valorPago: 0,
    status: StatusLancamento.PENDENTE,
  };
}





//--------------------------------------------------------------------
// funçoes para Pagar Fatura
async function atualizarLancamentoPai(
  tx: Prisma.TransactionClient,
  lancamentoId: number,
  contaFinanceiraId: number
) {
  const [parcelasPendentes, parcelasPagas] = await Promise.all([
    tx.parcela.count({
      where: {
        lancamentoId,
        status: StatusParcela.PENDENTE,
      },
    }),
    tx.parcela.aggregate({
      where: {
        lancamentoId,
        status: StatusParcela.PAGO,
      },
      _sum: {
        valorParcela: true,
      },
    }),
  ]);

  const valorPago = Number(
    parcelasPagas._sum.valorParcela ?? 0
  );

  await tx.lancamento.update({
    where: { id: lancamentoId },
    data: {
      valorPago,
      status:
        parcelasPendentes === 0
          ? StatusLancamento.PAGO
          : StatusLancamento.PENDENTE,
      dataPagamento:
        parcelasPendentes === 0 ? new Date() : null,
      contaFinanceiraId,
    },
  });
}

async function executarPagamentosFatura(
  tx: Prisma.TransactionClient,
  usuarioId: number,
  conta: {
    id: number;
    nome: string;
    saldo: unknown;
  },
  pagamentos: PagamentoFatura[]
) {
  const totalCentavos = pagamentos.reduce(
    (total, pagamento) => total + pagamento.valorCentavos,
    0
  );

  if (totalCentavos <= 0) {
    throw new Error("O valor total do pagamento é inválido.");
  }

  const valorTotal = deCentavos(totalCentavos);

  // Débito protegido contra saldo insuficiente e concorrência.
  // Se algum pagamento falhar depois, a transação desfaz o débito.
  await movimentarSaldo(
    tx,
    usuarioId,
    conta,
    TipoLancamento.SAIDA,
    valorTotal
  );

  const lancamentosParceladosAtualizar = new Set<number>();
  const agora = new Date();

  for (const pagamento of pagamentos) {
    if (pagamento.tipo === "LANCAMENTO") {
      const valorFinal = deCentavos(
        pagamento.valorFinalCentavos!
      );

      const valorAnterior = deCentavos(
        pagamento.valorPagoAnteriorCentavos!
      );

      const atualizacao = await tx.lancamento.updateMany({
        where: {
          id: pagamento.lancamentoId,
          usuarioId,
          tipo: TipoLancamento.SAIDA,
          AND: [
            { valorPago: valorAnterior },
            { valorPago: { lt: valorFinal } },
          ],
        },
        data: {
          valorPago: valorFinal,
          status: StatusLancamento.PAGO,
          dataPagamento: agora,
          contaFinanceiraId: conta.id,
        },
      });

      if (atualizacao.count !== 1) {
        throw new Error(
          "O lançamento foi alterado ou já foi pago. Atualize a fatura e tente novamente."
        );
      }

      continue;
    }

    if (!pagamento.parcelaId) {
      throw new Error("Parcela não informada.");
    }

    // Só permite pagar uma parcela que ainda esteja pendente.
    const atualizacao = await tx.parcela.updateMany({
      where: {
        id: pagamento.parcelaId,
        lancamentoId: pagamento.lancamentoId,
        status: StatusParcela.PENDENTE,
      },
      data: {
        status: StatusParcela.PAGO,
        dataPagamento: agora,
      },
    });

    if (atualizacao.count !== 1) {
      throw new Error(
        "Uma das parcelas já foi paga ou foi alterada. Atualize a fatura e tente novamente."
      );
    }

    lancamentosParceladosAtualizar.add(
      pagamento.lancamentoId
    );
  }

  // Recalcula cada lançamento pai uma única vez,
  // mesmo que várias parcelas dele tenham sido pagas.
  for (const lancamentoId of lancamentosParceladosAtualizar) {
    await atualizarLancamentoPai(
      tx,
      lancamentoId,
      conta.id
    );
  }

  // Busca o saldo atualizado no banco, evitando retornar
  // um saldo calculado a partir de uma leitura antiga.
  const contaAtualizada = await tx.contaFinanceira.findFirst({
    where: {
      id: conta.id,
      usuarioId,
      ativo: true,
    },
    select: {
      saldo: true,
    },
  });

  if (!contaAtualizada) {
    throw new Error("Conta financeira não encontrada.");
  }

  return {
    valorTotalPago: valorTotal,
    saldoRestante: Number(contaAtualizada.saldo),
    quantidadePagamentos: pagamentos.length,
  };
}

function validarValorPagoLancamento(
  lancamento: Pick<
    DadosLancamento,
    "valor" | "valorPago" | "status"
  >
) {
  const valorTotalCentavos = emCentavos(lancamento.valor);
  const valorPagoCentavos = emCentavos(lancamento.valorPago);

  if (
    valorPagoCentavos < 0 ||
    valorPagoCentavos > valorTotalCentavos
  ) {
    throw new Error(
      "O valor pago do lançamento está inconsistente."
    );
  }

  if (
    lancamento.status === StatusLancamento.PAGO &&
    valorPagoCentavos !== valorTotalCentavos
  ) {
    throw new Error(
      "O lançamento está marcado como pago, mas o valorPago não corresponde ao valor total."
    );
  }

  if (
    lancamento.status !== StatusLancamento.PAGO &&
    valorPagoCentavos === valorTotalCentavos
  ) {
    throw new Error(
      "O lançamento possui valorPago igual ao valor total, mas não está marcado como pago."
    );
  }

  return {
    valorTotalCentavos,
    valorPagoAnteriorCentavos: valorPagoCentavos,
    valorPendenteCentavos:
      valorTotalCentavos - valorPagoCentavos,
  };
}