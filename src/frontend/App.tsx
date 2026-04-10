import { useEffect, useMemo, useState } from "react";
import { Alert, Col, Container, Row } from "react-bootstrap";
import {
  createPlatApi,
  deletePlatApi,
  fetchPlatsApi,
  fetchSessionApi,
  orderPlatsApi,
  updatePlatApi
} from "./api/platsApi";
import { permissionsByRole, persistRole, readStoredRole, roleLabels, type DemoRole } from "./auth/roles";
import { GuestAuthView } from "./components/GuestAuthView";
import { PlatCatalogCards } from "./components/PlatCatalogCards";
import { PlatCreateForm } from "./components/PlatCreateForm";
import { RoleSwitcher } from "./components/RoleSwitcher";
import { showOrderSimulationPopup } from "./services/orderSimulation";
import "./styles/catalog.css";
import { emptyPlatForm, type Plat, type PlatInput } from "./types";
import { toPlatPayload } from "./utils/platsForm";

export default function App() {
  const [role, setRole] = useState<DemoRole>(readStoredRole);
  const [sessionRole, setSessionRole] = useState<DemoRole>(role);

  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<PlatInput>(emptyPlatForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PlatInput>(emptyPlatForm);
  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});

  const permissions = permissionsByRole[role];
  const orderedTotal = useMemo(
    () => Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0),
    [orderQuantities]
  );

  async function fetchSession() {
    try {
      const session = await fetchSessionApi(role);
      setSessionRole(session.role);
    } catch {
      setSessionRole(role);
    }
  }

  async function fetchPlats() {
    if (!permissions.canViewPlats) {
      setPlats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPlatsApi(role);
      setPlats(data);
      setOrderQuantities((prev) => {
        const next: Record<number, number> = {};

        for (const plat of data) {
          const existing = prev[plat.id] ?? 0;
          if (existing > 0 && plat.stock > 0) {
            next[plat.id] = Math.min(existing, plat.stock);
          }
        }

        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSession();
    void fetchPlats();
  }, [role]);

  function updateRole(nextRole: DemoRole) {
    setRole(nextRole);
    persistRole(nextRole);
    setEditingId(null);
    setOrderQuantities({});
    setError(null);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!permissions.canCreatePlat) {
      setError("Cette action est reservee aux administrateurs.");
      return;
    }

    const payload = toPlatPayload(createForm);

    if (!payload) {
      setError("Le formulaire d'ajout est invalide.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPlatApi(role, payload);
      setCreateForm(emptyPlatForm);
      await fetchPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(plat: Plat) {
    if (!permissions.canEditPlat) {
      setError("Cette action est reservee aux administrateurs.");
      return;
    }

    setEditingId(plat.id);
    setEditForm({
      name: plat.name,
      available_until: plat.available_until,
      price: String(plat.price),
      stock: String(plat.stock)
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyPlatForm);
  }

  async function saveEdit(id: number) {
    if (!permissions.canEditPlat) {
      setError("Cette action est reservee aux administrateurs.");
      return;
    }

    const payload = toPlatPayload(editForm);

    if (!payload) {
      setError("Le formulaire de modification est invalide.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updatePlatApi(role, id, payload);
      cancelEdit();
      await fetchPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!permissions.canDeletePlat) {
      setError("Cette action est reservee aux administrateurs.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await deletePlatApi(role, id);
      setOrderQuantities((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (editingId === id) {
        cancelEdit();
      }

      await fetchPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  function changeOrderQuantity(id: number, quantity: number) {
    const plat = plats.find((item) => item.id === id);

    if (!plat) {
      return;
    }

    const safeQuantity = Number.isFinite(quantity)
      ? Math.max(0, Math.min(Math.floor(quantity), plat.stock))
      : 0;

    setOrderQuantities((prev) => {
      const next = { ...prev };
      if (safeQuantity === 0) {
        delete next[id];
      } else {
        next[id] = safeQuantity;
      }

      return next;
    });
  }

  async function handleOrder() {
    if (!permissions.canOrderPlats) {
      setError("Vous devez etre authentifie pour commander.");
      return;
    }

    const items = Object.entries(orderQuantities)
      .map(([platId, quantity]) => ({ platId: Number(platId), quantity }))
      .filter((item) => Number.isInteger(item.platId) && item.quantity > 0);

    if (items.length === 0) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await orderPlatsApi(role, items);
      showOrderSimulationPopup(result.message);
      setOrderQuantities({});
      await fetchPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container className="py-4 catalog-shell">
      <Row className="mb-3">
        <Col>
          <RoleSwitcher role={role} onRoleChange={updateRole} />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <h1>Saisons Vegetales</h1>
          <p className="text-muted mb-0">
            Vue active: {roleLabels[role]} (session backend: {roleLabels[sessionRole]}).
          </p>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" className="mb-0">{error}</Alert>
          </Col>
        </Row>
      )}

      {!permissions.canViewPlats ? (
        <Row>
          <Col>
            <GuestAuthView onAuthenticate={() => updateRole("user")} />
          </Col>
        </Row>
      ) : (
        <>
          {permissions.canCreatePlat && (
            <Row className="mb-4">
              <Col>
                <h2 className="h5">Ajouter un plat</h2>
                <PlatCreateForm
                  value={createForm}
                  disabled={saving}
                  onSubmit={handleCreate}
                  onChange={setCreateForm}
                />
              </Col>
            </Row>
          )}

          <Row>
            <Col>
              <div className="catalog-actions mb-3">
                <h2 className="h5 mb-0">Plats disponibles</h2>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || loading || !permissions.canOrderPlats || orderedTotal === 0}
                  onClick={() => void handleOrder()}
                >
                  Commander ({orderedTotal})
                </button>
              </div>
              <PlatCatalogCards
                plats={plats}
                loading={loading}
                saving={saving}
                editingId={editingId}
                editForm={editForm}
                orderQuantities={orderQuantities}
                canOrder={permissions.canOrderPlats}
                canEdit={permissions.canEditPlat}
                canDelete={permissions.canDeletePlat}
                onEditFormChange={setEditForm}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={(id) => void saveEdit(id)}
                onDelete={(id) => void handleDelete(id)}
                onQuantityChange={changeOrderQuantity}
              />
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
}
