package com.hms.testtools.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import com.hms.testtools.dto.PharmacyMedicineDTO;
import com.hms.testtools.dto.MedicineInventoryDTO;
import com.hms.testtools.dto.SaleRequest;
import com.hms.testtools.dto.SaleDTO;
import java.util.List;

@FeignClient(
    name = "pharmacy-client",
    url = "${gateway.url}"
)
public interface PharmacyClient {

    // Medicine
    @PostMapping("/pharmacy/medicine/add")
    Long addMedicine(@RequestBody PharmacyMedicineDTO medicineDTO);

    @GetMapping("/pharmacy/medicine/get/{id}")
    PharmacyMedicineDTO getMedicine(@PathVariable("id") Long id);

    @GetMapping("/pharmacy/medicine/getAll")
    List<PharmacyMedicineDTO> getAllMedicines();

    // Inventory
    @PostMapping("/pharmacy/inventory/add")
    MedicineInventoryDTO addMedicineInventory(@RequestBody MedicineInventoryDTO inventoryDTO);

    @GetMapping("/pharmacy/inventory/getAll")
    List<MedicineInventoryDTO> getAllMedicineInventory();

    // Sales
    @PostMapping("/pharmacy/sales/create")
    Long createSale(@RequestBody SaleRequest saleRequest);

    @GetMapping("/pharmacy/sales/get/{id}")
    SaleDTO getSale(@PathVariable("id") Long id);
}
