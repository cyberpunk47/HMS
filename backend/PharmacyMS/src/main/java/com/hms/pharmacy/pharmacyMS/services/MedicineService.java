package com.hms.pharmacy.pharmacyMS.services;

import java.util.List;

import com.hms.pharmacy.pharmacyMS.dto.MedicineDTO;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;

public interface MedicineService {
    public Long addMedicine(MedicineDTO medicineDTO) throws HmsException;

    public MedicineDTO getMedicineById(Long id) throws HmsException;

    public void updateMedicine(MedicineDTO medicineDTO) throws HmsException;

    public List<MedicineDTO> getAllMedicines() throws HmsException;

    public Integer getStockById(Long id) throws HmsException;

    public Integer addStock(Long id, Integer quantity) throws HmsException;

    public Integer removeStock(Long id, Integer quantity) throws HmsException;

}