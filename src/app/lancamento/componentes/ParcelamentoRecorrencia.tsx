"use client";

import { useState } from "react";
import Styles from "../novo/page.module.css";

type Props = {
 onRecorrenteChange?: (recorrente: boolean) => void;
};

export default function ParcelamentoRecorrencia({onRecorrenteChange,}:Props) {
  const [recorrente, setRecorrente] = useState(false);
   function alterarRecorrente(valor: boolean) {
    setRecorrente(valor);
    onRecorrenteChange?.(valor); 
  }
  return (
     <>
      <label htmlFor="recorrente">
        É uma recorrência?
      </label>

      <select
        id="recorrente"
        value={recorrente ? "SIM" : "NAO"}
        onChange={(e) => {
          setRecorrente(e.target.value === "SIM");
        }}
      >
        <option value="NAO">Não</option>
        <option value="SIM">Sim</option>
      </select>

      {recorrente ? (
        <div className={Styles.recorrencia}>
          <label htmlFor="periodicidade">
            Periodicidade
          </label>

          <select
            id="periodicidade"
            name="periodicidade"
            defaultValue=""
            onChange={(e) => onRecorrenteChange?.(true)}
            required
          >
            <option value="" disabled>
              Selecione a periodicidade
            </option>
            <option value="MENSAL">Mensal</option>
            <option value="DIARIA">Diária</option>
            <option value="SEMANAL">Semanal</option>
            <option value="ANUAL">Anual</option>
          </select>
        </div>
      ) : (
        <>
          <label htmlFor="quantidadeParcelas">
            Quantidade de Parcelas
          </label>

          <input
            id="quantidadeParcelas"
            type="number"
            name="quantidadeParcelas"
            step="1"
            min="1"
            defaultValue="1"
            required
          />
        </>
      )}
    </>
  );
}