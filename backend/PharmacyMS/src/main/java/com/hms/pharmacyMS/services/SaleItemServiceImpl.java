package com.hms.pharmacyMS.services;

import java.util.List;

import org.springframework.stereotype.Service;

import com.hms.pharmacyMS.dto.SaleItemDTO;
import com.hms.pharmacyMS.entity.Medicine;
import com.hms.pharmacyMS.entity.SaleItem;
import com.hms.pharmacyMS.exception.HmsException;
import com.hms.pharmacyMS.repository.SaleItemRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SaleItemServiceImpl implements SaleItemService{
    private final SaleItemRepository saleItemRepository;
    private final MedicineInventoryService medicineInventoryService;


    @Override
    public Long createSaleItem(SaleItemDTO saleItemDTO) throws HmsException {
        return saleItemRepository.save(saleItemDTO.toEntity()).getId();
    }

    @Override
    public void createSaleItem(Long saleId, List<SaleItemDTO> saleItemDTOS) throws HmsException {
        saleItemDTOS.stream().map((x) -> {
            x.setSaleId(saleId);
            return x.toEntity();
        }).forEach(saleItemRepository::save);
    }

    @Override
    public void createMultipleSaleItem(Long saleId, Long medicineId, List<SaleItemDTO> saleItemDTOS)
            throws HmsException {
            saleItemDTOS.stream().map((x)->{
                x.setSaleId(saleId);
                x.setMedicineId(medicineId);
                return x.toEntity();
            }).forEach(saleItemRepository::save);
    }

    @Override
    public void updateSaleItem(SaleItemDTO saleItemDTO) throws HmsException {
       SaleItem sale = saleItemRepository.findById(saleItemDTO.getId()).orElseThrow(()-> new HmsException("SALE_ITEM_NOT_FOUND"));
       sale.setQuantity(saleItemDTO.getQuantity());
       sale.setUnitPrice(saleItemDTO.getUnitPrice());
       saleItemRepository.save(sale);
    }

    @Override
    public List<SaleItemDTO> getSaleItemsBySaleId(Long saleId) throws HmsException {
        return saleItemRepository.findBySaleId(saleId).stream().map(SaleItem::toDTO).toList();
    }

    @Override
    public SaleItemDTO getSaleItem(Long id) throws HmsException {
        return saleItemRepository.findById(id).map(SaleItem::toDTO).orElseThrow(()-> new HmsException("SALE_ITEM_NOT_FOUND"));
    }
    
}
