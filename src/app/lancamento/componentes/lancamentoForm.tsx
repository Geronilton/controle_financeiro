"use client";

import { useState } from "react";
import Styles from "../novo/page.module.css";
import ParcelamentoRecorrencia from "./ParcelamentoRecorrencia";
import ValorLancamento from "./ValorLancamento";
import { calcularVencimento } from "../../lib/vencimento"; // ajuste o caminho se necessário

type Categoria = {
  id: number;
  nome: string;
  tipo: "ENTRADA" | "SAIDA" | null;
};

type Participante = {
  id: number;
  nome: string;
};

type ContaFinanceira = {
  id: number;
  nome: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  tipoInicial: "ENTRADA" | "SAIDA";

  descricao?: string;
  valor?: number;
  status?: string;
  formaPagamento?: string;
  dataLancamento?: string;
  dataVencimento?: string;

  categoriaId?: number | null;
  participanteId?: number | null;
  contaFinanceiraId?: number | null;

  periodicidade?: string;

  categorias: Categoria[];
  participantes: Participante[];
  contasFinanceiras: ContaFinanceira[];

  modoEdicao?: boolean;
  modoRecorrencia?: boolean;
};

const FORMAS_QUE_EXIGEM_VENCIMENTO = ["CARTAO"];

function obterDataHoje() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default function LancamentoForm({
  action,
  tipoInicial,
  descricao = "",
  valor,
  status = "PAGO",
  formaPagamento = "",
  dataLancamento = "",
  dataVencimento = "",
  categoriaId,
  participanteId,
  contaFinanceiraId,
  periodicidade,
  categorias,
  participantes,
  contasFinanceiras,
  modoEdicao = false,
  modoRecorrencia = false,
}: Props) {
  const participanteEu = participantes.find(
    (participante) => participante.nome === "Eu"
  );

  const [contaId, setContaId] = useState(
    contaFinanceiraId?.toString() ?? ""
  );
  const [dataMovimentacao, setDataMovimentacao] = useState(
    dataLancamento || obterDataHoje()
  );
  const [vencimento, setVencimento] = useState(dataVencimento);
  const [formaPagamentoAtual, setFormaPagamentoAtual] =
    useState(formaPagamento);
  const [Recorrente, setRecorrente] = useState(!!periodicidade);

  const categoriasFiltradas = categorias.filter(
    (categoria) => categoria.tipo === null || categoria.tipo === tipoInicial
  );

  const exigeVencimento =
    modoRecorrencia ||
    Recorrente ||
    (tipoInicial === "SAIDA" &&
      FORMAS_QUE_EXIGEM_VENCIMENTO.includes(formaPagamentoAtual));


  function atualizarVencimento(novaContaId: string, novaData: string) {
    const conta = contasFinanceiras.find(
      (c) => c.id.toString() === novaContaId
    );

    if (
      !conta ||
      !novaData ||
      conta.diaFechamento === null ||
      conta.diaVencimento === null
    ) {
      return;
    }

    setVencimento(
      calcularVencimento(novaData, conta.diaFechamento, conta.diaVencimento)
    );
  }

  function handleContaChange(novaContaId: string) {
    setContaId(novaContaId);
    atualizarVencimento(novaContaId, dataMovimentacao);
  }

  function handleDataChange(novaData: string) {
    setDataMovimentacao(novaData);
    atualizarVencimento(contaId, novaData);
  }

  function handleFormaPagamentoChange(forma: string) {
    setFormaPagamentoAtual(forma);
    if (!vencimento) {
      atualizarVencimento(contaId, dataMovimentacao);
    }
  }

  return (
    <div className={Styles.container}>
      <div className={Styles.card}>
        <h2>
          {modoRecorrencia
            ? "Editar recorrência"
            : modoEdicao
              ? "Editar lançamento"
              : tipoInicial === "SAIDA"
                ? "Lançar dívida"
                : "Lançar entrada"}
        </h2>

        <form action={action} className={Styles.formulario}>
          {/* TIPO */}
          <input type="hidden" name="tipo" value={tipoInicial} />

          {/* DESCRIÇÃO */}
          <label htmlFor="descricao">Descrição</label>
          <input
            id="descricao"
            type="text"
            name="descricao"
            placeholder="Ex.: Venda de bolo"
            defaultValue={descricao}
            required
          />

          {/* VALOR + PAGAMENTO */}
          <ValorLancamento
            valorInicial={valor}
            formaPagamentoInicial={formaPagamento}
            statusInicial={status}
            onFormaPagamentoChange={handleFormaPagamentoChange}
            forcarPendenteCartao={
              tipoInicial === "SAIDA" && !modoEdicao && !modoRecorrencia
            }
          />
          
          {/* CONTA FINANCEIRA (toda entrada e toda saída) */}
          <label htmlFor="contaFinanceiraId">Conta financeira</label>
          <select
            id="contaFinanceiraId"
            name="contaFinanceiraId"
            value={contaId}
            onChange={(e) => handleContaChange(e.target.value)}
            required
          >
            <option value="">Selecione a conta</option>
            {contasFinanceiras.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {conta.nome}
              </option>
            ))}
          </select>

          {/* PARCELAMENTO / RECORRÊNCIA */}
          <ParcelamentoRecorrencia
            onRecorrenteChange={setRecorrente}
            recorrenteInicial={modoRecorrencia || !!periodicidade}
            periodicidadeInicial={periodicidade ?? ""}
          />

          {/* DATA LANÇAMENTO */}
          <label htmlFor="dataLancamento">Data da movimentação</label>
          <input
            id="dataLancamento"
            type="date"
            name="dataLancamento"
            value={dataMovimentacao}
            onChange={(e) => handleDataChange(e.target.value)}
            required
          />

          {/* VENCIMENTO */}
          {exigeVencimento && (
            <>
              <label htmlFor="dataVencimento">Data de vencimento</label>
              <input
                id="dataVencimento"
                type="date"
                name="dataVencimento"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                required
              />
            </>
          )}

          {/* CATEGORIA */}
          <label htmlFor="categoriaId">Categoria</label>
          <select
            id="categoriaId"
            name="categoriaId"
            defaultValue={categoriaId?.toString() ?? ""}
          >
            <option value="">Selecione</option>
            {categoriasFiltradas.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>

          {/* PARTICIPANTE */}
          <label htmlFor="participanteId">Participante</label>
          <select
            id="participanteId"
            name="participanteId"
            defaultValue={
              participanteId?.toString() ??
              participanteEu?.id?.toString() ??
              ""
            }
          >
            <option value="">Selecione</option>
            {participantes.map((participante) => (
              <option key={participante.id} value={participante.id}>
                {participante.nome}
              </option>
            ))}
          </select>

          {/* BOTÃO */}
          <button type="submit">
            {modoEdicao || modoRecorrencia
              ? "Salvar alterações"
              : tipoInicial === "SAIDA"
                ? "Registrar dívida"
                : "Registrar entrada"}
          </button>
        </form>
      </div>
    </div>
  );
}