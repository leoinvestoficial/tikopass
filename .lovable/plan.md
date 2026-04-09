
## Análise Completa da Plataforma — Gaps para Lançamento

### 🔴 Problemas Críticos Encontrados
1. **Menu mobile incompleto** — Não tem link para Carteira, nem para perfil completo no menu mobile
2. **Busca de eventos degradada** — O edge function `search-events` precisa ser testado/corrigido
3. **Sem navegação inferior mobile** — Plataforma não tem bottom nav bar (padrão essencial para apps mobile)
4. **Fluxo de transferência incompleto** — Após pagamento aceito, não há fluxo claro para transferir o ingresso
5. **Sem notificações por email** — Nenhum email transacional implementado
6. **Sem pagamento real integrado** — Stripe existe mas checkout não está finalizado para produção

### 📋 Plano de Ação (neste ciclo)

#### 1. Corrigir Algoritmo de Busca
- Testar edge function `search-events` com "Oboé Tour" e "Réveillon Destino 2027"
- Verificar se Perplexity e Firecrawl estão retornando dados
- Ajustar prompts se necessário para melhorar qualidade dos resultados
- Garantir que a busca por categoria na home dispara busca IA

#### 2. Acesso ao Perfil do Vendedor pelo Comprador
- O link já existe em `/ticket/:id` e em `/negotiations` — verificar se está funcionando
- Garantir que na página de negociações, o comprador consiga clicar no nome/avatar do vendedor e ir para `/seller/:userId`

#### 3. Carteira Mais Acessível
- Adicionar link "Carteira" no menu mobile
- Adicionar bottom navigation bar fixa no mobile com: Início, Vender, Negociações, Carteira

#### 4. Redesign Mobile-First Completo
- **Bottom Navigation Bar** — Barra fixa no rodapé com ícones para as 4 seções principais
- **Hero da Home** — Reduzir altura, search bar mais compacta
- **Cards de ingressos** — Grid 1 coluna no mobile, cards mais compactos
- **Negociações** — Layout mobile com lista + chat em tela cheia (drawer)
- **Navbar** — Simplificar para mobile
- **SellPage** — Steps mais compactos no mobile
- **WalletPage** — Cards de saldo empilhados

#### 5. Itens NÃO incluídos neste ciclo (próximos passos)
- Integração de pagamento real (Pagar.me)
- Notificações por email
- Fluxo completo de transferência de ingressos
- Push notifications
