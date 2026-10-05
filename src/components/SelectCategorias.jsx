import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import theme from '../theme';
import IconoCategoria from '../elementos/IconoCategoria';
import CATEGORIAS from '../functions/categorias';

import { ReactComponent as IconoDown } from '../img/down.svg';
// Estilos
const ContenedorSelect = styled.div`
    position: relative;
    width: 40%;
`;

//El disparador es un <button> real: se enfoca con teclado y lo anuncian los lectores de pantalla
const Disparador = styled.button`
    background: ${theme.grisClaro};
    border: none;
    cursor: pointer;
    border-radius: 0.625rem; /* 10px */
    height: 5rem; /* 80px */
    width: 100%;
    padding: 0px 1.25rem; /* 20px */
    font-family: inherit;
    font-size: 1.5rem; /* 24px */
    text-align: center;
    display: flex;
    align-items: center;
    transition: background-color .5s ease;
    &:hover {
        background: ${theme.grisClaro2};
    }
    &:focus-visible {
        outline: 3px solid ${theme.colorPrimario};
        outline-offset: 2px;
    }
`;

const OpcionSeleccionada = styled.span`
    width: 100%;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: space-between;
    svg {
        width: 1.25rem; /* 20px */
        height: auto;
        margin-left: 1.25rem; /* 20px */
    }
`;

const Opciones = styled.div`
    background: ${theme.grisClaro};
    position: absolute;
    top: 5.62rem; /* 90px */
    left: 0;
    width: 100%;
    border-radius: 0.625rem; /* 10px */
    max-height: 18.75rem; /* 300px */
    overflow-y: auto;
    overscroll-behavior: contain;
    z-index: 10;
`;

const Opcion = styled.button`
    background: transparent;
    border: none;
    width: 100%;
    font-family: inherit;
    font-size: 1.5rem; /* 24px */
    text-align: left;
    cursor: pointer;
    padding: 1.25rem; /* 20px */
    display: flex;
    align-items: center;
    svg {
        width: 28px;
        height: auto;
        margin-right: 1.25rem; /* 20px */
    }
    &:hover,
    &[aria-selected="true"] {
        background: ${theme.grisClaro2};
    }
    &:focus-visible {
        outline: 3px solid ${theme.colorPrimario};
        outline-offset: -3px;
    }
`;

const SelectCategoria = ({ categoria, setCategoria }) => {
    const [mostrarSelect, setMostrarSelect] = useState(false);
    const contenedorRef = useRef(null);
    const disparadorRef = useRef(null);

    //Cierra la lista al hacer clic fuera del selector
    useEffect(() => {
        if (!mostrarSelect) return;
        const alHacerClic = (e) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
                setMostrarSelect(false);
            }
        };
        document.addEventListener('mousedown', alHacerClic);
        return () => document.removeEventListener('mousedown', alHacerClic);
    }, [mostrarSelect]);

    //Escape cierra la lista y devuelve el foco al disparador
    const alPresionarTecla = (e) => {
        if (e.key === 'Escape' && mostrarSelect) {
            setMostrarSelect(false);
            disparadorRef.current.focus();
        }
    };

    const seleccionar = (id) => {
        setCategoria(id);
        setMostrarSelect(false);
        disparadorRef.current.focus();
    };

    return (
        <ContenedorSelect ref={contenedorRef} onKeyDown={alPresionarTecla}>
            <Disparador
                type="button"
                ref={disparadorRef}
                aria-haspopup="listbox"
                aria-expanded={mostrarSelect}
                aria-label={`Categoría: ${categoria}`}
                onClick={() => setMostrarSelect(!mostrarSelect)}
            >
                <OpcionSeleccionada>
                    {categoria} <IconoDown aria-hidden="true" />
                </OpcionSeleccionada>
            </Disparador>
            {mostrarSelect && (
                <Opciones role="listbox" aria-label="Categorías">
                    {CATEGORIAS.map((cat) => (
                        <Opcion
                            key={cat.id}
                            type="button"
                            role="option"
                            aria-selected={cat.id === categoria}
                            onClick={() => seleccionar(cat.id)}
                        >
                            <IconoCategoria id={cat.id} />
                            {cat.texto}
                        </Opcion>
                    ))}
                </Opciones>
            )}
        </ContenedorSelect>
    );
}

export default SelectCategoria;
