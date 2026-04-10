import { useEffect, useState } from "react";
import { Alert, Col, Container, Row } from "react-bootstrap";
import {
  createPlatApi,
  deletePlatApi,
  fetchPlatsApi,
  updatePlatApi
} from "./api/platsApi";
import { PlatCreateForm } from "./components/PlatCreateForm";
import { PlatTable } from "./components/PlatTable";
import { emptyPlatForm, type Plat, type PlatInput } from "./types";
import { toPlatPayload } from "./utils/platsForm";

export default function App() {
  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<PlatInput>(emptyPlatForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PlatInput>(emptyPlatForm);

  async function fetchPlats() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchPlatsApi();
      setPlats(data);
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

  return (
    <Container className="py-4">
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
          <h2 className="h5">Plats disponibles</h2>
          <PlatTable
            plats={plats}
            loading={loading}
            saving={saving}
            editingId={editingId}
            editForm={editForm}
            onEditFormChange={setEditForm}
            onStartEdit={startEdit}
            onCancelEdit={cancelEdit}
            onSaveEdit={(id) => void saveEdit(id)}
            onDelete={(id) => void handleDelete(id)}
          />
        </Col>
      </Row>
    </Container>
  );
}