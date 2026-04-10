import { Alert, Button, Form, Spinner, Table } from "react-bootstrap";
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
  onDelete
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
          <th>ID</th>
          <th>Nom</th>
          <th>Disponible jusqu'au</th>
          <th>Prix</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {plats.map((plat) => {
          const isEditing = editingId === plat.id;

          return (
            <tr key={plat.id}>
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
                  plat.stock
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
