package com.hms.testtools.generator;

import com.hms.testtools.dto.MedicineInventoryDTO;
import com.hms.testtools.dto.StockStatus;
import net.datafaker.Faker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import java.time.LocalDate;

@Component
public class InventoryGenerator {

    @Autowired
    private Faker faker;

    public MedicineInventoryDTO generateInventory(Long medicineId) {
        MedicineInventoryDTO inv = new MedicineInventoryDTO();
        inv.setMedicineId(medicineId);
        inv.setBatchNo("BAT-" + faker.random().hex(6).toUpperCase());
        int qty = faker.number().numberBetween(50, 500);
        inv.setQuantity(qty);
        inv.setInitialQuantity(qty);
        inv.setExpiryDate(LocalDate.now().plusYears(faker.number().numberBetween(1, 3)));
        inv.setAddedDate(LocalDate.now());
        inv.setStatus(StockStatus.ACTIVE);
        return inv;
    }
}
