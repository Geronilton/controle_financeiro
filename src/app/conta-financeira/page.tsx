import Link from "next/link";
import ListaContasFinanceiras from "./componentes/listarContasFinanceiras";
import Styles from "@/app/styles/contaFinanceira.module.css";
import { prisma } from "../lib/prisma";
import { exigirUsuarioId } from "../lib/auth";

export default async function ContaFinanceiraPage() {
  const usuarioId = await exigirUsuarioId();
  const contasRaw =
    await prisma.contaFinanceira.findMany({
      where: {
        usuarioId
      },
      orderBy: {
        nome: "asc",
      },
    });

  const contas = contasRaw.map((conta) => ({
    id: conta.id,
    nome: conta.nome,
    descricao: conta.descricao,
    saldo: Number(conta.saldo),
    objetivo:
      conta.objetivo !== null
        ? Number(conta.objetivo)
        : null,
    ativo: conta.ativo,
  }));

  const contasAtivas = contas.filter(
    (conta) => conta.ativo
  );

  const saldoTotal = contasAtivas.reduce(
    (total, conta) =>
      total + conta.saldo,
    0
  );

  return (
    <main className={Styles.container}>
      <header className={Styles.header}>
        <div>
          <h2>Contas financeiras</h2>

          <p>
            Gerencie suas contas e acompanhe
            seus saldos.
          </p>
        </div>

        <Link
          href="/conta-financeira/novo"
          className={Styles.newButton}
        >
          + Nova conta
        </Link>
      </header>

      <section className={Styles.resumo}>
        <div className={Styles.resumoCard}>
          <span className={Styles.resumoLabel}>
            Saldo total
          </span>

          <strong
            className={Styles.resumoValor}
          >
            R${" "}
            {saldoTotal.toLocaleString(
              "pt-BR",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </strong>
        </div>

        <div className={Styles.resumoCard}>
          <span className={Styles.resumoLabel}>
            Contas ativas
          </span>

          <strong
            className={Styles.resumoValor}
          >
            {contasAtivas.length}
          </strong>
        </div>
      </section>

      <ListaContasFinanceiras
        contas={contas}
      />
    </main>
  );
}

