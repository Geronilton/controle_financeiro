import { Criar_participante } from "@/app/actions/participante";
import Styles from "@/app/lancamento/novo/page.module.css";

export default async function Cadastro (){

    return(
    <div className={Styles.container}>
        
      <div className={Styles.card}>
        <h1>Adcionar um participante</h1>
        <form action={Criar_participante} className={Styles.formulario}>
          <label className="labelNome" htmlFor="nome">Nome</label>
          <br />
          <input 
            className="inputNome" 
            type="text"
            id="nome"
            name="nome"
            placeholder="Digite seu nome"
          />
          <br />

          <label className="telefone" htmlFor="telefone">Telefone</label>
          <br />
          <input 
            className="inputPass" 
            type="number"
            id="telefone"
            name="telefone"
            placeholder="Digite um telefone"
          />
          <br />

          <label htmlFor="apelido">Apelido</label>
          <br />
          <input 
            className="inputApelido" 
            type="text"
            id="apelido"
            name="apelido"
            placeholder="Digite um apelido"
          />
          <br />
          

          <button 
            className="buttonSubmit" 
            type="submit"
          >
            Cadastrar
          </button>
        </form>
      </div>  
    </div>

    )
}