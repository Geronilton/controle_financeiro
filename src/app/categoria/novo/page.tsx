import { Criar_categoria } from "@/app/actions/categoria"
import Styles from "@/app/lancamento/novo/page.module.css";


export default function categoria(){
    return(

    <div className={Styles.container}>
      <div className={Styles.card}>
        <h2>Nova categoria</h2>

      <form action={Criar_categoria} className={Styles.formulario}>

        <label>Nome</label>
        <input
          type="text"
          name="nome"
          placeholder="Ex.: Ingredientes, mercado, energia"
          required
        />

        <label>Tipo</label>
        <select
          name="tipo"
          required
        >
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saída</option>
          <option value="AMBOS">Ambos (entrada e saída)</option>
        </select>

        <button type="submit">
          Salvar
        </button>

      </form>
      </div>
    </div>
    )
}