package com.hms.pharmacyMS.api;


import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hms.pharmacyMS.dto.MedicineInventoryDTO;
import com.hms.pharmacyMS.exception.HmsException;
import com.hms.pharmacyMS.services.MedicineInventoryService;

import lombok.RequiredArgsConstructor;

@RestController
@CrossOrigin
@RequestMapping("/pharmacy/inventory")
@RequiredArgsConstructor
public class MedicineInventoryAPI {
    private final MedicineInventoryService medicineInventoryService;

    @PostMapping("/add")
    public ResponseEntity<MedicineInventoryDTO> addMedicine(@RequestBody MedicineInventoryDTO medicineDTO) throws HmsException {
        return new ResponseEntity<>(medicineInventoryService.addMedicineBatch(medicineDTO), HttpStatus.CREATED);
    }

    @PutMapping("/update")
    public ResponseEntity<MedicineInventoryDTO> updateMedicine(@RequestBody MedicineInventoryDTO medicineDTO) throws HmsException {
        return new ResponseEntity<>(medicineInventoryService.updateMedicineBatch(medicineDTO),HttpStatus.OK);
    }

    @GetMapping("/get/{id}")
    public ResponseEntity<MedicineInventoryDTO> getById(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(medicineInventoryService.getBatchById(id), HttpStatus.OK);
    }

   @GetMapping("/getAll")
    public ResponseEntity<List<MedicineInventoryDTO>> getAllMedicineInventory() throws HmsException{
        return new ResponseEntity<>(medicineInventoryService.getAllInventoryBatches(), HttpStatus.OK);
   }
}