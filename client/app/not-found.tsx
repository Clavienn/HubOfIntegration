'use client'

import Layout from '@/components/layouts/Layout'
import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Search, 
  ArrowLeft, 
  FileQuestion,
  Compass
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface NotFoundProps {
  title?: string
  description?: string
  showSearch?: boolean
}

function NotFound({ 
  title = "Page non trouvée", 
  description = "Désolé, la page que vous recherchez n'existe pas ou a été déplacée.",
  showSearch = true 
}: NotFoundProps) {
  const router = useRouter()

  const handleGoBack = () => {
    router.back()
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const searchQuery = formData.get('search')
    if (searchQuery && typeof searchQuery === 'string') {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <Layout>
      <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Section 404 avec animation */}
          <div className="relative mb-8">
            <div className="text-[150px] sm:text-[200px] font-bold leading-none text-muted-foreground/10 select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <FileQuestion className="w-20 h-20 sm:w-28 sm:h-28 text-primary/60" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-destructive rounded-full animate-ping opacity-75" />
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            {title}
          </h1>
          
          <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-md mx-auto">
            {description}
          </p>

          {/* Code d'erreur */}
          <div className="inline-block px-3 py-1 rounded-full bg-muted text-xs font-mono text-muted-foreground mb-8">
            Erreur 404
          </div>

          {/* Recherche */}
          {showSearch && (
            <form onSubmit={handleSearch} className="max-w-sm mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  name="search"
                  placeholder="Rechercher une page..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background 
                           focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring
                           transition-all duration-200"
                  aria-label="Recherche"
                />
              </div>
            </form>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="min-w-[140px]">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Accueil
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="min-w-[140px]">
              <Link href="/explore">
                <Compass className="mr-2 h-4 w-4" />
                Explorer
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              size="lg" 
              onClick={handleGoBack}
              className="min-w-[140px]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </div>

          {/* Liens rapides */}
          <div className="mt-12 pt-6 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Liens utiles
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link 
                href="/blog" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Blog
              </Link>
              <Link 
                href="/faq" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                FAQ
              </Link>
              <Link 
                href="/support" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Support
              </Link>
              <Link 
                href="/contact" 
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default NotFound