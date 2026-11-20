"use client";

import { useState } from "react";
import Styles from "../../lancamento/novo/page.module.css";

type Props = {
  action: (
    formData: FormData
  ) => void | Promise<void>;

  nome?: string;
  saldo?: number | null
  descricao?: string | null;
  objetivo?: number | null;
  diaFechamento?: number | null;
  diaVencimento?: number| null;
  cartaoCredito?: boolean;
  modoEdicao?: boolean;
};

export default function FormContaFinanceira({
  action,
  nome = "",
  saldo= null,
  descricao = "",
  objetivo = null,
  modoEdicao = false,
  diaVencimento,
  diaFechamento,
  cartaoCredito
}: Props) {
 const [ehCartao, setEhCartao] = useState(cartaoCredito);

  return (
    <div className={Styles.container}>
      <div className={Styles.card}>
        <h2>{modoEdicao ? "Editar conta financeira" : "Nova conta financeira"}</h2>

        <form action={action} className={Styles.formulario}>
          <label htmlFor="nome">Nome da conta</label>
          <input id="nome" type="text" name="nome" placeholder="Ex.: Nubank"
            defaultValue={nome} required />

          {!modoEdicao ? (
            <>
              <label htmlFor="saldoInicial">Saldo inicial</label>
              <input id="saldoInicial" type="number" name="saldoInicial"
                step="0.01" min="0" defaultValue="0" required />
            </>
          ) : (
            saldo !== null && (
              <>
                <label htmlFor="saldoAtual">Saldo atual</label>
                <input id="saldoAtual" type="text" readOnly
                  value={saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
              </>
            )
          )}

          <label htmlFor="cartaoCredito">
            <input
              id="cartaoCredito"
              type="checkbox"
              name="cartaoCredito"
              checked={ehCartao}
              onChange={(e) => setEhCartao(e.target.checked)}
            />{" "}
            Cartão de crédito
          </label>

          {ehCartao && (
            <>
              <label htmlFor="diaFechamento">Dia de fechamento da fatura</label>
              <input id="diaFechamento" type="number" name="diaFechamento"
                min="1" max="31" step="1" placeholder="Ex.: 3"
                defaultValue={diaFechamento ?? ""} required />

              <label htmlFor="diaVencimento">Dia de vencimento da fatura</label>
              <input id="diaVencimento" type="number" name="diaVencimento"
                min="1" max="31" step="1" placeholder="Ex.: 10"
                defaultValue={diaVencimento ?? ""} required />
            </>
          )}

          <label htmlFor="descricao">Descrição</label>
          <input id="descricao" type="text" name="descricao"
            placeholder="Ex.: Conta principal" defaultValue={descricao ?? ""} />

          <label htmlFor="objetivo">Objetivo financeiro</label>
          <input id="objetivo" type="number" name="objetivo" step="0.01" min="0"
            placeholder="Ex.: 5000.00" defaultValue={objetivo ?? ""} />

          <button type="submit">{modoEdicao ? "Salvar alterações" : "Criar conta"}</button>
        </form>
      </div>
    </div>
  );
}

