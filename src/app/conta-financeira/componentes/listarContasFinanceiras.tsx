
"use client";

import Link from "next/link";
import {
  Excluir_conta_financeira,
} from "@/app/actions/contaFinanceira";
import Styles from "@/app/styles/contaFinanceira.module.css";

type Conta = {
  id: number;
  nome: string;
  descricao: string | null;
  saldo: number;
  objetivo: number | null;
  ativo: boolean;
};

type Props = {
  contas: Conta[];
};

export default function ListaContasFinanceiras({
  contas,
}: Props) {
  async function excluir(id: number) {
    const confirmar = window.confirm(
      "Deseja realmente excluir esta conta financeira?"
    );

    if (!confirmar) {
      return;
    }

    await Excluir_conta_financeira(id);
  }

  if (contas.length === 0) {
    return (
      <div className={Styles.tableWrapper}>
        <div className={Styles.empty}>
          Nenhuma conta financeira cadastrada.
        </div>
      </div>
    );
  }

  return (
    <div className={Styles.tableWrapper}>
      <table className={Styles.table}>
        <thead>
          <tr>
            <th>Conta</th>
            <th>Saldo</th>
            <th>Objetivo</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {contas.map((conta) => {
            const saldoNegativo =
              conta.saldo < 0;

            return (
              <tr key={conta.id}>
                <td>
                  <div className={Styles.contaNome}>
                    <strong>
                      {conta.nome}
                    </strong>

                    {conta.descricao && (
                      <span>
                        {conta.descricao}
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  <span
                    className={
                      saldoNegativo
                        ? Styles.saldoNegativo
                        : Styles.saldo
                    }
                  >
                    R${" "}
                    {conta.saldo.toLocaleString(
                      "pt-BR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </span>
                </td>

                <td>
                  {conta.objetivo !== null ? (
                    <span
                      className={Styles.objetivo}
                    >
                      R${" "}
                      {conta.objetivo.toLocaleString(
                        "pt-BR",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </td>

                <td>
                  <span
                    className={`${Styles.badge} ${
                      conta.ativo
                        ? Styles.badgeAtivo
                        : Styles.badgeInativo
                    }`}
                  >
                    {conta.ativo
                      ? "Ativa"
                      : "Inativa"}
                  </span>
                </td>

                <td>
                  {conta.ativo && (
                    <div
                      className={Styles.actions}
                    >
                      <Link
                        href={`/conta-financeira/${conta.id}`}
                        className={
                          Styles.editButton
                        }
                      >
                        Editar
                      </Link>

                      <button
                        type="button"
                        className={
                          Styles.deleteButton
                        }
                        onClick={() =>
                          excluir(conta.id)
                        }
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

