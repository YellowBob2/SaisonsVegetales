import { Button, Col, Form, Row } from "react-bootstrap";
import type { PlatInput } from "../types";

type PlatCreateFormProps = {
  value: PlatInput;
  disabled: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onChange: (next: PlatInput) => void;
};

export function PlatCreateForm({ value, disabled, onSubmit, onChange }: PlatCreateFormProps) {
  return (
    <Form onSubmit={onSubmit}>
      <Row className="g-2">
        <Col md={3}>
          <Form.Control
            placeholder="Nom"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </Col>
        <Col md={3}>
          <Form.Control
            placeholder="Disponible jusqu'au"
            value={value.available_until}
            onChange={(e) => onChange({ ...value, available_until: e.target.value })}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="number"
            step="0.01"
            placeholder="Prix"
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
          />
        </Col>
        <Col md={2}>
          <Form.Control
            type="number"
            placeholder="Stock"
            value={value.stock}
            onChange={(e) => onChange({ ...value, stock: e.target.value })}
          />
        </Col>
        <Col md={2}>
          <Button type="submit" className="w-100" disabled={disabled}>
            Ajouter
          </Button>
        </Col>
      </Row>
    </Form>
  );
}
