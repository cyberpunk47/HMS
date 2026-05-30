package com.hms.pharmacyMS.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

import com.hms.pharmacyMS.dto.MedicineDTO;
import com.hms.pharmacyMS.dto.ResponseDTO;
import com.hms.pharmacyMS.exception.HmsException;
import com.hms.pharmacyMS.services.MedicineService;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;



@RestController
@RequestMapping("/pharmacy/medicine")
@RequiredArgsConstructor
@CrossOrigin
public class MedicineApi {
    private final MedicineService medicineService;

    @PostMapping("/add")
    public ResponseEntity<Long> addMedicine(@RequestBody MedicineDTO medicineDTO) throws HmsException {
        return new ResponseEntity<>(medicineService.addMedicine(medicineDTO), HttpStatus.OK);
    }
    //get
    @GetMapping("/get/{id}")
    public ResponseEntity<MedicineDTO> getMedicine(@PathVariable Long id) throws HmsException {
        return new ResponseEntity<>(medicineService.getMedicineById(id), HttpStatus.OK);
    }
    //Update
    @PutMapping("/update")
    public ResponseEntity<ResponseDTO>updateMedicine(@RequestBody MedicineDTO medicineDTO)throws HmsException {
        medicineService.updateMedicine(medicineDTO);
        return new ResponseEntity<>(new ResponseDTO("Medicine Updated Successfully"), HttpStatus.OK);
    }
        
    //getAll
    @GetMapping("/getAll")
    public ResponseEntity<List<MedicineDTO>> getAllMedicines() throws HmsException{
        return new ResponseEntity<>(medicineService.getAllMedicines(),HttpStatus.OK);
    }
}
