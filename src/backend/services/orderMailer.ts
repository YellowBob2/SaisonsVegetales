import { Resend } from "resend";
import type { OrderedPlatItem } from "../plats.repository";

const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildOrderText(
  userName: string,
  orderedItems: OrderedPlatItem[],
  unavailableIds: number[],
  notFoundIds: number[]
): string {
  const lines = [`Bonjour ${userName},`, "", "Merci pour votre commande chez Saisons Végétales.", ""]; 

  if (orderedItems.length > 0) {
    lines.push("Articles commandés :");
    for (const item of orderedItems) {
      lines.push(`- ${item.name} x${item.orderedQuantity}`);
    }
    lines.push("");
  }

  if (unavailableIds.length > 0) {
    lines.push(`Les articles avec les identifiants suivants ne sont pas disponibles : ${unavailableIds.join(", ")}.`);
  }

  if (notFoundIds.length > 0) {
    lines.push(`Les articles avec les identifiants suivants n'ont pas été trouvés : ${notFoundIds.join(", ")}.`);
  }

  lines.push("", "Nous vous contacterons si nécessaire.", "", "Cordialement,", "L'équipe Saisons Végétales");
  return lines.join("\n");
}

function buildOrderHtml(
  userName: string,
  orderedItems: OrderedPlatItem[],
  unavailableIds: number[],
  notFoundIds: number[]
): string {
  const safeName = escapeHtml(userName);
  const orderedLines = orderedItems
    .map(
      (item) =>
        `<li><strong>${escapeHtml(item.name)}</strong> — quantité : ${item.orderedQuantity}</li>`
    )
    .join("");

  const unavailableSection = unavailableIds.length
    ? `<p>Les articles suivants ne sont pas disponibles : ${escapeHtml(unavailableIds.join(", "))}.</p>`
    : "";

  const notFoundSection = notFoundIds.length
    ? `<p>Les articles suivants n'ont pas été trouvés : ${escapeHtml(notFoundIds.join(", "))}.</p>`
    : "";

  return `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
      <h1>Merci ${safeName} !</h1>
      <p>Votre commande a bien été enregistrée pour Saisons Végétales.</p>
      ${orderedItems.length > 0 ? `<p>Voici le détail de votre commande :</p><ul>${orderedLines}</ul>` : "<p>Aucun article n'a été commandé.</p>"}
      ${unavailableSection}
      ${notFoundSection}
      <p>Nous vous contacterons si nécessaire.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280;">Saisons Végétales</p>
    </div>
  `;
}

async function createResendClient(): Promise<Resend> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("La variable d'environnement RESEND_API_KEY n'est pas configurée.");
  }

  return new Resend(apiKey);
}

export async function sendOrderConfirmationEmail(params: {
  userEmail: string;
  userName: string;
  orderedItems: OrderedPlatItem[];
  unavailableIds: number[];
  notFoundIds: number[];
}): Promise<void> {
  const { userEmail, userName, orderedItems, unavailableIds, notFoundIds } = params;

  if (!userEmail) {
    throw new Error("Impossible d'envoyer l'email sans adresse du destinataire.");
  }

  const subject = `Confirmation de commande – Saisons Végétales`;
  const text = buildOrderText(userName, orderedItems, unavailableIds, notFoundIds);
  const html = buildOrderHtml(userName, orderedItems, unavailableIds, notFoundIds);

  const resend = await createResendClient();
  await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject,
    text,
    html
  });
}
