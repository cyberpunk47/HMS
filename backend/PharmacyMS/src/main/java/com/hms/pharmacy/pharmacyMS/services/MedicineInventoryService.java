package com.hms.pharmacy.pharmacyMS.services;

import java.util.List;

import com.hms.pharmacy.pharmacyMS.dto.MedicineInventoryDTO;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;

public interface MedicineInventoryService {
    
    // Naya stock batch aaya → inventory mein add karo
    MedicineInventoryDTO addStockBatch(MedicineInventoryDTO dto) throws HmsException;
    
    // Inventory record ID se dekho
    MedicineInventoryDTO getStockBatchById(Long id) throws HmsException;
    
    // Ek medicine ke saare batches dekho
    List<MedicineInventoryDTO> getStockByMedicineId(Long medicineId) throws HmsException;
    
    // Saara stock dekho
    List<MedicineInventoryDTO> getAllStock();
    
    // Stock update karo — quantity, expiry etc
    MedicineInventoryDTO updateStockBatch(MedicineInventoryDTO dto) throws HmsException;
    
    // Batch delete karo
    void deleteStockBatch(Long id) throws HmsException;
    
    // Expired batches automatically hataao
    void removeExpiredStock();
}