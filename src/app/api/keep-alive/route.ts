import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'


export const dynamic = 'force-dinamic'

export async function GET() {
    try {
        const {data, error} = await supabase
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
            {status: 'erro', mensagem: error.message},
            {status: 500}
        )
    }
}