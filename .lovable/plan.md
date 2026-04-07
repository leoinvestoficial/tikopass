## Plano de implementação

### 1. Formulário /sell em 4 etapas (modelo VMI)
- **Etapa 1**: Busca do evento pelo nome (autocomplete)
- **Etapa 2**: Setor, fileira, assento e quantidade
- **Etapa 3**: Preço livre (sem teto) + preço original para comparação
- **Etapa 4**: Upload do ingresso + validação por IA com loading animado
- Stepper visual com progresso entre etapas
- Upload vai para o final (vendedor já está comprometido)

### 2. Taxa 10% transparente no checkout
- Antes do pagamento, exibir com destaque:
  - "Ingresso: R$180 + Taxa Tiko Pass: R$18 = Total: R$198"
- Taxa paga pelo comprador, 0% do vendedor
- Conformidade com STJ

### 3. Comparação de preços nos cards de ingresso
- Exibir "Preço original: R$120" vs "Preço de revenda: R$180" nos TicketCards
- Usar campo `original_price` já existente na tabela tickets

### 4. Histórico detalhado na carteira
- Listar por transação: nome do evento, data da venda, valor bruto, taxa da plataforma, valor líquido, status (pendente/disponível/sacado), data prevista de liberação
- Melhorar a WalletPage com tabela/cards detalhados

### 5. Documentos legais (modelo base)
- Gerar Termos de Uso adaptado ao modelo P2P
- Gerar Política de Privacidade LGPD
- Gerar Política de Contestação (24h pós-evento)
- Implementar nas páginas /terms e /privacy existentes
