package com.hms.pharmacy.pharmacyMS.services;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import com.hms.pharmacy.pharmacyMS.entity.MedicineInventory;
import com.hms.pharmacy.pharmacyMS.dto.MedicineInventoryDTO;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;
import com.hms.pharmacy.pharmacyMS.repository.MedicineInventoryRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class MedicineInventoryServiceImpl implements MedicineInventoryService{

    private final MedicineInventoryRepository medicineInventoryRepository;

    @Override
    public MedicineInventoryDTO addStockBatch(MedicineInventoryDTO dto) throws HmsException {
        Boolean exists = medicineInventoryRepository.existsByMedicineIdAndBatchNumber(dto.getMedicineId(), dto.getBatchNo());
        if(exists){
            throw new HmsException("BATCH_ALREADY_EXISTS");
        }
        return medicineInventoryRepository.save(dto.toEntity()).toDTO();

    }

    @Override
    public MedicineInventoryDTO getStockBatchById(Long id) throws HmsException {
    MedicineInventory medicineInventory = medicineInventoryRepository.findById(id).orElseThrow(()-> new HmsException("STOCK_NOT_FOUND"));
        return medicineInventory.toDTO();
    }

    @Override
    public List<MedicineInventoryDTO> getStockByMedicineId(Long medicineId) throws HmsException {
        List<MedicineInventory> batches = medicineInventoryRepository.findAllMedicineById(medicineId);
        return batches.stream().map(MedicineInventory::toDTO).toList();
    }

    @Override
    public List<MedicineInventoryDTO> getAllStock() {
       List<MedicineInventory> listofStock = medicineInventoryRepository.findAll();
       return listofStock.stream().map(MedicineInventory::toDTO).toList();
    }

    @Override
    public MedicineInventoryDTO updateStockBatch(MedicineInventoryDTO dto) throws HmsException {
        MedicineInventory medicineInventory = medicineInventoryRepository.findById(dto.getId()).orElseThrow(()-> new HmsException("STOCK_BATCH_NOT_FOUND"));
        
        medicineInventory.setQuantity(dto.getQuantity());
        medicineInventory.setStatus(dto.getStatus());
        medicineInventory.setExpiryDate(dto.getExpiryDate());
        medicineInventory.setAddedDate(dto.getAddedDate());
        medicineInventory.setBatchNo(dto.getBatchNo());
        medicineInventory.setInitialQuantity(dto.getInitialQuantity());
        return medicineInventoryRepository.save(medicineInventory).toDTO();
    }

    @Override
    public void deleteStockBatch(Long id) throws HmsException {
        MedicineInventory medicineInventory = medicineInventoryRepository.findById(id).orElseThrow(()-> new HmsException("STOCK_BATCH_NOT_FOUND"));
        medicineInventoryRepository.delete(medicineInventory);
    }

    @Override
    public void removeExpiredStock() {
        List<MedicineInventory> expiredStock = medicineInventoryRepository.findByExpiryDateBefore(LocalDate.now());
        medicineInventoryRepository.deleteAll(expiredStock);
    }
    
}
