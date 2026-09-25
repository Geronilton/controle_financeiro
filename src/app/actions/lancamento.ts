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

export async function Dados_dashboard() {
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
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

    // Dívidas ainda não pagas
    prisma.lancamento.findMany({
      where: {
        usuarioId,
        tipo: "SAIDA",
        status: "PENDENTE",
      },
      include: {
        parcelas: {
          where: {
            status: "PENDENTE",
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

  // Saldo atual = soma dos saldos das contas ativas
  const saldo = contasFinanceiras.reduce(
    (total, conta) =>
      total + Number(conta.saldo),
    0
  );

  const totalEntradas = Number(
    entradas._sum.valorPago ?? 0
  );

  // Calcula o valor das dívidas pendentes
  const totalDividas = dividas.reduce(
    (total, lancamento) => {
      // Lançamento parcelado
      if (lancamento.quantidadeParcelas > 1) {
        const valorParcelasPendentes =
          lancamento.parcelas.reduce(
            (subtotal, parcela) =>
              subtotal +
              Number(parcela.valorParcela),
            0
          );

        return total + valorParcelasPendentes;
      }

      // Lançamento normal
      const valorPendente =
        Number(lancamento.valor) -
        Number(lancamento.valorPago);

      return total + Math.max(valorPendente, 0);
    },
    0
  );

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

  await prisma.$transaction(async (tx) => {

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
            usuarioId,
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
    // RECORRÊNCIA
    // =====================================================

    if (dados.periodicidade) {
      await criarRecorrencia(tx, dados);
      return;
    }

    // =====================================================
    // LANÇAMENTO NORMAL
    // =====================================================

    const lancamento =
      await criarLancamento(tx, dados);

    // =====================================================
    // PARCELAMENTO
    // =====================================================

    await criarParcelas(
      tx,
      lancamento.id,
      dados
    );

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
  });

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


export async function Excluir_lancamento(id: number) {
  const usuarioId = await exigirUsuarioId();

  await prisma.$transaction(async (tx) => {
    const lancamento = await tx.lancamento.findFirst({
      where: {
        id,
        usuarioId,
      },
    });

    if (!lancamento) {
      throw new Error("Lançamento não encontrado.");
    }

    await tx.parcela.deleteMany({
      where: {
        lancamentoId: lancamento.id,
      },
    });

    await tx.lancamento.delete({
      where: {
        id: lancamento.id,
      },
    });
  });

  revalidatePath("/lancamento/listar");
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
) {
  const usuarioId = await exigirUsuarioId();
  const descricao =
    formData.get("descricao")?.toString() ?? "";

  const valor = Number(formData.get("valor"));

  const tipo =
    formData.get("tipo") as TipoLancamento;

  const status =
    formData.get("status") as StatusLancamento;

  const formaPagamento =
    formData.get("formaPagamento") as TipoPagamento;

  
  const quantidadeParcelas = Number(
    formData.get("quantidadeParcelas") ?? 1
  );

  const valorPagoInformado = Number(
    formData.get("valorPago") ?? 0
  );

  const valorPago =
    formaPagamento === "PIX" ||
      formaPagamento === "DINHEIRO"
      ? valor
      : valorPagoInformado;

  const dataLancamento = new Date(
    formData.get("dataLancamento")?.toString() ??
    new Date()
  );

  const dataVencimento =
    formData.get("dataVencimento")
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

  if (!descricao) {
    throw new Error("Descrição é obrigatória.");
  }

  if (!valor || valor <= 0) {
    throw new Error(
      "Valor é obrigatório e deve ser maior que zero."
    );
  }

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
      throw new Error("Lançamento não encontrado.");
    }

    /*
     * Verifica se o lançamento já possuía parcelas
     */
    const tinhaParcelas = lancamento.parcelas.length > 0;

    if (
    tinhaParcelas &&
      quantidadeParcelas < lancamento.parcelas.length
    ) {
      const parcelasQueSeriamRemovidas =
        lancamento.parcelas.filter(
          (parcela) =>
            parcela.numeroParcela > quantidadeParcelas
        );

      const existeParcelaPaga =
        parcelasQueSeriamRemovidas.some(
          (parcela) =>
            parcela.status === StatusParcela.PAGO
        );

      if (existeParcelaPaga) {
        throw new Error(
          "Não é possível reduzir a quantidade de parcelas porque existem parcelas que já foram pagas."
        );
      }
    }
    await tx.lancamento.update({
      where: {
        id: lancamento.id,
      },
      data: {
        descricao,
        valor,
        valorPago,
        tipo,
        status,
        quantidadeParcelas,
        formaPagamento,
        dataLancamento,
        dataVencimento,
        categoriaId,
        contaFinanceiraId,
        participanteId,
      },
    });

    /*
     * Se já existiam parcelas OU se a quantidade
     * informada agora é maior que 1, precisamos
     * criar/atualizar os registros da tabela Parcela.
     */
    if (tinhaParcelas || quantidadeParcelas > 1) {
      /*
       * Guarda os status das parcelas que já existiam.
       *
       * Exemplo:
       * parcela 1 = PAGO
       * parcela 2 = PENDENTE
       * parcela 3 = PENDENTE
       *
       * Esses status não serão alterados pela edição.
       */
      const statusParcelasExistentes = new Map(
        lancamento.parcelas.map((parcela) => [
          parcela.numeroParcela,
          parcela.status,
        ])
      );

      /*
       * Remove as parcelas antigas
       */
      await tx.parcela.deleteMany({
        where: {
          lancamentoId: lancamento.id,
        },
      });

      /*
       * Calcula o valor de cada parcela em centavos
       */
      const valorCentavos = Math.round(valor * 100);

      const valorBase = Math.floor(
        valorCentavos / quantidadeParcelas
      );

      const resto =
        valorCentavos % quantidadeParcelas;

      /*
       * Cria as novas parcelas
       */
      for (let i = 0; i < quantidadeParcelas; i++) {
        const numeroParcela = i + 1;

        const valorParcelaCentavos =
          valorBase +
          (i < resto ? 1 : 0);

        /*
         * Se essa parcela já existia,
         * preserva o status dela.
         *
         * Se for uma parcela nova,
         * começa como PENDENTE.
         */
        const statusParcela =
          statusParcelasExistentes.get(
            numeroParcela
          ) ?? StatusParcela.PENDENTE;

        const vencimento = new Date(
          dataVencimento ?? dataLancamento
        );

        vencimento.setMonth(
          vencimento.getMonth() + i
        );

        await tx.parcela.create({
          data: {
            lancamentoId: lancamento.id,
            numeroParcela,
            valorParcela:
              valorParcelaCentavos / 100,
            vencimento,
            status: statusParcela,
          },
        });
      }
    }
  });

  revalidatePath("/lancamento/listar");

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
  const contaFinanceiraId = Number(
    formData.get("contaFinanceiraId")
  );

  const mes = Number(formData.get("mes"));
  const ano = Number(formData.get("ano"));

  if (!participanteId) {
    throw new Error("Participante não informado.");
  }

  if (!contaFinanceiraId) {
    throw new Error("Selecione a conta financeira.");
  }

  if (!mes || mes < 1 || mes > 12) {
    throw new Error("Mês inválido.");
  }

  if (!ano) {
    throw new Error("Ano inválido.");
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      // =====================================================
      // PARTICIPANTE
      // =====================================================

    const participante = await tx.participante.findFirst({
      where: {
        id: participanteId,
        usuarioId,
        ativo: true,
      },
    });

    if (!participante) {
      throw new Error("Participante não encontrado.");
    }

      // =====================================================
      // CONTA FINANCEIRA
      // =====================================================

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

      // =====================================================
      // PERÍODO DA FATURA
      // =====================================================

      const inicioMes = new Date(
        ano,
        mes - 1,
        1,
        0,
        0,
        0,
        0
      );

      const inicioProximoMes = new Date(
        ano,
        mes,
        1,
        0,
        0,
        0,
        0
      );

      // =====================================================
      // LANÇAMENTOS DO PARTICIPANTE
      // =====================================================

    const lancamentos = await tx.lancamento.findMany({
      where: {
        participanteId,
        usuarioId,
        tipo: "SAIDA",
      },
      include: {
        parcelas: {
          orderBy: {
            numeroParcela: "asc",
          },
        },
      },
    });

      if (lancamentos.length === 0) {
        throw new Error(
          "Nenhum lançamento encontrado para este participante."
        );
      }

      // =====================================================
      // PRIMEIRO: DESCOBRIR QUANTO SERÁ PAGO
      // =====================================================

      let valorTotalPagamento = 0;

      const pagamentos: {
        tipo: "LANCAMENTO" | "PARCELA";
        lancamentoId: number;
        parcelaId?: number;
        valor: number;
      }[] = [];

      for (const lancamento of lancamentos) {
        // ===================================================
        // COBRANÇA ÚNICA
        // ===================================================

        if (lancamento.quantidadeParcelas <= 1) {
          if (
            lancamento.status ===
            StatusLancamento.PAGO
          ) {
            continue;
          }

          if (!lancamento.dataVencimento) {
            continue;
          }

          const dataVencimento = new Date(
            lancamento.dataVencimento
          );

          const pertenceAoMes =
            dataVencimento >= inicioMes &&
            dataVencimento < inicioProximoMes;

          if (!pertenceAoMes) {
            continue;
          }

          const valor =
            Number(lancamento.valor) -
            Number(lancamento.valorPago);

          if (valor <= 0) {
            continue;
          }

          pagamentos.push({
            tipo: "LANCAMENTO",
            lancamentoId: lancamento.id,
            valor,
          });

          valorTotalPagamento += valor;

          continue;
        }

        // ===================================================
        // LANÇAMENTO PARCELADO
        // ===================================================

        const parcelaDoMes =
          lancamento.parcelas.find(
            (parcela) => {
              const vencimento =
                new Date(parcela.vencimento);

              return (
                vencimento >= inicioMes &&
                vencimento < inicioProximoMes
              );
            }
          );

        if (!parcelaDoMes) {
          continue;
        }

        if (
          parcelaDoMes.status ===
          StatusParcela.PAGO
        ) {
          continue;
        }

        const valor =
          Number(parcelaDoMes.valorParcela);

        if (valor <= 0) {
          continue;
        }

        pagamentos.push({
          tipo: "PARCELA",
          lancamentoId: lancamento.id,
          parcelaId: parcelaDoMes.id,
          valor,
        });

        valorTotalPagamento += valor;
      }

      // =====================================================
      // NENHUM PAGAMENTO
      // =====================================================

      if (pagamentos.length === 0) {
        throw new Error(
          "Nenhum gasto pendente encontrado nesta fatura."
        );
      }

      // =====================================================
      // VERIFICA SALDO
      // =====================================================

      const saldoAtual = Number(conta.saldo);

      if (saldoAtual < valorTotalPagamento) {
        throw new Error(
          `Saldo insuficiente. Saldo disponível: R$ ${saldoAtual.toFixed(
            2
          )}. Valor da fatura: R$ ${valorTotalPagamento.toFixed(
            2
          )}.`
        );
      }

      // =====================================================
      // REALIZA OS PAGAMENTOS
      // =====================================================

      for (const pagamento of pagamentos) {
        // ===================================================
        // COBRANÇA ÚNICA
        // ===================================================

        if (
          pagamento.tipo === "LANCAMENTO"
        ) {
          const lancamento =
            await tx.lancamento.findUnique({
              where: {
                id: pagamento.lancamentoId,
              },
            });

          if (!lancamento) {
            throw new Error(
              "Lançamento não encontrado."
            );
          }

          await tx.lancamento.update({
            where: {
              id: lancamento.id,
            },
            data: {
              status:
                StatusLancamento.PAGO,

              valorPago:
                lancamento.valor,

              dataPagamento:
                new Date(),

              contaFinanceiraId:
                conta.id,
            },
          });

          continue;
        }

        // ===================================================
        // PARCELA
        // ===================================================

        if (!pagamento.parcelaId) {
          throw new Error(
            "Parcela não informada."
          );
        }

        await tx.parcela.update({
          where: {
            id: pagamento.parcelaId,
          },
          data: {
            status:
              StatusParcela.PAGO,
          },
        });

        // ===================================================
        // VERIFICA TODAS AS PARCELAS
        // ===================================================

        const parcelasPendentes =
          await tx.parcela.count({
            where: {
              lancamentoId:
                pagamento.lancamentoId,

              status:
                StatusParcela.PENDENTE,
            },
          });

        // ===================================================
        // CALCULA VALOR TOTAL JÁ PAGO
        // ===================================================

        const parcelasPagas =
          await tx.parcela.aggregate({
            where: {
              lancamentoId:
                pagamento.lancamentoId,

              status:
                StatusParcela.PAGO,
            },

            _sum: {
              valorParcela: true,
            },
          });

        const valorPago =
          Number(
            parcelasPagas._sum
              .valorParcela ?? 0
          );

        // ===================================================
        // ATUALIZA LANÇAMENTO
        // ===================================================

        await tx.lancamento.update({
          where: {
            id: pagamento.lancamentoId,
          },

          data: {
            valorPago,

            status:
              parcelasPendentes === 0
                ? StatusLancamento.PAGO
                : StatusLancamento.PENDENTE,

            dataPagamento:
              parcelasPendentes === 0
                ? new Date()
                : undefined,

            contaFinanceiraId:
              conta.id,
          },
        });
      }

      // =====================================================
      // DEBITA A CONTA
      // =====================================================

      await tx.contaFinanceira.update({
        where: {
          id: conta.id,
        },

        data: {
          saldo: {
            decrement: valorTotalPagamento,
          },
        },
      });

      return {
        quantidadePagamentos:
          pagamentos.length,

        valorTotalPago:
          valorTotalPagamento,

        saldoRestante:
          saldoAtual -
          valorTotalPagamento,
      };
    }
  );

  // =======================================================
  // ATUALIZA AS PÁGINAS
  // =======================================================

  revalidatePath("/fatura");
  revalidatePath("/lancamento");
  revalidatePath("/conta-financeira");

  return {
    sucesso: true,

    mensagem:
      resultado.quantidadePagamentos === 1
        ? "Fatura paga com sucesso!"
        : `Fatura paga com sucesso! ${resultado.quantidadePagamentos} cobranças foram pagas.`,

    quantidadePagamentos:
      resultado.quantidadePagamentos,

    valorTotalPago:
      resultado.valorTotalPago,

    saldoRestante:
      resultado.saldoRestante,
  };
}

export async function Pagar_itens_fatura(
  participanteId: number,
  formData: FormData
) {
  const usuarioId = await exigirUsuarioId();

  const contaFinanceiraId = Number(
    formData.get("contaFinanceiraId")
  );

  const parcelaIds = formData
    .getAll("parcelaIds")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  const lancamentoIds = formData
    .getAll("lancamentoIds")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!participanteId) {
    throw new Error("Participante não informado.");
  }

  if (!contaFinanceiraId) {
    throw new Error("Selecione a conta financeira.");
  }

  if (
    parcelaIds.length === 0 &&
    lancamentoIds.length === 0
  ) {
    throw new Error(
      "Nenhum item foi selecionado para pagamento."
    );
  }

  const resultado = await prisma.$transaction(
    async (tx) => {
      // =====================================================
      // PARTICIPANTE
      // =====================================================

      const participante =
        await tx.participante.findFirst({
          where: {
            id: participanteId,
            usuarioId,
            ativo: true,
          },
        });

      if (!participante) {
        throw new Error(
          "Participante não encontrado."
        );
      }

      // =====================================================
      // CONTA FINANCEIRA
      // =====================================================

      const conta =
        await tx.contaFinanceira.findFirst({
          where: {
            id: contaFinanceiraId,
            usuarioId,
            ativo: true,
          },
        });

      if (!conta) {
        throw new Error(
          "Conta financeira não encontrada."
        );
      }

      // =====================================================
      // BUSCA OS ITENS SELECIONADOS
      // =====================================================

      const pagamentos: {
        tipo: "LANCAMENTO" | "PARCELA";
        lancamentoId: number;
        parcelaId?: number;
        valor: number;
      }[] = [];

      // =====================================================
      // PARCELAS SELECIONADAS
      // =====================================================

      if (parcelaIds.length > 0) {
        const parcelas =
          await tx.parcela.findMany({
            where: {
              id: {
                in: parcelaIds,
              },
              lancamento: {
                usuarioId,
                participanteId,
                tipo: "SAIDA",
              },
            },
          });

        if (parcelas.length !== parcelaIds.length) {
          throw new Error(
            "Uma ou mais parcelas não pertencem a esta fatura."
          );
        }

        for (const parcela of parcelas) {
          if (
            parcela.status === StatusParcela.PAGO
          ) {
            continue;
          }

          const valor = Number(
            parcela.valorParcela
          );

          if (valor <= 0) {
            continue;
          }

          pagamentos.push({
            tipo: "PARCELA",
            lancamentoId: parcela.lancamentoId,
            parcelaId: parcela.id,
            valor,
          });
        }
      }

      // =====================================================
      // LANÇAMENTOS SEM PARCELAMENTO
      // =====================================================

      if (lancamentoIds.length > 0) {
        const lancamentos =
          await tx.lancamento.findMany({
            where: {
              id: {
                in: lancamentoIds,
              },
              usuarioId,
              participanteId,
              tipo: "SAIDA",
              quantidadeParcelas: {
                lte: 1,
              },
            },
          });

        if (
          lancamentos.length !==
          lancamentoIds.length
        ) {
          throw new Error(
            "Um ou mais lançamentos não pertencem a esta fatura ou possuem parcelas."
          );
        }

        for (const lancamento of lancamentos) {
          if (
            lancamento.status ===
            StatusLancamento.PAGO
          ) {
            continue;
          }

          const valor =
            Number(lancamento.valor) -
            Number(lancamento.valorPago);

          if (valor <= 0) {
            continue;
          }

          pagamentos.push({
            tipo: "LANCAMENTO",
            lancamentoId: lancamento.id,
            valor,
          });
        }
      }

      // =====================================================
      // NENHUM PAGAMENTO
      // =====================================================

      if (pagamentos.length === 0) {
        throw new Error(
          "Nenhum item pendente foi encontrado."
        );
      }

      // =====================================================
      // VALOR TOTAL
      // =====================================================

      const valorTotalPagamento =
        pagamentos.reduce(
          (total, pagamento) =>
            total + pagamento.valor,
          0
        );

      // =====================================================
      // VERIFICA SALDO
      // =====================================================

      const saldoAtual = Number(conta.saldo);

      if (
        saldoAtual < valorTotalPagamento
      ) {
        throw new Error(
          `Saldo insuficiente. Saldo disponível: R$ ${saldoAtual.toFixed(
            2
          )}. Valor selecionado: R$ ${valorTotalPagamento.toFixed(
            2
          )}.`
        );
      }

      // =====================================================
      // REALIZA OS PAGAMENTOS
      // =====================================================

      for (const pagamento of pagamentos) {
        // ===================================================
        // LANÇAMENTO SIMPLES
        // ===================================================

        if (
          pagamento.tipo === "LANCAMENTO"
        ) {
          const lancamento =
            await tx.lancamento.findFirst({
              where: {
                id: pagamento.lancamentoId,
                usuarioId,
                participanteId,
              },
            });

          if (!lancamento) {
            throw new Error(
              "Lançamento não encontrado."
            );
          }

          await tx.lancamento.update({
            where: {
              id: lancamento.id,
            },
            data: {
              status:
                StatusLancamento.PAGO,
              valorPago:
                lancamento.valor,
              dataPagamento:
                new Date(),
              contaFinanceiraId:
                conta.id,
            },
          });

          continue;
        }

        // ===================================================
        // PARCELA
        // ===================================================

        if (!pagamento.parcelaId) {
          throw new Error(
            "Parcela não informada."
          );
        }

        const parcela =
          await tx.parcela.findFirst({
            where: {
              id: pagamento.parcelaId,
              lancamento: {
                usuarioId,
                participanteId,
              },
            },
          });

        if (!parcela) {
          throw new Error(
            "Parcela não encontrada."
          );
        }

        await tx.parcela.update({
          where: {
            id: parcela.id,
          },
          data: {
            status: StatusParcela.PAGO,
          },
        });

        // ===================================================
        // VERIFICA TODAS AS PARCELAS
        // ===================================================

        const parcelasPendentes =
          await tx.parcela.count({
            where: {
              lancamentoId:
                pagamento.lancamentoId,
              status:
                StatusParcela.PENDENTE,
            },
          });

        // ===================================================
        // CALCULA TOTAL PAGO
        // ===================================================

        const parcelasPagas =
          await tx.parcela.aggregate({
            where: {
              lancamentoId:
                pagamento.lancamentoId,
              status:
                StatusParcela.PAGO,
            },
            _sum: {
              valorParcela: true,
            },
          });

        const valorPago =
          Number(
            parcelasPagas._sum
              .valorParcela ?? 0
          );

        // ===================================================
        // ATUALIZA LANÇAMENTO
        // ===================================================

        await tx.lancamento.update({
          where: {
            id: pagamento.lancamentoId,
          },
          data: {
            valorPago,
            status:
              parcelasPendentes === 0
                ? StatusLancamento.PAGO
                : StatusLancamento.PENDENTE,
            dataPagamento:
              parcelasPendentes === 0
                ? new Date()
                : undefined,
            contaFinanceiraId:
              conta.id,
          },
        });
      }

      // =====================================================
      // DEBITA A CONTA
      // =====================================================

      await tx.contaFinanceira.update({
        where: {
          id: conta.id,
        },
        data: {
          saldo: {
            decrement:
              valorTotalPagamento,
          },
        },
      });

      return {
        quantidadePagamentos:
          pagamentos.length,
        valorTotalPago:
          valorTotalPagamento,
        saldoRestante:
          saldoAtual -
          valorTotalPagamento,
      };
    }
  );

  // =======================================================
  // ATUALIZA AS PÁGINAS
  // =======================================================

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
    quantidadePagamentos:
      resultado.quantidadePagamentos,
    valorTotalPago:
      resultado.valorTotalPago,
    saldoRestante:
      resultado.saldoRestante,
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