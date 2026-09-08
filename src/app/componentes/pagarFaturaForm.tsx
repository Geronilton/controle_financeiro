
"use client";

import { useActionState } from "react";

import {
  Pagar_fatura,
  Pagar_itens_fatura,
} from "@/app/actions/lancamento";

import styles from "@/app/styles/faturaParticipante.module.css";

type Props = {
  participanteId: number;
  mes: number;
  ano: number;

  contasFinanceiras: {
    id: number;
    nome: string;
  }[];

  parcelasSelecionadas: number[];
  lancamentosSelecionados: number[];
  quantidadeSelecionados: number;

  onPagamentoSucesso: () => void;
};

type EstadoPagamento = {
  sucesso: boolean;
  mensagem: string;
} | null;

export default function PagarFaturaForm({
  participanteId,
  mes,
  ano,
  contasFinanceiras,
  parcelasSelecionadas,
  lancamentosSelecionados,
  quantidadeSelecionados,
  onPagamentoSucesso,
}: Props) {
  const [state, formAction, pending] = useActionState<
    EstadoPagamento,
    FormData
  >(
    async (_estadoAnterior, formData) => {
      try {
        const acao = formData.get("acao");

        if (acao === "SELECIONADOS") {
          const resultado = await Pagar_itens_fatura(
            participanteId,
            formData
          );

          if (resultado.sucesso) {
            onPagamentoSucesso();
          }

          return resultado;
        }

        const resultado = await Pagar_fatura(
          participanteId,
          formData
        );

        if (resultado.sucesso) {
          onPagamentoSucesso();
        }

        return resultado;
      } catch (error) {
        return {
          sucesso: false,
          mensagem:
            error instanceof Error
              ? error.message
              : "Erro ao pagar a fatura.",
        };
      }
    },
    null
  );

  return (
    <>
      <form
        action={formAction}
        className={styles.formPagamento}
      >
        {parcelasSelecionadas.map((parcelaId) => (
          <input
            key={`parcela-${parcelaId}`}
            type="hidden"
            name="parcelaIds"
            value={parcelaId}
          />
        ))}

        {lancamentosSelecionados.map(
          (lancamentoId) => (
            <input
              key={`lancamento-${lancamentoId}`}
              type="hidden"
              name="lancamentoIds"
              value={lancamentoId}
            />
          )
        )}

        <input
          type="hidden"
          name="mes"
          value={mes}
        />

        <input
          type="hidden"
          name="ano"
          value={ano}
        />

        <select
          name="contaFinanceiraId"
          required
          className={styles.conta}
          disabled={pending}
        >
          <option value="">
            Selecione a conta
          </option>

          {contasFinanceiras.map((conta) => (
            <option
              key={conta.id}
              value={conta.id}
            >
              {conta.nome}
            </option>
          ))}
        </select>

        {/* Pagar fatura inteira */}
        <button
          type="submit"
          name="acao"
          value="TODOS"
          className={styles.botaoPagar}
          disabled={pending}
        >
          {pending
            ? "Pagando..."
            : "Pagar fatura inteira"}
        </button>

        {/* Pagar somente selecionados */}
        {quantidadeSelecionados > 0 && (
          <button
            type="submit"
            name="acao"
            value="SELECIONADOS"
            className={styles.botaoPagar}
            disabled={pending}
          >
            {pending
              ? "Pagando..."
              : `Pagar selecionados (${quantidadeSelecionados})`}
          </button>
        )}
      </form>

      {state && (
        <p
          className={
            state.sucesso
              ? styles.mensagemSucesso
              : styles.mensagemErro
          }
        >
          {state.mensagem}
        </p>
      )}
    </>
  );
}

