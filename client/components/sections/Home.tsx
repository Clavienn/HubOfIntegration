// app/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Hero } from './Hero';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, CheckCircle2, Clock, Database, Route as RouteIcon } from 'lucide-react';

// Types pour les statistiques du dashboard
interface DashboardStats {
  totalMessages: number;
  activeRoutes: number;
  connectedSystems: number;
  successRate: number;
}

interface RecentActivity {
  id: string;
  type: 'message' | 'route' | 'system';
  action: string;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
}

// Données mockées (à remplacer par des appels API réels)
const mockStats: DashboardStats = {
  totalMessages: 2458,
  activeRoutes: 12,
  connectedSystems: 8,
  successRate: 99.2,
};

const mockActivities: RecentActivity[] = [
  {
    id: '1',
    type: 'message',
    action: 'Message envoyé vers CRM',
    timestamp: new Date(),
    status: 'success',
  },
  {
    id: '2',
    type: 'message',
    action: 'Tentative d\'envoi vers API externe',
    timestamp: new Date(Date.now() - 5 * 60000),
    status: 'pending',
  },
  {
    id: '3',
    type: 'system',
    action: 'Nouveau système connecté : DataLake',
    timestamp: new Date(Date.now() - 30 * 60000),
    status: 'success',
  },
  {
    id: '4',
    type: 'route',
    action: 'Route mise à jour : SOAP > JSON',
    timestamp: new Date(Date.now() - 60 * 60000),
    status: 'success',
  },
];

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
}

function StatCard({ title, value, icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityIconProps {
  type: RecentActivity['type'];
  status: RecentActivity['status'];
}

function ActivityIcon({ type, status }: ActivityIconProps) {
  if (status === 'success') {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  if (status === 'failed') {
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
  return <Clock className="h-4 w-4 text-yellow-500" />;
}

function formatTime(timestamp: Date): string {
  const diff = Date.now() - timestamp.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  return `Il y a ${Math.floor(hours / 24)} j`;
}

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">      
      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Dashboard Section - Visible uniquement après scroll ou sur desktop */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-12 relative z-10">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Messages"
              value={mockStats.totalMessages.toLocaleString()}
              icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              description="Dernières 24h"
            />
            <StatCard
              title="Routes Actives"
              value={mockStats.activeRoutes}
              icon={<RouteIcon className="h-4 w-4 text-muted-foreground" />}
              description="Sur 15 routes totales"
            />
            <StatCard
              title="Systèmes Connectés"
              value={mockStats.connectedSystems}
              icon={<Database className="h-4 w-4 text-muted-foreground" />}
              description="Sources + Cibles"
            />
            <StatCard
              title="Taux de Succès"
              value={`${mockStats.successRate}%`}
              icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
              description="Moyenne 30 jours"
            />
          </div>

          {/* Activités Récentes */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Activités Récentes</CardTitle>
                <CardDescription>
                  Dernières actions sur la plateforme d'intégration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <ActivityIcon type={activity.type} status={activity.status} />
                        <div>
                          <p className="text-sm font-medium">{activity.action}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {activity.type}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}