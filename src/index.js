import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import WebFont from "webfontloader";
import { Helmet } from "react-helmet";
//Elementos styled components
import Contenedor from "./elementos/Contenedor";
// *********************  COMPONENTES *********************
import InicioSesion from "./components/InicioSesion";
import EditarGasto from "./components/EditarGasto";
import RegistroUsuario from "./components/RegistroUsuarios";
import GastoPorCategoria from "./components/GastosPorCategoria";
import ListaDeGastos from "./components/ListaDeGatos";
import Error404 from "./components/Error404";
import favicon from "./img/logo.png";
import Fondo from "./elementos/Fondo";

import { AuthProvider } from "./contexts/AuthContext";
import { TotalGastadoProvider } from "./contexts/TotalGastadoEnElMesContext";
import RutaPrivada from "./components/RutaPrivada";
//Cargando las fuentes de Google Fonts
WebFont.load({
  google: {
    //Work+Sans:wght@400;500;600;700
    families: ["Work Sans: 400,500,600,700", "sans-serif"],
  },
});

const Index = () => {
  return (
    <>
      <Helmet>
        <link rel="shortcut icon" href={favicon} type="image/x-icon" />
      </Helmet>
      <AuthProvider>
          <TotalGastadoProvider>
        <BrowserRouter>
            <Contenedor>
              <Routes>
                <Route path="*" element={<Error404 />} />
                <Route path="/crear-cuenta" element={<RegistroUsuario />} />
                <Route path="/inicio-sesion" element={<InicioSesion />} />
                
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

                {/* <Route path='/crear-cuenta' element={<RegistroUsuario />} />
                  <Route path='/categorias' element={<GastoPorCategoria />} />
                  <Route path='/lista' element={<ListaDeGastos />} />
                  <Route path='/editar/:id' element={<EditarGasto />} /> */}
              </Routes>
            </Contenedor>
        </BrowserRouter>
        </TotalGastadoProvider>
      </AuthProvider>
      <Fondo />
    </>
  );
};
ReactDOM.render(<Index />, document.getElementById("root"));
