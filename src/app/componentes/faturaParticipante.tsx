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
  conta?: {
    id: number;
    nome: string;
    cartaoCredito: boolean;
    diaFechamento: number | null;
    diaVencimento: number | null;
  } | null;
};

export default async function FaturaParticipante({
  participanteId,
  participanteNome,
  mes,
  ano,
  mostrarAcesso = false,
  conta = null,
}: Props) {
  const contasFinanceiras = (await Listar_contas_financeiras()).map(
    (c) => ({
      ...c,
      saldo: Number(c.saldo),
      objetivo: c.objetivo ? Number(c.objetivo) : null,
    })
  );

  const fatura = await Fatura_participante(
    participanteId,
    mes,
    ano,
    conta?.id
  );

  const temLancamentos = fatura.lancamentos.length > 0;

  const temPendencias = fatura.lancamentos.some(
    (lancamento) => lancamento.status !== "PAGO"
  );

  const faturaPaga = temLancamentos && !temPendencias;

  // Data em UTC para não deslocar o mês no fuso local
  const nomeMes = new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString(
    "pt-BR",
    { month: "long", timeZone: "UTC" }
  );

  const mesFormatado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

  return (
    <section className={styles.container}>
      <div className={styles.card}>
        <div className={styles.mes}>
          <span>
            {mesFormatado} {ano}
          </span>

          {mostrarAcesso && (
            <Link
              href={`/fatura?participante=${participanteId}&conta=${conta?.id ?? "todas"}&mes=${mes}&ano=${ano}`}
              className={styles.acessar}
            >
              Acessar fatura →
            </Link>
          )}
        </div>

        <div className={styles.participante}>
          Fatura de {participanteNome}
        </div>

        {conta && (
          <div className={styles.participante}>
            {conta.nome}
            {conta.cartaoCredito &&
              ` · fecha dia ${conta.diaFechamento} · vence dia ${conta.diaVencimento}`}
          </div>
        )}

        <div className={styles.total}>
          <span>Total</span>

          <strong>
            R${" "}
            {fatura.totalPendente.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
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