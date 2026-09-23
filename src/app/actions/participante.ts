"use server";

import { prisma } from "@/app/lib/prisma";
import { Participante } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirUsuarioId } from "../lib/auth";

export async function Criar_participante(formData: FormData) {
  const nome = formData.get("nome")?.toString().trim() ?? "";
  const apelido = formData.get("apelido")?.toString() ?? "";
  const telefone = formData.get("telefone")?.toString() ?? "";
  const observacao = formData.get("observacao")?.toString() ?? "";

  // ID vem exclusivamente da sessão
  const usuarioId = await exigirUsuarioId();

  try {
    await prisma.participante.create({
      data: {
        nome,
        apelido,
        telefone,
        observacao,
        usuarioId,
      },
    });

    revalidatePath("/participantes");
    revalidatePath("/participantes/listar");
  } catch (error) {
    console.error("Erro ao criar participante:", error);
    throw error
  }

  redirect("/participantes/listar");
}

export async function Listar_participantes(): Promise<Participante[]> {
  const usuarioId = await exigirUsuarioId();

  try {
    return await prisma.participante.findMany({
      where: {
        usuarioId,
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
    });
  } catch (error) {
    console.error("Erro ao listar participantes:", error);
    return [];
  }
}

export async function Editar_participante(
  id: number,
  formData: FormData
) {
  const nome = formData.get("nome")?.toString() ?? "";
  const telefone = formData.get("telefone")?.toString() ?? "";
  const apelido = formData.get("apelido")?.toString() ?? "";

  const usuarioId = await exigirUsuarioId();

  try {
    // Primeiro verifica se o participante pertence ao usuário da sessão
    const participante = await prisma.participante.findFirst({
      where: {
        id,
        usuarioId,
        ativo: true,
      },
    });

    if (!participante) {
      throw new Error("Participante não encontrado.");
    }

    await prisma.participante.update({
      where: {
        id: participante.id,
        usuarioId
      },
      data: {
        nome,
        telefone,
        apelido,
      },
    });

    revalidatePath(`/participantes/${id}`);
    revalidatePath("/participantes");
    revalidatePath("/participantes/listar");
  } catch (error) {
    console.error("Erro ao atualizar participante:", error);
    throw new Error("Erro ao atualizar participante.");
  }

  redirect("/participantes/listar");
}

export async function excluir_participante(id: number) {
  const usuarioId = await exigirUsuarioId();

  try {
    // Só pode excluir participante pertencente ao usuário da sessão
    const participante = await prisma.participante.findFirst({
      where: {
        id,
        usuarioId,
        ativo: true,
      },
    });

    if (!participante) {
      throw new Error("Participante não encontrado.");
    }

    await prisma.participante.update({
      where: {
        id: participante.id,
      },
      data: {
        ativo: false,
      },
    });

    revalidatePath("/participantes/listar");
  } catch (error) {
    console.error("Erro ao excluir participante:", error);
    throw new Error("Erro ao excluir participante.");
  }
}

export async function Fatura_participante(
  participanteId: number,
  mes: number,
  ano: number
) {
  const usuarioId = await exigirUsuarioId();

  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 1);

  // Garante que o participante pertence ao usuário da sessão
  const participante = await prisma.participante.findFirst({
    where: {
      id: participanteId,
      usuarioId,
      ativo: true,
    },
  });

  if (!participante) {
    throw new Error("Participante não encontrado.");
  }

  const lancamentos = await prisma.lancamento.findMany({
    where: {
      usuarioId,
      participanteId,
      tipo: "SAIDA",
    },
    include: {
      parcelas: {
        where: {
          vencimento: {
            gte: inicio,
            lt: fim,
          },
        },
      },
    },
    orderBy: {
      dataLancamento: "desc",
    },
  });

  const itens = [];

  for (const lancamento of lancamentos) {
    /*
     * Lançamento parcelado
     */
    if (lancamento.quantidadeParcelas > 1) {
      for (const parcela of lancamento.parcelas) {
        itens.push({
          id: `parcela-${parcela.id}`,
          parcelaId: parcela.id,
          descricao: lancamento.descricao,
          valor: Number(parcela.valorParcela),
          status: parcela.status,
          numParcela: `${parcela.numeroParcela}/${lancamento.quantidadeParcelas}`,
          parcela: {
            numeroParcela: parcela.numeroParcela,
            status: parcela.status,
          },
          data: parcela.vencimento,
        });
      }

      continue;
    }

    /*
     * Lançamento normal ou recorrente
     */
    if (
      lancamento.dataLancamento >= inicio &&
      lancamento.dataLancamento < fim
    ) {
      itens.push({
        id: `lancamento-${lancamento.id}`,
        lancamentoId: lancamento.id,
        descricao: lancamento.descricao,
        valor: Number(lancamento.valor),
        status: lancamento.status,
        numParcela: null,
        parcela: null,
        data: lancamento.dataLancamento,
      });
    }
  }

  // Total de todos os itens da fatura
  const total = itens.reduce(
    (soma, item) => soma + item.valor,
    0
  );

  // Total somente das dívidas pendentes
  const totalPendente = itens
    .filter((item) => item.status !== "PAGO")
    .reduce(
      (soma, item) => soma + item.valor,
      0
    );

  return {
    lancamentos: itens,
    total,
    totalPendente,
  };
}



export async function Fatura_todos_participantes(
  mes: number,
  ano: number
) {
  const usuarioId = await exigirUsuarioId();

  const participantes = await prisma.participante.findMany({
    where: {
      usuarioId,
      ativo: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  const resultado = [];

  for (const participante of participantes) {
    const fatura = await Fatura_participante(
      participante.id,
      mes,
      ano
    );

    resultado.push({
      participante,
      ...fatura,
    });
  }

  return resultado;
}