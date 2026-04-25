import { Badge, Button, Card, Spinner, Table } from "react-bootstrap";
import type { Order, OrderStatus } from "../types";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Nouveau",
  processing: "En cours",
  confirmed: "Validé",
  canceled: "Annulé"
};

const statusActions: Array<{ status: OrderStatus; label: string; variant: string }> = [
  { status: "processing", label: "En cours", variant: "warning" },
  { status: "confirmed", label: "Validé", variant: "success" },
  { status: "canceled", label: "Annulé", variant: "danger" }
];

type AdminOrdersPanelProps = {
  orders: Order[];
  loading: boolean;
  updatingOrderId: number | null;
  onChangeStatus: (orderId: number, status: OrderStatus) => void;
};

export function AdminOrdersPanel({ orders, loading, updatingOrderId, onChangeStatus }: AdminOrdersPanelProps) {
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center">
          <Spinner animation="border" />
          <p className="mt-3 mb-0">Chargement des commandes...</p>
        </Card.Body>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <p className="mb-0">Aucune commande récente à afficher.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Client</th>
              <th>Statut</th>
              <th>Articles</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
                <td>
                  <strong>{order.userName}</strong>
                  <br />
                  <small className="text-muted">{order.userEmail}</small>
                </td>
                <td>
                  <Badge bg={
                    order.status === "confirmed"
                      ? "success"
                      : order.status === "canceled"
                      ? "danger"
                      : order.status === "processing"
                      ? "warning"
                      : "secondary"
                  }>
                    {statusLabels[order.status]}
                  </Badge>
                </td>
                <td>
                  {order.items.length > 0 ? (
                    <ul className="mb-0 ps-3">
                      {order.items.map((item) => (
                        <li key={`${order.id}-${item.platId}`}>
                          {item.name} x{item.quantity}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted">Aucun article</span>
                  )}
                </td>
                <td className="d-flex flex-column gap-2">
                  {statusActions.map((action) => (
                    <Button
                      key={action.status}
                      size="sm"
                      variant={action.variant}
                      disabled={updatingOrderId === order.id || order.status === action.status}
                      onClick={() => onChangeStatus(order.id, action.status)}
                    >
                      {action.label}
                    </Button>
                  ))}
                  {updatingOrderId === order.id && (
                    <span className="text-muted small">Mise à jour en cours...</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
