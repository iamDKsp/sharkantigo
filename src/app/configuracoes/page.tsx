import { Metadata } from "next";
import { obterConfiguracoesSistema } from "./actions";
import ConfiguracoesView from "./ConfiguracoesView";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Configurações do Sistema | Soluções Financeiras",
};

export default async function ConfiguracoesPage() {
  const config = await obterConfiguracoesSistema();

  return <ConfiguracoesView initialConfig={config} />;
}
