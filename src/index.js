import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import WebFont from "webfontloader";
//Elementos styled components
import Contenedor from "./elementos/Contenedor";
// *********************  COMPONENTES *********************
import PaginaAuth from "./components/auth/PaginaAuth";
import Error404 from "./components/Error404";
import Fondo from "./elementos/Fondo";
import EstadoConexion from "./components/EstadoConexion";
import AvisoActualizacion from "./components/AvisoActualizacion";
import { registrarServiceWorker } from "./pwa/registroServiceWorker";
import "./pwa/instalacion"; //debe cargarse al arrancar para no perder el evento de instalación

import { AuthProvider } from "./contexts/AuthContext";
import { TotalGastadoProvider } from "./contexts/TotalGastadoEnElMesContext";
import RutaPrivada from "./components/RutaPrivada";

//Las pantallas secundarias se cargan solo cuando se visitan (menor bundle inicial)
const EditarGasto = lazy(() => import("./components/EditarGasto"));
const GastoPorCategoria = lazy(() => import("./components/GastosPorCategoria"));
const ListaDeGastos = lazy(() => import("./components/ListaDeGatos"));
//Cargando las fuentes de Google Fonts
WebFont.load({
  google: {
    //Work+Sans:wght@400;500;600;700;800
    families: ["Work Sans: 400,500,600,700,800", "sans-serif"],
  },
});

//Las pantallas de la app (gastos, lista, categorías) van dentro de la tarjeta blanca.
//El acceso (iniciar sesión / crear cuenta) ocupa toda la ventana y no usa este contenedor.
const DisenoApp = () => (
  <Contenedor>
    <Outlet />
  </Contenedor>
);

const Index = () => {
  return (
    <>
      <AuthProvider>
        <TotalGastadoProvider>
          <BrowserRouter>
            <Suspense fallback={<p role="status" style={{ textAlign: "center" }}>Cargando…</p>}>
              <Routes>
                <Route path="/inicio-sesion" element={<PaginaAuth />} />
                <Route path="/crear-cuenta" element={<PaginaAuth />} />

                <Route element={<DisenoApp />}>
                  <Route path="*" element={<Error404 />} />

                  <Route
                    path="/"
                    element={
                      <RutaPrivada>
                        <App />
                      </RutaPrivada>
                    }
                  />

                  <Route
                    path="/categorias"
                    element={
                      <RutaPrivada>
                        <GastoPorCategoria />
                      </RutaPrivada>
                    }
                  />

                  <Route
                    path="/lista"
                    element={
                      <RutaPrivada>
                        <ListaDeGastos />
                      </RutaPrivada>
                    }
                  />

                  <Route
                    path="/editar-gasto/:id"
                    element={
                      <RutaPrivada>
                        <EditarGasto />
                      </RutaPrivada>
                    }
                  />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TotalGastadoProvider>
      </AuthProvider>
      <EstadoConexion />
      <AvisoActualizacion />
      <Fondo />
    </>
  );
};
ReactDOM.render(<Index />, document.getElementById("root"));

//Versión visible para diagnóstico y pruebas (se define al compilar con REACT_APP_VERSION)
window.__versionApp = process.env.REACT_APP_VERSION || "dev";

//Service worker: solo se registra en el build de producción
registrarServiceWorker();
