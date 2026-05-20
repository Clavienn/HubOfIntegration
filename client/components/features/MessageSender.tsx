'use client';

import { useState, useMemo } from 'react';
import { useIngest } from '@/hooks/useIngest';
import { useSystems } from '@/hooks/useSystem';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { IngestService } from '@/services/ingest';

interface MessageSenderProps {
  onSuccess?: (messageId: string) => void;
  defaultPayload?: Record<string, any>;
  defaultDestination?: string;
  initialSourceSystemId?: string;  // ✅ Optionnel: ID source par défaut
}

interface PayloadField {
  id: number;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'object';
}

const SYSTEMS_FILTERS = { limit: 100 };

let fieldCounter = 0;
const newField = (): PayloadField => ({ 
  id: ++fieldCounter, 
  key: '', 
  value: '',
  valueType: 'string'
});

export function MessageSender({
  onSuccess,
  defaultPayload,
  defaultDestination,
  initialSourceSystemId,
}: MessageSenderProps) {
  const { systems = [], loading: systemsLoading } = useSystems(SYSTEMS_FILTERS);
  const { sendMessage, loading: sendLoading, error, lastResponse } = useIngest();

  const [fields, setFields] = useState<PayloadField[]>(() => {
    if (defaultPayload) {
      return Object.entries(defaultPayload).map(([key, value]) => ({
        id: ++fieldCounter,
        key,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
        valueType: typeof value === 'object' ? 'object' : typeof value as any,
      }));
    }
    return [newField()];
  });

  const [selectedSourceSystemId, setSelectedSourceSystemId] = useState<string>(
    initialSourceSystemId || ''
  );
  const [destinationSystemId, setDestinationSystemId] = useState<string>(
    defaultDestination || ''
  );
  const [fieldErrors, setFieldErrors] = useState<Record<number, string>>({});

  const activeSystems = useMemo(
    () => systems.filter((s) => s.isActive),
    [systems]
  );

  // Construit le JSON à partir des champs avec parsing intelligent
  const builtPayload = useMemo(() => {
    const obj: Record<string, any> = {};
    for (const f of fields) {
      if (!f.key.trim()) continue;
      
      const key = f.key.trim();
      const value = f.value.trim();
      
      if (value === '') {
        obj[key] = null;
        continue;
      }
      
      // Tentative de parsing JSON (pour objets ou tableaux)
      if ((value.startsWith('{') && value.endsWith('}')) || 
          (value.startsWith('[') && value.endsWith(']'))) {
        try {
          obj[key] = JSON.parse(value);
          continue;
        } catch {
          // Si échec du parsing, continuer avec les autres types
        }
      }
      
      // Tentative de parsing nombre
      if (!isNaN(Number(value)) && value !== '') {
        obj[key] = Number(value);
        continue;
      }
      
      // Tentative de parsing booléen
      if (value === 'true') {
        obj[key] = true;
        continue;
      }
      if (value === 'false') {
        obj[key] = false;
        continue;
      }
      
      // Par défaut, garder comme string
      obj[key] = value;
    }
    return obj;
  }, [fields]);

  const updateField = (id: number, part: Partial<Omit<PayloadField, 'id'>>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...part } : f))
    );
    if (part.key !== undefined) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const updateValueType = (id: number, valueType: PayloadField['valueType']) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, valueType } : f))
    );
  };

  const addField = () => setFields((prev) => [...prev, newField()]);

  const removeField = (id: number) =>
    setFields((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));

  const validate = (): boolean => {
    const errors: Record<number, string> = {};
    const keys = fields.map((f) => f.key.trim()).filter(Boolean);

    for (const f of fields) {
      if (!f.key.trim() && f.value.trim()) {
        errors[f.id] = 'La clé est requise';
      }
    }

    // Clés dupliquées
    const seen = new Set<string>();
    for (const f of fields) {
      if (!f.key.trim()) continue;
      if (seen.has(f.key.trim())) {
        errors[f.id] = 'Clé déjà utilisée';
      }
      seen.add(f.key.trim());
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0 && keys.length > 0;
  };

  const handleSubmit = async () => {
    // ✅ Vérifier qu'un système source est sélectionné
    if (!selectedSourceSystemId) {
      setFieldErrors({ [fields[0]?.id || 0]: 'Veuillez sélectionner un système source' });
      return;
    }

    if (!validate()) return;

    const validation = IngestService.validatePayload(builtPayload);
    if (!validation.valid) {
      setFieldErrors({ [fields[0].id]: validation.errors.join(', ') });
      return;
    }

    const response = await sendMessage(
      builtPayload,
      selectedSourceSystemId,  // ✅ Envoi du système source sélectionné
      destinationSystemId && destinationSystemId !== 'auto' ? destinationSystemId : undefined
    );

    if (response && onSuccess) {
      onSuccess(response.messageId);
    }
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;
  const filledFields = fields.filter((f) => f.key.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Envoyer un message</CardTitle>
        <CardDescription>
          Envoyez un payload vers un système destination via l&apos;ESB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* ✅ Sélecteur du système source */}
        <div className="space-y-2">
          <Label>Système source *</Label>
          <Select
            value={selectedSourceSystemId}
            onValueChange={setSelectedSourceSystemId}
            disabled={systemsLoading}
          >
            <SelectTrigger>
              {systemsLoading ? (
                <span className="text-muted-foreground text-sm">Chargement...</span>
              ) : (
                <SelectValue placeholder="📤 Sélectionner un système source" />
              )}
            </SelectTrigger>
            <SelectContent>
              {activeSystems.map((system) => (
                <SelectItem key={system.id} value={system.id!}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <Label>Système destination (optionnel)</Label>
          <Select
            value={destinationSystemId}
            onValueChange={setDestinationSystemId}
            disabled={systemsLoading}
          >
            <SelectTrigger>
              {systemsLoading ? (
                <span className="text-muted-foreground text-sm">Chargement...</span>
              ) : (
                <SelectValue placeholder="🚦 Routage automatique" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">🚦 Routage automatique</SelectItem>
              {activeSystems.map((system) => (
                <SelectItem key={system.id} value={system.id!}>
                  {system.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Champs clé / valeur - reste identique */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Données du message</Label>
            {filledFields.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                {filledFields.length} champ{filledFields.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* En-tête colonnes */}
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
                      field.valueType === 'object' 
                        ? 'ex: {"name":"John"}' 
                        : field.valueType === 'number'
                        ? 'ex: 12345'
                        : field.valueType === 'boolean'
                        ? 'ex: true'
                        : 'ex: texte'
                    }
                    value={field.value}
                    onChange={(e) => updateField(field.id, { value: e.target.value })}
                  />
                  <Select
                    value={field.valueType}
                    onValueChange={(val) => updateValueType(field.id, val as any)}
                  >
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">📝 Texte</SelectItem>
                      <SelectItem value="number">🔢 Nombre</SelectItem>
                      <SelectItem value="boolean">✓/✗ Booléen</SelectItem>
                      <SelectItem value="object">📦 Objet/Array</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
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

          <Button
            variant="outline"
            size="sm"
            onClick={addField}
            className="w-full border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un champ
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

        {/* Erreur envoi */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Succès */}
        {lastResponse && !error && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              ✅ Message envoyé !<br />
              ID: <span className="font-mono text-xs">{lastResponse.messageId}</span><br />
              Statut: {lastResponse.status}
            </AlertDescription>
          </Alert>
        )}

        {/* Bouton */}
        <Button
          onClick={handleSubmit}
          disabled={sendLoading || hasErrors || filledFields.length === 0 || !selectedSourceSystemId}
          className="w-full"
        >
          {sendLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Envoyer le message
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}