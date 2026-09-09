'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { ThemeToggle } from './components/ThemeToggle'

// Tipos de Equipamento e suas respectivas marcas
const TIPOS_EQUIPAMENTO = [
  {
    id: 'Celular',
    nome: 'Celular da loja',
    marcas: ['Samsung', 'Apple', 'Outro / Não listado'],
  },
  {
    id: 'Mobshop',
    nome: 'Mobshop',
    marcas: ['Samsung', 'Outro / Não listado'],
  },
  {
    id: 'Mobpin',
    nome: 'Mobpin',
    marcas: ['Mooz', 'Outro / Não listado'],
  },
  {
    id: 'ImpressoraPreco',
    nome: 'Impressora de Preço',
    marcas: ['Zebra ZD220', 'Outro / Não listado'],
  },
  {
    id: 'ImpressoraCupom',
    nome: 'Impressora de Cupom',
    marcas: ['MP4200', 'Outro / Não listado'],
  },
  {
    id: 'Nobreak',
    nome: 'Nobreak',
    marcas: ['APC', 'SMS', 'Outro / Não listado'],
  },
  {
    id: 'Tablet',
    nome: 'Tablet',
    marcas: ['Samsung', 'Lenovo', 'Outro / Não listado'],
  },
]

// Lista consolidada de todas as abas
const ABAS = [
  { id: 'geral', nome: 'Geral' },
  ...TIPOS_EQUIPAMENTO.map((t) => ({ id: t.id, nome: t.nome })),
]

interface Loja {
  id: string
  nome: string
  codigo_loja?: string
}

interface Er {
  id: string
  nome: string
  codigo_er?: string
}

type TipoUnidade = 'loja' | 'er'

