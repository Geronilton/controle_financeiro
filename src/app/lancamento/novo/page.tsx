import { Novo_lancamento } from "@/app/actions/lancamento";
import { Listar_contas_financeiras } from "@/app/actions/contaFinanceira";
import { prisma } from "@/app/lib/prisma";
import LancamentoForm from "../componentes/lancamentoForm";
import { exigirUsuarioId } from "@/app/lib/auth";

type Props = {
  searchParams: Promise<{
    tipo?: string;
  }>;
};

export default async function NovoLancamento({
  searchParams,
}: Props) {
  const params = await searchParams;

  const usuarioId = await exigirUsuarioId();
  if (usuarioId === null) {
    throw new Error("Usuário não autenticado.");
  }
    

  const tipoInicial =
    params.tipo === "SAIDA" ||
    params.tipo === "ENTRADA"
      ? params.tipo
      : "ENTRADA";

  const categorias =
    await prisma.categoria.findMany({
      where: {
        usuarioId,
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

  const participantes =
    await prisma.participante.findMany({
      where: {
        usuarioId,
        ativo: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

const contasFinanceiras = (
  await Listar_contas_financeiras()
).map((conta) => ({
  ...conta,
  saldo: Number(conta.saldo),
  objetivo: conta.objetivo
    ? Number(conta.objetivo)
    : null,
}));

  return (
    <LancamentoForm
      action={Novo_lancamento}
      tipoInicial={tipoInicial}
      categorias={categorias}
      participantes={participantes}
      contasFinanceiras={contasFinanceiras}
    />
  );
}