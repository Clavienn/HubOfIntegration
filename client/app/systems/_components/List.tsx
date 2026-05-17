'use client';

import { useState } from 'react';
import { useSystems } from '@/hooks/useSystem';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { System } from '@/domains/models/System';

import SystemCreate from './Create';
import SystemView from './View';
import SystemUpdate from './Update';
import ModalToggleSystem from './ToggleSystem';
import ModalDeleteSystem from './Delete';

type ModalState =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'view'; system: System }
  | { type: 'update'; system: System }
  | { type: 'toggle'; system: System }
  | { type: 'delete'; system: System };

export default function SystemsPage() {
  const {
    systems,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    filters,
    fetchSystems,
    setFilters,
    resetFilters,
  } = useSystems({ limit: 10 });

  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  const closeModal = () => setModal({ type: 'none' });
  const onMutated = () => {
    fetchSystems(filters);
    closeModal();
  };

  const handleSearch = (search: string) => setFilters({ search, page: 1 });

  const handleFilterActive = (checked: boolean) => {
    setFilters({ isActive: filters.isActive === checked ? undefined : checked, page: 1 });
  };

  const handlePageChange = (page: number) => setFilters({ page });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Systèmes</h1>
        <Button onClick={() => setModal({ type: 'create' })}>Nouveau Système</Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <Input
          placeholder="Rechercher..."
          value={filters.search ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm">Actifs uniquement :</span>
          <Switch
            checked={filters.isActive === true}
            onCheckedChange={handleFilterActive}
          />
        </div>
        <Button variant="outline" onClick={resetFilters}>
          Réinitialiser
        </Button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-600 text-sm">{error}</div>
      )}

      {/* Statistiques */}
      <div className="text-sm text-muted-foreground mb-4">
        {loading
          ? 'Chargement...'
          : `Affichage de ${systems.length} sur ${total} systèmes`}
      </div>

      {/* Liste */}
      {!loading && systems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Aucun système trouvé
        </div>
      ) : (
        <div className={`grid gap-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          {systems.map((system) => (
            <div key={system.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start flex-wrap gap-4">
                {/* Infos — cliquable pour ouvrir la vue détail */}
                <button
                  type="button"
                  className="text-left flex-1 min-w-0 hover:opacity-80 transition-opacity"
                  onClick={() => setModal({ type: 'view', system })}
                >
                  <h3 className="font-semibold">{system.name}</h3>
                  {system.apiKey && (
                    <p className="text-sm text-muted-foreground font-mono">
                      API Key: {system.apiKey.slice(0, 12)}...
                    </p>
                  )}
                  {system.webhookUrl && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      Webhook: {system.webhookUrl}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Timeout : {system.timeoutMs}ms &nbsp;|&nbsp; Tentatives :{' '}
                    {system.retryPolicy?.maxAttempts ?? 3}
                  </p>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Badge statut */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      system.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {system.isActive ? 'Actif' : 'Inactif'}
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModal({ type: 'update', system })}
                  >
                    Modifier
                  </Button>

                  <Button
                    variant={system.isActive ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => setModal({ type: 'toggle', system })}
                  >
                    {system.isActive ? 'Désactiver' : 'Activer'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModal({ type: 'delete', system })}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            disabled={currentPage <= 1 || loading}
            onClick={() => handlePageChange(currentPage - 1)}
          >
            Précédent
          </Button>
          <span className="py-2 px-4 text-sm">
            Page {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= totalPages || loading}
            onClick={() => handlePageChange(currentPage + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Modals */}
      <SystemCreate
        open={modal.type === 'create'}
        onClose={closeModal}
        onCreated={onMutated}
      />

      <SystemView
        open={modal.type === 'view'}
        system={modal.type === 'view' ? modal.system : null}
        onClose={closeModal}
        onEdit={(system) => setModal({ type: 'update', system })}
      />

      <SystemUpdate
        open={modal.type === 'update'}
        system={modal.type === 'update' ? modal.system : null}
        onClose={closeModal}
        onUpdated={onMutated}
      />

      <ModalToggleSystem
        open={modal.type === 'toggle'}
        system={modal.type === 'toggle' ? modal.system : null}
        onClose={closeModal}
        onToggled={onMutated}
      />

      <ModalDeleteSystem
        open={modal.type === 'delete'}
        system={modal.type === 'delete' ? modal.system : null}
        onClose={closeModal}
        onDeleted={onMutated}
      />
    </div>
  );
}