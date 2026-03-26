import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import tikoChatAvatar from "@/assets/tiko-chat-avatar.png";
import ReactMarkdown from "react-markdown";

type Message = { role: "user" | "assistant"; content: string };

export default function TikoChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Oi! Eu sou o **Tiko** 🎟️\nComo posso te ajudar hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("tiko-chat", {
        body: { messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })) },
      });
      if (error) throw error;
      const reply = data?.reply || "Desculpe, não consegui processar sua pergunta. Tente novamente!";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ops, algo deu errado. Tente novamente em instantes! 😅" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          open ? "bg-foreground text-background rotate-90" : "bg-primary text-primary-foreground"
        }`}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ height: "min(500px, calc(100vh - 140px))" }}
        >
          {/* Header */}
          <div className="bg-primary px-5 py-4 flex items-center gap-3 shrink-0">
            <img src={tikoIcon} alt="Tiko" className="w-10 h-10 rounded-xl object-cover border-2 border-white/20" />
            <div>
              <h3 className="font-bold text-primary-foreground text-sm">Tiko</h3>
              <p className="text-primary-foreground/70 text-xs">Suporte • Online agora</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <img src={tikoIcon} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5 mr-2" />
                )}
                <div
                  className={`max-w-[80%] px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                      : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>p:last-child]:mb-0">
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
                <img src={tikoIcon} alt="" className="w-7 h-7 rounded-lg object-cover" />
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
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
