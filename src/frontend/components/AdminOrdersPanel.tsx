import { useMemo, useState } from "react";
import { Badge, Card, Col, Form, Nav, Row, Spinner, Table } from "react-bootstrap";
import type { Order, OrderStatus } from "../types";

const statusLabels: Record<OrderStatus, string> = {
  pending: "Nouveau",
  processing: "En cours",
  confirmed: "Validé",
  canceled: "Annulé"
};

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Nouveau" },
  { value: "processing", label: "En cours" },
  { value: "confirmed", label: "Validé" },
  { value: "canceled", label: "Annulé" }
];

const statusOrder: Record<OrderStatus, number> = {
  pending: 0,
  processing: 1,
  confirmed: 2,
  canceled: 3
};

type SortBy = "date" | "status" | "user";

type AdminOrdersPanelProps = {
  orders: Order[];
  loading: boolean;
  updatingOrderId: number | null;
  onChangeStatus: (orderId: number, status: OrderStatus) => void;
};

export function AdminOrdersPanel({ orders, loading, updatingOrderId, onChangeStatus }: AdminOrdersPanelProps) {
  const [activeTab, setActiveTab] = useState<"current" | "history">("current");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const displayedOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      if (activeTab === "current") {
        return order.status === "pending" || order.status === "processing";
      }
      return order.status === "confirmed" || order.status === "canceled";
    });

    return [...filtered].sort((a, b) => {
      let compare = 0;

      if (sortBy === "date") {
        compare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === "status") {
        compare = statusOrder[a.status] - statusOrder[b.status];
      } else if (sortBy === "user") {
        compare = a.userName.localeCompare(b.userName, undefined, { sensitivity: "base" });
      }

      if (compare === 0) {
        return b.id - a.id;
      }

      return sortDirection === "asc" ? compare : -compare;
    });
  }, [activeTab, orders, sortBy, sortDirection]);

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

  const tabLabel = activeTab === "current" ? "commandes en cours" : "historique";

  if (displayedOrders.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Row className="align-items-center mb-3">
            <Col>
              <Nav variant="tabs" activeKey={activeTab}>
                <Nav.Item>
                  <Nav.Link eventKey="current" onClick={() => setActiveTab("current")}>Commandes en cours</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="history" onClick={() => setActiveTab("history")}>Historique</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
          </Row>
          <p className="mb-0">Aucune {tabLabel} à afficher.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Row className="align-items-center mb-3">
          <Col>
            <Nav variant="tabs" activeKey={activeTab}>
              <Nav.Item>
                <Nav.Link eventKey="current" onClick={() => setActiveTab("current")}>Commandes en cours</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="history" onClick={() => setActiveTab("history")}>Historique</Nav.Link>
              </Nav.Item>
            </Nav>
          </Col>
          <Col xs="auto" className="d-flex gap-2 align-items-center">
            <span className="text-muted">Trier par :</span>
            <Form.Select
              size="sm"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              style={{ minWidth: 140 }}
            >
              <option value="date">Date</option>
              <option value="status">Statut</option>
              <option value="user">Utilisateur</option>
            </Form.Select>
            <Form.Select
              size="sm"
              value={sortDirection}
              onChange={(event) => setSortDirection(event.target.value as "desc" | "asc")}
              style={{ minWidth: 140 }}
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </Form.Select>
          </Col>
        </Row>

        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Client</th>
              <th>Statut</th>
              <th>Articles</th>
            </tr>
          </thead>
          <tbody>
            {displayedOrders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{new Date(order.created_at).toLocaleString()}</td>
                <td>
                  <strong>{order.userName}</strong>
                  <br />
                  <small className="text-muted">{order.userEmail}</small>
                </td>
                <td>
                  <Form.Select
                    size="sm"
                    value={order.status}
                    disabled={updatingOrderId === order.id}
                    onChange={(event) => onChangeStatus(order.id, event.target.value as OrderStatus)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
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
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
