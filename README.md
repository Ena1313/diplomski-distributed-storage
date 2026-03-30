# Distribuirani sustav za skladištenje podataka

Projekt predstavlja implementaciju distribuiranog sustava za pohranu datoteka s web sučeljem.

## Arhitektura

Sustav je organiziran kao:

- centralni backend servis (Node.js + Express)
- više storage node servisa (Docker containeri)
- frontend aplikacija (React)

Centralni backend upravlja:
- uploadom i downloadom datoteka
- segmentacijom i replikacijom
- metapodacima (SQLite baza)
- failover i rebalance logikom

Storage nodeovi:
- rade kao zasebni servisi
- imaju vlastiti izolirani storage
- komuniciraju s backendom putem HTTP-a

## Funkcionalnosti

- upload i download datoteka
- segmentacija datoteka (chunkovi od 1MB)
- replikacija segmenata (2 replike)
- failover (korištenje alternativne replike ako node padne)
- rebalance (ponovno stvaranje replika)
- upravljanje nodeovima (aktivacija/deaktivacija)
- prikaz sustava kroz web UI

---
## Preduvjeti

Za pokretanje projekta potrebno je imati instalirano:

- Docker Desktop: https://www.docker.com/products/docker-desktop/
- Node.js (za pokretanje frontend aplikacije)

Docker se koristi za pokretanje backend servisa i storage nodeova putem docker-compose konfiguracije.

## Pokretanje projekta
### 1. Docker Desktop
Najprije je potrebno pokrenuti Docker Desktop i pričekati da se Docker potpuno pokrene (status "running").

### 2. Backend + nodeovi

Zatim je potrebno ući u backend folder i pokrenuti:
```
cd backend
npm install
docker compose up --build
```

Backend je dostupan na:  
http://localhost:3000  

---

### 3. Frontend

```
cd frontend  
npm install  
npm run dev  
```

Frontend je dostupan na:  
http://localhost:5173  

---

## Testiranje

### Upload i segmentacija

- upload datoteke putem web sučelja
- datoteka se dijeli na segmente (chunkovi od 1MB)
- svaki segment se replicira na 2 različita nodea

---

### Pregled segmenata i replika

- u UI-u je moguće vidjeti:
  - segmente datoteke
  - na kojim nodeovima se nalaze replike
- status datoteke može biti:
  - **Healthy** – sve replike postoje
  - **Degraded** – nedostaje jedna replika
  - **Missing** – segment nema nijednu repliku

---

### Failover (pad nodea)

- ručno se ugasi jedan node (Docker container)
- prilikom download-a:
  - sustav koristi alternativnu repliku
  - datoteka se i dalje uspješno rekonstruira

---

### Simulacija gubitka replika

- moguće je ručno obrisati replike iz storage foldera nodeova
  (npr. `backend/node-data/node-2/<fileId>/chunk-00000.bin`)
- ovisno o stanju:
  - ako postoji barem jedna replika → datoteka je **Degraded**
  - ako ne postoji nijedna replika → datoteka je **Missing**

---

### Rebalance

- pokretanjem rebalance funkcije:
  - sustav ponovno stvara nedostajuće replike
- ponašanje:
  - **Degraded** → rebalance vraća sustav u Healthy stanje
  - **Missing** → rebalance ne može pomoći (nema izvornog podatka)

---

### Upravljanje nodeovima

- moguće je:
  - aktivirati / deaktivirati nodeove
- deaktivirani nodeovi se ne koriste za:
  - spremanje novih segmenata
  - dohvat segmenata

---

## Napomena

Svi nodeovi su pokrenuti lokalno putem Docker containera, ali koriste:

- odvojene procese  
- izolirani storage  
- mrežnu komunikaciju (HTTP)  

Na taj način sustav simulira distribuirano okruženje i omogućuje demonstraciju tolerancije na greške i redistribucije podataka.
