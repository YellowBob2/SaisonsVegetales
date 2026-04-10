import { useEffect, useState } from "react";
import { Alert, Col, Container, Row } from "react-bootstrap";
import {
  createPlatApi,
  deletePlatApi,
  fetchPlatsApi,
  orderPlatsApi,
  updatePlatApi
} from "./api/platsApi";
import { PlatCreateForm } from "./components/PlatCreateForm";
import { PlatCatalogCards } from "./components/PlatCatalogCards";
import { showOrderSimulationPopup } from "./services/orderSimulation";
import { emptyPlatForm, type Plat, type PlatInput } from "./types";
import { toPlatPayload } from "./utils/platsForm";
import "./styles/catalog.css";

export default function App() {
  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<PlatInput>(emptyPlatForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PlatInput>(emptyPlatForm);
  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});

  async function fetchPlats() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPlatsApi();
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
    void fetchPlats();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const payload = toPlatPayload(createForm);

    if (!payload) {
      setError("Le formulaire d'ajout est invalide.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createPlatApi(payload);

      setCreateForm(emptyPlatForm);
      await fetchPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(plat: Plat) {
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
    const payload = toPlatPayload(editForm);

    if (!payload) {
      setError("Le formulaire de modification est invalide.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updatePlatApi(id, payload);

      cancelEdit();
      await fetchPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setSaving(true);
    setError(null);
    try {
      await deletePlatApi(id);
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
    const items = Object.entries(orderQuantities)
      .map(([platId, quantity]) => ({ platId: Number(platId), quantity }))
      .filter((item) => Number.isInteger(item.platId) && item.quantity > 0);

    if (items.length === 0) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await orderPlatsApi(items);
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
      <Row className="mb-4">
        <Col>
          <h1>Saisons Vegetales</h1>
          <p className="text-muted mb-0">Gestion des plats: affichage, ajout, modification et suppression.</p>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" className="mb-0">{error}</Alert>
          </Col>
        </Row>
      )}

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

      <Row>
        <Col>
          <div className="catalog-actions mb-3">
            <h2 className="h5 mb-0">Plats disponibles</h2>
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                saving ||
                loading ||
                Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0) === 0
              }
              onClick={() => void handleOrder()}
            >
              Commander ({Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0)})
            </button>
          </div>
          <PlatCatalogCards
            plats={plats}
            loading={loading}
            saving={saving}
            editingId={editingId}
            editForm={editForm}
            orderQuantities={orderQuantities}
            onEditFormChange={setEditForm}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={(id) => void saveEdit(id)}
            onDelete={(id) => void handleDelete(id)}
            onQuantityChange={changeOrderQuantity}
          />
        </Col>
      </Row>
    </Container>
  );
}