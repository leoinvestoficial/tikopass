import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import tikoChatAvatar from "@/assets/tiko-chat-avatar.png";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

const WHATSAPP_NUMBER = "5571999470825";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá! Vim pelo Tiko Pass e gostaria de falar com um atendente."
)}`;

const QUICK_QUESTIONS = [
  "Como funciona a venda?",
  "Quando recebo meu dinheiro?",
  "Meu ingresso foi recusado, e agora?",
  "É seguro comprar aqui?",
  "Quais plataformas são aceitas?",
  "Como faço para sacar?",
];

export default function TikoChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Oi! Eu sou o **Tiko** 🎟️\n\nComo posso te ajudar hoje? Você pode escolher uma das perguntas abaixo ou digitar a sua dúvida.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text || loading) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setInteractionCount((c) => c + 1);

    try {
      const { data, error } = await supabase.functions.invoke("tiko-chat", {
        body: {
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const reply =
        data?.reply || "Desculpe, não consegui processar sua pergunta. Tente novamente!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Ops, algo deu errado. Tente novamente em instantes ou fale com um atendente humano pelo WhatsApp! 😅",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input.trim());
  const handleQuickQuestion = (q: string) => sendMessage(q);

  // Show WhatsApp fallback after 2 interactions OR always available as button
  const showWhatsappCta = interactionCount >= 2;
  const showQuickQuestions = messages.length <= 2 && !loading;

  return (
    <>
      {/* FAB with label */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-center gap-1.5">
        {!open && (
          <span className="text-[11px] font-bold text-foreground bg-card border border-border rounded-full px-3 py-1 shadow-md whitespace-nowrap">
            Fale com o Tiko
          </span>
        )}
        <button
          onClick={() => setOpen(!open)}
          className={`w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 overflow-hidden ${
            open ? "bg-foreground text-background rotate-90" : ""
          }`}
        >
          {open ? (
            <X className="w-6 h-6" />
          ) : (
            <img src={tikoChatAvatar} alt="Fale com o Tiko" className="w-full h-full object-cover" />
          )}
        </button>
      </div>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-40 w-[380px] max-w-[calc(100vw-32px)] md:max-w-[calc(100vw-48px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ height: "min(560px, calc(100vh - 200px))" }}
        >
          {/* Header */}
          <div className="bg-primary px-5 py-4 flex items-center gap-3 shrink-0">
            <img
              src={tikoChatAvatar}
              alt="Tiko"
              className="w-10 h-10 rounded-xl object-cover border-2 border-white/20"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-primary-foreground text-sm">Tiko</h3>
              <p className="text-primary-foreground/70 text-xs">Suporte • Online agora</p>
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold bg-white/15 hover:bg-white/25 text-primary-foreground rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
              title="Falar com atendente humano"
            >
              WhatsApp
            </a>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <img
                    src={tikoChatAvatar}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5 mr-2"
                  />
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                      : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0 [&_strong]:text-foreground">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <img src={tikoChatAvatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Quick question chips */}
            {showQuickQuestions && (
              <div className="pt-2">
                <p className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground mb-2 px-1">
                  Perguntas rápidas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-xs bg-muted hover:bg-primary hover:text-primary-foreground text-foreground rounded-full px-3 py-1.5 transition-colors border border-border"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* WhatsApp CTA after a few interactions */}
            {showWhatsappCta && !loading && (
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 rounded-xl p-3 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Precisa de mais ajuda?</p>
                  <p className="text-[11px] text-muted-foreground">
                    Falar com atendente humano no WhatsApp
                  </p>
                </div>
              </a>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Pergunte ao Tiko..."
                className="flex-1 text-sm bg-muted rounded-xl px-4 py-2.5 outline-none placeholder:text-muted-foreground text-foreground"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="bg-primary text-primary-foreground rounded-xl w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-opacity hover:bg-primary/90"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
