//Puertos de las pruebas E2E. Son distintos de los habituales (8080, 9099) para no chocar con
//otros emuladores de Firebase que ya estén corriendo en la máquina.
module.exports = {
  auth: 9199,
  firestore: 8180,
  hosting: 5050,
  hub: 4600,
  logging: 4700,
};
