import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic' // Garante que a rota não seja cacheada pela Vercel

export async function GET(request: Request) {
  // A Vercel envia "Authorization: Bearer <CRON_SECRET>" nas chamadas de cron
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ status: 'não autorizado' }, { status: 401 })
  }

  try {
    // Faz uma ESCRITA no banco (upsert na tabela keep_alive) via função SQL.
    // Escritas são contabilizadas como atividade de forma confiável pelo Supabase
    // e não dependem das policies de RLS das tabelas da aplicação.
    const { data: ultimoPing, error } = await supabase.rpc('ping_keep_alive')

    if (error) throw error

    console.log('[keep-alive] ping registrado em', ultimoPing)

    return NextResponse.json({
      status: 'ativo',
      ultimoPing,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[keep-alive] falha ao registrar ping:', error)
    return NextResponse.json(
      { status: 'erro', mensagem: error.message },
      { status: 500 }
    )
  }
}
