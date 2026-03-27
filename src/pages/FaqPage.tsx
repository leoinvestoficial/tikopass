import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldCheck, HelpCircle } from "lucide-react";

const FAQ_SECTIONS = [
  {
    title: "Compra de ingressos",
    items: [
      {
        q: "Como funciona a compra de ingressos no Tiko Pass?",
        a: "Você encontra o ingresso desejado, faz uma oferta ou aceita o preço anunciado. O pagamento é processado com segurança e o ingresso só é liberado após a confirmação.",
      },
      {
        q: "Os ingressos são verificados?",
        a: "Sim! Todos os ingressos passam por validação com inteligência artificial que verifica a autenticidade do PDF, QR Code e correspondência com o evento selecionado.",
      },
      {
        q: "Posso negociar o preço?",
        a: 'Sim! Ao clicar em "Negociar no chat" você pode enviar uma oferta diferente do valor anunciado. O vendedor pode aceitar, recusar ou fazer uma contra-proposta.',
      },
      {
        q: "E se o ingresso não funcionar no evento?",
        a: "O pagamento fica retido na plataforma até a confirmação de recebimento pelo comprador. Em caso de problemas, nossa equipe de suporte intermedia a resolução.",
      },
    ],
  },
  {
    title: "Venda de ingressos",
    items: [
      {
        q: "Como vender meu ingresso?",
        a: 'Clique em "Vender ingresso", selecione o evento, faça upload do PDF e defina o preço. Nossa IA valida o ingresso automaticamente em segundos.',
      },
      {
        q: "Quanto tempo leva a validação?",
        a: "A validação por IA é praticamente instantânea. Em casos excepcionais, pode levar alguns minutos para revisão manual.",
      },
      {
        q: "Quando recebo o dinheiro da venda?",
        a: "Após o comprador confirmar o recebimento do ingresso, o valor é creditado na sua Carteira Tiko. De lá, você pode sacar quando quiser.",
      },
      {
        q: "Posso definir qualquer preço?",
        a: "Sim, o preço é definido por você. Os compradores podem ver o preço original (valor de face) e o seu preço para tomar uma decisão informada.",
      },
    ],
  },
  {
    title: "Pagamentos e segurança",
    items: [
      {
        q: "O pagamento é seguro?",
        a: "Sim! Utilizamos processamento de pagamento protegido. O valor fica retido até a confirmação de entrega do ingresso.",
      },
      {
        q: "Como funciona a Carteira Tiko?",
        a: "A Carteira Tiko é sua conta digital dentro da plataforma. Todo dinheiro de vendas é depositado lá e você pode solicitar saque a qualquer momento.",
      },
      {
        q: "Quais formas de pagamento são aceitas?",
        a: "Aceitamos cartão de crédito, débito e PIX para pagamentos de ingressos.",
      },
    ],
  },
  {
    title: "Conta e dados",
    items: [
      {
        q: "Meus dados estão protegidos?",
        a: "Sim! Seguimos todas as diretrizes da LGPD (Lei Geral de Proteção de Dados). Seus dados pessoais são criptografados e nunca compartilhados com terceiros sem consentimento.",
      },
      {
        q: "Posso excluir minha conta?",
        a: 'Sim. Acesse seu Perfil, vá até a seção "Zona de perigo" e clique em "Excluir conta". Todos os seus dados serão removidos permanentemente.',
      },
      {
        q: "Por que preciso informar o CPF?",
        a: "O CPF é necessário para validar sua identidade e garantir que os ingressos que você vende estão vinculados ao seu nome, aumentando a segurança da plataforma.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="border-b border-border bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="container py-12 text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Perguntas Frequentes
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Tire suas dúvidas sobre como comprar, vender e negociar ingressos no Tiko Pass.
          </p>
        </div>
      </section>

      <div className="container py-10 max-w-3xl space-y-10">
        {FAQ_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">{section.title}</h2>
            <Accordion type="single" collapsible className="space-y-2">
              {section.items.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`${section.title}-${i}`}
                  className="bg-card border border-border rounded-xl px-5 data-[state=open]:shadow-sm"
                >
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}

        <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-4">
          <ShieldCheck className="w-8 h-8 text-success shrink-0" />
          <div>
            <p className="font-display font-semibold text-foreground text-sm">Ainda com dúvidas?</p>
            <p className="text-sm text-muted-foreground">
              Use o chat Tiko no canto inferior direito da tela para falar com nosso assistente virtual.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
