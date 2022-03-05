import styled from "styled-components";
import { Link } from "react-router-dom";
const Boton = styled(Link)`
    background: ${(props) => props.primario ? '#5B69E2' : '#000'};
    width: ${(props) => props.conIcono ? '10rem' : '8.8rem'}; /* 250px */
    margin-left: 1rem; /* 20px */
    margin-bottom: 1rem; /* 20px */
    border: none;
    border-radius: 0.625rem; /* 10px */
    color: #fff;
    font-family: 'Work Sans', sans-serif;
    height: 3.75rem; /* 60px */
    padding: 1rem; /* 20px 30px */
    font-size: 1.25rem; /* 20px */
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    justify-content: space-between;
    align-items: center;
    outline: none;
    text-align: center;
 
    svg {
        height: ${(props) => props.iconoGrande ? '100%' : '0.75rem;'};  /* 12px */
        fill: white;
    }

    @media (max-width: 1100px) {
        max-width: ${(props) => props.conIcono ? '11.62rem' : '5rem'}; 
        align-items: center;
        font-size: 1rem;
        padding: 0.3rem 0.49rem;
    }

    @media (max-width: 1280px) {
        max-width: ${(props) => props.conIcono ? '11.62rem' : '6rem'}; 
        align-items: center;
        font-size: 1rem;
        padding: 0.3rem 0.49rem;
    }
`;
export default Boton;