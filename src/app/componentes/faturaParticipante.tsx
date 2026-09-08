
import { Fatura_participante } from "@/app/actions/participante";

import styles from "@/app/styles/faturaParticipante.module.css";

import Link from "next/link";

import { Listar_contas_financeiras } from "../actions/contaFinanceira";

import FaturaPagamento from "./faturaPagamento";

type Props = {
  participanteId: number;
  participanteNome: string;
  mes: number;
  ano: number;
  mostrarAcesso?: boolean;
};

export default async function FaturaParticipante({
  participanteId,
  participanteNome,
  mes,
  ano,
  mostrarAcesso = false,
}: Props) {
  const contasFinanceiras = (
    await Listar_contas_financeiras()
  ).map((conta) => ({
    ...conta,
    saldo: Number(conta.saldo),
    objetivo: conta.objetivo
      ? Number(conta.objetivo)
      : null,
  }));

  const fatura = await Fatura_participante(
    participanteId,
    mes,
    ano
  );

  const temLancamentos =
    fatura.lancamentos.length > 0;

  const temPendencias =
    fatura.lancamentos.some(
      (lancamento) =>
        lancamento.status !== "PAGO"
    );

  const faturaPaga =
    temLancamentos && !temPendencias;

  const nomeMes = new Date(
    ano,
    mes - 1,
    1
  ).toLocaleDateString("pt-BR", {
    month: "long",
  });

  const mesFormatado =
    nomeMes.charAt(0).toUpperCase() +
    nomeMes.slice(1);

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        <div className={styles.mes}>
          <span>
            {mesFormatado} {ano}
          </span>

          {mostrarAcesso && (
            <Link
              href={`/fatura?participante=${participanteId}&mes=${mes}&ano=${ano}`}
              className={styles.acessar}
            >
              Acessar fatura →
            </Link>
          )}
        </div>

        <div className={styles.participante}>
          Fatura de {participanteNome}
        </div>

        <div className={styles.total}>
          <span>Total</span>

          <strong>
            R${" "}
            {fatura.totalPendente.toLocaleString(
              "pt-BR",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }
            )}
          </strong>
        </div>

        <FaturaPagamento
          participanteId={participanteId}
          mes={mes}
          ano={ano}
          contasFinanceiras={contasFinanceiras}
          lancamentos={fatura.lancamentos}
        />
      </div>
    </section>
  );
}

