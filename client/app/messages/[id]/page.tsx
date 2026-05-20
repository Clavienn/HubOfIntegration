'use client';

import { useState } from 'react';
import { useIngest } from '@/hooks/useIngest';
import { MessageSender } from '@/components/features/MessageSender';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, RefreshCw, Eye } from 'lucide-react';
import { IngestService } from '@/services/ingest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Layout from '@/components/layouts/Layout';

export default function IngestPage() {
  const [messageId, setMessageId] = useState<string>('');
  const [searchId, setSearchId] = useState<string>('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const { getStatus, replayMessage, lastStatus, loading } = useIngest();

  const handleSearchStatus = async (overrideId?: string) => {
    const targetId = overrideId ?? searchId;
    if (!targetId) return;
    await getStatus(targetId);
    setStatusDialogOpen(true);
  };

  const handleReplay = async () => {
    if (!lastStatus?.id) return;
    await replayMessage(lastStatus.id);
    await getStatus(lastStatus.id);
  };

  const statusDisplay = lastStatus
    ? IngestService.formatStatusForDisplay(lastStatus.status)
    : null;

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Ingestion de messages</h1>

        <Tabs defaultValue="send" className="space-y-6">
          <TabsList>
            <TabsTrigger value="send">📤 Envoyer</TabsTrigger>
            <TabsTrigger value="track">🔍 Suivre un message</TabsTrigger>
          </TabsList>

          {/* Onglet Envoi */}
          <TabsContent value="send">
            <MessageSender
              onSuccess={(id) => setMessageId(id)}
            />

            {messageId && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Message envoyé !</CardTitle>
                  <CardDescription>
                    Votre message a été reçu par l&apos;ESB
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    ID: {messageId}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setSearchId(messageId);
                      handleSearchStatus(messageId);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Voir le statut
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Onglet Suivi */}
          <TabsContent value="track">
            <Card>
              <CardHeader>
                <CardTitle>Suivre un message</CardTitle>
                <CardDescription>
                  Entrez l&apos;ID d&apos;un message pour voir son statut
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="ID du message"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchStatus()}
                  />
                  <Button
                    onClick={() => handleSearchStatus()}
                    disabled={loading || !searchId}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal de statut - identique */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Statut du message</DialogTitle>
              <DialogDescription>{lastStatus?.id}</DialogDescription>
            </DialogHeader>

            {lastStatus && statusDisplay && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                  <span className="text-2xl">{statusDisplay.icon}</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <p className={`font-semibold ${statusDisplay.color}`}>
                      {statusDisplay.label}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <p className="text-sm text-muted-foreground">Tentatives</p>
                    <p className="font-semibold">
                      {lastStatus.metadata.retryCount}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Système source
                    </p>
                    <p className="font-medium">
                      {lastStatus.metadata.sourceSystemId}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Système destination
                    </p>
                    <p className="font-medium">
                      {lastStatus.metadata.destinationSystemId || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Date de création
                    </p>
                    <p className="font-medium">
                      {new Date(lastStatus.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dernière mise à jour
                    </p>
                    <p className="font-medium">
                      {new Date(lastStatus.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {lastStatus.error && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">Erreur</p>
                    <p className="text-sm text-red-700">{lastStatus.error}</p>
                  </div>
                )}

                {(lastStatus.status === 'failed' ||
                  lastStatus.status === 'dead') && (
                  <Button
                    onClick={handleReplay}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Rejouer le message
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}