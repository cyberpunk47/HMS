package com.hms.pharmacy.pharmacyMS.services;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.hms.pharmacy.pharmacyMS.entity.MedicineInventory;
import com.hms.pharmacy.pharmacyMS.dto.MedicineInventoryDTO;
import com.hms.pharmacy.pharmacyMS.dto.StockStatus;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;
import com.hms.pharmacy.pharmacyMS.repository.MedicineInventoryRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MedicineInventoryServiceImpl implements MedicineInventoryService {

    private final MedicineInventoryRepository medicineInventoryRepository;
    private final MedicineService medicineService;

    @Override
    public List<MedicineInventoryDTO> getAllInventoryBatches() throws HmsException {
        // Now notice something as the list is directly talking with the db we are using
        // here MedicineInventory not MedicineInventoryDTO
        List<MedicineInventory> ListOfBatches = medicineInventoryRepository.findAll();
        return ListOfBatches.stream().map(MedicineInventory::toDTO).toList();
    }

    @Override
    public MedicineInventoryDTO getBatchById(Long id) throws HmsException {
        return medicineInventoryRepository.findById(id).orElseThrow(() -> new HmsException("INVENTORY_NOT_FOUND"))
                .toDTO();
    }


    @Override
    @Transactional
    public MedicineInventoryDTO addMedicineBatch(MedicineInventoryDTO batchDTO) throws HmsException {
        batchDTO.setAddedDate(LocalDate.now());
        medicineService.addStock(batchDTO.getMedicineId(), batchDTO.getQuantity());
        batchDTO.setInitialQuantity(batchDTO.getQuantity());
        batchDTO.setStatus(StockStatus.ACTIVE);
        return medicineInventoryRepository.save(batchDTO.toEntity()).toDTO();

    }

    @Override
    @Transactional
    public MedicineInventoryDTO updateMedicineBatch(MedicineInventoryDTO batchDTO) throws HmsException {

        MedicineInventory existsInInventory = medicineInventoryRepository.findById(batchDTO.getId())
                .orElseThrow(() -> new HmsException("INVENTORY_NOT_FOUND"));
        existsInInventory.setBatchNo(batchDTO.getBatchNo());
        // Now we need to check for the quantity
        // Scenario A: The pharmacist typed too little.
        // Mistake: They typed 100 boxes originally.
        // Correction: They meant to type 150 boxes.
        if (existsInInventory.getInitialQuantity() < batchDTO.getQuantity()) {
            medicineService.addStock(batchDTO.getMedicineId(),
                    batchDTO.getQuantity() - existsInInventory.getInitialQuantity());
        }
        // Scenario B: The pharmacist typed too much.
        // Mistake: They typed 100 boxes originally.
        // Correction: They meant to type 80 boxes.
        else if (existsInInventory.getInitialQuantity() > batchDTO.getQuantity()) {
            medicineService.removeStock(batchDTO.getMedicineId(),
                    existsInInventory.getInitialQuantity() - batchDTO.getQuantity());
        }
        existsInInventory.setQuantity(batchDTO.getQuantity());
        existsInInventory.setInitialQuantity(batchDTO.getInitialQuantity());
        existsInInventory.setExpiryDate(batchDTO.getExpiryDate());
        return medicineInventoryRepository.save(existsInInventory).toDTO();

    }

    public void markExpired(List<MedicineInventory> inventories) throws HmsException {
        for (MedicineInventory inventory : inventories) {
            inventory.setStatus(StockStatus.EXPIRED);
        }
        medicineInventoryRepository.saveAll(inventories);
    }

    @Override
    @Transactional
    public void deleteBatch(Long id) throws HmsException {
        medicineInventoryRepository.deleteById(id);
    }

    @Override
    @Transactional
    @Scheduled(cron = "0 10 0 * * ?")
    // Means here every day at 12:10 am system will automatically check for the
    // expired medicines and mark them as expired
    public void deleteExpiredBatches() throws HmsException {
        List<MedicineInventory> expiredMedicines = medicineInventoryRepository.findByExpiryDateBefore(LocalDate.now());
        for (MedicineInventory medicine : expiredMedicines) {
            medicineService.removeStock(medicine.getId(), medicine.getQuantity());
        }
        this.markExpired(expiredMedicines);
        ;

    }

    @Override
    @Transactional
    public String sellStock(Long medicineId, Integer quantity) throws HmsException {
        // fetch the old ones first which are expiring
        List<MedicineInventory> batches = medicineInventoryRepository
                .findByMedicineIdAndExpiryDateAfterAndQuantityGreaterThanAndStatusOrderByExpiryDateAsc(medicineId,
                        LocalDate.now(), 0, StockStatus.ACTIVE);
        // if batches are empty means medicine is out of stock
        if (batches.isEmpty()) {
            throw new HmsException("OUT_OF_STOCK");
        }
        // Audit trail to tell exactly which boxes we opened and from where we sold
        StringBuilder batchDetails = new StringBuilder();
        // 'remainingQuantity' is our loop counter. It tracks how many pills we still
        // need to find.
        int remainingQuantity = quantity;
        // Now we check FIFO approach
        for (MedicineInventory inventory : batches) {
            // OPTIMIZATION: If we fulfilled the customer's order, stop looping immediately.
            if (remainingQuantity <= 0) {
                break;
            }
            int avaiableQuantity = inventory.getQuantity();
            // SCENARIO A: The current box DOES NOT have enough to fulfill the whole order.
            // Example: Customer wants 15, but this box only has 10.
            if (avaiableQuantity <= remainingQuantity) {
                // Log that we are emptying this specific batch.
                batchDetails.append(String.format("Batch %s: %d units\n", inventory.getBatchNo(), avaiableQuantity));
                // Subtract what we took from our running total. (We still need 5 more).
                remainingQuantity -= avaiableQuantity;
                // This box is now empty
                inventory.setQuantity(0);
                // Mark as empty (or expired, to get it out of rotation)
                inventory.setStatus(StockStatus.EXPIRED);
            }
            // SCENARIO B: The current box has MORE than enough.
            // Example: We need 5 pills. This box has 50.
            else if (avaiableQuantity > remainingQuantity) {
                // Log that we took the remaining pills from this batch.
                batchDetails.append(String.format("Batch %s: %d units\n", inventory.getBatchNo(), remainingQuantity));

                // Update the box's quantity. (50 - 5 = 45 left in the box).
                inventory.setQuantity(avaiableQuantity - remainingQuantity);

                // Our order is fulfilled! Set to 0 so the loop breaks on the next pass.
                remainingQuantity = 0;
            }
        }
        // 5. THE FINAL SAFETY CHECK
        // WHY: What if the customer wanted 100 pills, and we looped through ALL
        // available boxes,
        // but the sum of all boxes was only 90? The loop finishes, but
        // remainingQuantity is still 10.
        if (remainingQuantity > 0) {
            throw new HmsException("INSUFFICIENT_STOCK");
            // NOTE: Because of @Transactional, throwing this exception here cancels
            // everything.
            // The boxes we emptied in Scenario A will magically revert back to their
            // original state!
        }
        medicineService.removeStock(medicineId, quantity);
        medicineInventoryRepository.saveAll(batches);
        return batchDetails.toString();
    }

}
