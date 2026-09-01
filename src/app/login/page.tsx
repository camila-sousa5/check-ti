'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)

  // Se o usuário já estiver logado, redireciona direto para a auditoria
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace('/')
      }
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace('/')
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const handleGoogleLogin = async () => {
    setCarregando(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  return (
    <main className="min-h-screen bg-bg-primary flex items-center justify-center p-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-bg-card border border-border-main rounded-2xl shadow-xl p-8 text-center space-y-6">
        {/* Ícone ou Logo */}
        <div className="w-16 h-16 bg-brand-light text-brand rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          TI
        </div>

        <div>
          <h1 className="text-2xl font-bold text-txt-primary">Auditoria de TI</h1>
          <p className="text-sm text-txt-muted mt-1">
            Faça login com sua conta Google para continuar
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={carregando}
          className="w-full py-3 px-4 bg-bg-card border border-border-main rounded-xl font-semibold text-txt-secondary hover:bg-bg-primary flex items-center justify-center gap-3 shadow-sm hover:shadow transition-all disabled:opacity-50"
        >
          {/* Logo do Google em SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {carregando ? 'Redirecionando...' : 'Entrar com Google'}
        </button>
      </div>
    </main>
  )
}