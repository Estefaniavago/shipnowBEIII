// Se ejecuta ANTES que cualquier test: fuerza el entorno de testing.
// Así la app lee .env.test (y no .env) sin depender de cómo se ejecute el comando
// (funciona igual en Windows, Linux y macOS).
process.env.NODE_ENV = 'test';
