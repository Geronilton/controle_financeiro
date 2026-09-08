
import FormContaFinanceira from "../componentes/formContaFinanceira";
import {
  Nova_conta_financeira,
} from "@/app/actions/contaFinanceira";

export default function NovaContaFinanceiraPage() {
  return (
    <FormContaFinanceira
      action={Nova_conta_financeira}
    />
  );
}

