"use client";

import { useState } from "react";

type Props = {
  valorInicial?: number;
  formaPagamentoInicial?: string;
  statusInicial?: string;
  onFormaPagamentoChange?: (forma: string) => void;
  forcarPendenteCartao?: boolean;
};

export default function ValorLancamento({
  valorInicial,
  formaPagamentoInicial,
  statusInicial = "PAGO",
  onFormaPagamentoChange,
  forcarPendenteCartao = false,
}: Props) {
  const [valor, setValor] = useState(valorInicial?.toString() ?? "");
  const [formaPagamento, setFormaPagamento] = useState(
    formaPagamentoInicial ?? ""
  );
  const [status, setStatus] = useState(statusInicial);

  const pagamentoImediato =
    formaPagamento === "PIX" || formaPagamento === "DINHEIRO";

  const cartaoPendenteFixo =
    forcarPendenteCartao && formaPagamento === "CARTAO";

  // Status que realmente será enviado
  const statusTravado = pagamentoImediato || cartaoPendenteFixo;
  const statusEfetivo = pagamentoImediato
    ? "PAGO"
    : cartaoPendenteFixo
      ? "PENDENTE"
      : status;

  function alterarFormaPagamento(novaForma: string) {
    setFormaPagamento(novaForma);
    onFormaPagamentoChange?.(novaForma);

    if (novaForma === "PIX" || novaForma === "DINHEIRO") {
      setStatus("PAGO");
    }

    if (forcarPendenteCartao && novaForma === "CARTAO") {
      setStatus("PENDENTE");
    }
  }

  return (
    <>
      <label htmlFor="valor">Valor</label>

      <input
        id="valor"
        type="number"
        name="valor"
        step="0.01"
        min="0"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        required
      />

      <label htmlFor="formaPagamento">Forma de pagamento</label>

      <select
        id="formaPagamento"
        name="formaPagamento"
        value={formaPagamento}
        onChange={(e) => alterarFormaPagamento(e.target.value)}
      >
        <option value="">Selecione</option>
        <option value="PIX">PIX</option>
        <option value="DINHEIRO">Dinheiro</option>
        <option value="CARTAO">Cartão</option>
        <option value="TRANSFERENCIA">Transferência</option>
      </select>

      {/* STATUS */}
      <label htmlFor="status">Status</label>

      {statusTravado ? (
        <>
          <input
            id="status"
            type="text"
            value={statusEfetivo === "PAGO" ? "Pago" : "Pendente"}
            disabled
          />
          <input type="hidden" name="status" value={statusEfetivo} />
        </>
      ) : (
        <select
          id="status"
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
        >
          <option value="PENDENTE">Pendente</option>
          <option value="PAGO">Pago</option>
        </select>
      )}

      {cartaoPendenteFixo && (
        <small>Compras no cartão entram na fatura e ficam pendentes.</small>
      )}

      {/* VALOR PAGO: enviado sempre que o status efetivo é Pago */}
      {statusEfetivo === "PAGO" && (
        <>
          <label htmlFor="valorPago">Valor pago</label>

          <input
            id="valorPago"
            type="number"
            name="valorPago"
            step="0.01"
            min="0"
            value={valor}
            readOnly
          />
        </>
      )}
    </>
  );
}