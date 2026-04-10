import { Badge, Button, ButtonGroup, Card } from "react-bootstrap";
import { type DemoRole, roleLabels } from "../auth/roles";

type RoleSwitcherProps = {
  role: DemoRole;
  onRoleChange: (role: DemoRole) => void;
};

const availableRoles: DemoRole[] = ["guest", "user", "admin"];

export function RoleSwitcher({ role, onRoleChange }: RoleSwitcherProps) {
  return (
    <Card className="mb-4 shadow-sm">
      <Card.Body className="d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <div className="text-muted small mb-1">Mode authentification (simulation)</div>
          <div className="d-flex align-items-center gap-2">
            <span>Vue active:</span>
            <Badge bg="dark">{roleLabels[role]}</Badge>
          </div>
        </div>

        <ButtonGroup>
          {availableRoles.map((candidateRole) => (
            <Button
              key={candidateRole}
              variant={role === candidateRole ? "primary" : "outline-primary"}
              onClick={() => onRoleChange(candidateRole)}
            >
              {roleLabels[candidateRole]}
            </Button>
          ))}
        </ButtonGroup>
      </Card.Body>
    </Card>
  );
}
