import { Alert, Badge, Button, Form, Spinner, Table } from "react-bootstrap";
import type { Plat, PlatInput } from "../types";

type PlatTableProps = {
  plats: Plat[];
  loading: boolean;
  saving: boolean;
  editingId: number | null;
  editForm: PlatInput;
  onEditFormChange: (next: PlatInput) => void;
  onStartEdit: (plat: Plat) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: number) => void;
  onDelete: (id: number) => void;
  selectedIds: number[];
  onToggleSelection: (id: number, checked: boolean) => void;
};

export function PlatTable({
  plats,
  loading,
  saving,
  editingId,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  selectedIds,
  onToggleSelection
}: PlatTableProps) {
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
    <Table striped bordered hover responsive>
      <thead>
        <tr>
          <th>Selection</th>
          <th>ID</th>
          <th>Nom</th>
          <th>Disponible jusqu'au</th>
          <th>Description</th>
          <th>Allergènes</th>
          <th>Prix</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {plats.map((plat) => {
          const isEditing = editingId === plat.id;
          const isUnavailable = plat.stock <= 0;
          const isSelected = selectedIds.includes(plat.id);

          return (
            <tr key={plat.id}>
              <td>
                <Form.Check
                  type="checkbox"
                  checked={isSelected}
                  disabled={isUnavailable || saving}
                  onChange={(e) => onToggleSelection(plat.id, e.target.checked)}
                  aria-label={`Selectionner le plat ${plat.name}`}
                />
              </td>
              <td>{plat.id}</td>
              <td>
                {isEditing ? (
                  <Form.Control
                    value={editForm.name}
                    onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
                  />
                ) : (
                  plat.name
                )}
              </td>
              <td>
                {isEditing ? (
                  <Form.Control
                    type="date"
                    value={editForm.available_until}
                    onChange={(e) => onEditFormChange({ ...editForm, available_until: e.target.value })}
                  />
                ) : (
                  plat.available_until
                )}
              </td>
              <td>
                {isEditing ? (
                  <Form.Control
                    value={editForm.description}
                    onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
                  />
                ) : (
                  plat.description || "-"
                )}
              </td>
              <td>
                {isEditing ? (
                  <Form.Control
                    value={editForm.allergenes}
                    onChange={(e) => onEditFormChange({ ...editForm, allergenes: e.target.value })}
                  />
                ) : (
                  plat.allergenes.length > 0 ? plat.allergenes.join(", ") : "Aucun"
                )}
              </td>
              <td>
                {isEditing ? (
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => onEditFormChange({ ...editForm, price: e.target.value })}
                  />
                ) : (
                  plat.price
                )}
              </td>
              <td>
                {isEditing ? (
                  <Form.Control
                    type="number"
                    value={editForm.stock}
                    onChange={(e) => onEditFormChange({ ...editForm, stock: e.target.value })}
                  />
                ) : (
                  <>
                    {plat.stock}
                    {isUnavailable && <Badge bg="secondary" className="ms-2">Epuisé</Badge>}
                  </>
                )}
              </td>
              <td className="d-flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => onSaveEdit(plat.id)}
                      disabled={saving}
                    >
                      Sauver
                    </Button>
                    <Button size="sm" variant="secondary" onClick={onCancelEdit} disabled={saving}>
                      Annuler
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => onStartEdit(plat)} disabled={saving}>
                    Modifier
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline-danger"
                  onClick={() => onDelete(plat.id)}
                  disabled={saving}
                >
                  Supprimer
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
