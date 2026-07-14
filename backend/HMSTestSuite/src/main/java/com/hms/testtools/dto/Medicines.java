package com.hms.testtools.dto;

public enum Medicines {
    PARACETAMOL("Paracetamol", "500mg", MedicineCategory.ANTIPYRETICS, MedicineType.TABLET),
    AMOXICILLIN("Amoxicillin", "250mg", MedicineCategory.ANTIBIOTICS, MedicineType.CAPSULE),
    OMEPRAZOLE("Omeprazole", "20mg", MedicineCategory.ANTACIDS, MedicineType.CAPSULE),
    DOLO_650("Dolo - 650", "650mg", MedicineCategory.ANTIPYRETICS, MedicineType.TABLET),
    IBUPROFEN("Ibuprofen", "400mg", MedicineCategory.ANTIINFLAMMATORY, MedicineType.TABLET),
    TELMA_AM("Telma - AM Active", "40mg", MedicineCategory.ANTIHYPERTENSIVES, MedicineType.TABLET),
    ECOSPRIN("Ecosprin", "75mg", MedicineCategory.ANTIPLATELETS, MedicineType.TABLET),
    AZITHROMYCIN("Azithromycin", "500mg", MedicineCategory.ANTIBIOTICS, MedicineType.TABLET),
    CETIRIZINE("Cetirizine", "10mg", MedicineCategory.ANTIHISTAMINES, MedicineType.TABLET),
    LEVOCETIRIZINE("Levocetirizine", "5mg", MedicineCategory.ANTIHISTAMINES, MedicineType.TABLET),
    MONTELUKAST("Montelukast", "10mg", MedicineCategory.ANTIALLERGICS, MedicineType.TABLET),
    PANTOPRAZOLE("Pantoprazole", "40mg", MedicineCategory.ANTACIDS, MedicineType.TABLET),
    RABEPRAZOLE("Rabeprazole", "20mg", MedicineCategory.ANTACIDS, MedicineType.TABLET),
    METFORMIN("Metformin", "500mg", MedicineCategory.ANTIDIABETICS, MedicineType.TABLET),
    GLIMEPIRIDE("Glimepiride", "2mg", MedicineCategory.ANTIDIABETICS, MedicineType.TABLET),
    GLYCOMET("Glycomet", "500mg", MedicineCategory.ANTIDIABETICS, MedicineType.TABLET),
    ATORVASTATIN("Atorvastatin", "10mg", MedicineCategory.STATINS, MedicineType.TABLET),
    ROSUVASTATIN("Rosuvastatin", "10mg", MedicineCategory.STATINS, MedicineType.TABLET),
    AMLODIPINE("Amlodipine", "5mg", MedicineCategory.ANTIHYPERTENSIVES, MedicineType.TABLET),
    LOSARTAN("Losartan", "50mg", MedicineCategory.ANTIHYPERTENSIVES, MedicineType.TABLET),
    TELMISARTAN("Telmisartan", "40mg", MedicineCategory.ANTIHYPERTENSIVES, MedicineType.TABLET),
    CROCIN("Crocin", "500mg", MedicineCategory.ANTIPYRETICS, MedicineType.TABLET),
    COMBIFLAM("Combiflam", "400mg", MedicineCategory.ANTIINFLAMMATORY, MedicineType.TABLET),
    DICLOFENAC("Diclofenac", "50mg", MedicineCategory.ANTIINFLAMMATORY, MedicineType.TABLET),
    NAPROXEN("Naproxen", "250mg", MedicineCategory.ANTIINFLAMMATORY, MedicineType.TABLET),
    ACECLOFENAC("Aceclofenac", "100mg", MedicineCategory.ANTIINFLAMMATORY, MedicineType.TABLET),
    ORS("ORS", "200ml", MedicineCategory.ANTIDIARRHEALS, MedicineType.POWDER),
    ZINCOVIT("Zincovit", "1 Tablet", MedicineCategory.VITAMINS, MedicineType.TABLET),
    LIMCEE("Limcee", "500mg", MedicineCategory.VITAMINS, MedicineType.TABLET),
    SHELCAL_500("Shelcal - 500", "500mg", MedicineCategory.SUPPLEMENTS, MedicineType.TABLET),
    BECOSULES("Becosules", "1 Capsule", MedicineCategory.VITAMINS, MedicineType.CAPSULE),
    BENADRYL("Benadryl", "100ml", MedicineCategory.ANTITUSSIVES, MedicineType.SYRUP),
    ASCORIL("Ascoril", "100ml", MedicineCategory.ANTITUSSIVES, MedicineType.SYRUP),
    ALEX("Alex Syrup", "100ml", MedicineCategory.ANTITUSSIVES, MedicineType.SYRUP),
    DIGENE("Digene", "200ml", MedicineCategory.ANTACIDS, MedicineType.SYRUP),
    GELUSIL("Gelusil", "170ml", MedicineCategory.ANTACIDS, MedicineType.SYRUP),
    BETADINE("Betadine", "100ml", MedicineCategory.ANTISEPTICS, MedicineType.LIQUID),
    SOFRAMYCIN("Soframycin", "30g", MedicineCategory.ANTISEPTICS, MedicineType.OINTMENT),
    VOLINI("Volini Gel", "30g", MedicineCategory.ANTIINFLAMMATORY, MedicineType.GEL),
    MOOV("Moov Cream", "50g", MedicineCategory.ANTIINFLAMMATORY, MedicineType.CREAM),
    VICKS("Vicks VapoRub", "50g", MedicineCategory.ANTIINFLAMMATORY, MedicineType.OINTMENT),
    INSULIN("Human Insulin", "100IU/ml", MedicineCategory.ANTIDIABETICS, MedicineType.INJECTION),
    CEFIXIME("Cefixime", "200mg", MedicineCategory.ANTIBIOTICS, MedicineType.TABLET),
    DOXYCYCLINE("Doxycycline", "100mg", MedicineCategory.ANTIBIOTICS, MedicineType.CAPSULE),
    CIPROFLOXACIN("Ciprofloxacin", "500mg", MedicineCategory.ANTIBIOTICS, MedicineType.TABLET),
    OFLOXACIN("Ofloxacin", "200mg", MedicineCategory.ANTIBIOTICS, MedicineType.TABLET),
    NORFLOXACIN("Norfloxacin", "400mg", MedicineCategory.ANTIBIOTICS, MedicineType.TABLET),
    DOMPERIDONE("Domperidone", "10mg", MedicineCategory.ANTIEMETICS, MedicineType.TABLET),
    ONDANSETRON("Ondansetron", "4mg", MedicineCategory.ANTIEMETICS, MedicineType.TABLET);

    private final String name;
    private final String dosage;
    private final MedicineCategory category;
    private final MedicineType type;

    Medicines(String name, String dosage, MedicineCategory category, MedicineType type) {
        this.name = name;
        this.dosage = dosage;
        this.category = category;
        this.type = type;
    }

    public String getName() {
        return name;
    }

    public String getDosage() {
        return dosage;
    }

    public MedicineCategory getCategory() {
        return category;
    }

    public MedicineType getType() {
        return type;
    }
}
