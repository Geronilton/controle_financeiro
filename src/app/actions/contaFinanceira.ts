'use server'

import { OrigemLancamento, StatusLancamento, TipoLancamento } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../lib/prisma";
import { exigirUsuarioId } from "../lib/auth";


export async function Nova_conta_financeira(formData: FormData) {
  const nome = formData.get("nome")?.toString().trim() ?? "";
  const descricao = formData.get("descricao")?.toString().trim() || null;
  const saldoInicial = Number(
    formData.get("saldoInicial") ?? 0
  );
  const objetivoRaw = formData.get("objetivo")?.toString();
  const objetivo =
    objetivoRaw && objetivoRaw !== ""
      ? Number(objetivoRaw)
      : null;
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }

  if (!nome) {
    throw new Error("Nome da conta é obrigatório.");
  }

  if (saldoInicial < 0) {
    throw new Error("O saldo inicial não pode ser negativo.");
  }

  if (objetivo !== null && objetivo < 0) {
    throw new Error("O objetivo não pode ser negativo.");
  }

  await prisma.$transaction(async (tx) => {
    const conta = await tx.contaFinanceira.create({
      data: {
        nome,
        descricao,
        objetivo,
        usuarioId,
      },
    });

    // Saldo inicial é registrado como uma entrada.
    if (saldoInicial > 0) {
      await tx.lancamento.create({
        data: {
          descricao: `Nova conta financeira: '${nome}'`,
          valor: saldoInicial,
          valorPago: saldoInicial,
          tipo: TipoLancamento.ENTRADA,
          status: StatusLancamento.PAGO,
          origem: OrigemLancamento.MANUAL,
          quantidadeParcelas: 1,
          dataLancamento: new Date(),
          dataVencimento: null,
          formaPagamento: null,
          usuarioId,
          categoriaId: null,
          participanteId: null,
          contaFinanceiraId: conta.id,
        },
      });
    }
  });

  revalidatePath("/conta-financeira");
  revalidatePath("/lancamento/listar");

  redirect("/conta-financeira");
}

export async function Listar_contas_financeiras() {
  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  return await prisma.contaFinanceira.findMany({
    where: {
      usuarioId,
      ativo: true,
    },
    orderBy: {
      nome: "asc",
    },
  });
}


// ================================
// EDITAR
// ================================

export async function Editar_conta_financeira(
  id: number,
  formData: FormData
) {

  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  const nome = String(formData.get("nome") ?? "").trim();

  const descricao = String(
    formData.get("descricao") ?? ""
  ).trim();

  const objetivoString = String(
    formData.get("objetivo") ?? ""
  ).trim();

  if (!nome) {
    throw new Error("Informe o nome da conta.");
  }

  const objetivo = objetivoString
    ? Number(objetivoString)
    : null;


  const conta =
    await prisma.contaFinanceira.findFirst({
      where: {
        id,
        usuarioId
      },
    });

  if (!conta) {
    throw new Error(
      "Conta financeira não encontrada."
    );
  }

  await prisma.contaFinanceira.update({
    where: {
      id: conta.id,
      usuarioId,
    },
    data: {
      nome,
      descricao: descricao || null,
      objetivo,
    },
  });

  revalidatePath("/conta-financeira");
  revalidatePath(`/conta-financeira/${id}`);

  redirect("/conta-financeira");
}


// ================================
// EXCLUIR / DESATIVAR
// ================================

export async function Excluir_conta_financeira(
  id: number
) {


  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
  const conta =
    await prisma.contaFinanceira.findFirst({
      where: {
        id,
        usuarioId
      },
    });

  if (!conta) {
    throw new Error(
      "Conta financeira não encontrada."
    );
  }

  const quantidadeLancamentos =
    await prisma.lancamento.count({
      where: {
        contaFinanceiraId: id,
      },
    });

  const quantidadeRecorrencias =
    await prisma.recorrencia.count({
      where: {
        contaFinanceiraId: id,
      },
    });

  if (
    quantidadeLancamentos > 0 ||
    quantidadeRecorrencias > 0
  ) {
    await prisma.contaFinanceira.update({
      where: {
        id,
      },
      data: {
        ativo: false,
      },
    });
  } else {
    await prisma.contaFinanceira.delete({
      where: {
        id,
      },
    });
  }

  revalidatePath("/conta-financeira");
}

