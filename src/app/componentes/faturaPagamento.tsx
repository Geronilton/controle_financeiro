"use client";

import { useState } from "react";
import PagarFaturaForm from "./pagarFaturaForm";
import styles from "@/app/styles/faturaParticipante.module.css";

type ContaFinanceira = {
  id: number;
  nome: string;
  saldo: number;
  objetivo: number | null;
};

type LancamentoFatura = {
  id: string;
  lancamentoId?: number;
  parcelaId?: number;
  descricao: string;
  valor: number;
  status: string;
  numParcela: string | null;
  parcela: {
    numeroParcela: number;
    status: string;
  } | null;
  data: Date;
};

type Props = {
  participanteId: number;
  mes: number;
  ano: number;
  contasFinanceiras: ContaFinanceira[];
  lancamentos: LancamentoFatura[];
};

export default function FaturaPagamento({
  participanteId,
  mes,
  ano,
  contasFinanceiras,
  lancamentos,
}: Props) {
  const [parcelasSelecionadas, setParcelasSelecionadas] =
    useState<number[]>([]);

  const [lancamentosSelecionados, setLancamentosSelecionados] =
    useState<number[]>([]);

  const pendentes = lancamentos.filter(
    (lancamento) => lancamento.status !== "PAGO"
  );

  function alternarSelecao(lancamento: LancamentoFatura) {
  if (lancamento.parcelaId !== undefined) {
    setParcelasSelecionadas((atual) =>
      atual.includes(lancamento.parcelaId!)
        ? atual.filter((id) => id !== lancamento.parcelaId)
        : [...atual, lancamento.parcelaId!]
    );
    return;
  }

  const lancamentoId = lancamento.lancamentoId!;

  setLancamentosSelecionados((atual) =>
    atual.includes(lancamentoId)
      ? atual.filter((id) => id !== lancamentoId)
      : [...atual, lancamentoId]
  );
  }

  function estaSelecionado(lancamento: LancamentoFatura) {
    if (lancamento.parcelaId !== undefined) {
      return parcelasSelecionadas.includes(lancamento.parcelaId);
    }
    return lancamentosSelecionados.includes(lancamento.lancamentoId!);
  }

  function limparSelecao() {
    setParcelasSelecionadas([]);
    setLancamentosSelecionados([]);
  }

  const quantidadeSelecionados =
    parcelasSelecionadas.length +
    lancamentosSelecionados.length;

  return (
    <>
      <div className={styles.lancamentos}>
        {lancamentos.map((lancamento) => {
          const pago = lancamento.status === "PAGO";

          return (
            <div
              key={`${lancamento.id}-${
                lancamento.parcelaId ?? "sem-parcela"
              }`}
              className={`${styles.lancamento} ${
                pago ? styles.lancamentoPago : ""
              }`}
            >
              <div className={styles.infoLancamento}>
                {!pago && (
                  <input
                    type="checkbox"
                    checked={estaSelecionado(lancamento)}
                    onChange={() => alternarSelecao(lancamento)}
                  />
                )}

                <div className={styles.detalhesLancamento}>
                  <span>{lancamento.descricao}</span>

                  {lancamento.parcela && (
                    <small>
                      Parcela {lancamento.numParcela}
                    </small>
                  )}

                  {pago && (
                    <small className={styles.statusPago}>
                      ✓ Pago
                    </small>
                  )}
                </div>
              </div>

              <strong>
                R${" "}
                {Number(lancamento.valor).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
          );
        })}
      </div>

      {pendentes.length > 0 && (
        <PagarFaturaForm
          participanteId={participanteId}
          mes={mes}
          ano={ano}
          contasFinanceiras={contasFinanceiras}
          parcelasSelecionadas={parcelasSelecionadas}
          lancamentosSelecionados={lancamentosSelecionados}
          quantidadeSelecionados={quantidadeSelecionados}
          onPagamentoSucesso={limparSelecao}
        />
      )}
    </>
  );
}