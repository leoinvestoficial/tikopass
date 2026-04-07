import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="container py-10 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Política de Privacidade</h1>
          <p className="text-muted-foreground text-sm">Última atualização: 26 de março de 2026</p>
        </div>
      </section>

      <div className="flex-1 container max-w-3xl py-10 prose prose-sm dark:prose-invert">

        <h2>1. Introdução</h2>
        <p>A Tiko Pass ("nós", "nosso" ou "plataforma") tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos, compartilhamos e protegemos suas informações pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD – Lei nº 13.709/2018)</strong> e demais legislações aplicáveis.</p>
        <p>Ao se cadastrar e utilizar nossa plataforma, você declara que leu, compreendeu e aceita as práticas descritas nesta política.</p>

        <h2>2. Dados Pessoais Coletados</h2>
        <p>Coletamos os seguintes dados pessoais durante o cadastro e uso da plataforma:</p>

        <h3>2.1. Dados de Identificação</h3>
        <ul>
          <li><strong>Nome completo</strong> — para identificação na plataforma e nas negociações</li>
          <li><strong>CPF</strong> — obrigatório para validação de ingressos (correspondência entre o titular do ingresso e o vendedor)</li>
          <li><strong>E-mail</strong> — para autenticação, notificações e comunicações essenciais</li>
          <li><strong>Telefone</strong> — para contato de segurança, quando necessário</li>
          <li><strong>Foto de perfil</strong> — opcional, para personalização do perfil público</li>
        </ul>

        <h3>2.2. Dados de Endereço</h3>
        <ul>
          <li>CEP, rua, número, complemento, bairro, cidade e estado</li>
          <li>Utilizados para eventual verificação de identidade e localização geográfica para recomendações de eventos</li>
        </ul>

        <h3>2.3. Dados Transacionais</h3>
        <ul>
          <li>Ingressos publicados, negociações iniciadas e concluídas</li>
          <li>Valores de transações e histórico de pagamentos</li>
          <li>Avaliações e comentários realizados</li>
        </ul>

        <h3>2.4. Dados Técnicos</h3>
        <ul>
          <li>Endereço IP, tipo de navegador e sistema operacional</li>
          <li>Dados de sessão e cookies essenciais para funcionamento</li>
          <li>Registros de acesso (logs), conforme exigido pelo Marco Civil da Internet</li>
        </ul>

        <h3>2.5. Dados de Ingressos</h3>
        <ul>
          <li>Imagem/PDF do ingresso (armazenado em bucket privado e criptografado)</li>
          <li>Hash SHA-256 do QR Code/código de barras (para anti-duplicidade — o dado original não é armazenado)</li>
          <li>Informações extraídas por OCR (código do ingresso, setor, nome do evento)</li>
        </ul>

        <h2>3. Finalidade do Tratamento</h2>
        <p>Seus dados pessoais são tratados exclusivamente para as seguintes finalidades:</p>
        <table>
          <thead>
            <tr><th>Finalidade</th><th>Base Legal (LGPD)</th></tr>
          </thead>
          <tbody>
            <tr><td>Criação e gestão de conta</td><td>Execução de contrato (Art. 7°, V)</td></tr>
            <tr><td>Validação de ingressos por IA (correspondência de CPF)</td><td>Execução de contrato (Art. 7°, V)</td></tr>
            <tr><td>Intermediação de compra e venda</td><td>Execução de contrato (Art. 7°, V)</td></tr>
            <tr><td>Processamento de pagamentos</td><td>Execução de contrato (Art. 7°, V)</td></tr>
            <tr><td>Prevenção de fraudes e duplicidade</td><td>Legítimo interesse (Art. 7°, IX)</td></tr>
            <tr><td>Comunicações sobre negociações</td><td>Execução de contrato (Art. 7°, V)</td></tr>
            <tr><td>Recomendações personalizadas de eventos</td><td>Consentimento (Art. 7°, I)</td></tr>
            <tr><td>Cumprimento de obrigações legais</td><td>Obrigação legal (Art. 7°, II)</td></tr>
          </tbody>
        </table>

        <h2>4. Compartilhamento de Dados</h2>
        <p>Seus dados pessoais <strong>nunca são vendidos</strong>. O compartilhamento ocorre apenas nos seguintes casos:</p>
        <ul>
          <li><strong>Com outros usuários:</strong> durante negociações, compartilhamos apenas seu nome de exibição, foto de perfil, cidade e avaliações públicas. CPF e dados sensíveis <strong>nunca</strong> são compartilhados</li>
          <li><strong>Com processadores de pagamento:</strong> dados necessários para processar transações financeiras de forma segura</li>
          <li><strong>Com autoridades competentes:</strong> quando exigido por lei, ordem judicial ou requisição de autoridade pública</li>
          <li><strong>Com prestadores de serviço:</strong> serviços de infraestrutura, hospedagem e inteligência artificial utilizados para o funcionamento da plataforma, sempre sob contratos de confidencialidade</li>
        </ul>

        <h2>5. Armazenamento e Segurança</h2>
        <p>Implementamos medidas técnicas e organizacionais robustas para proteger seus dados:</p>
        <ul>
          <li><strong>Criptografia de senhas</strong> utilizando algoritmo bcrypt</li>
          <li><strong>Row-Level Security (RLS)</strong> — cada usuário só acessa seus próprios dados</li>
          <li><strong>Bucket privado</strong> para armazenamento de ingressos — sem acesso público</li>
          <li><strong>Hash SHA-256</strong> para detecção de duplicidade sem armazenar dados originais do QR Code</li>
          <li><strong>HTTPS/TLS</strong> em todas as comunicações</li>
          <li><strong>Autenticação JWT</strong> com tokens de sessão seguros</li>
          <li><strong>Backups regulares</strong> dos dados com redundância geográfica</li>
        </ul>
        <p>Os dados são armazenados em servidores seguros com certificações SOC 2 Type II e ISO 27001.</p>

        <h2>6. Cookies e Tecnologias de Rastreamento</h2>
        <p>Utilizamos apenas cookies essenciais para o funcionamento da plataforma:</p>
        <ul>
          <li><strong>Cookies de sessão:</strong> para manter sua autenticação ativa</li>
          <li><strong>Cookies de preferência:</strong> para armazenar preferências de cidade e gêneros musicais</li>
        </ul>
        <p>Não utilizamos cookies de rastreamento publicitário de terceiros.</p>

        <h2>7. Seus Direitos (LGPD - Art. 18)</h2>
        <p>Como titular dos dados, você tem os seguintes direitos:</p>
        <ul>
          <li><strong>Acesso:</strong> solicitar quais dados pessoais seus estão armazenados</li>
          <li><strong>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados (via página de Perfil)</li>
          <li><strong>Exclusão:</strong> solicitar a eliminação dos seus dados pessoais (via "Excluir conta" no Perfil)</li>
          <li><strong>Portabilidade:</strong> solicitar a transferência dos seus dados para outro serviço</li>
          <li><strong>Revogação de consentimento:</strong> retirar seu consentimento a qualquer momento</li>
          <li><strong>Informação:</strong> ser informado sobre as entidades com as quais seus dados são compartilhados</li>
          <li><strong>Oposição:</strong> opor-se ao tratamento quando realizado com base em legítimo interesse</li>
        </ul>
        <p>Para exercer qualquer direito, acesse seu perfil na plataforma ou entre em contato pelo e-mail <strong>privacidade@tiko.com.br</strong>. Responderemos em até 15 dias úteis.</p>

        <h2>8. Retenção e Eliminação de Dados</h2>
        <ul>
          <li><strong>Conta ativa:</strong> dados são mantidos enquanto a conta estiver ativa</li>
          <li><strong>Exclusão de conta:</strong> dados são removidos em até 30 dias, incluindo ingressos, avatar e perfil</li>
          <li><strong>Obrigação legal:</strong> registros de acesso (logs) são mantidos por 6 meses conforme o Marco Civil da Internet (Lei nº 12.965/2014)</li>
          <li><strong>Transações financeiras:</strong> dados de transações são mantidos por 5 anos conforme legislação fiscal</li>
        </ul>

        <h2>9. Transferência Internacional de Dados</h2>
        <p>Seus dados podem ser processados em servidores localizados fora do Brasil para fins de hospedagem e infraestrutura. Nesses casos, garantimos que os prestadores de serviço adotam medidas de proteção equivalentes às exigidas pela LGPD, conforme Art. 33.</p>

        <h2>10. Menores de Idade</h2>
        <p>A Tiko Pass não é destinada a menores de 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos uma conta de menor, ela será desativada e os dados eliminados.</p>

        <h2>11. Alterações nesta Política</h2>
        <p>Reservamo-nos o direito de atualizar esta Política de Privacidade a qualquer momento. Alterações significativas serão comunicadas por e-mail ou notificação na plataforma. O uso continuado após alterações constitui aceitação dos novos termos.</p>

        <h2>12. Encarregado de Dados (DPO)</h2>
        <p>Para questões relacionadas à proteção de dados pessoais, entre em contato com nosso Encarregado de Dados:</p>
        <ul>
          <li><strong>E-mail:</strong> privacidade@tiko.com.br</li>
          <li><strong>Canal de suporte:</strong> Chat Tiko (disponível na plataforma)</li>
        </ul>

        <h2>13. Legislação Aplicável</h2>
        <p>Esta política é regida pela legislação brasileira, especialmente:</p>
        <ul>
          <li>Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018)</li>
          <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
          <li>Código de Defesa do Consumidor (Lei nº 8.078/1990)</li>
        </ul>
      </div>
      <Footer />
    </div>
  );
}
