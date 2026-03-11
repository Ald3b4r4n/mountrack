'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Logo from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';

/**
 * Tipos de gastos permitidos na plataforma.
 */
type ExpenseType = 'ampoule' | 'consultation' | 'supplement' | 'other';

/**
 * Interface que define a estrutura de um Gasto (Expense) no banco de dados Firestore.
 */
interface ExpenseData {
  id: string;
  type: ExpenseType;
  title: string; // Nome da marca, médico ou descrição curta
  amount: number; // Valor financeiro gasto
  date: string; // Data do gasto no formato YYYY-MM-DD
}

/**
 * Componente principal da página de Gestão de Gastos.
 * Permite ao usuário cadastrar perdas financeiras (investimentos) em sua saúde,
 * visualizando o histórico e o resumo de tudo o que foi gasto no processo.
 */
export default function Expenses() {
  const { user } = useAuth();
  
  // Estados para armazenar a lista de gastos e o status de carregamento
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados referentes ao formulário de novo gasto
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Valores do formulário
  const [type, setType] = useState<ExpenseType>('ampoule');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  
  // Iniciar a data sugerida com o dia de hoje
  const getToday = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const [date, setDate] = useState(() => getToday());

  /**
   * Efeito colateral para buscar todos os registros de gastos assim que o componente for montado.
   * Utiliza ordenação pela data de forma decrescente (mais recente primeiro).
   */
  const fetchExpenses = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Referência à subcoleção 'expenses' do usuário atual
      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      
      // Criar a query ordenando da data mais recente para a mais antiga
      const q = query(expensesRef, orderBy('date', 'desc'));
      
      // Executar a busca no Firebase
      const querySnapshot = await getDocs(q);
      
      const fetchedExpenses: ExpenseData[] = [];
      querySnapshot.forEach((document) => {
        fetchedExpenses.push({ id: document.id, ...document.data() } as ExpenseData);
      });

      // Atualiza o estado com o array preenchido
      setExpenses(fetchedExpenses);
    } catch (err) {
      console.error("Erro ao carregar gastos:", err);
      setMessage({ type: 'error', text: 'Não foi possível carregar o histórico de gastos.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  /**
   * Função responsável por salvar um novo gasto no Firestore.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validações básicas de formulário
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Informe um valor válido.' });
      return;
    }
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Informe uma descrição para o gasto.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage({ type: '', text: '' });

      // Dados estruturados a serem salvos
      const expenseData = {
        type,
        title: title.trim(),
        amount: parsedAmount,
        date: date,
        createdAt: new Date().toISOString()
      };

      // Inserção do documento na subcoleção 'expenses'
      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      await addDoc(expensesRef, expenseData);

      // Limpar formulário após o sucesso do cadastro
      setTitle('');
      setAmount('');
      setType('ampoule');
      setDate(getToday());
      setMessage({ type: 'success', text: 'Gasto salvo com sucesso.' });
      
      // Atualizar a lista de gastos na tela
      await fetchExpenses();

      // Limpa a mensagem  de sucesso apois de 3 segundos
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Não foi possível salvar o gasto. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Função para excluir um gasto específico.
   * @param id - Identificador único do documento (gasto) no Firestore
   */
  const handleDelete = async (id: string) => {
    // Confirmação simples para evitar exclusão por cliques acidentais
    if (!window.confirm("Tem certeza que deseja excluir este gasto?")) return;
    
    if (!user) return;
    
    try {
      // Removendo documento do banco
      await deleteDoc(doc(db, 'users', user.uid, 'expenses', id));
      
      // Atualizar estado local removendo o item, evitando um novo fetch completo
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    } catch (err) {
      console.error("Erro ao deletar gasto:", err);
      alert("Houve um erro ao tentar excluir o registro.");
    }
  };

  /**
   * Método de auxílio que transforma o identificador (tipo do gasto) do banco 
   * em uma string amigável para exibição ao usuário.
   */
  const getExpenseLabel = (expenseType: ExpenseType) => {
    const labels: Record<ExpenseType, string> = {
      ampoule: 'Ampola/Medicação',
      consultation: 'Consulta Médica',
      supplement: 'Suplementação',
      other: 'Outros Gastos'
    };
    return labels[expenseType] || 'Desconhecido';
  };

  // =============== CÁLCULOS DE RESUMO (SUMÁRIO) ===============
  const totalAmount = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAmpoules = expenses.filter(e => e.type === 'ampoule').reduce((acc, curr) => acc + curr.amount, 0);
  const totalConsultations = expenses.filter(e => e.type === 'consultation').reduce((acc, curr) => acc + curr.amount, 0);
  const totalSupplements = expenses.filter(e => e.type === 'supplement').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOthers = expenses.filter(e => e.type === 'other').reduce((acc, curr) => acc + curr.amount, 0);

  /**
   * Função auxiliar de formatação para moeda (Real Brasileiro).
   */
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <ProtectedRoute>
      <main className="container" style={{ paddingTop: '3rem', position: 'relative' }}>
        
        {/* Cabeçalho da página de Gastos */}
        <header className="anim-enter" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div>
            <Logo size="md" />
            <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>Acompanhe quanto já foi investido na jornada.</p>
          </div>
          <Link href="/" className="nav-pill">
            {/* Ícone chevron esquerdo */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Dashboard
          </Link>
        </header>

        {/* =============== SEÇÃO DE RESUMO FINANCEIRO =============== */}
        <section className="anim-enter" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          
          {/* Card: Gasto Total */}
          <article className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
            <p className="stat-label">Investimento Total</p>
            <div className="stat-number" style={{ color: 'var(--accent-primary)', fontSize: '2rem' }}>
              {formatCurrency(totalAmount)}
            </div>
          </article>

          {/* Card: Medicação */}
          <article className="glass-panel" style={{ padding: '1.5rem' }}>
            <p className="stat-label">Ampolas</p>
            <div className="stat-number" style={{ fontSize: '1.5rem' }}>
              {formatCurrency(totalAmpoules)}
            </div>
          </article>

          {/* Card: Consultas */}
          <article className="glass-panel" style={{ padding: '1.5rem' }}>
            <p className="stat-label">Consultas</p>
            <div className="stat-number" style={{ fontSize: '1.5rem' }}>
              {formatCurrency(totalConsultations)}
            </div>
          </article>

          {/* Card: Outros (Suplementos + Diversos) */}
          <article className="glass-panel" style={{ padding: '1.5rem' }}>
            <p className="stat-label">Suplementos & Outros</p>
            <div className="stat-number" style={{ fontSize: '1.5rem' }}>
              {formatCurrency(totalSupplements + totalOthers)}
            </div>
          </article>
        </section>

        {/* =============== SEÇÃO PRINCIPAL (FORMULÁRIO E LISTAGEM) =============== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* Lado Esquerdo: Novo formulário de gasto */}
          <section className="glass-panel anim-enter anim-delay-1" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontFamily: "'Outfit', sans-serif" }}>
              Novo gasto
            </h2>
            
            {/* Mensagens de feedback do formulário (Sucesso ou Erro) */}
            {message.text && (
              <div style={{ 
                padding: '1rem', 
                marginBottom: '1.5rem', 
                borderRadius: '8px', 
                backgroundColor: message.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: message.type === 'error' ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
                border: `1px solid ${message.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
              }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Grupo: Tipo de Gasto */}
              <div className="form-group">
                <label htmlFor="expense-category" className="form-label">Categoria</label>
                <select 
                  id="expense-category"
                  className="input-field" 
                  value={type} 
                  onChange={(e) => setType(e.target.value as ExpenseType)}
                  style={{ appearance: 'none', backgroundColor: 'var(--bg-tertiary)' }}
                  required
                >
                  <option value="ampoule">Ampola / Medicação</option>
                  <option value="consultation">Consulta Médica</option>
                  <option value="supplement">Suplementos</option>
                  <option value="other">Outros</option>
                </select>
              </div>

              {/* Grupo: Título / Marca */}
              <div className="form-group">
                <label htmlFor="expense-title" className="form-label">Descrição</label>
                <input 
                  id="expense-title"
                  type="text" 
                  className="input-field" 
                  placeholder="Ex: Mounjaro 2,5 mg, consulta com endocrinologista, whey protein"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Layout para Valor e Data dividindo a mesma linha */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="expense-amount" className="form-label">Valor gasto (R$)</label>
                  <input 
                    id="expense-amount"
                    type="number" 
                    step="0.01"
                    min="0"
                    className="input-field" 
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expense-date" className="form-label">Data do registro</label>
                  <input 
                    id="expense-date"
                    type="date" 
                    className="input-field" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Botão de Enviar */}
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting}
                style={{ marginTop: '1rem', opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar gasto'}
              </button>
            </form>
          </section>

          {/* Lado Direito: Listagem Histórica dos Gastos */}
          <section className="glass-panel anim-enter anim-delay-2" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontFamily: "'Outfit', sans-serif" }}>
              Lançamentos
            </h2>

            {loading ? (
              // Esqueleto (Skeleton) para enquanto carrega do Firebase
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[1, 2, 3].map((skeletonId) => <div key={`expense-skeleton-${skeletonId}`} className="skeleton-pulse" style={{ height: '70px', borderRadius: '8px' }}></div>)}
              </div>
            ) : expenses.length === 0 ? (
              // Estado Vazio (Zero itens)
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p>Ainda não há gastos registrados.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Adicione seus primeiros lançamentos para acompanhar os custos da jornada.</p>
              </div>
            ) : (
              // Lista de Registros formatados
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {expenses.map((expense) => (
                  <div key={expense.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    padding: '1rem', 
                    backgroundColor: 'var(--bg-tertiary)', 
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)'
                  }}>
                    {/* Detalhes principais do gasto à esquerda */}
                    <div style={{ flex: '1 1 auto', minWidth: '150px' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: "'Outfit', sans-serif", color: 'var(--text-primary)' }}>
                        {expense.title}
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <span>{getExpenseLabel(expense.type)}</span> • 
                        <span>
                          {new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </p>
                    </div>

                    {/* Preço e Botão de Deletar à direita */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '1.1rem' }}>
                        {formatCurrency(expense.amount)}
                      </span>
                      
                      {/* Botão para Deletar (Lixeira) */}
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}
                        title="Excluir gasto"
                        aria-label="Excluir gasto"
                      >
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'color 0.2s', ':hover': { color: 'var(--accent-danger)' } } as React.CSSProperties}>
                           <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                         </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </ProtectedRoute>
  );
}
