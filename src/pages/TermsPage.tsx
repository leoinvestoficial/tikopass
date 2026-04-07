import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="container py-10 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Termos de Uso</h1>
          <p className="text-muted-foreground text-sm">Última atualização: 26 de março de 2026</p>
        </div>
      </section>

      <div className="flex-1 container max-w-3xl py-10 prose prose-sm dark:prose-invert">

        <h2>1. Aceitação dos Termos</h2>
        <p>Ao se cadastrar e utilizar a plataforma Tiko Pass ("plataforma", "nós"), você ("usuário") declara ter lido, compreendido e aceito integralmente estes Termos de Uso. Caso não concorde com qualquer disposição, não utilize a plataforma.</p>
        <p>O uso da plataforma implica aceitação automática de eventuais atualizações destes termos, que serão comunicadas por e-mail ou notificação.</p>

        <h2>2. Sobre a Plataforma</h2>
        <p>A Tiko Pass é um <strong>marketplace de revenda de ingressos</strong> que conecta compradores e vendedores de forma segura. Atuamos exclusivamente como <strong>intermediários</strong>, oferecendo:</p>
        <ul>
          <li>Validação automatizada de ingressos por inteligência artificial</li>
          <li>Sistema de pagamento protegido (escrow)</li>
          <li>Chat de negociação entre as partes</li>
          <li>Carteira digital para gerenciamento de pagamentos</li>
        </ul>
        <p><strong>A Tiko Pass não é produtora, organizadora ou promotora de eventos.</strong> Não emitimos ingressos originais nem garantimos a realização dos eventos.</p>

        <h2>3. Elegibilidade e Cadastro</h2>
        <ul>
          <li>O usuário deve ter no mínimo <strong>18 anos</strong> de idade</li>
          <li>O cadastro exige informações verídicas: nome completo, CPF válido, e-mail e senha</li>
          <li>O <strong>CPF informado deve corresponder</strong> ao CPF presente nos ingressos que o usuário pretende vender</li>
          <li>Cada pessoa física pode manter apenas <strong>uma conta</strong> na plataforma</li>
          <li>O usuário é responsável pela segurança de suas credenciais de acesso</li>
          <li>Ao se cadastrar, o usuário aceita a <a href="/privacy">Política de Privacidade</a> e autoriza o tratamento de dados conforme a LGPD</li>
        </ul>

        <h2>4. Regras para Vendedores</h2>
        <h3>4.1. Obrigações do Vendedor</h3>
        <ul>
          <li>O vendedor deve ser o <strong>titular legítimo</strong> do ingresso</li>
          <li>O ingresso deve ser válido, não utilizado e não transferido a terceiros</li>
          <li>O vendedor é <strong>inteiramente responsável</strong> pela autenticidade do ingresso</li>
          <li>O preço é definido livremente pelo vendedor, devendo o preço original (valor de face) ser informado com veracidade</li>
        </ul>

        <h3>4.2. Proibições</h3>
        <ul>
          <li>Venda de ingressos <strong>falsificados, duplicados ou de cortesia</strong></li>
          <li>Venda de ingressos de plataformas com QR rotativo (ex: Ticketmaster/SafeTix)</li>
          <li>Uso de CPF de terceiros para validação</li>
          <li>Publicação do mesmo ingresso em múltiplas plataformas simultaneamente</li>
          <li>Manipulação ou adulteração de documentos de ingresso</li>
        </ul>

        <h3>4.3. Validação por IA</h3>
        <p>Todos os ingressos passam por validação automatizada que verifica:</p>
        <ul>
          <li>Autenticidade do documento (OCR inteligente)</li>
          <li>Correspondência do CPF do vendedor com o CPF no ingresso</li>
          <li>Unicidade do QR Code/código de barras (anti-duplicidade via SHA-256)</li>
          <li>Correspondência com o evento selecionado</li>
          <li>Detecção de ingressos de cortesia</li>
          <li>Compatibilidade da plataforma de origem</li>
        </ul>
        <p>A plataforma reserva-se o direito de <strong>recusar ingressos</strong> que não atendam aos critérios de validação.</p>

        <h2>5. Regras para Compradores</h2>
        <ul>
          <li>O comprador pode fazer ofertas pelo valor desejado ou aceitar o preço anunciado</li>
          <li>A negociação ocorre exclusivamente pelo chat da plataforma</li>
          <li>O pagamento é processado de forma segura e o valor <strong>fica retido (escrow)</strong> até a confirmação</li>
          <li>O comprador deve verificar os detalhes do ingresso antes de confirmar a compra</li>
          <li>Os preços são definidos pelos vendedores e podem estar <strong>acima ou abaixo</strong> do valor original</li>
        </ul>

        <h2>6. Pagamentos e Taxas</h2>
        <h3>6.1. Taxa de Serviço</h3>
        <ul>
          <li>A plataforma cobra uma taxa de <strong>10% sobre o valor do ingresso, paga pelo comprador</strong></li>
          <li>O vendedor recebe 100% do valor que definiu para o ingresso, sem descontos</li>
          <li>A taxa é exibida de forma destacada antes da confirmação do pagamento, conforme determinação do STJ</li>
          <li>Exemplo: Ingresso R$ 180,00 + Taxa Tiko Pass R$ 18,00 = <strong>Total: R$ 198,00</strong></li>
          <li>Essa taxa cobre: validação por IA, intermediação, processamento de pagamento e suporte</li>
        </ul>

        <h3>6.2. Pagamento Protegido (Escrow)</h3>
        <ul>
          <li>O valor pago pelo comprador fica <strong>retido pela plataforma</strong> durante o período de proteção</li>
          <li>O valor é liberado ao vendedor na <strong>Carteira Tiko</strong> automaticamente 24 horas após a realização do evento, desde que não haja contestação aberta</li>
          <li>O vendedor pode solicitar saque do saldo disponível na carteira a qualquer momento via Pix</li>
        </ul>

        <h3>6.3. Reembolsos</h3>
        <ul>
          <li>Em caso de ingresso comprovadamente inválido, o comprador será reembolsado integralmente</li>
          <li>Cancelamentos de eventos pelo organizador não são de responsabilidade da Tiko Pass — o comprador deve buscar reembolso junto ao organizador</li>
        </ul>

        <h2>7. Política de Contestação</h2>
        <h3>7.1. Prazo</h3>
        <ul>
          <li>O comprador tem até <strong>24 horas após a realização do evento</strong> para abrir uma contestação</li>
          <li>Após esse prazo, o pagamento é automaticamente liberado ao vendedor</li>
        </ul>

        <h3>7.2. Como abrir uma contestação</h3>
        <ul>
          <li>Acesse "Meus Ingressos" na aba "Comprados"</li>
          <li>Clique em "Abrir contestação" no ingresso em questão</li>
          <li>Descreva o problema detalhadamente (ingresso inválido, não recebido, dados incorretos, etc.)</li>
        </ul>

        <h3>7.3. Análise e resolução</h3>
        <ul>
          <li>A equipe Tiko Pass analisará as evidências de ambas as partes (comprador e vendedor)</li>
          <li>O prazo de resolução é de até <strong>48 horas úteis</strong> após a abertura da contestação</li>
          <li>Durante a análise, o pagamento permanece retido</li>
        </ul>

        <h3>7.4. Possíveis resultados</h3>
        <ul>
          <li><strong>Reembolso ao comprador:</strong> se comprovada a invalidade do ingresso ou descumprimento por parte do vendedor</li>
          <li><strong>Liberação ao vendedor:</strong> se a contestação for considerada improcedente</li>
          <li>A decisão da plataforma é final nos casos que envolvam o pagamento retido</li>
        </ul>

        <h2>8. Propriedade Intelectual</h2>
        <p>Todo o conteúdo da plataforma (marca, logotipo, design, código, textos) é de propriedade da Tiko Pass e protegido pela legislação de propriedade intelectual. É proibida a reprodução sem autorização prévia.</p>

        <h2>9. Limitação de Responsabilidade</h2>
        <p><strong>A Tiko Pass é um marketplace — intermediamos a revenda entre pessoas físicas. Não somos revendedores de ingressos.</strong></p>
        <ul>
          <li>A Tiko Pass <strong>não garante a realização dos eventos</strong> listados na plataforma</li>
          <li>Não nos responsabilizamos por eventos cancelados, adiados ou alterados pelos organizadores</li>
          <li>A plataforma não se responsabiliza por negociações realizadas fora da plataforma</li>
          <li>O uso de ingressos adquiridos está sujeito às regras do organizador do evento</li>
        </ul>

        <h2>9. Penalidades e Suspensão</h2>
        <p>A Tiko Pass pode, a seu exclusivo critério:</p>
        <ul>
          <li>Suspender ou encerrar contas que violem estes termos</li>
          <li>Remover anúncios que não atendam às políticas da plataforma</li>
          <li>Reter pagamentos em caso de suspeita de fraude</li>
          <li>Reportar atividades ilegais às autoridades competentes</li>
        </ul>

        <h2>10. Exclusão de Conta</h2>
        <ul>
          <li>O usuário pode solicitar a exclusão da conta a qualquer momento pelo Perfil</li>
          <li>Transações em andamento devem ser finalizadas antes da exclusão</li>
          <li>Saldos pendentes na Carteira devem ser sacados antes da exclusão</li>
          <li>Após a exclusão, os dados são removidos conforme a <a href="/privacy">Política de Privacidade</a></li>
        </ul>

        <h2>11. Resolução de Conflitos</h2>
        <p>Em caso de disputas entre compradores e vendedores, a Tiko Pass poderá atuar como mediadora, analisando as evidências e tomando decisão com base nas políticas da plataforma. A decisão da plataforma é final nos casos em que envolvam o pagamento retido.</p>

        <h2>12. Legislação Aplicável e Foro</h2>
        <p>Estes termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Salvador/BA para dirimir eventuais controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

        <h2>13. Disposições Gerais</h2>
        <ul>
          <li>A eventual invalidade de qualquer cláusula não afeta as demais</li>
          <li>A tolerância quanto ao descumprimento de qualquer obrigação não implica renúncia ao direito de exigir seu cumprimento</li>
          <li>Estes termos constituem o acordo integral entre as partes</li>
        </ul>

        <h2>14. Contato</h2>
        <p>Para dúvidas sobre estes termos:</p>
        <ul>
          <li><strong>E-mail:</strong> suporte@tiko.com.br</li>
          <li><strong>Chat:</strong> Fale com o Tiko (disponível na plataforma)</li>
        </ul>
      </div>
      <Footer />
    </div>
  );
}
