import { notFound } from "next/navigation";
import FormContaFinanceira from "../componentes/formContaFinanceira";
import {
  Editar_conta_financeira,
} from "@/app/actions/contaFinanceira";
import { prisma } from "@/app/lib/prisma";
import { exigirUsuarioId } from "@/app/lib/auth";



type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarContaFinanceiraPage({
  params,
}: Props) {
  const { id } = await params;
  const usuarioId = await exigirUsuarioId();
  const contaId = Number(id);

  if (!Number.isInteger(contaId)) {
    notFound();
  }

  const conta =
    await prisma.contaFinanceira.findFirst({
      where: {
        id: contaId,
        usuarioId
      },
    });

  if (!conta) {
    notFound();
  }

  const action =
    Editar_conta_financeira.bind(
      null,
      conta.id
    );

  return (
    <FormContaFinanceira
      action={action}
      nome={conta.nome}
      descricao={conta.descricao}
      objetivo={
        conta.objetivo
          ? Number(conta.objetivo)
          : null
      }
      modoEdicao
    />
  );
}

