
## Lacunas identificadas no fluxo do comprador

### 🔴 Críticas (não implementadas)

1. **Fluxo de transferência de ingresso (Seção 3.5 + 4.3 + 6)**
   - Atualmente: comprador recebe apenas um token para ver o PDF. Não há rastreamento de transferência.
   - Documento: status em tempo real no `/my-tickets` → "Aguardando transferência" → "Transferido" → "Confirmado"
   - Documento: instruções automáticas por plataforma (Sympla, Eventim, Ticket Maker, etc.)
   - Documento: comprador confirma recebimento na plataforma
   - **Ação**: Criar tabela `ticket_transfers` com status tracking, UI de progresso no `/my-tickets`, instruções por plataforma

2. **Níveis de garantia nos cards (Seção 5)**
   - Não existe badge Verde/Amarelo/Laranja nos cards de ingresso
   - Documento: comprador vê o nível ANTES de pagar
   - **Ação**: Detectar plataforma de origem (já extraída pelo OCR) e exibir badge de garantia

3. **Janela de contestação (Seção 4.4)**
   - Atualmente: `release-payments` libera automaticamente 2h após o evento
   - Documento: comprador tem 24h após o evento para contestar
   - **Ação**: Ajustar timer para 24h, adicionar botão "Abrir contestação" no `/my-tickets`

4. **Confirmação de recebimento pelo comprador (Seção 3.6)**
   - Atualmente: não existe
   - Documento: comprador confirma que recebeu → abre janela de contestação → sem contestação = liberação
   - **Ação**: Botão "Confirmar recebimento" que muda status e inicia contagem de contestação

### 🟡 Importantes (parcialmente implementadas)

5. **Níveis de vendedor (Seção 8.2)**
   - Tabela `seller_ratings` existe mas não há cálculo de nível
   - Documento: Novo → Iniciante → Confiável → Verificado → Top Seller
   - **Ação**: Função que calcula nível + badge visual nos cards e perfil

6. **Avaliação pós-compra (Seção 4.5)**
   - Tabela existe, mas não há UI para o comprador avaliar após o evento
   - **Ação**: Modal de avaliação no `/my-tickets` para negociações concluídas

### 🟢 Menores

7. **Badge de nível do vendedor nos cards de ingresso**
8. **Número de vendas anteriores visível no perfil**

---

### Sugestão de prioridade
Implementar na ordem: 1 → 4 → 3 → 2 → 5 → 6 (fluxo de transferência primeiro, pois é o core da proposta de valor)
