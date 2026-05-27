package com.hms.pharmacy.pharmacyMS.services;

import java.util.List;
import com.hms.pharmacy.pharmacyMS.dto.MedicineInventoryDTO;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;

public interface MedicineInventoryService {
    
    // Get a list of all physical inventory batches
    List<MedicineInventoryDTO> getAllInventoryBatches() throws HmsException;

    // Get a specific inventory batch by its ID 
    MedicineInventoryDTO getBatchById(Long id) throws HmsException;

    // Receive and add a new batch of medicine to the shelf
    MedicineInventoryDTO addMedicineBatch(MedicineInventoryDTO batchDTO) throws HmsException;

    // Update the details of a specific batch 
    MedicineInventoryDTO updateMedicineBatch(MedicineInventoryDTO batchDTO) throws HmsException;

    // Sell stock based on nearest expiry date (FIFO)
    String sellStock(Long medicineId, Integer quantity) throws HmsException;

    // Delete a specific batch record 
    void deleteBatch(Long id) throws HmsException;

    // Remove or mark expired batches from the active inventory
    public void deleteExpiredBatches() throws HmsException;
}