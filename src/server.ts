import { serve } from "bun";
import index from "./frontend/index.html";
import path from "path";
import { isUserAuthenticated } from "./backend/authentification";
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

const port = Number(process.env.PORT ?? 3000);
const frontendDir = path.join(import.meta.dir, "frontend");

const server = serve({
    port,
    async fetch(req) {
        const url = new URL(req.url);

        const userAuthenticated = isUserAuthenticated(req);
        
        if (url.pathname === "/index.tsx") {
            const transpiled = await Bun.build({
                entrypoints: [path.join(frontendDir, "index.tsx")],
            });

            if (!transpiled.outputs || transpiled.outputs.length === 0) {
                return new Response("Build failed", { status: 500 });
            }

            const firstOutput = transpiled.outputs[0];
            if (!firstOutput) {
              return new Response("Build failed", { status: 500 });
            }

            const output = await firstOutput.text();
            return new Response(output, {
                headers: { "content-type": "text/javascript" }
            });
        }

        const htmlTemplate = await Bun.file(path.join(frontendDir, "index.html")).text();
        const runtimeConfigScript = `<script></script>`;
        const html = htmlTemplate.replace("</head>", `${runtimeConfigScript}</head>`);
        return new Response(html, {
        headers: { "Content-Type": "text/html" },
        });
    }

    // routes: {
    //     "/": index,
    //     "/api/plats": async (req) => {
    //         if (req.method === "GET") {
    //             return jsonResponse({ plats: getAllplats() });
    //         }

    //         if (req.method === "POST") {
    //             const body = await req.json().catch(() => null);

    //             if (!body) {
    //                 return jsonResponse({ error: "JSON body is required" }, 400);
    //             }

    //             const { name, available_until, price, stock } = body as {
    //                 name?: string;
    //                 available_until?: string;
    //                 price?: number;
    //                 stock?: number;
    //             };

    //             if (!name || !available_until || typeof price !== "number" || typeof stock !== "number") {
    //                 return jsonResponse(
    //                     { error: "name, available_until, price (number), stock (number) are required" },
    //                     400
    //                 );
    //             }

    //             const created = createplat({ name, available_until, price, stock });
    //             return jsonResponse({ plat: created }, 201);
    //         }

    //         if (req.method === "PATCH") {
    //             const url = new URL(req.url);
    //             const id = Number(url.searchParams.get("id"));
    //             const body = await req.json().catch(() => null);
    //             const newStock = body?.stock;

    //             if (!Number.isInteger(id) || typeof newStock !== "number") {
    //                 return jsonResponse({ error: "id query param and stock number are required" }, 400);
    //             }

    //             const updated = updateplatStock(id, newStock);

    //             if (!updated) {
    //                 return jsonResponse({ error: "plat not found" }, 404);
    //             }

    //             return jsonResponse({ plat: updated });
    //         }

    //         if (req.method === "DELETE") {
    //             const url = new URL(req.url);
    //             const id = Number(url.searchParams.get("id"));

    //             if (!Number.isInteger(id)) {
    //                 return jsonResponse({ error: "id query param is required" }, 400);
    //             }

    //             const deleted = deleteplat(id);

    //             if (!deleted) {
    //                 return jsonResponse({ error: "plat not found" }, 404);
    //             }

    //             return jsonResponse({ deleted: true });
    //         }

    //         return jsonResponse({ error: "Method not allowed" }, 405);
    //     },
    //     "/api/plats/seed": (req) => {
    //         if (req.method !== "POST") {
    //             return jsonResponse({ error: "Method not allowed" }, 405);
    //         }

    //         return jsonResponse(seedExampleplats());
    //     }
    // }
});

console.log(`Server running at ${server.url}`);