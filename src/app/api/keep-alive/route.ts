import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase' // Ajuste o caminho para o seu cliente do Supabase

export const dynamic = 'force-dynamic' // Garante que a rota não seja cacheada pela Vercel

export async function GET() {
  try {
    // Faz um SELECT minúsculo apenas para registrar atividade no banco
    const { data, error } = await supabase
      .from('lojas')
      .select('id')
      .limit(1)

    if (error) throw error

    return NextResponse.json({ 
      status: 'ativo', 
      timestamp: new Date().toISOString() 
    })
  } catch (error: any) {
    return NextResponse.json(
      { status: 'erro', mensagem: error.message }, 
      { status: 500 }
    )
  }
}