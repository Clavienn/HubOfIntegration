'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { ingestRepo } from '@/infrastructures/repository/IngestRepoAPI';
import { systemRepo } from '@/infrastructures/repository/SystemRepoAPI';
import { System } from '@/domains/models/System';
import { IngestResponse } from '@/domains/models/Ingest';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MessageSenderProps {
  onSuccess?:             (messageId: string) => void;
  defaultPayload?:        Record<string, unknown>;
  defaultDestination?:    string;
  initialSourceSystemId?: string;
}

interface PayloadField {
  id:        number;
  key:       string;
  value:     string;
  valueType: 'string' | 'number' | 'boolean' | 'object';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let fieldCounter = 0;
const newField = (): PayloadField => ({
  id: ++fieldCounter, key: '', value: '', valueType: 'string',
});

function buildPayload(fields: PayloadField[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const f of fields) {
    if (!f.key.trim()) continue;
    const v = f.value.trim();
    if (v === '') { obj[f.key.trim()] = null; continue; }
    if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('[') && v.endsWith(']'))) {
      try { obj[f.key.trim()] = JSON.parse(v); continue; } catch { /* fallthrough */ }
    }
    if (v === 'true')        { obj[f.key.trim()] = true;     continue; }
    if (v === 'false')       { obj[f.key.trim()] = false;    continue; }
    if (!isNaN(Number(v)))   { obj[f.key.trim()] = Number(v); continue; }
    obj[f.key.trim()] = v;
  }
  return obj;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function MessageSender({
  onSuccess, defaultPayload, defaultDestination, initialSourceSystemId,
}: MessageSenderProps) {
  const [systems, setSystems]               = useState<System[]>([]);
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [sendLoading, setSendLoading]       = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [lastResponse, setLastResponse]     = useState<IngestResponse | null>(null);

  const [sourceSystemId, setSourceSystemId] = useState(initialSourceSystemId ?? '');
  const [destSystemId, setDestSystemId]     = useState(defaultDestination ?? '');
  const [fieldErrors, setFieldErrors]       = useState<Record<number, string>>({});

  const [fields, setFields] = useState<PayloadField[]>(() => {
    if (defaultPayload) {
      return Object.entries(defaultPayload).map(([key, value]) => ({
        id: ++fieldCounter,
        key,
        value:     typeof value === 'object' ? JSON.stringify(value) : String(value),
        valueType: (typeof value === 'object' ? 'object' : typeof value) as PayloadField['valueType'],
      }));
    }
    return [newField()];
  });

  // ── Chargement systèmes ──────────────────────────────────────────────────

  useEffect(() => {
    setSystemsLoading(true);
    systemRepo.getAll({ limit: 100 })
      .then((res) => setSystems(res.systems))
      .catch(() => setSystems([]))
      .finally(() => setSystemsLoading(false));
  }, []);

  const activeSystems = useMemo(() => systems.filter((s) => s.isActive), [systems]);
  const builtPayload  = useMemo(() => buildPayload(fields), [fields]);
  const filledFields  = fields.filter((f) => f.key.trim());

  // ── Champs ───────────────────────────────────────────────────────────────

  const updateField = (id: number, part: Partial<Omit<PayloadField, 'id'>>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...part } : f)));
    if (part.key !== undefined)
      setFieldErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const addField    = () => setFields((prev) => [...prev, newField()]);
  const removeField = (id: number) =>
    setFields((prev) => prev.length > 1 ? prev.filter((f) => f.id !== id) : prev);

  // ── Validation ───────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Record<number, string> = {};
    const seen = new Set<string>();
    for (const f of fields) {
      if (!f.key.trim() && f.value.trim()) { errors[f.id] = 'La clé est requise'; continue; }
      if (!f.key.trim()) continue;
      if (seen.has(f.key.trim())) errors[f.id] = 'Clé déjà utilisée';
      seen.add(f.key.trim());
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0 && filledFields.length > 0;
  };

  // ── Envoi ────────────────────────────────────────────────────────────────
  // FIX: sourceSystemId passé en 4e argument → envoyé dans le body par IngestRepoAPI

  const handleSubmit = async () => {
    if (!sourceSystemId) {
      setFieldErrors({ [fields[0]?.id ?? 0]: 'Veuillez sélectionner un système source' });
      return;
    }
    if (!validate()) return;

    setSendLoading(true);
    setError(null);
    setLastResponse(null);

    try {
      const dest = destSystemId && destSystemId !== 'auto' ? destSystemId : undefined;
      const response = await ingestRepo.send(builtPayload, dest, undefined, sourceSystemId);
      setLastResponse(response);
      if (onSuccess) onSuccess(response.messageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSendLoading(false);
    }
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envoyer un message</CardTitle>
        <CardDescription>Envoyez un payload vers un système destination via l&apos;ESB</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Source */}
        <div className="space-y-2">
          <Label>Système source *</Label>
          <Select value={sourceSystemId} onValueChange={setSourceSystemId} disabled={systemsLoading}>
            <SelectTrigger>
              {systemsLoading
                ? <span className="text-muted-foreground text-sm">Chargement...</span>
                : <SelectValue placeholder="Sélectionner un système source" />}
            </SelectTrigger>
            <SelectContent>
              {activeSystems.map((s) => (
                <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label>Système destination (optionnel)</Label>
          <Select value={destSystemId} onValueChange={setDestSystemId} disabled={systemsLoading}>
            <SelectTrigger>
              {systemsLoading
                ? <span className="text-muted-foreground text-sm">Chargement...</span>
                : <SelectValue placeholder="Routage automatique" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Routage automatique</SelectItem>
              {activeSystems.map((s) => (
                <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Champs payload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Données du message</Label>
            {filledFields.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                {filledFields.length} champ{filledFields.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="grid grid-cols-[0.8fr_1.2fr_auto_32px] gap-2 px-1">
            <span className="text-xs font-medium text-muted-foreground">Clé</span>
            <span className="text-xs font-medium text-muted-foreground">Valeur</span>
            <span className="text-xs font-medium text-muted-foreground">Type</span>
            <span />
          </div>

          <div className="space-y-2">
            {fields.map((field) => (
              <div key={field.id} className="space-y-1">
                <div className="grid grid-cols-[0.8fr_1.2fr_auto_32px] gap-2 items-center">
                  <Input
                    placeholder="ex: userId"
                    value={field.key}
                    onChange={(e) => updateField(field.id, { key: e.target.value })}
                    className={fieldErrors[field.id] ? 'border-red-400' : ''}
                  />
                  <Input
                    placeholder={
                      field.valueType === 'object'  ? 'ex: {"name":"John"}' :
                      field.valueType === 'number'  ? 'ex: 12345' :
                      field.valueType === 'boolean' ? 'true / false' : 'ex: texte'
                    }
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                  />
                  <Select
                    value={field.valueType}
                    onValueChange={(v) => updateField(field.id, { valueType: v as PayloadField['valueType'] })}
                  >
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Texte</SelectItem>
                      <SelectItem value="number">Nombre</SelectItem>
                      <SelectItem value="boolean">Booléen</SelectItem>
                      <SelectItem value="object">Objet</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => removeField(field.id)}
                    disabled={fields.length === 1}
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {fieldErrors[field.id] && (
                  <p className="text-xs text-red-500 pl-1">{fieldErrors[field.id]}</p>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addField} className="w-full border-dashed">
            <Plus className="h-4 w-4 mr-2" />Ajouter un champ
          </Button>
        </div>

        {/* Aperçu JSON */}
        {filledFields.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aperçu JSON</Label>
            <pre className="text-xs font-mono bg-muted rounded-md px-3 py-2 overflow-x-auto max-h-48 text-muted-foreground">
              {JSON.stringify(builtPayload, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {lastResponse && !error && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Message envoyé !<br />
              ID: <span className="font-mono text-xs">{lastResponse.messageId}</span><br />
              Statut: {lastResponse.status}
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSubmit}
          disabled={sendLoading || hasErrors || filledFields.length === 0 || !sourceSystemId}
          className="w-full"
        >
          {sendLoading
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi en cours...</>
            : <><Send className="mr-2 h-4 w-4" />Envoyer le message</>}
        </Button>
      </CardContent>
    </Card>
  );
}