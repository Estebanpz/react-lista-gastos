import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import theme from "../../theme";
import Hoja from "../Hoja";
import Insignia from "./Insignia";
import IconoCat, { EXTRAS } from "./iconos";
import COLORES from "../../functions/paleta";
import { useCategorias } from "../../contexts/CategoriasContext";
import { crearCategoria, actualizarCategoria } from "../../firebase/categorias";
import { IconoCheck } from "../iconos";
import { Espera, BotonPrincipal, MensajeError } from "../auth/elementos";

const NOMBRES_ICONO = {
  megafono: "Megáfono", caja: "Caja", camion: "Camión", maletin: "Maletín", billete: "Billete", tienda: "Tienda",
  llave: "Llave inglesa", taza: "Taza", flechas: "Flechas", avion: "Avión", pata: "Huella", formas: "Formas",
};
const NOMBRES_COLOR = { indigo: "Índigo", verde: "Verde", naranja: "Naranja", azul: "Azul", rosa: "Rosa", violeta: "Violeta", turquesa: "Turquesa", coral: "Coral" };

const Formulario = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const Etiqueta = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${theme.tintaSuave};
`;

const Entrada = styled.input`
  width: 100%;
  min-height: 3.25rem;
  padding: 0 1.1rem;
  border: 1px solid ${(p) => (p.$error ? theme.rojo : theme.bordeCampo)};
  border-radius: 999px;
  background: ${theme.campo};
  font: inherit;
  font-size: ${theme.letraCampo};
  color: ${theme.tinta};
  caret-color: ${theme.colorPrimario};

  &::placeholder {
    color: ${theme.placeholder};
    opacity: 1;
  }

  &:focus-visible {
    outline: 0;
    background: #fff;
    border-color: ${theme.colorPrimario};
    box-shadow: 0 0 0 3px rgba(91, 105, 226, 0.22);
  }
`;

const Ayuda = styled.p`
  margin-top: 0.35rem;
  padding-left: 0.4rem;
  font-size: 0.8125rem;
  color: ${(p) => (p.$error ? "#B42323" : theme.tintaSuave)};
`;

const Rejilla = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.5rem;
`;

const BotonIcono = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-height: 2.75rem;
  border: 2px solid ${(p) => (p.$marcado ? theme.colorPrimario : theme.borde)};
  border-radius: 0.875rem;
  background: ${(p) => (p.$marcado ? theme.violetaSuave : "#fff")};
  color: ${(p) => (p.$marcado ? "#3e4bc7" : theme.tintaSuave)};
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  touch-action: manipulation;

  &:active {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:active { transform: none; }
  }
`;

const Colores = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.4rem;
`;

const Muestra = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  min-height: 2.5rem;
  border: 3px solid ${(p) => (p.$marcado ? theme.tinta : "transparent")};
  border-radius: 50%;
  background: ${(p) => p.$color};
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 3px;
  }
`;

const Vista = styled.div`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 1rem;
  border: 1px dashed ${theme.bordeCampo};
  border-radius: 1rem;
  background: ${theme.campo};

  strong {
    display: block;
    font-size: 1rem;
    color: ${theme.tinta};
    overflow-wrap: anywhere;
  }

  span {
    font-size: 0.8125rem;
    color: ${theme.tintaSuave};
  }
`;

const Acciones = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 0.75rem;
`;

const Secundario = styled.button`
  min-height: 3.5rem;
  border: 0;
  border-radius: 999px;
  background: ${theme.campo};
  font: inherit;
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.tinta};
  cursor: pointer;

  &:hover {
    background: #e8ecf0;
  }

  &:focus-visible {
    outline: 3px solid ${theme.colorPrimario};
    outline-offset: 2px;
  }
`;

