package com.hms.testtools.seeder;

import com.hms.testtools.client.PharmacyClient;
import com.hms.testtools.dto.MedicineInventoryDTO;
import com.hms.testtools.generator.InventoryGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class InventorySeeder {

    @Autowired
    private PharmacyClient pharmacyClient;

    @Autowired
    private InventoryGenerator inventoryGenerator;

    public void seedInventory(Long medicineId) {
        MedicineInventoryDTO inv = inventoryGenerator.generateInventory(medicineId);
        pharmacyClient.addMedicineInventory(inv);
    }
}
