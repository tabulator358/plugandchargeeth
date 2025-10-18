# Deploy Scripts

Tento adresář obsahuje deploy scripty pro Plug and Charge systém.

## Pořadí spuštění

1. **00_deploy_your_contract.ts** - Deploy základních smluv
2. **01_setup_test_data.ts** - Nastavení testovacích dat

## Spuštění

```bash
# Deploy všech smluv
yarn deploy

# Nebo jen základní smlouvy
yarn deploy --tags PlugAndChargeSystem

# Nebo jen testovací data
yarn deploy --tags SetupTestData
```

## Co script 01_setup_test_data.ts vytvoří

### 👥 6 majitelů aut
- Vygeneruje 6 testovacích účtů s private key
- Každý majitel dostane 10,000 USDC
- Adresy jsou uložené pro pozdější použití

### 🚗 40 různých aut
- Různé značky: Tesla, BMW, Mercedes, Audi, Volkswagen, Nissan, Hyundai
- Různé modely pro každou značku
- Každé auto má unikátní chip ID a vehicle hash
- Všechna auta mají ISO 15118 enabled
- Rozdělena mezi 6 majitelů (6-7 aut na majitele)

### 🔌 5 nabíječek v Římě
1. **Vatican City Charger** - 50kW, €0.25/kWh
2. **Colosseum Charger** - 150kW, €0.30/kWh  
3. **Termini Station Charger** - 75kW, €0.28/kWh
4. **Trastevere Charger** - 100kW, €0.32/kWh
5. **EUR District Charger** - 200kW, €0.27/kWh

### ⚡ Aktivní nabíjení
- **3 sessions spuštěné ze strany majitele auta** (owners 1-3)
- **3 sessions spuštěné ze strany nabíječky** (owners 4-6)
- Každá session má 100 USDC deposit
- Všechny majitelé mají nastavené trusted chargers

### 🤝 Trust vztahy
- Každý majitel důvěřuje prvním 3 nabíječkám
- Umožňuje automatické nabíjení bez interakce

## Testovací účty

Po spuštění scriptu dostanete adresy 6 testovacích účtů. Tyto účty můžete použít pro testování UI.

## Lokace nabíječek v Římě

Všechny nabíječky jsou umístěné v Římě s reálnými souřadnicemi:
- Vatican City: (41.9, 12.5)
- Colosseum: (41.8, 12.5) 
- Termini: (42.0, 12.4)
- Trastevere: (41.9, 12.4)
- EUR: (42.0, 12.5)

Tyto lokace jsou ideální pro testování mapových funkcí v UI.