//Hoja para crear (o editar) una categoría propia: nombre, icono y color, con vista previa en vivo.
const CrearCategoria = ({ abierta, alCerrar, categoria, alGuardar }) => {
  const { categorias } = useCategorias();
  const editando = Boolean(categoria);
  const [nombre, cambiarNombre] = useState("");
  const [icono, cambiarIcono] = useState(EXTRAS[0]);
  const [color, cambiarColor] = useState("indigo");
  const [error, cambiarError] = useState("");
  const [enviando, cambiarEnviando] = useState(false);
  const refNombre = useRef(null);

  //Cada vez que se abre se parte de cero (o de la categoría que se edita)
  useEffect(() => {
    if (!abierta) return;
    cambiarNombre(categoria ? categoria.texto : "");
    cambiarIcono(categoria ? categoria.icono : EXTRAS[0]);
    cambiarColor(categoria ? categoria.color : "indigo");
    cambiarError("");
    cambiarEnviando(false);
  }, [abierta, categoria]);

  const guardar = async (e) => {
    e.preventDefault();
    if (enviando) return;
    const limpio = nombre.trim();
    if (!limpio) { cambiarError("Escribe un nombre para la categoría."); refNombre.current.focus(); return; }
    const repetida = categorias.some((c) => c.texto.toLowerCase() === limpio.toLowerCase() && (!editando || c.id !== categoria.id));
    if (repetida) { cambiarError("Ya existe una categoría con ese nombre."); refNombre.current.focus(); return; }

    cambiarError("");
    cambiarEnviando(true);
    try {
      if (editando) {
        await actualizarCategoria(categoria.id, { nombre: limpio, icono, color });
        alGuardar && alGuardar({ ...categoria, texto: limpio, icono, color });
      } else {
        const { id } = await crearCategoria({ nombre: limpio, icono, color });
        alGuardar && alGuardar({ id, texto: limpio, icono, color, propia: true });
      }
      alCerrar();
    } catch (err) {
      console.log(err);
      cambiarEnviando(false);
      cambiarError("No se pudo guardar la categoría. Inténtalo de nuevo.");
    }
  };

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo={editando ? "Editar categoría" : "Crear categoría"} subtitulo="Personaliza cómo agrupas tus gastos">
      <Formulario onSubmit={guardar} noValidate>
        <Vista aria-live="polite">
          <Insignia categoria={{ icono, color }} tam={3} />
          <div>
            <strong>{nombre.trim() || "Nombre de la categoría"}</strong>
            <span>Así se verá en tus gastos</span>
          </div>
        </Vista>

        <div>
          <Etiqueta htmlFor="categoria-nombre">Nombre</Etiqueta>
          <Entrada id="categoria-nombre" name="nombre" ref={refNombre} value={nombre} maxLength={30} autoComplete="off" placeholder="Ej.: Publicidad…" $error={Boolean(error)}
            aria-invalid={error ? "true" : undefined} aria-describedby="categoria-ayuda" onChange={(e) => { cambiarNombre(e.target.value); cambiarError(""); }} />
          <Ayuda id="categoria-ayuda" $error={Boolean(error)} role={error ? "alert" : undefined}>
            {error || "Usa un nombre corto y reconocible."}
          </Ayuda>
        </div>

        <div>
          <Etiqueta as="span" id="categoria-icono">Icono</Etiqueta>
          <Rejilla role="radiogroup" aria-labelledby="categoria-icono">
            {EXTRAS.map((clave) => (
              <BotonIcono key={clave} type="button" role="radio" aria-checked={icono === clave} aria-label={NOMBRES_ICONO[clave]} $marcado={icono === clave} onClick={() => cambiarIcono(clave)}>
                <IconoCat clave={clave} tam={22} />
              </BotonIcono>
            ))}
          </Rejilla>
        </div>

        <div>
          <Etiqueta as="span" id="categoria-color">Color</Etiqueta>
          <Colores role="radiogroup" aria-labelledby="categoria-color">
            {COLORES.map((c) => (
              <Muestra key={c.id} type="button" role="radio" aria-checked={color === c.id} aria-label={NOMBRES_COLOR[c.id]} $color={c.base} $marcado={color === c.id} onClick={() => cambiarColor(c.id)}>
                {color === c.id && <IconoCheck tam={16} />}
              </Muestra>
            ))}
          </Colores>
        </div>

        {error && !error.includes("nombre") && <MensajeError role="alert">{error}</MensajeError>}

        <Acciones>
          <Secundario type="button" onClick={alCerrar}>Cancelar</Secundario>
          <BotonPrincipal type="submit" aria-busy={enviando} style={{ marginTop: 0 }}>
            {enviando ? <><Espera aria-hidden="true" /> Guardando…</> : <><IconoCheck tam={18} /> {editando ? "Guardar cambios" : "Crear categoría"}</>}
          </BotonPrincipal>
        </Acciones>
      </Formulario>
    </Hoja>
  );
};

export default CrearCategoria;
