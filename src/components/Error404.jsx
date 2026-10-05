import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Error404 = () => {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Helmet>
                <title>Página no encontrada</title>
            </Helmet>
            <h1>Página no encontrada</h1>
            <p style={{ margin: '1rem 0' }}>La dirección que abriste no existe.</p>
            <Link to="/">Volver al inicio</Link>
        </div>
    );
}

export default Error404;
