import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 container max-w-3xl py-10 prose prose-sm dark:prose-invert">
        <h1 className="text-2xl font-display font-bold text-foreground">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm">Última atualização: 26 de março de 2026</p>

        <h2>1. Dados coletados</h2>
        <p>Coletamos os seguintes dados pessoais durante o cadastro e uso da plataforma:</p>
        <ul>
          <li><strong>Dados de identificação:</strong> nome completo, CPF, e-mail e telefone</li>
          <li><strong>Dados de endereço:</strong> CEP, rua, número, bairro, cidade e estado</li>
          <li><strong>Dados de uso:</strong> ingressos publicados, negociações e transações</li>
          <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador e dados de acesso</li>
        </ul>

        <h2>2. Finalidade do tratamento</h2>
        <p>Seus dados são utilizados exclusivamente para:</p>
        <ul>
          <li>Autenticação e segurança da conta</li>
          <li>Validação de ingressos via OCR (correspondência de CPF)</li>
          <li>Intermediação segura de compra e venda de ingressos</li>
          <li>Prevenção de fraudes e duplicidade</li>
          <li>Comunicações sobre suas negociações</li>
        </ul>

        <h2>3. Base legal (LGPD)</h2>
        <p>O tratamento dos dados é realizado com base no consentimento do titular (Art. 7°, I da LGPD) e na execução de contrato (Art. 7°, V), quando necessário para a prestação do serviço.</p>

        <h2>4. Compartilhamento de dados</h2>
        <p>Seus dados <strong>não são vendidos</strong> a terceiros. O compartilhamento ocorre apenas:</p>
        <ul>
          <li>Com compradores/vendedores durante negociações (nome de exibição apenas)</li>
          <li>Com processadores de pagamento para finalizar transações</li>
          <li>Com autoridades, quando exigido por lei</li>
        </ul>

        <h2>5. Segurança</h2>
        <p>Implementamos medidas técnicas e organizacionais para proteger seus dados, incluindo:</p>
        <ul>
          <li>Criptografia de senhas (bcrypt)</li>
          <li>Controle de acesso por Row-Level Security (RLS)</li>
          <li>Armazenamento seguro de ingressos em bucket privado</li>
          <li>Hashes SHA-256 para detecção de duplicidade (sem armazenar dados originais)</li>
        </ul>

        <h2>6. Seus direitos</h2>
        <p>Conforme a LGPD, você tem direito a:</p>
        <ul>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar a exclusão dos seus dados</li>
          <li>Revogar o consentimento a qualquer momento</li>
          <li>Solicitar a portabilidade dos dados</li>
        </ul>
        <p>Para exercer seus direitos, acesse seu perfil ou entre em contato pelo suporte.</p>

        <h2>7. Retenção de dados</h2>
        <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após a exclusão da conta, os dados são removidos em até 30 dias, exceto quando a retenção for necessária para cumprimento de obrigação legal.</p>

        <h2>8. Contato</h2>
        <p>Para dúvidas sobre esta política, entre em contato pelo chat de suporte da plataforma.</p>
      </div>
      <Footer />
    </div>
  );
}
