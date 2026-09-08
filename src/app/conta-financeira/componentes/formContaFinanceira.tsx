"use client";

import Styles from "../../lancamento/novo/page.module.css";

type Props = {
  action: (
    formData: FormData
  ) => void | Promise<void>;

  nome?: string;
  descricao?: string | null;
  objetivo?: number | null;
  modoEdicao?: boolean;
};

export default function FormContaFinanceira({
  action,
  nome = "",
  descricao = "",
  objetivo = null,
  modoEdicao = false,
}: Props) {
  return (
    <div className={Styles.container}>
      <div className={Styles.card}>
        <h2>
          {modoEdicao
            ? "Editar conta financeira"
            : "Nova conta financeira"}
        </h2>

        <form
          action={action}
          className={Styles.formulario}
        >
          <label htmlFor="nome">
            Nome da conta
          </label>

          <input
            id="nome"
            type="text"
            name="nome"
            placeholder="Ex.: Nubank"
            defaultValue={nome}
            required
          />

          <label htmlFor="descricao">
            Descrição
          </label>

          <input
            id="descricao"
            type="text"
            name="descricao"
            placeholder="Ex.: Conta principal"
            defaultValue={descricao ?? ""}
          />

          <label htmlFor="objetivo">
            Objetivo financeiro
          </label>

          <input
            id="objetivo"
            type="number"
            name="objetivo"
            step="0.01"
            min="0"
            placeholder="Ex.: 5000.00"
            defaultValue={
              objetivo ?? ""
            }
          />

          <button type="submit">
            {modoEdicao
              ? "Salvar alterações"
              : "Criar conta"}
          </button>
        </form>
      </div>
    </div>
  );
}

