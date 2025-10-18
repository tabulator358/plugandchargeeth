# 🚀 Plug and Charge Test Setup Guide

Tento guide ti ukáže, jak nastavit kompletní testovací prostředí pro Plug and Charge systém.

## 📋 Co bude připraveno po deploy

### 👥 **6 majitelů aut**
- Každý majitel dostane **10,000 USDC**
- Vygenerované private key pro import do MetaMask
- Rozděleni do dvou skupin:
  - **Majitelé 1-3**: Sessions spuštěné ze strany majitele
  - **Majitelé 4-6**: Sessions spuštěné ze strany nabíječky

### 🚗 **40 různých vozidel**
- **7 značek**: Tesla, BMW, Mercedes, Audi, Volkswagen, Nissan, Hyundai
- **Různé modely** pro každou značku
- **Unikátní chip ID** pro každé auto
- **ISO 15118 enabled** pro všechna vozidla
- **~6-7 vozidel na majitele**

### 🔌 **5 nabíječek v Římě**
| ID | Název | Výkon | Cena | Lokace |
|----|-------|-------|------|--------|
| 1 | Vatican City Charger | 50kW | €0.25/kWh | (41.9, 12.5) |
| 2 | Colosseum Charger | 150kW | €0.30/kWh | (41.8, 12.5) |
| 3 | Termini Station Charger | 75kW | €0.28/kWh | (42.0, 12.4) |
| 4 | Trastevere Charger | 100kW | €0.32/kWh | (41.9, 12.4) |
| 5 | EUR District Charger | 200kW | €0.27/kWh | (42.0, 12.5) |

### ⚡ **6 aktivních nabíjecích sessions**
- **3 sessions spuštěné majitelem** (owners 1-3)
- **3 sessions spuštěné nabíječkou** (owners 4-6)
- **100 USDC deposit** na každou session
- **Všechny sessions jsou aktivní** a připravené k testování

### 🤝 **Trust vztahy**
- Každý majitel důvěřuje **prvním 3 nabíječkám**
- Umožňuje **automatické nabíjení** bez interakce
- **18 trust vztahů** celkem

## 🚀 Jak spustit

### 1. Spuštění lokální blockchain
```bash
yarn chain
```

### 2. Deploy smluv a testovacích dat
```bash
yarn deploy
```

### 3. Spuštění frontendu
```bash
yarn start
```

## 🔍 Kontrola testovacích dat

### Zobrazení přehledu dat
```bash
yarn test-data
```

### Získání testovacích účtů
```bash
yarn test-accounts
```

## 🔑 Import testovacích účtů do MetaMask

1. Spusť `yarn test-accounts` pro získání private key
2. Otevři MetaMask
3. Klikni na profil → Import Account
4. Vlož private key
5. Přepni na **Localhost 8545** network
6. Opakuj pro všechny 6 účtů

## 🎯 Testovací scénáře

### Scénář 1: Majitel spouští nabíjení
- **Použij účet Owner 1-3**
- Session je už spuštěná ze strany majitele
- Můžeš testovat:
  - Přidání dalšího depositu
  - Ukončení session
  - Disputování nabíjení

### Scénář 2: Nabíječka spouští nabíjení
- **Použij účet Owner 4-6**
- Session je spuštěná ze strany nabíječky
- Můžeš testovat:
  - Trusted charger funkce
  - Automatické pull depositu
  - Nabíječka ukončuje session

### Scénář 3: Mapové funkce
- **Všechny nabíječky jsou v Římě**
- Můžeš testovat:
  - Zobrazení nabíječek na mapě
  - Filtrování podle výkonu/ceny
  - Navigaci k nabíječkám

## 📊 Kontrola stavu

### Kontrola balanců
```bash
yarn test-data
```

### Kontrola sessions
- Přejdi na `/debug` stránku
- Použij PlugAndChargeCore contract
- Zavolej `getSession(1)` až `getSession(6)`

### Kontrola vozidel
- Přejdi na `/driver` stránku
- Přepni mezi testovacími účty
- Měl bys vidět registrovaná vozidla

## 🛠️ Troubleshooting

### Problém: "Not deployed yet"
```bash
# Ujisti se, že jsi spustil deploy
yarn deploy
```

### Problém: "Insufficient funds"
```bash
# Zkontroluj, jestli máš USDC na účtu
yarn test-data
```

### Problém: "Contract not found"
```bash
# Restartuj chain a deploy znovu
yarn chain
# V novém terminálu:
yarn deploy
```

## 📝 Poznámky

- **Všechny adresy jsou deterministické** - stejné při každém deploy
- **Private key jsou vygenerované** - bezpečné pro testování
- **Rome lokace jsou reálné** - ideální pro mapové testy
- **Sessions jsou aktivní** - okamžitě připravené k testování

## 🎉 Hotovo!

Po spuštění `yarn deploy` máš kompletní testovací prostředí s:
- ✅ 6 majiteli aut s USDC
- ✅ 40 registrovanými vozidly  
- ✅ 5 nabíječkami v Římě
- ✅ 6 aktivními sessions
- ✅ Trust vztahy pro automatické nabíjení

Můžeš začít testovat UI a všechny funkce Plug and Charge systému!
