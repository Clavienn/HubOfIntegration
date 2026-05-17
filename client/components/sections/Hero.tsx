// components/Hero.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Database, Zap, Shield, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StatItem {
  label: string;
  value: string;
}

const stats: StatItem[] = [
  { label: 'Messages traités', value: '2.5M+' },
  { label: 'Systèmes connectés', value: '50+' },
  { label: 'Uptime', value: '99.99%' },
  { label: 'Latence moyenne', value: '< 50ms' },
];

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: FeatureItem[] = [
  {
    icon: <Database className="h-6 w-6" />,
    title: 'Multi-systèmes',
    description: 'Connectez et orchestrez des données entre différents systèmes et protocoles.',
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: 'Temps réel',
    description: 'Traitement et transformation des messages avec une latence minimale.',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Sécurisé',
    description: 'Authentification API, chiffrement et politique de retry avancée.',
  },
  {
    icon: <Activity className="h-6 w-6" />,
    title: 'Monitoring',
    description: 'Dashboard complet pour suivre vos flux et diagnostiquer les erreurs.',
  },
];

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className={cn('relative overflow-hidden bg-gradient-to-b from-background to-secondary/20', className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 transition-all duration-700',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Plateforme ESB nouvelle génération
          </div>

          {/* Title */}
          <h1
            className={cn(
              'text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 transition-all duration-700 delay-100',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            Hub d'Intégration
            <span className="text-primary block mt-2">Multi-Systèmes</span>
          </h1>

          {/* Description */}
          <p
            className={cn(
              'text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 transition-all duration-700 delay-200',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            Connectez, transformez et orchestrez vos données entre tous vos systèmes.
            Solution ESB moderne, scalable et hautement disponible.
          </p>

          {/* CTA Buttons */}
          <div
            className={cn(
              'flex flex-col sm:flex-row gap-4 justify-center mb-16 transition-all duration-700 delay-300',
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <Button size="lg" className="group">
              Commencer gratuitement
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline">
              Voir la documentation
            </Button>
          </div>

          {/* Stats */}
          <div
            className={cn(
              'grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 border-t pt-12 transition-all duration-700 delay-400',
              isVisible ? 'opacity-100' : 'opacity-0'
            )}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div
          className={cn(
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 transition-all duration-700 delay-500',
            isVisible ? 'opacity-100' : 'opacity-0'
          )}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-6 rounded-xl bg-card border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}