import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Container, Nav, Row } from "react-bootstrap";
import {
  createPlatApi,
  deletePlatApi,
  fetchPlatsApi,
  fetchSessionApi,
  orderPlatsApi,
  updatePlatApi
} from "./api/platsApi";
import { fetchOrdersApi, updateOrderStatusApi } from "./api/ordersApi";
import { permissionsByRole, roleLabels, type DemoRole } from "./auth/roles";
import { PlatCatalogCards } from "./components/PlatCatalogCards";
import { PlatCreateForm } from "./components/PlatCreateForm";
import { PlatTable } from "./components/PlatTable";
import { AdminOrdersPanel } from "./components/AdminOrdersPanel";
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/clerk-react";
import "./styles/catalog.css";
import { emptyPlatForm, type Order, type OrderStatus, type Plat, type PlatInput } from "./types";
import { toPlatPayload } from "./utils/platsForm";

export default function App() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sessionRole, setSessionRole] = useState<DemoRole>("guest");
  const [plats, setPlats] = useState<Plat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersUpdatingId, setOrdersUpdatingId] = useState<number | null>(null);
  const [adminView, setAdminView] = useState<"products" | "orders">("products");
  const [selectedPlatIds, setSelectedPlatIds] = useState<number[]>([]);
  const [route, setRoute] = useState<string>(window.location.pathname || "/");

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

  function navigate(path: string) {
    window.history.pushState(null, "", path);
    setRoute(path);
  }

  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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

  async function loadOrders(token: string) {
    setOrdersLoading(true);
    try {
      const data = await fetchOrdersApi(token);
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function handleUpdateOrderStatus(orderId: number, status: OrderStatus) {
    setError(null);
    setSuccessMessage(null);
    setOrdersUpdatingId(orderId);

    try {
      const token = await getTokenOrThrow();
      await updateOrderStatusApi(token, orderId, status);
      setSuccessMessage("Statut de commande mis à jour.");
      await loadOrders(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setOrdersUpdatingId(null);
    }
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

      if (session.role === "admin") {
        await loadOrders(token);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
      setPlats([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshSessionAndPlats();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    document.title = "Saisons Vegetales";
  }, []);

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
      stock: String(plat.stock),
      description: plat.description || "",
      allergenes: plat.allergenes.join(", ")
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

  const currentRoute = route === "/commande" || route === "/admin" ? route : "/";
  const isAdmin = sessionRole === "admin";
  const orderPageEnabled = permissions.canOrderPlats;

  function renderHomePage() {
    return (
      <>
        <Row className="mb-5">
          <Col className="text-center">
            <div className="py-4 px-3">
              <h2 style={{ color: "var(--brand-green)", fontSize: "2.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                Bonjour cher.e.s gourmand.e.s,
              </h2>
              <p style={{ color: "var(--brand-orange)", fontSize: "1.25rem", fontWeight: "500", marginBottom: "0" }}>
                Bienvenue sur le site de commande des Saisons Végétales.
              </p>
            </div>
          </Col>
        </Row>

        <Row className="mb-4 justify-content-start">
          <Col md={7}>
            <Card className="shadow-sm product-card">
              <Card.Body>
                <Card.Title style={{ color: "var(--brand-green)" }}>Qu'est ce que c'est ?</Card.Title>
                <Card.Text className="text-start" style={{ color: "var(--brand-text)" }}>
                  Le principe est simple: mieux manger, moins cher, et sans cuisiner en semaine. Je suis une jeune 
                  entrepreneuse, passionnée de cuisine et de nutrition. J'ai commencé par préparer des repas 
                  bénévolement pour la semaine pour des familles dont un enfant était porteur de handicap. Voyant 
                  l'aide que ce geste leur proposait, j'ai eu l'idée de l'étendre à un plus large public, afin 
                  d'en faire une activité auxiliaire. Travaillant à plein temps, et veillant également à respecter 
                  un équilibre personnel et familial, je ne propose pour l'instant qu'un jour de retrait des repas: 
                  le mardi soir. Du fait des normes d'hygiène, je ne peux pas vous vendre des plats pour toute la 
                  semaine car ils se conservent 3 jours au réfrigérateur. Par contre je peux vous préparer tous les repas 
                  du mercredi, jeudi et vendredi et vous coacher sur la préparation de la suite le week end, avec des 
                  recettes faciles et réalisables en famille. (À terme, il est possible que je prépare également des 
                  repas le samedi, mais pour l'instant, le projet est naissant, je loue une cuisine et ne peux pas 
                  avoir plusieurs créneaux.)
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4 justify-content-end">
          <Col md={7}>
            <Card className="shadow-sm product-card">
              <Card.Body>
                <Card.Title style={{ color: "var(--brand-green)" }}>Qu'est ce qu'on mange ?</Card.Title>
                <Card.Text className="text-start" style={{ color: "var(--brand-text)" }}>
                  Je cuisine principalement des produits végétaux de saison: peu de viande dans mes plats donc. 
                  Cependant, ils seront équilibrés, et sains pour que le plaisir soit partagé entre vos papilles, 
                  et votre santé. Passez sur l'onglet des plats pour avoir un apperçu de ceux proposés cette semaine !
                  Les plats changeront en fonction des produits proposés par la ferme où je m'approvisionne. 
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4 justify-content-start">
          <Col md={7}>
            <Card className="shadow-sm product-card">
              <Card.Body>
                <Card.Title style={{ color: "var(--brand-green)" }}>Comment ça marche ?</Card.Title>
                <Card.Text className="text-start" style={{ color: "var(--brand-text)" }}>
                  La formule est flexible, vous commandez les plats que vous souhaitez, ainsi que le nombre de portions 
                  sur l'onglet de commande. Vous faites un paiement en virement ou via Wero/Sumeria, en mettant votre
                  numéro de commande en référence. Je vous confirme la réception par mail. 
                  Le lundi soir, je vous envoie un mail de rappel, avec l'adresse, l'horaire et le contenu de commande. 
                  J'ajoute également les consignes de transport et de conservation. Veuillez d'ailleurs apporter une 
                  glacière (avec des blocs, ou les ajouter à votre panier, ils sont consignés) pour un respect de la 
                  chaine du froid.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4 justify-content-end">
          <Col md={7}>
            <Card className="shadow-sm product-card">
              <Card.Body>
                <Card.Title style={{ color: "var(--brand-green)" }}>Les petits plus durables :</Card.Title>
                <Card.Text className="text-start" style={{ color: "var(--brand-text)" }}>
                  Les contenants et les blocs sont consignés, pensez à les rapporter la fois suivante!
                  Les produits sont issus de circuit court, le plus souvent bio et locaux. Ils seront toujours de 
                  saison, selon les disponibilités. 
                  Consommer moins de viande réduit l'impact carbone de notre alimentation, le test des versions 
                  végétariennes des plats est encouragé par une réduction sur le prix !
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="mb-4">
          <Col className="text-center">
            <div className="py-4 px-3">
              <h2 style={{ color: "var(--brand-green)", fontSize: "2.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                Bonne exploration, et bon appétit !
              </h2>
              <p style={{ color: "var(--brand-orange)", fontSize: "1.25rem", fontWeight: "600", marginBottom: "0" }}>
                Laure
              </p>
            </div>
          </Col>
        </Row>
      </>
    );
  }

  function renderOrderPage() {
    if (!isLoaded) {
      return (
        <Row>
          <Col className="text-center">
            <Card className="shadow-sm">
              <Card.Body>
                <p className="text-muted">Chargement en cours...</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      );
    }

    if (!isSignedIn) {
      return (
        <Row>
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <Card.Title>Connexion requise</Card.Title>
                <Card.Text>
                  Vous devez être connecté pour passer commande. Connectez-vous et revenez sur cette page.
                </Card.Text>
                <SignInButton>
                  <Button variant="primary">Se connecter</Button>
                </SignInButton>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      );
    }

    if (!orderPageEnabled) {
      return (
        <Row>
          <Col>
            <Alert variant="info">Vous n'avez pas les droits pour passer commande depuis cette session.</Alert>
          </Col>
        </Row>
      );
    }

    return (
      <>
        <Row className="mb-4">
          <Col>
            <h2 className="h5">Passer commande</h2>
            <p className="text-muted">
              Choisissez vos plats, ajustez les quantités et confirmez votre commande.
            </p>
          </Col>
        </Row>

        <Row>
          <Col>
            <div className="catalog-actions mb-3 d-flex align-items-center justify-content-between gap-3">
              <h2 className="h5 mb-0">Plats disponibles</h2>
              <Button
                type="button"
                variant="primary"
                disabled={saving || loading || orderedTotal === 0}
                onClick={() => void handleOrder()}
              >
                Commander ({orderedTotal})
              </Button>
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
    );
  }

  function renderAdminPage() {
    if (!isLoaded) {
      return (
        <Row>
          <Col className="text-center">
            <Card className="shadow-sm">
              <Card.Body>
                <p className="text-muted">Chargement en cours...</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      );
    }

    if (!isSignedIn) {
      return (
        <Row>
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <Card.Title>Connexion requise</Card.Title>
                <Card.Text>
                  Connectez-vous pour accéder à l'espace d'administration.
                </Card.Text>
                <SignInButton>
                  <Button variant="primary">Se connecter</Button>
                </SignInButton>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      );
    }

    if (!isAdmin) {
      return (
        <Row>
          <Col>
            <Alert variant="danger">Accès refusé. Cette page est réservée aux administrateurs.</Alert>
          </Col>
        </Row>
      );
    }

    return (
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

        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm">
              <Card.Body>
                <Card.Title>Administration</Card.Title>
                <Nav variant="tabs" activeKey={adminView} onSelect={(value) => value && setAdminView(value as "products" | "orders")}> 
                  <Nav.Item>
                    <Nav.Link eventKey="products">Produits</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="orders">Commandes</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {adminView === "products" && (
          <Row className="mb-4">
            <Col>
              <h2 className="h5">Gestion des plats</h2>
              <PlatTable
                plats={plats}
                selectedIds={selectedPlatIds}
                onToggleSelection={(id, checked) => {
                  setSelectedPlatIds((current) =>
                    checked ? [...current, id] : current.filter((item) => item !== id)
                  );
                }}
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
        )}

        {adminView === "orders" && (
          <Row className="mb-4">
            <Col>
              <h2 className="h5">Historique des commandes</h2>
              <AdminOrdersPanel
                orders={orders}
                loading={ordersLoading}
                updatingOrderId={ordersUpdatingId}
                onChangeStatus={handleUpdateOrderStatus}
              />
            </Col>
          </Row>
        )}
      </>
    );
  }

  return (
    <Container className="py-4 catalog-shell app-shell">
      <Row className="mb-3 align-items-center brand-header">
        <Col xs="auto">
          <img src="/assets/logo.png" alt="Saisons Vegetales" className="brand-logo" />
        </Col>
        <Col>
          <h1 className="brand-heading">Saisons Vegetales</h1>
          <p className="text-muted mb-0">
            {!isLoaded 
              ? "Chargement..."
              : isAdmin
              ? "Mode admin"
              : ""}
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

      <Row className="mb-4">
        <Col>
          <Nav variant="pills" className="mb-3">
            <Nav.Item>
              <Nav.Link active={currentRoute === "/"} onClick={() => navigate("/")}>Accueil</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link active={currentRoute === "/commande"} onClick={() => navigate("/commande")}>Commander</Nav.Link>
            </Nav.Item>
            {isAdmin && (
              <Nav.Item>
                <Nav.Link active={currentRoute === "/admin"} onClick={() => navigate("/admin")}>Admin</Nav.Link>
              </Nav.Item>
            )}
          </Nav>
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

      {currentRoute === "/" && renderHomePage()}
      {currentRoute === "/commande" && renderOrderPage()}
      {currentRoute === "/admin" && renderAdminPage()}
    </Container>
  );
}
