import { Alert, Badge, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import type { Plat, PlatInput } from "../types";

type PlatCatalogCardsProps = {
  plats: Plat[];
  loading: boolean;
  saving: boolean;
  editingId: number | null;
  editForm: PlatInput;
  orderQuantities: Record<number, number>;
  canOrder: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEditFormChange: (next: PlatInput) => void;
  onStartEdit: (plat: Plat) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onQuantityChange: (id: number, quantity: number) => void;
};

export function PlatCatalogCards({
  plats,
  loading,
  saving,
  editingId,
  editForm,
  orderQuantities,
  canOrder,
  canEdit,
  canDelete,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onQuantityChange
}: PlatCatalogCardsProps) {
  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <Spinner animation="border" size="sm" />
        <span>Chargement...</span>
      </div>
    );
  }

  if (plats.length === 0) {
    return <Alert variant="info">Aucun plat pour le moment.</Alert>;
  }

  return (
    <Row className="g-3">
      {plats.map((plat) => {
        const isEditing = editingId === plat.id;
        const isUnavailable = plat.stock <= 0;
        const selectedQuantity = orderQuantities[plat.id] ?? 0;

        return (
          <Col key={plat.id} md={6} lg={4}>
            <Card className="h-100 shadow-sm product-card">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <Card.Title className="mb-0">{plat.name}</Card.Title>
                  {isUnavailable ? (
                    <Badge bg="secondary">Epuisé</Badge>
                  ) : (
                    <Badge bg="success">En stock</Badge>
                  )}
                </div>

                <Card.Text className="mb-1 text-muted small">
                  Disponible jusqu'au: {plat.available_until}
                </Card.Text>
                <Card.Text className="mb-2 fw-semibold">{plat.price.toFixed(2)} EUR</Card.Text>
                <Card.Text className="mb-2">{plat.description || "Sans description."}</Card.Text>
                <Card.Text className="mb-2">Allergènes: {plat.allergenes.length > 0 ? plat.allergenes.join(", ") : "Aucun"}</Card.Text>
                <Card.Text className="mb-3">Stock: {plat.stock}</Card.Text>

                {isEditing ? (
                  <div className="d-grid gap-2 mb-3">
                    <Form.Control
                      value={editForm.name}
                      onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
                    />
                    <Form.Control
                      value={editForm.available_until}
                      onChange={(e) => onEditFormChange({ ...editForm, available_until: e.target.value })}
                    />
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => onEditFormChange({ ...editForm, price: e.target.value })}
                    />
                    <Form.Control
                      type="number"
                      value={editForm.stock}
                      onChange={(e) => onEditFormChange({ ...editForm, stock: e.target.value })}
                    />
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="success" onClick={() => onSaveEdit(plat.id)} disabled={saving}>
                        Sauver
                      </Button>
                      <Button size="sm" variant="secondary" onClick={onCancelEdit} disabled={saving}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="d-grid gap-2 mb-3">
                    <Form.Group>
                      <Form.Label className="mb-1">Quantité à commander</Form.Label>
                      <Form.Control
                        type="number"
                        min={0}
                        max={plat.stock}
                        value={selectedQuantity}
                        disabled={isUnavailable || saving || !canOrder}
                        onChange={(e) => onQuantityChange(plat.id, Number(e.target.value))}
                      />
                    </Form.Group>
                    <div className="d-flex gap-2">
                      {canEdit && (
                        <Button size="sm" onClick={() => onStartEdit(plat)} disabled={saving}>
                          Modifier
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => onDelete(plat.id)}
                          disabled={saving}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
