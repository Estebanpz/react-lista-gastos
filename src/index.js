import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import WebFont from "webfontloader";
//Elementos styled components
// *********************  COMPONENTES *********************
import PaginaAuth from "./components/auth/PaginaAuth";
import Error404 from "./components/Error404";
import AppShell from "./components/app/AppShell";
import PaginaInicio from "./components/paginas/PaginaInicio";
import { CategoriasProvider } from "./contexts/CategoriasContext";
import { RecurrentesProvider } from "./contexts/RecurrentesContext";
import { ClienteProvider } from "./contexts/ClienteContext";
import EstadoConexion from "./components/EstadoConexion";
import AvisoActualizacion from "./components/AvisoActualizacion";
import { registrarServiceWorker } from "./pwa/registroServiceWorker";
import "./pwa/instalacion"; //debe cargarse al arrancar para no perder el evento de instalación

import { AuthProvider } from "./contexts/AuthContext";
import RutaPrivada from "./components/RutaPrivada";
import RutaDeCliente from "./components/RutaDeCliente";

//Las pantallas secundarias se cargan solo cuando se visitan (menor bundle inicial)
const PaginaEditar = lazy(() => import("./components/paginas/PaginaEditar"));
const PaginaCategorias = lazy(() => import("./components/paginas/PaginaCategorias"));
const PaginaLista = lazy(() => import("./components/paginas/PaginaLista"));
const PaginaRecurrentes = lazy(() => import("./components/paginas/PaginaRecurrentes"));
const PaginaAdmin = lazy(() => import("./components/paginas/PaginaAdmin"));
const PaginaPlan = lazy(() => import("./components/paginas/PaginaPlan"));
//Cargando las fuentes de Google Fonts
WebFont.load({
  google: {
    //Work+Sans:wght@400;500;600;700;800
    families: ["Work Sans: 400,500,600,700,800", "sans-serif"],
  },
});

const Index = () => {
  return (
    <>
      <AuthProvider>
          <ClienteProvider>
          <CategoriasProvider>
          <RecurrentesProvider>
          <BrowserRouter>
            <Suspense fallback={<p role="status" style={{ textAlign: "center" }}>Cargando…</p>}>
              <Routes>
                <Route path="/inicio-sesion" element={<PaginaAuth />} />
                {/* Ya no hay registro abierto (acceso por invitación): el enlace viejo lleva al inicio de sesión */}
                <Route path="/crear-cuenta" element={<Navigate to="/inicio-sesion" replace />} />

                <Route element={<RutaPrivada><AppShell /></RutaPrivada>}>
                  <Route path="/" element={<RutaDeCliente><PaginaInicio /></RutaDeCliente>} />
                  <Route path="/lista" element={<RutaDeCliente><PaginaLista /></RutaDeCliente>} />
                  <Route path="/categorias" element={<RutaDeCliente><PaginaCategorias /></RutaDeCliente>} />
                  <Route path="/recurrentes" element={<RutaDeCliente><PaginaRecurrentes /></RutaDeCliente>} />
                  <Route path="/plan" element={<RutaDeCliente><PaginaPlan /></RutaDeCliente>} />
                  <Route path="/admin" element={<PaginaAdmin />} />
                  <Route path="/editar-gasto/:id" element={<RutaDeCliente><PaginaEditar /></RutaDeCliente>} />
                  <Route path="*" element={<Error404 />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          </RecurrentesProvider>
          </CategoriasProvider>
          </ClienteProvider>
      </AuthProvider>
      <EstadoConexion />
      <AvisoActualizacion />
    </>
  );
};
ReactDOM.render(<Index />, document.getElementById("root"));

//Versión visible para diagnóstico y pruebas (se define al compilar con REACT_APP_VERSION)
window.__versionApp = process.env.REACT_APP_VERSION || "dev";

//Service worker: solo se registra en el build de producción
registrarServiceWorker();
