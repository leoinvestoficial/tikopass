import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 container max-w-3xl py-10 prose prose-sm dark:prose-invert">
        <h1 className="text-2xl font-display font-bold text-foreground">Termos de Uso</h1>
        <p className="text-muted-foreground text-sm">Última atualização: 26 de março de 2026</p>

        <h2>1. Sobre a plataforma</h2>
        <p>A Tiko Pass é um marketplace de ingressos que conecta compradores e vendedores de forma segura. Atuamos como intermediários, garantindo a autenticidade dos ingressos através de validação por inteligência artificial.</p>

        <h2>2. Cadastro</h2>
        <p>Para utilizar a plataforma, é obrigatório o cadastro com dados verídicos. O CPF informado deve corresponder ao CPF presente nos ingressos que o usuário pretende vender.</p>

        <h2>3. Venda de ingressos</h2>
        <ul>
          <li>O vendedor deve ser o titular legítimo do ingresso</li>
          <li>Ingressos de cortesia são proibidos para venda</li>
          <li>Cada ingresso só pode ser publicado uma vez</li>
          <li>O vendedor é responsável pela autenticidade do ingresso</li>
        </ul>

        <h2>4. Compra de ingressos</h2>
        <ul>
          <li>O comprador pode negociar o preço com o vendedor</li>
          <li>O pagamento é processado de forma segura</li>
          <li>O acesso ao ingresso é liberado após confirmação do pagamento</li>
        </ul>

        <h2>5. Taxas</h2>
        <p>A plataforma cobra uma taxa de serviço sobre cada transação concluída. As taxas são exibidas antes da confirmação do pagamento.</p>

        <h2>6. Proibições</h2>
        <ul>
          <li>Venda de ingressos falsificados ou duplicados</li>
          <li>Uso de dados de terceiros sem autorização</li>
          <li>Tentativa de burlar o sistema de validação</li>
        </ul>

        <h2>7. Responsabilidades</h2>
        <p>A Tiko Pass não se responsabiliza por eventos cancelados ou alterados pelos organizadores. Em caso de cancelamento, o comprador deve buscar reembolso junto ao organizador do evento.</p>

        <h2>8. Exclusão de conta</h2>
        <p>O usuário pode solicitar a exclusão da sua conta a qualquer momento através do perfil. Transações em andamento devem ser finalizadas antes da exclusão.</p>
      </div>
      <Footer />
    </div>
  );
}
