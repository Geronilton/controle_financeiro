import { Editar_participante } from "@/app/actions/participante";
import Styles from "@/app/lancamento/novo/page.module.css";
import { exigirUsuarioId } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { notFound } from "next/navigation";


export default async function EditarParticipante(
  {params}: {params: Promise<{id: string}>}
){
  const {id} = await params;
  const participanteId = Number(id);
  const usuarioId = await exigirUsuarioId();
  const participante = await prisma.participante.findUnique({
    where: {
      id:participanteId,
      usuarioId
    },
  });

  if (!participante) {
    notFound();
  }
    return(
    <div className={Styles.container}>
        
      <div className={Styles.card}>
        <h1>Adcionar um participante</h1>
        <form action={Editar_participante.bind(null,participanteId)} className={Styles.formulario}>
          <label className="labelNome" htmlFor="nome">Nome</label>
          <br />
          <input 
            className="inputNome" 
            type="text"
            defaultValue={participante.nome}
            name="nome"
            placeholder="Digite seu nome"
            required
          />
          <br />

          <label className="telefone" htmlFor="telefone">Telefone</label>
          <br />
          <input 
            className="inputPass" 
            type="number"
            defaultValue={participante.telefone ?? ""}
            name="telefone"
            placeholder="Digite um telefone"
          />
          <br />

          <label htmlFor="apelido">Apelido</label>
          <br />
          <input 
            className="inputApelido" 
            type="text"
            defaultValue={participante.apelido ?? ""}
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