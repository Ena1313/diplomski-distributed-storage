# Distribuirani sustav za skladištenje podataka

Projekt predstavlja implementaciju distribuiranog sustava za pohranu datoteka s web sučeljem.

---

## Arhitektura

Sustav je organiziran kao centralno koordinirani distribuirani sustav:

- **backend servis** (Node.js + Express)
- **storage nodeovi** (Docker containeri)
- **frontend aplikacija** (React + MUI)

### Backend

Backend je glavni koordinator sustava i odgovoran je za:

- upload i download datoteka
- segmentaciju datoteka (chunkovi od 1MB)
- izračun checksum-a (SHA-256)
- replikaciju segmenata (2 replike po segmentu)
- failover logiku tijekom dohvaćanja
- rebalance logiku za obnovu replika
- upravljanje nodeovima
- vođenje metapodataka u SQLite bazi

### Storage nodeovi

- rade kao zasebni servisi (Docker containeri)
- imaju vlastiti izolirani storage
- ne donose odluke
- komuniciraju s backendom putem HTTP-a

---

## Funkcionalnosti

- upload i download datoteka
- segmentacija datoteka (chunkovi od 1MB)
- replikacija segmenata (2 replike)
- round-robin raspodjela replika po nodeovima
- failover (korištenje alternativne replike ako node padne)
- rebalance (ponovno stvaranje replika)
- upravljanje nodeovima (aktivacija/deaktivacija)
- prikaz sustava kroz web UI
- health status datoteka (Healthy / Degraded / Missing)

---

## Automatizirani testovi

Za backend su implementirani unit testovi korištenjem Jest frameworka.

Testirani dijelovi sustava:

- pickRoundRobinNodes  
  → raspodjela replika po nodeovima

- calculateFileHealth  
  → ispravan prikaz stanja datoteka (Healthy / Degraded / Missing)

- segmentFileToDisk  
  → segmentacija datoteka i spremanje replika

- rebuildFileToResponse  
  → failover prilikom dohvaćanja segmenata

- rebalanceSingleFile  
  → obnova replika na ispravnim nodeovima

Testovi koriste mockanje baze i node komunikacije kako bi se izolirala logika sustava.

---

## Preduvjeti

Za pokretanje projekta potrebno je imati:

- Docker Desktop  
  https://www.docker.com/products/docker-desktop/
- Node.js (za frontend)

---

## Pokretanje projekta

### 1. Pokrenuti Docker

Pokrenuti Docker Desktop i pričekati da je status running.

---

### 2. Backend + nodeovi

cd backend
docker compose up --build  

Backend:  
http://localhost:3000  

---

### 3. Frontend

cd frontend  
npm install  
npm run dev  

Frontend:  
http://localhost:5173  

---

## Testiranje sustava

### Upload i segmentacija

- upload datoteke putem UI-a
- datoteka se dijeli na segmente (1MB)
- svaki segment se replicira na 2 različita nodea

---

### Pregled replika

- moguće vidjeti:
  - segmente
  - lokacije replika
- status:
  - Healthy
  - Degraded
  - Missing

---

### Failover

- gašenje nodea (Docker stop)
- download koristi alternativnu repliku
- datoteka se uspješno rekonstruira

---

### Rebalance

- ponovno stvaranje replika
- ponašanje:
  - Degraded → vraća u Healthy
  - Missing → nije moguće obnoviti

---

### Upravljanje nodeovima

- aktivacija / deaktivacija nodeova
- neaktivni nodeovi se ne koriste
