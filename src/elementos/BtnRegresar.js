import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from "styled-components";
import {ReactComponent as IconoFlecha} from "../img/flecha.svg";

const Btn = styled.button`
    display: block;
    width: 3.12rem; /* 50px */
    height: 3.12rem; /* 50px */
    line-height: 3.12rem; /* 50px */
    text-align: center;
    margin-right: 1.25rem; /* 20px */
    border: none;
    background: #000;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.31rem; /* 5px */
    cursor: pointer;

    &:focus-visible {
        outline: 3px solid #8792F1;
        outline-offset: 2px;
    }
 
    @media(max-width: 60rem){ /* 950px */
        width: 2.5rem; /* 40px */
        height: 2.5rem; /* 40px */
        line-height: 2.5rem; /* 40px */
    }
`;
 
const Icono = styled(IconoFlecha)`
    width: 50%;
    height: auto;
    fill: #fff;
`;

const BtnRegresar = ({ruta = '/'}) => {
    const navigate = useNavigate();
    return ( 
            <Btn type="button" aria-label="Volver" onClick={() => navigate(ruta)}>
                <Icono aria-hidden="true" />
            </Btn>
     );
}
export default BtnRegresar;