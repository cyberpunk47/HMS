package com.hms.testtools.seeder;

import com.hms.testtools.client.PharmacyClient;
import com.hms.testtools.dto.PharmacyMedicineDTO;
import com.hms.testtools.generator.MedicineGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MedicineSeeder {

    @Autowired
    private PharmacyClient pharmacyClient;

    @Autowired
    private MedicineGenerator medicineGenerator;

    public Long seedMedicine() {
        PharmacyMedicineDTO med = medicineGenerator.generateMedicine();
        return pharmacyClient.addMedicine(med);
    }
}
