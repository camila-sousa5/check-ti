'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { ThemeToggle } from '../components/ThemeToggle'

interface Equipamento {
  id: string
  tipo: string
  marca?: string
  patrimonio?: string
  status: string
  qtd_funcionando?: number
  qtd_defeito?: number
  tem_reserva?: boolean
  qtd_reserva?: number
  foto_url?: string | null
  observacoes?: string
}

export default function MinhasAuditorias() {
  const router = useRouter()

  // Estados da tela
  const [auditorias, setAuditorias] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [busca, setBusca] = useState('')
  const [cardsExpandidos, setCardsExpandidos] = useState<Record<string, boolean>>({})
  const [fotoModal, setFotoModal] = useState<string | null | undefined>(null)

  const [erroCarregar, setErroCarregar] = useState<string | null>(null)

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      await carregarMinhasAuditorias(user.id, user.email ?? '')
    }

    inicializar()
  }, [router])

  const carregarMinhasAuditorias = async (userId: string, userEmail: string) => {
    setCarregando(true)
    setErroCarregar(null)
    try {
      const { data, error } = await supabase
        .from('auditorias')
        .select('*, lojas(nome, codigo_loja), er(nome, codigo_er), equipamentos(*)')
        .or(`user_id.eq.${userId},auditor_email.eq.${userEmail}`) // Traz apenas as auditorias do próprio usuário
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar no Supabase:', error)
        setErroCarregar(error.message)
        setAuditorias([])
        return
      }

      setAuditorias(data ?? [])
    } catch (error) {
      console.error('Erro ao carregar auditorias:', error)
    } finally {
      setCarregando(false)
    }
  }

  // Toggle para expandir/recolher card
  const toggleExpandir = (id: string) => {
    setCardsExpandidos((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Filtragem dos dados exibidos
  const auditoriasFiltradas = auditorias.filter((aud) => {
    const atendeStatus = filtroStatus === 'todos' || aud.validacao_status === filtroStatus
    const unidade = aud.tipo_unidade === 'er' ? aud.er : aud.lojas
    const atendeBusca = unidade?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
                        (unidade?.codigo_loja ?? unidade?.codigo_er)?.includes(busca)
    return atendeStatus && atendeBusca
  })

  // Helper de badges para o status de validação
  const renderBadgeValidação = (status: string) => {
    switch (status) {
      case 'aprovado':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            ✓ Aprovado
          </span>
        )
      case 'ajuste_solicitado':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
            ⚠️ Requer Ajustes
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1">
            ⏳ Em Análise
          </span>
        )
    }
  }

  return (
    <main className="min-h-screen bg-bg-primary text-txt-primary p-4 sm:p-6 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* CABEÇALHO DA TELA */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-bg-card text-txt-primary p-5 rounded-xl shadow-sm border border-border-main gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Minhas Auditorias</h1>
            <p className="text-sm text-txt-muted">
              Acompanhe o status e a validação dos relatórios enviados por você
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2.5 bg-brand text-white hover:bg-brand-dark rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
            >
              <span>+</span> Nova Auditoria
            </button>
          </div>
        </div>

        {/* CONTADORES RÁPIDOS / KPIS DE VALIDAÇÃO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-bg-card p-4 rounded-xl border border-border-main text-center">
            <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Em Análise</p>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
              {auditorias.filter((a) => a.validacao_status === 'pendente').length}
            </p>
          </div>
          <div className="bg-bg-card p-4 rounded-xl border border-border-main text-center">
            <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Ajustes Solicitados</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {auditorias.filter((a) => a.validacao_status === 'ajuste_solicitado').length}
            </p>
          </div>
          <div className="bg-bg-card p-4 rounded-xl border border-border-main text-center">
            <p className="text-xs font-semibold text-txt-muted uppercase tracking-wider">Aprovadas</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {auditorias.filter((a) => a.validacao_status === 'aprovado').length}
            </p>
          </div>
        </div>

        {/* FILTROS E BUSCA */}
        <div className="bg-bg-card p-4 rounded-xl border border-border-main flex flex-col md:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            placeholder="Buscar por nome ou código da loja/ER..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full md:w-1/2 p-2.5 border border-border-main bg-bg-input text-txt-primary placeholder:text-txt-muted rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />

          <div className="flex w-full md:w-auto gap-2">
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full md:w-auto p-2.5 border border-border-main bg-bg-input text-txt-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="todos">Todos os Status de Validação</option>
              <option value="pendente">Em Análise</option>
              <option value="ajuste_solicitado">Requer Ajustes</option>
              <option value="aprovado">Aprovadas</option>
            </select>
          </div>
        </div>

        {/* LISTAGEM DE AUDITORIAS */}
        <div className="space-y-4">
          {carregando ? (
            <div className="bg-bg-card p-8 text-center rounded-xl border border-border-main text-txt-muted">
              Carregando suas auditorias...
            </div>
          ) : erroCarregar ? (
            <div className="bg-bg-card p-8 text-center rounded-xl border border-red-500/40 text-red-600 dark:text-red-400 text-sm font-mono">
              Erro ao carregar suas auditorias: {erroCarregar}
            </div>
          ) : auditoriasFiltradas.length === 0 ? (
            <div className="bg-bg-card p-8 text-center rounded-xl border border-border-main text-txt-muted">
              {auditorias.length === 0
                ? 'Você ainda não enviou nenhuma auditoria.'
                : 'Nenhuma auditoria encontrada com os filtros selecionados.'}
            </div>
          ) : (
            auditoriasFiltradas.map((aud) => {
              const estaExpandido = cardsExpandidos[aud.id] || false
              const qtdEquipamentos = aud.equipamentos?.length || 0
              const unidade = aud.tipo_unidade === 'er' ? aud.er : aud.lojas
              const codigoUnidade = unidade?.codigo_loja ?? unidade?.codigo_er

              return (
                <div
                  key={aud.id}
                  className={`bg-bg-card text-txt-primary rounded-xl shadow-sm border transition-all duration-200 overflow-hidden ${
                    aud.validacao_status === 'ajuste_solicitado' ? 'border-amber-500/50' : 'border-border-main'
                  }`}
                >
                  {/* CABEÇALHO DO CARD DA AUDITORIA */}
                  <div
                    onClick={() => toggleExpandir(aud.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-bg-primary/40 gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-txt-muted bg-bg-primary px-1.5 py-0.5 rounded border border-border-main">
                          {aud.tipo_unidade === 'er' ? 'ER' : 'Loja'}
                        </span>
                        <h2 className="text-lg font-bold tracking-tight">
                          {unidade?.nome || 'Unidade Não Identificada'}
                        </h2>
                        {codigoUnidade && (
                          <span className="text-xs font-semibold text-txt-muted bg-bg-primary px-2 py-0.5 rounded border border-border-main">
                            Cód: {codigoUnidade}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-txt-muted">
                        Enviado em{' '}
                        <span className="font-semibold text-txt-primary">
                          {new Date(aud.created_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(aud.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>

                    {/* BADGES E AÇÕES */}
                    <div className="flex items-center justify-start md:justify-end gap-3 flex-wrap">
                      {/* STATUS DA VALIDAÇÃO */}
                      {renderBadgeValidação(aud.validacao_status)}

                      <span className="text-xs font-medium text-txt-muted bg-bg-primary px-3 py-1 rounded-lg border border-border-main">
                        {qtdEquipamentos} {qtdEquipamentos === 1 ? 'item' : 'itens'}
                      </span>

                      {/* BOTÃO CORRIGIR (EXIBIDO APENAS SE HOUVER AJUSTE SOLICITADO) */}
                      {aud.validacao_status === 'ajuste_solicitado' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/auditoria/editar/${aud.id}`)
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                          ✏️ Corrigir Dados
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpandir(aud.id)
                        }}
                        className="px-3 py-1.5 border border-border-main text-txt-secondary hover:bg-bg-primary rounded-lg text-xs font-bold transition-colors"
                      >
                        {estaExpandido ? '▲ Recolher' : '▼ Ver Detalhes'}
                      </button>
                    </div>
                  </div>

                  {/* ALERTA DE PARECER DO SUPERVISOR (QUANDO HÁ SOLICITAÇÃO DE AJUSTE) */}
                  {aud.validacao_status === 'ajuste_solicitado' && aud.parecer_supervisor && (
                    <div className="bg-amber-500/10 border-y border-amber-500/20 p-3.5 px-5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <span className="text-base">💬</span>
                      <div>
                        <strong className="font-bold">Observação do Validador/Supervisor:</strong>
                        <p className="mt-0.5">{aud.parecer_supervisor}</p>
                      </div>
                    </div>
                  )}

                  {/* DETALHES EXPANDIDOS */}
                  {estaExpandido && (
                    <div className="border-t border-border-main bg-bg-primary/30 p-5 space-y-4">
                      {/* OBSERVAÇÕES DE REDE/INTERNET SE HOUVER */}
                      {aud.problema_internet_sistema && (
                        <div className="bg-bg-card p-3 rounded-lg text-xs border border-border-main">
                          <p className="font-bold text-amber-600 dark:text-amber-400 mb-0.5">⚠️ Alerta de Conexão/Sistema Apontado:</p>
                          <p className="text-txt-muted">{aud.detalhe_internet_sistema || 'Sem detalhes informados.'}</p>
                        </div>
                      )}

                      {/* TABELA DOS EQUIPAMENTOS AUDITADOS */}
                      <div className="bg-bg-card rounded-lg border border-border-main shadow-sm overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-bg-primary text-txt-muted uppercase font-semibold border-b border-border-main">
                            <tr>
                              <th className="p-3">Equipamento</th>
                              <th className="p-3">Marca/Modelo</th>
                              <th className="p-3">Patrimônio</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center">Reserva</th>
                              <th className="p-3 text-center">Foto</th>
                              <th className="p-3">Observações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-main align-middle">
                            {aud.equipamentos?.map((eq: Equipamento) => (
                              <tr key={eq.id} className="hover:bg-bg-primary/30">
                                <td className="p-3 font-semibold">{eq.tipo}</td>
                                <td className="p-3">{eq.marca || '-'}</td>
                                <td className="p-3 font-mono text-txt-muted">{eq.patrimonio || '-'}</td>

                                <td className="p-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                      eq.status === 'ok'
                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                        : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                                    }`}
                                  >
                                    {eq.status}
                                  </span>
                                </td>

                                <td className="p-3 text-center text-txt-muted">
                                  {eq.tem_reserva ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      Sim ({eq.qtd_reserva || 0})
                                    </span>
                                  ) : (
                                    'Não'
                                  )}
                                </td>

                                <td className="p-3 text-center">
                                  {eq.foto_url ? (
                                    <button
                                      onClick={() => setFotoModal(eq.foto_url)}
                                      className="text-brand font-semibold hover:underline bg-brand/10 px-2 py-1 rounded text-xs"
                                    >
                                      📷 Foto
                                    </button>
                                  ) : (
                                    <span className="text-txt-muted">-</span>
                                  )}
                                </td>

                                <td className="p-3 min-w-[220px] max-w-md whitespace-pre-line break-words text-txt-muted">
                                  {eq.observacoes || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* MODAL DE FOTO */}
      {fotoModal && (
        <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-bg-card rounded-xl p-4 max-w-lg w-full space-y-3 border border-border-main shadow-xl">
            <div className="flex justify-between items-center border-b border-border-main pb-2">
              <h3 className="font-bold text-sm text-txt-primary">Foto Anexada</h3>
              <button onClick={() => setFotoModal(null)} className="font-bold text-txt-muted hover:text-txt-primary">✕</button>
            </div>
            <img src={fotoModal} alt="Equipamento" className="w-full max-h-[60vh] object-contain rounded bg-bg-primary" />
            <button
              onClick={() => setFotoModal(null)}
              className="w-full py-2 bg-brand hover:bg-brand-dark text-white rounded text-xs font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
