"use client";

import { useTransition } from "react";
import { Excluir_lancamento } from "@/app/actions/lancamento"; // ajuste o caminho

type Props = {
  id: number;
  descricao: string;
  tipo: "ENTRADA" | "SAIDA";
  afetaSaldo: boolean; // status PAGO e com conta vinculada
};

export default function BotaoExcluirLancamento({
  id,
  descricao,
  tipo,
  afetaSaldo,
}: Props) {
  const [excluindo, startTransition] = useTransition();

  function excluir() {
    const aviso = !afetaSaldo
      ? ""
      : tipo === "ENTRADA"
        ? "\nO valor será retirado do saldo da conta."
        : "\nO valor será devolvido ao saldo da conta.";

    const confirmou = window.confirm(
      `Excluir "${descricao}"?${aviso}\nEsta ação não pode ser desfeita.`
    );
    if (!confirmou) return;

    startTransition(async () => {
      const resultado = await Excluir_lancamento(id);
      if (resultado?.erro) window.alert(resultado.erro);
    });
  }

  return (
    <button type="button" onClick={excluir} disabled={excluindo}>
      {excluindo ? "Excluindo..." : "Excluir"}
    </button>
  );
}