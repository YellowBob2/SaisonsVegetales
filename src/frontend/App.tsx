import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Row } from "react-bootstrap";
import {
  createPlatApi,
  deletePlatApi,
  fetchPlatsApi,
  fetchSessionApi,
  orderPlatsApi,
  updatePlatApi
} from "./api/platsApi";
import { permissionsByRole, roleLabels, type DemoRole } from "./auth/roles";
import { PlatCatalogCards } from "./components/PlatCatalogCards";
import { PlatCreateForm } from "./components/PlatCreateForm";
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/clerk-react";
import "./styles/catalog.css";
import { emptyPlatForm, type Plat, type PlatInput } from "./types";
import { toPlatPayload } from "./utils/platsForm";

export default function App() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sessionRole, setSessionRole] = useState<DemoRole>("guest");
  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<PlatInput>(emptyPlatForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PlatInput>(emptyPlatForm);
  const [orderQuantities, setOrderQuantities] = useState<Record<number, number>>({});

  const permissions = permissionsByRole[sessionRole];
  const orderedTotal = useMemo(
    () => Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0),
    [orderQuantities]
  );

  async function getTokenOrThrow() {
    if (!getToken) {
      throw new Error("Clerk n'est pas encore chargé.");
    }

    const token = await getToken();
    if (!token) {
      throw new Error("Impossible d'obtenir un token Clerk.");
    }

    return token;
  }

  function clampOrderQuantities(data: Plat[]) {
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
  }

  async function refreshSessionAndPlats() {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setSessionRole("guest");
      setPlats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getTokenOrThrow();
      const session = await fetchSessionApi(token);
      setSessionRole(session.role);

      const data = await fetchPlatsApi(token);
      setPlats(data);
      clampOrderQuantities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setPlats([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSessionAndPlats();
  }, [isLoaded, isSignedIn]);

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
      const token = await getTokenOrThrow();
      await createPlatApi(token, payload);
      setCreateForm(emptyPlatForm);
      await refreshSessionAndPlats();
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
      const token = await getTokenOrThrow();
      await updatePlatApi(token, id, payload);
      cancelEdit();
      await refreshSessionAndPlats();
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
      const token = await getTokenOrThrow();
      await deletePlatApi(token, id);
      setOrderQuantities((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (editingId === id) {
        cancelEdit();
      }

      await refreshSessionAndPlats();
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
    setSuccessMessage(null);

    try {
      const token = await getTokenOrThrow();
      const result = await orderPlatsApi(token, items);
      setSuccessMessage(result.message);
      setOrderQuantities({});
      await refreshSessionAndPlats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Container className="py-4 catalog-shell">
      <Row className="mb-3 align-items-center">
        <Col>
          <h1>Saisons Vegetales</h1>
          <p className="text-muted mb-0">
            {!isLoaded 
              ? "Chargement..."
              : isSignedIn
              ? `Role courant: ${roleLabels[sessionRole]}`
              : "Non connecté"}
          </p>
        </Col>
        <Col className="text-end">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <Button variant="primary">Se connecter</Button>
            </SignInButton>
          </SignedOut>
        </Col>
      </Row>

      {error && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" className="mb-0">{error}</Alert>
          </Col>
        </Row>
      )}

      {successMessage && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" className="mb-0">{successMessage}</Alert>
          </Col>
        </Row>
      )}

      {!isLoaded && (
        <Row>
          <Col className="text-center">
            <Card className="shadow-sm">
              <Card.Body>
                <p className="text-muted">Initialisation en cours...</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <SignedOut>
        {isLoaded && (
          <Row>
            <Col>
              <Card className="shadow-sm">
                <Card.Body>
                  <Card.Title>Connexion requise</Card.Title>
                  <Card.Text className="text-muted mb-3">
                    Connectez-vous pour consulter les plats et passer commande.
                  </Card.Text>
                  <SignInButton>
                    <Button>Se connecter</Button>
                  </SignInButton>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </SignedOut>

      <SignedIn>
        {isLoaded && loading && sessionRole === "guest" && (
          <Row>
            <Col className="text-center">
              <Card className="shadow-sm">
                <Card.Body>
                  <p className="text-muted">Récupération de votre rôle...</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {isLoaded && sessionRole !== "guest" && (
          <>
            {permissions.canCreatePlat && (
              <Row className="mb-4">
                <Col>
                  <h2 className="h5">Ajouter un plat</h2>
                  <PlatCreateForm
                    value={createForm}
                    disabled={saving || loading}
                    onSubmit={handleCreate}
                    onChange={setCreateForm}
                  />
                </Col>
              </Row>
            )}

            <Row>
              <Col>
                <div className="catalog-actions mb-3 d-flex align-items-center justify-content-between gap-3">
                  <h2 className="h5 mb-0">Plats disponibles</h2>
                  {permissions.canOrderPlats && (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={saving || loading || orderedTotal === 0}
                      onClick={() => void handleOrder()}
                    >
                      Commander ({orderedTotal})
                    </Button>
                  )}
                </div>
                {loading ? (
                  <Card className="shadow-sm">
                    <Card.Body className="text-center">
                      <p className="text-muted">Chargement des plats...</p>
                    </Card.Body>
                  </Card>
                ) : (
                  <PlatCatalogCards
                    plats={plats}
                    loading={false}
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
                )}
              </Col>
            </Row>
          </>
        )}
      </SignedIn>
    </Container>
  );
}
