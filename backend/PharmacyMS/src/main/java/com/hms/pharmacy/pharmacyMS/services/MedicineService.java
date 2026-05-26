package com.hms.pharmacy.pharmacyMS.services;

import java.util.List;

import com.hms.pharmacy.pharmacyMS.dto.MedicineDTO;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;

public interface MedicineService {

    // Always rememeber while adding medicine use Long and use medicne dto 
    Long addMedicine(MedicineDTO medicineDTO) throws HmsException;
    //EK medicine find krne ke liye we will use medicneDTO which takes id and gives whole dto;
    MedicineDTO findMedicine(Long id) throws HmsException;
    //Update hamesha void ke saath aayega and we will give the messsage in the api 
    void updateMedicine(MedicineDTO medicineDTO) throws HmsException;
    //List of medicine ko lene ke liye we will use lists and send it to the api response as a list of DTO 
    List<MedicineDTO> getAllMedicines() throws HmsException;
    // get stock
    public Integer getStockById(Long id) throws HmsException;
    // add stok
    public Integer addStockById(Long id, Integer quantity) throws HmsException;
    // remove stock 
    public Integer removeStockById(Long id, Integer quantity) throws HmsException;
}