export default function AuditoriaForm() {
  const router = useRouter()
  const [podeVerRelatorio, setPodeVerRelatorio] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)
  const [checandoAuth, setChecandoAuth] = useState(true)

  const [tipoUnidade, setTipoUnidade] = useState<TipoUnidade>('loja')
  const [lojas, setLojas] = useState<Loja[]>([])
  const [ers, setErs] = useState<Er[]>([])
  const [erroUnidade, setErroUnidade] = useState<string | null>(null)
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('')
  const [abaAtual, setAbaAtual] = useState(0)
  const [carregando, setCarregando] = useState(false)

  // 1. Verificação Única de Autenticação e Permissões
  useEffect(() => {
    async function inicializarAuth() {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.log('Sem usuário autenticado. Redirecionando...')
        router.replace('/login')
        return
      }

      setUsuario(user)

      // 🔴 1. VERIFICAÇÃO VIA METADATA NATIVA DO SUPABASE (Opcional se você salvou a role ao criar o usuário)
      const roleUserMetadata = user.user_metadata?.role

      // 🔴 2. BUSCA DA ROLE NO BANCO DE DADOS
      // Verifique se a sua tabela chama 'users' ou 'profiles'
      const { data: perfil, error: perfilError } = await supabase
        .from('profiles') // ⚠️ Se sua tabela for 'profiles', mude para 'profiles'
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (perfilError) {
        console.error('Erro ao buscar perfil do usuário no Supabase:', perfilError.message)
      }

      console.log('Dados do usuário autenticado:', user)
      console.log('Perfil retornado da tabela:', perfil)

      // Pega a role vinda da tabela ou da metadata do auth
      const userRole = perfil?.role || roleUserMetadata

      console.log('Role identificada:', userRole)

      const perfisPermitidos = ['admin', 'gestor', 'auditor_chefe']

      // Compara ignorando diferenças de maiúsculas/minúsculas
      if (userRole && perfisPermitidos.includes(String(userRole).toLowerCase())) {
        console.log('✅ Permissão concedida! Exibindo botão de relatório.')
        setPodeVerRelatorio(true)
      } else {
        console.warn('❌ Permissão negada para o perfil:', userRole)
      }

      setChecandoAuth(false)
    }

    inicializarAuth()
  }, [router])

  // Estado das perguntas gerais da loja
  const [dadosGerais, setDadosGerais] = useState({
    problema_internet_sistema: false,
    detalhe_internet_sistema: '',
    problema_PDV_equipamento: false,
    detalhe_PDV_equipamento: '',
    problema_fisico: false,
    detalhe_problema_fisico: '',
  })

  // Estado dos equipamentos
  // OBS: "status: null" nos equipamentos comuns força o usuário a escolher
  // explicitamente OK/Defeito em vez de assumir "ok" por padrão.
  const [dadosFormulario, setDadosFormulario] = useState<Record<string, any>>({
    Celular: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: null, observacoes: '', foto: null },
    Mobshop: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null, qtd_funcionando: '', qtd_defeito: '', tem_reserva: null, qtd_reserva: '' },
    Mobpin: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: 'ok', observacoes: '', foto: null, qtd_funcionando: '', qtd_defeito: '', tem_reserva: null, qtd_reserva: '' },
    ImpressoraPreco: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: null, observacoes: '', foto: null },
    ImpressoraCupom: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: null, observacoes: '', foto: null },
    Nobreak: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: null, observacoes: '', foto: null },
    Tablet: { marca: '', marca_custom: '', modelo: '', patrimonio: '', status: null, observacoes: '', foto: null },
  })

  // 2. Busca a lista de lojas e ERs no Supabase
  useEffect(() => {
    async function carregarUnidades() {
      setErroUnidade(null)

      const [lojasRes, ersRes] = await Promise.all([
        supabase.from('lojas').select('*').order('nome'),
        supabase.from('er').select('*').order('nome'),
      ])

      if (lojasRes.error) {
        console.error('Erro ao buscar lojas:', lojasRes.error)
        setErroUnidade(lojasRes.error.message)
      } else if (lojasRes.data) {
        setLojas(lojasRes.data)
      }

      if (ersRes.error) {
        console.error('Erro ao buscar ERs:', ersRes.error)
        setErroUnidade((prev) => prev ?? ersRes.error.message)
      } else if (ersRes.data) {
        setErs(ersRes.data)
      }
    }

    if (usuario) {
      carregarUnidades()
    }
  }, [usuario])

  // Reseta a unidade selecionada ao trocar entre Loja e ER
  useEffect(() => {
    setUnidadeSelecionada('')
  }, [tipoUnidade])

  const unidades = tipoUnidade === 'loja' ? lojas : ers
  const getCodigoUnidade = (u: Loja | Er) =>
    tipoUnidade === 'loja' ? (u as Loja).codigo_loja : (u as Er).codigo_er

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const handleChange = (tipo: string, campo: string, valor: any) => {
    setDadosFormulario((prev) => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [campo]: valor,
      },
    }))
  }

  // Impede digitação de números negativos nos campos de quantidade
  const handleQuantidadeChange = (tipo: string, campo: 'qtd_funcionando' | 'qtd_defeito', valorBruto: string) => {
    if (valorBruto === '') {
      handleChange(tipo, campo, '')
    } else {
      const numero = Math.max(0, Number(valorBruto) || 0)
      handleChange(tipo, campo, numero)
    }

    const dados = dadosFormulario[tipo]
    const funcionando = Number(campo === 'qtd_funcionando' ? valorBruto : dados.qtd_funcionando) || 0
    const defeito = Number(campo === 'qtd_defeito' ? valorBruto : dados.qtd_defeito) || 0
    handleChange(tipo, 'status', defeito > 0 ? 'defeito' : 'ok')
  }

  // 3. Envio final da auditoria com validação reforçada
  const handleSubmit = async () => {
    // --- Validação: Unidade selecionada ---
    if (!unidadeSelecionada) {
      alert(`Por favor, selecione ${tipoUnidade === 'loja' ? 'uma loja' : 'um ER'}.`)
      setAbaAtual(0)
      return
    }

    // --- Validação: Aba Geral — detalhes obrigatórios quando "Sim" é marcado ---
    if (dadosGerais.problema_internet_sistema && !dadosGerais.detalhe_internet_sistema?.trim()) {
      alert('Por favor, descreva o problema de internet/sistema relatado.')
      setAbaAtual(0)
      return
    }
    if (dadosGerais.problema_PDV_equipamento && !dadosGerais.detalhe_PDV_equipamento?.trim()) {
      alert('Por favor, descreva o problema com o PDV/equipamento relatado.')
      setAbaAtual(0)
      return
    }
    if (dadosGerais.problema_fisico && !dadosGerais.detalhe_problema_fisico?.trim()) {
      alert('Por favor, descreva o problema físico relatado.')
      setAbaAtual(0)
      return
    }

    // --- Validação: cada equipamento (com navegação até a aba com erro) ---
    for (let i = 0; i < TIPOS_EQUIPAMENTO.length; i++) {
      const tipoObj = TIPOS_EQUIPAMENTO[i]
      const item = dadosFormulario[tipoObj.id]
      const indiceAba = i + 1 // aba 0 é "Geral"

      // Marca customizada exige descrição e foto
      if (item.marca === 'Outro / Não listado') {
        if (!item.marca_custom?.trim()) {
          alert(`Por favor, especifique a marca/modelo para "${tipoObj.nome}".`)
          setAbaAtual(indiceAba)
          return
        }
        if (!item.foto) {
          alert(`Por favor, adicione uma foto para o equipamento "${tipoObj.nome}" ao selecionar "Outro / Não listado".`)
          setAbaAtual(indiceAba)
          return
        }
      }

      if (tipoObj.id === 'Mobshop' || tipoObj.id === 'Mobpin') {
        // Quantidades obrigatórias, numéricas e não-negativas
        if (item.qtd_funcionando === '' || item.qtd_defeito === '') {
          alert(`Por favor, informe as quantidades de unidades funcionando e com defeito para "${tipoObj.nome}".`)
          setAbaAtual(indiceAba)
          return
        }

        const qtdFuncionando = Number(item.qtd_funcionando)
        const qtdDefeito = Number(item.qtd_defeito)

        if (Number.isNaN(qtdFuncionando) || Number.isNaN(qtdDefeito) || qtdFuncionando < 0 || qtdDefeito < 0) {
          alert(`As quantidades informadas para "${tipoObj.nome}" são inválidas. Utilize apenas números maiores ou iguais a zero.`)
          setAbaAtual(indiceAba)
          return
        }

        if (qtdFuncionando + qtdDefeito === 0) {
          alert(`Informe ao menos 1 unidade (funcionando ou com defeito) para "${tipoObj.nome}".`)
          setAbaAtual(indiceAba)
          return
        }

        // "Tem reserva?" precisa ser respondido explicitamente
        if (item.tem_reserva !== true && item.tem_reserva !== false) {
          alert(`Por favor, informe se há dispositivo reserva na loja para "${tipoObj.nome}".`)
          setAbaAtual(indiceAba)
          return
        }
      } else {
        // Status obrigatório para equipamentos "simples"
        if (item.status !== 'ok' && item.status !== 'defeito') {
          alert(`Por favor, selecione o status (OK ou Defeito) do equipamento "${tipoObj.nome}".`)
          setAbaAtual(indiceAba)
          return
        }

        // Se está com defeito, exige descrição em observações
        if (item.status === 'defeito' && !item.observacoes?.trim()) {
          alert(`Por favor, descreva o defeito encontrado em "${tipoObj.nome}" no campo de observações.`)
          setAbaAtual(indiceAba)
          return
        }
      }
    }

    setCarregando(true)
    let auditoriaIdCriada: string | null = null

    try {
      const { data: auditoria, error: errAuditoria } = await supabase
        .from('auditorias')
        .insert([
          {
            tipo_unidade: tipoUnidade,
            loja_id: tipoUnidade === 'loja' ? unidadeSelecionada : null,
            er_id: tipoUnidade === 'er' ? unidadeSelecionada : null,
            user_id: usuario?.id,
            auditor_email: usuario?.email,
            status: 'concluida',
            problema_internet_sistema: dadosGerais.problema_internet_sistema,
            detalhe_internet_sistema: dadosGerais.problema_internet_sistema
              ? dadosGerais.detalhe_internet_sistema.trim()
              : null,
            problema_PDV_equipamento: dadosGerais.problema_PDV_equipamento,
            detalhe_PDV_equipamento: dadosGerais.problema_PDV_equipamento
              ? dadosGerais.detalhe_PDV_equipamento.trim()
              : null,
            problema_fisico: dadosGerais.problema_fisico,
            detalhe_problema_fisico: dadosGerais.problema_fisico
              ? dadosGerais.detalhe_problema_fisico.trim()
              : null,
            concluded_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (errAuditoria) throw errAuditoria
      auditoriaIdCriada = auditoria.id

      for (const tipoObj of TIPOS_EQUIPAMENTO) {
        const item = dadosFormulario[tipoObj.id]
        let fotoUrl = null

        if (item.foto) {
          const fileExt = item.foto.name?.split('.').pop()?.toLowerCase() || 'jpg'
          const fileName = `${auditoria.id}_${tipoObj.id}_${Date.now()}.${fileExt}`

          const { error: errUpload } = await supabase.storage
            .from('fotos-equipamentos')
            .upload(fileName, item.foto, {
              cacheControl: '3600',
              upsert: true,
              contentType: item.foto.type || 'image/jpeg',
            })

          if (errUpload) {
            throw new Error(`Falha no upload da foto (${tipoObj.nome}): ${errUpload.message}`)
          }

          const { data: publicUrlData } = supabase.storage
            .from('fotos-equipamentos')
            .getPublicUrl(fileName)

          fotoUrl = publicUrlData.publicUrl
        }

        const marcaFinal =
          item.marca === 'Outro / Não listado' || item.marca === 'Sem Marca / Não informada' || !item.marca
            ? null
            : item.marca

        const payloadEquipamento: Record<string, any> = {
          auditoria_id: auditoria.id,
          tipo_unidade: tipoUnidade,
          loja_id: tipoUnidade === 'loja' ? unidadeSelecionada : null,
          er_id: tipoUnidade === 'er' ? unidadeSelecionada : null,
          tipo: tipoObj.id,
          marca: marcaFinal,
          marca_custom: item.marca === 'Outro / Não listado' ? item.marca_custom.trim() : null,
          modelo: item.modelo?.trim() || null,
          patrimonio: item.patrimonio?.trim() || null,
          status: item.status,
          observacoes: item.observacoes?.trim() || null,
          foto_url: fotoUrl,
        }

        if (tipoObj.id === 'Mobshop' || tipoObj.id === 'Mobpin') {
          payloadEquipamento.qtd_funcionando = Number(item.qtd_funcionando) || 0
          payloadEquipamento.qtd_defeito = Number(item.qtd_defeito) || 0
          payloadEquipamento.tem_reserva = Boolean(item.tem_reserva)
          payloadEquipamento.qtd_reserva = Number(item.qtd_reserva) || 0
        }

        const { error: errEquipamento } = await supabase
          .from('equipamentos')
          .insert([payloadEquipamento])

        if (errEquipamento) throw errEquipamento
      }

      alert('Auditoria salva com sucesso!')
      // router.push('/sucesso')
    } catch (error: any) {
      if (auditoriaIdCriada) {
        // Rollback simples caso algo falhe no envio dos equipamentos
        await supabase.from('auditorias').delete().eq('id', auditoriaIdCriada)
      }
      alert('Erro ao salvar auditoria: ' + error.message)
    } finally {
      setCarregando(false)
    }
  }

  if (checandoAuth) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-500 font-medium">Carregando...</p>
      </div>
    )
  }

  const equipamentoAtual = abaAtual > 0 ? TIPOS_EQUIPAMENTO[abaAtual - 1] : null
  const dadosAtuais = equipamentoAtual ? dadosFormulario[equipamentoAtual.id] : null

  return (
    <main className="min-h-screen bg-bg-primary p-4 pb-12 text-txt-primary transition-colors duration-200">
      <div className="max-w-xl mx-auto bg-bg-card rounded-xl shadow-md p-6 border border-border-main">
        {/* CABEÇALHO */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 pb-4 border-b border-border-main">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-txt-primary">Auditoria de TI</h1>
              <p className="text-xs text-txt-muted">Sessão ativa</p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
            {/* BOTÃO PARA MINHAS AUDITORIAS */}
            <button
              type="button"
              onClick={() => router.push('/minhas-auditorias')} // Ajuste o caminho da sua rota
              className="text-xs font-semibold text-brand hover:bg-brand/10 bg-brand/5 border border-brand/20 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Minhas Auditorias
            </button>

            <ThemeToggle />

            <span className="text-xs font-semibold text-txt-secondary bg-bg-primary px-2.5 py-1 rounded-md border border-border-main truncate max-w-[160px] sm:max-w-none">
              {usuario?.email}
            </span>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-medium text-red-500 hover:text-red-400 hover:underline shrink-0"
            >
              Sair
            </button>
          </div>
        </div>

        {podeVerRelatorio && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => router.push('/relatorio')}
              className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Ver Relatórios
            </button>
          </div>
        )}

        {/* 1. SELEÇÃO DA UNIDADE (LOJA OU ER) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-txt-primary">Tipo de Unidade *</label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { id: 'loja' as TipoUnidade, label: 'Loja' },
              { id: 'er' as TipoUnidade, label: 'ER' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTipoUnidade(opt.id)}
                className={`p-2.5 rounded-lg border text-sm font-semibold transition-all ${tipoUnidade === opt.id
                  ? 'bg-brand text-white border-brand'
                  : 'border-border-main text-txt-secondary hover:bg-bg-primary'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="block text-sm font-semibold mb-2 text-txt-primary">
            {tipoUnidade === 'loja' ? 'Loja' : 'ER'} *
          </label>
          <select
            value={unidadeSelecionada}
            onChange={(e) => setUnidadeSelecionada(e.target.value)}
            className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary focus:ring-2 focus:ring-brand"
          >
            <option value="">-- Escolha {tipoUnidade === 'loja' ? 'a Loja' : 'o ER'} --</option>
            {unidades.map((u) => {
              const codigo = getCodigoUnidade(u)
              return (
                <option key={u.id} value={u.id}>
                  {codigo ? `[${codigo}] ` : ''}
                  {u.nome}
                </option>
              )
            })}
          </select>

          {erroUnidade && (
            <p className="text-xs text-red-500 mt-1 font-mono">
              Erro ao carregar {tipoUnidade === 'loja' ? 'lojas' : 'ERs'}: {erroUnidade}
            </p>
          )}
        </div>

        {/* 2. NAVEGAÇÃO DAS ABAS */}
        <div className="flex border-b border-border-main mb-6 overflow-x-auto">
          {ABAS.map((aba, idx) => (
            <button
              key={aba.id}
              type="button"
              onClick={() => setAbaAtual(idx)}
              className={`flex-1 py-3 px-3 text-xs font-semibold text-center border-b-2 whitespace-nowrap transition-colors ${abaAtual === idx
                ? 'border-brand text-brand font-bold'
                : 'border-transparent text-txt-muted hover:text-txt-secondary'
                }`}
            >
              {idx === 0 ? 'Geral' : aba.nome}
            </button>
          ))}
        </div>

        {/* 3. CONTEÚDO DA ABA ATIVA */}
        {abaAtual === 0 ? (
          /* ABA GERAL */
          <div className="space-y-4">
            <h2 className="text-base font-bold text-txt-primary border-b border-border-main pb-2">
              Perguntas Gerais da Unidade
            </h2>

            {/* Problema Internet */}
            <div className="p-4 bg-bg-primary border border-border-main rounded-lg space-y-3">
              <label className="block text-sm font-semibold text-txt-primary">
                Teve algum problema com a internet recentemente?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="internet"
                    checked={dadosGerais.problema_internet_sistema === true}
                    onChange={() => setDadosGerais({ ...dadosGerais, problema_internet_sistema: true })}
                    className="w-4 h-4 text-brand"
                  />
                  Sim (Houve Problema)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="internet"
                    checked={dadosGerais.problema_internet_sistema === false}
                    onChange={() =>
                      setDadosGerais({ ...dadosGerais, problema_internet_sistema: false, detalhe_internet_sistema: '' })
                    }
                    className="w-4 h-4 text-brand"
                  />
                  Não / Estável
                </label>
              </div>

              {dadosGerais.problema_internet_sistema && (
                <>
                  <textarea
                    rows={2}
                    placeholder="Descreva o problema (ex: Quedas constantes à tarde, lentidão...) *"
                    value={dadosGerais.detalhe_internet_sistema}
                    onChange={(e) => setDadosGerais({ ...dadosGerais, detalhe_internet_sistema: e.target.value })}
                    className={`w-full p-2.5 border rounded-md bg-bg-input text-txt-primary text-sm mt-2 ${!dadosGerais.detalhe_internet_sistema.trim() ? 'border-red-400' : 'border-border-main'
                      }`}
                  />
                  {!dadosGerais.detalhe_internet_sistema.trim() && (
                    <p className="text-xs text-red-500">Este campo é obrigatório quando "Sim" está selecionado.</p>
                  )}
                </>
              )}
            </div>

            {/* Problema PDV */}
            <div className="p-4 bg-bg-primary border border-border-main rounded-lg space-y-3">
              <label className="block text-sm font-semibold text-txt-primary">
                O PDV ou a impressora apresentaram falhas recentemente?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="pdv"
                    checked={dadosGerais.problema_PDV_equipamento === true}
                    onChange={() => setDadosGerais({ ...dadosGerais, problema_PDV_equipamento: true })}
                    className="w-4 h-4 text-brand"
                  />
                  Sim (Apresentou Falha)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="pdv"
                    checked={dadosGerais.problema_PDV_equipamento === false}
                    onChange={() =>
                      setDadosGerais({ ...dadosGerais, problema_PDV_equipamento: false, detalhe_PDV_equipamento: '' })
                    }
                    className="w-4 h-4 text-brand"
                  />
                  Não / Normal
                </label>
              </div>

              {dadosGerais.problema_PDV_equipamento && (
                <>
                  <textarea
                    rows={2}
                    placeholder="Descreva o problema com o sistema ou PDV... *"
                    value={dadosGerais.detalhe_PDV_equipamento}
                    onChange={(e) => setDadosGerais({ ...dadosGerais, detalhe_PDV_equipamento: e.target.value })}
                    className={`w-full p-2.5 border rounded-md bg-bg-input text-txt-primary text-sm mt-2 ${!dadosGerais.detalhe_PDV_equipamento.trim() ? 'border-red-400' : 'border-border-main'
                      }`}
                  />
                  {!dadosGerais.detalhe_PDV_equipamento.trim() && (
                    <p className="text-xs text-red-500">Este campo é obrigatório quando "Sim" está selecionado.</p>
                  )}
                </>
              )}
            </div>

            {/* Problema Físico */}
            <div className="p-4 bg-bg-primary border border-border-main rounded-lg space-y-3">
              <label className="block text-sm font-semibold text-txt-primary">
                Há algum problema físico (cabos, teclado, leitor de código de barras) a relatar?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="fisico"
                    checked={dadosGerais.problema_fisico === true}
                    onChange={() => setDadosGerais({ ...dadosGerais, problema_fisico: true })}
                    className="w-4 h-4 text-brand"
                  />
                  Sim
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                  <input
                    type="radio"
                    name="fisico"
                    checked={dadosGerais.problema_fisico === false}
                    onChange={() =>
                      setDadosGerais({ ...dadosGerais, problema_fisico: false, detalhe_problema_fisico: '' })
                    }
                    className="w-4 h-4 text-brand"
                  />
                  Não / Sem Danos
                </label>
              </div>

              {dadosGerais.problema_fisico && (
                <>
                  <textarea
                    rows={2}
                    placeholder="Descreva o problema físico... *"
                    value={dadosGerais.detalhe_problema_fisico}
                    onChange={(e) => setDadosGerais({ ...dadosGerais, detalhe_problema_fisico: e.target.value })}
                    className={`w-full p-2.5 border rounded-md bg-bg-input text-txt-primary text-sm mt-2 ${!dadosGerais.detalhe_problema_fisico.trim() ? 'border-red-400' : 'border-border-main'
                      }`}
                  />
                  {!dadosGerais.detalhe_problema_fisico.trim() && (
                    <p className="text-xs text-red-500">Este campo é obrigatório quando "Sim" está selecionado.</p>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* ABAS DOS EQUIPAMENTOS */
          equipamentoAtual && dadosAtuais && (
            <div className="space-y-4">
              <h2 className="text-base font-bold text-txt-primary border-b border-border-main pb-2">
                Detalhamento: {equipamentoAtual.nome}
              </h2>

              {/* SE FOR MOBSHOP OU MOBPIN */}
              {(equipamentoAtual.id === 'Mobshop' || equipamentoAtual.id === 'Mobpin') && (
                <div className="p-4 bg-brand-light border border-brand-accent rounded-lg space-y-4">
                  <h3 className="text-sm font-bold text-brand-dark border-b border-brand-accent pb-1">
                    Contagem de Unidades ({equipamentoAtual.nome})
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                        Qtd. Funcionando *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={dadosAtuais.qtd_funcionando}
                        onChange={(e) => handleQuantidadeChange(equipamentoAtual.id, 'qtd_funcionando', e.target.value)}
                        className="w-full p-2.5 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                        Qtd. com Defeito *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={dadosAtuais.qtd_defeito}
                        onChange={(e) => handleQuantidadeChange(equipamentoAtual.id, 'qtd_defeito', e.target.value)}
                        className="w-full p-2.5 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                      Possui dispositivo reserva na loja? *
                    </label>
                    <div className="flex gap-4 mt-1">
                      <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                        <input
                          type="radio"
                          name={`reserva_${equipamentoAtual.id}`}
                          checked={dadosAtuais.tem_reserva === true}
                          onChange={() => handleChange(equipamentoAtual.id, 'tem_reserva', true)}
                          className="w-4 h-4 text-brand"
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer text-txt-secondary">
                        <input
                          type="radio"
                          name={`reserva_${equipamentoAtual.id}`}
                          checked={dadosAtuais.tem_reserva === false}
                          onChange={() => {
                            handleChange(equipamentoAtual.id, 'tem_reserva', false)
                            handleChange(equipamentoAtual.id, 'qtd_reserva', 0) // Zera a quantidade se mudar para Não
                          }}
                          className="w-4 h-4 text-brand"
                        />
                        Não
                      </label>
                    </div>

                    {/* CAMPO DE QUANTIDADE DE RESERVA (Aparece apenas se selecionar "Sim") */}
                    {dadosAtuais.tem_reserva && (
                      <div className="mt-3 animate-in fade-in duration-200">
                        <label className="block text-xs font-semibold mb-1 text-txt-secondary">
                          Quantidade de dispositivos reserva *
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Ex: 2"
                          value={dadosAtuais.qtd_reserva || ''}
                          onChange={(e) =>
                            handleChange(
                              equipamentoAtual.id,
                              'qtd_reserva',
                              e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 0)
                            )
                          }
                          className="w-full p-2.5 border border-border-main bg-bg-primary text-txt-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Marca */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">
                  Marca <span className="text-xs text-txt-muted font-normal">(opcional)</span>
                </label>
                <select
                  value={dadosAtuais.marca}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'marca', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                >
                  <option value="">Selecione ou deixe em branco...</option>
                  {equipamentoAtual.marcas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Marca Customizada e Foto */}
              {dadosAtuais.marca === 'Outro / Não listado' && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-amber-600 dark:text-amber-400">
                      Descreva a Marca/Modelo *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Xiaomi, Asus, TP-Link..."
                      value={dadosAtuais.marca_custom}
                      onChange={(e) => handleChange(equipamentoAtual.id, 'marca_custom', e.target.value)}
                      className={`w-full p-2.5 border rounded-md bg-bg-input text-txt-primary text-sm ${!dadosAtuais.marca_custom.trim() ? 'border-red-400' : 'border-border-main'
                        }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-amber-600 dark:text-amber-400">
                      Foto do Equipamento *
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) =>
                        handleChange(equipamentoAtual.id, 'foto', e.target.files?.[0] || null)
                      }
                      className="w-full text-xs text-txt-muted file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white"
                    />
                    {!dadosAtuais.foto && (
                      <p className="text-xs text-red-500 mt-1">Foto obrigatória para marcas não listadas.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Modelo */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: Galaxy A14 / Vostro 3400"
                  value={dadosAtuais.modelo}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'modelo', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                />
              </div>

              {/* Patrimônio */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">Patrimônio</label>
                <input
                  type="text"
                  placeholder="Ex: 00123"
                  value={dadosAtuais.patrimonio}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'patrimonio', e.target.value)}
                  className="w-full p-3 border border-border-main rounded-lg bg-bg-input text-txt-primary text-sm"
                />
              </div>

              {/* STATUS GERAL - EXIBIDO APENAS SE NÃO FOR MOBSHOP NEM MOBPIN */}
              {equipamentoAtual.id !== 'Mobshop' && equipamentoAtual.id !== 'Mobpin' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-txt-primary text-left">
                    Status Geral do Equipamento *
                  </label>

                  {/* Ajustado para grid-cols-2 e centralizado */}
                  <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                    {[
                      { label: 'OK', val: 'ok' },
                      { label: 'Defeito', val: 'defeito' },
                    ].map((st) => (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => handleChange(equipamentoAtual.id, 'status', st.val)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center text-center ${dadosAtuais.status === st.val
                          ? 'bg-brand text-white border-brand'
                          : 'border-border-main text-txt-secondary hover:bg-bg-primary'
                          }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                  {dadosAtuais.status !== 'ok' && dadosAtuais.status !== 'defeito' && (
                    <p className="text-xs text-red-500 mt-1 text-center">Selecione o status do equipamento.</p>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium mb-1 text-txt-primary">
                  Observações
                  {dadosAtuais.status === 'defeito' && equipamentoAtual.id !== 'Mobshop' && equipamentoAtual.id !== 'Mobpin' && (
                    <span className="text-red-500"> * (descreva o defeito)</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  placeholder="Algum detalhe adicional..."
                  value={dadosAtuais.observacoes}
                  onChange={(e) => handleChange(equipamentoAtual.id, 'observacoes', e.target.value)}
                  className={`w-full p-3 border rounded-lg bg-bg-input text-txt-primary text-sm ${dadosAtuais.status === 'defeito' &&
                    equipamentoAtual.id !== 'Mobshop' &&
                    equipamentoAtual.id !== 'Mobpin' &&
                    !dadosAtuais.observacoes?.trim()
                    ? 'border-red-400'
                    : 'border-border-main'
                    }`}
                />
              </div>
            </div>
          )
        )}

        {/* 4. BOTÕES DE NAVEGAÇÃO */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-border-main">
          <button
            type="button"
            disabled={abaAtual === 0}
            onClick={() => setAbaAtual((prev) => prev - 1)}
            className="px-4 py-2 border border-border-main rounded-lg text-sm text-txt-secondary disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:bg-bg-primary"
          >
            Voltar
          </button>

          {abaAtual < ABAS.length - 1 ? (
            <button
              type="button"
              onClick={() => setAbaAtual((prev) => prev + 1)}
              className="px-5 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark cursor-pointer transition-colors"
            >
              Próxima Aba →
            </button>
          ) : (
            <button
              type="button"
              disabled={carregando}
              onClick={handleSubmit}
              className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
            >
              {carregando ? 'Salvando...' : 'Finalizar Auditoria'}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}