import { serve } from "bun";
import index from "./index.html";
import {
  createplat,
  deleteplat,
  getAllplats,
  seedExampleplats,
  updateplatStock
} from "./backend/database";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" }
  });
}

const server = serve({
    port: 3000,
    routes: {
        "/": index,
        "/api/plats": async (req) => {
            if (req.method === "GET") {
                return jsonResponse({ plats: getAllplats() });
            }

            if (req.method === "POST") {
                const body = await req.json().catch(() => null);

                if (!body) {
                    return jsonResponse({ error: "JSON body is required" }, 400);
                }

                const { name, available_until, price, stock } = body as {
                    name?: string;
                    available_until?: string;
                    price?: number;
                    stock?: number;
                };

                if (!name || !available_until || typeof price !== "number" || typeof stock !== "number") {
                    return jsonResponse(
                        { error: "name, available_until, price (number), stock (number) are required" },
                        400
                    );
                }

                const created = createplat({ name, available_until, price, stock });
                return jsonResponse({ plat: created }, 201);
            }

            if (req.method === "PATCH") {
                const url = new URL(req.url);
                const id = Number(url.searchParams.get("id"));
                const body = await req.json().catch(() => null);
                const newStock = body?.stock;

                if (!Number.isInteger(id) || typeof newStock !== "number") {
                    return jsonResponse({ error: "id query param and stock number are required" }, 400);
                }

                const updated = updateplatStock(id, newStock);

                if (!updated) {
                    return jsonResponse({ error: "plat not found" }, 404);
                }

                return jsonResponse({ plat: updated });
            }

            if (req.method === "DELETE") {
                const url = new URL(req.url);
                const id = Number(url.searchParams.get("id"));

                if (!Number.isInteger(id)) {
                    return jsonResponse({ error: "id query param is required" }, 400);
                }

                const deleted = deleteplat(id);

                if (!deleted) {
                    return jsonResponse({ error: "plat not found" }, 404);
                }

                return jsonResponse({ deleted: true });
            }

            return jsonResponse({ error: "Method not allowed" }, 405);
        },
        "/api/plats/seed": (req) => {
            if (req.method !== "POST") {
                return jsonResponse({ error: "Method not allowed" }, 405);
            }

            return jsonResponse(seedExampleplats());
        }
    }
});

console.log(`Server running at ${server.url}`);