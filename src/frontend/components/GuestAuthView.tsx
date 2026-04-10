import { Button, Card } from "react-bootstrap";

type GuestAuthViewProps = {
  onAuthenticate: () => void;
};

export function GuestAuthView({ onAuthenticate }: GuestAuthViewProps) {
  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title>Acces limite</Card.Title>
        <Card.Text className="text-muted mb-3">
          Vous etes en mode non authentifie. Connectez-vous pour voir les plats et passer commande.
        </Card.Text>
        <Button onClick={onAuthenticate}>S'authentifier (simulation)</Button>
      </Card.Body>
    </Card>
  );
}
