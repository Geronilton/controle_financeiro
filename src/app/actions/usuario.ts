"use server";

import { prisma } from "@/app/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import {
  criarSessao,
  encerrarSessao,
} from "@/app/lib/auth";

export async function Login_usuario(
  formData: FormData
) {
  const email =
    formData
      .get("email")
      ?.toString()
      .trim()
      .toLowerCase() ?? "";

  const senha =
    formData.get("senha")?.toString() ?? "";

  if (!email || !senha) {
    throw new Error(
      "E-mail e senha são obrigatórios."
    );
  }

  const usuario =
    await prisma.usuario.findUnique({
      where: {
        email,
      },
    });

  if (!usuario) {
    throw new Error(
      "E-mail ou senha inválidos."
    );
  }

  const senhaValida =
    await bcrypt.compare(
      senha,
      usuario.senhaHash
    );

  if (!senhaValida) {
    throw new Error(
      "E-mail ou senha inválidos."
    );
  }

  await criarSessao(usuario.id);

  redirect("/");
}

export async function Logout_usuario() {
  await encerrarSessao();

  redirect("/usuario/login");
}

export async function Cadastrar_usuario(formData: FormData) { 
  const nome = formData.get("nome")?.toString() ?? "";
  const email = formData.get("email")?.toString() ?? "";
  const senha = formData.get("senha")?.toString() ?? "";

  const usuarioExistente = await prisma.usuario.findUnique({
    where: {
      email,
    },
  });

  if (!nome) {
    throw new Error("Nome é obrigatório.");
  }

  if (!email) {
    throw new Error("E-mail é obrigatório.");
  }

  if (!senha) {
    throw new Error("Senha é obrigatória.");
  }
  if (usuarioExistente) {
    throw new Error("E-mail já cadastrado.");
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  await prisma.usuario.create({
  data: {
      nome,
      email,
      senhaHash,

      participantes: {
        create: {
          nome: "Eu",
        },
      },
      contasFinanceiras: {
        create: {
          nome: "Carteira",
        },
      },
      categorias: {
        createMany:{
          data:[
            {nome:"Mercado",tipo:"SAIDA"},
            {nome:"Eletronicos",tipo:"SAIDA"},
            {nome:"Compras avulsas",tipo:"SAIDA"},
            {nome:"Shoppe",tipo:"SAIDA"},
            {nome:"Compras pela internet",tipo:"SAIDA"},
            {nome:"Venda",tipo:"ENTRADA"},
            {nome:"Emprestimo",tipo:"ENTRADA"},
            {nome:"Salario",tipo:"ENTRADA"},
            {nome:"Freelancer",tipo:"ENTRADA"},

          ]
        }
      }
    },
  });
  redirect("/usuario/login")

}










// await prisma.usuario.create({
//   data: {
//     nome,
//     email,
//     senhaHash,

//     participantes: {
//       create: {
//         nome: "Eu",
//       },
//     },

//     contasFinanceiras: {
//       create: {
//         nome: "Carteira",
//       },
//     },

//     categorias: {
//       createMany: {
//         data: [
//           { nome: "Alimentação", tipo: "SAIDA" },
//           { nome: "Transporte", tipo: "SAIDA" },
//           { nome: "Salário", tipo: "ENTRADA" },
//         ],
//       },
//     },
//   },
// });