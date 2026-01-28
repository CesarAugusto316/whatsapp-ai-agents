import { headers as getHeaders } from "next/headers.js";
import logo from "../../assets/nexoti_2.png";
import { getPayload } from "payload";
import React from "react";
import config from "@/payload.config";
import "./styles.css";

export default async function HomePage() {
  const headers = await getHeaders();
  const payloadConfig = await config;
  const payload = await getPayload({ config: payloadConfig });
  const { user } = await payload.auth({ headers });
  const userData = user?.collection === "users" ? user : undefined;
  // const fileURL = `vscode://file/${fileURLToPath(import.meta.url)}`;

  return (
    <div className="home">
      <div className="content">
        <picture>
          <img
            style={{
              width: 200,
              height: "auto",
              display: "block",
            }}
            src={logo.src}
            alt="Nexoti Logo"
          />
        </picture>
        {!user && <h1>Welcome to your new project.</h1>}
        {user && <h1>Bienvenido, {userData?.name || userData?.email}</h1>}
        <div className="links">
          <a
            className="admin"
            href={payloadConfig.routes.admin}
            rel="noopener noreferrer"
          >
            Go to admin panel
          </a>
          {userData?.role === "admin" && (
            <a
              className="docs"
              href="https://payloadcms.com/docs"
              rel="noopener noreferrer"
              target="_blank"
            >
              Documentation
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
