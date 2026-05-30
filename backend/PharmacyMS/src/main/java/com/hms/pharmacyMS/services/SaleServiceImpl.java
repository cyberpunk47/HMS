package com.hms.pharmacyMS.services;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hms.pharmacyMS.dto.SaleDTO;
import com.hms.pharmacyMS.dto.SaleItemDTO;
import com.hms.pharmacyMS.entity.Sale;
import com.hms.pharmacyMS.entity.SaleRequest;
import com.hms.pharmacyMS.exception.HmsException;
import com.hms.pharmacyMS.repository.MedicineInventoryRepository;
import com.hms.pharmacyMS.repository.SaleItemRepository;
import com.hms.pharmacyMS.repository.SaleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SaleServiceImpl implements SaleService{
    private final SaleItemService saleItemService;
    private final SaleItemRepository saleItemRepository;
	private final MedicineInventoryService medicineInventoryService;
    private final SaleRepository saleRepository;


    @Override
    @Transactional
    public Long createSale(SaleRequest dto) throws HmsException {
        if(dto.getPrescriptionId()!= null && saleRepository.existsByPrescriptionId(dto.getPrescriptionId())){
            throw new HmsException("SALES_ALREADY_EXISTS");
        }
        // We are going to create sale and sale items in the same transaction
        for(SaleItemDTO saleItemDTO : dto.getSaleItems()){
            saleItemDTO.setBatchNo(medicineInventoryService.sellStock(saleItemDTO.getMedicineId(), saleItemDTO.getQuantity()));
        }
        Sale sale = new Sale(null , dto.getPrescriptionId(), dto.getBuyerName(), dto.getBuyerContact(), LocalDateTime.now(), dto.getTotalAmount());
        sale = saleRepository.save(sale);
        saleItemService.createSaleItem(sale.getId(), dto.getSaleItems());
        return sale.getId();
    }

    @Override
    public void updateSale(SaleDTO dto) throws HmsException {
        Sale sale = saleRepository.findById(dto.getId()).orElseThrow(()-> new HmsException("SALE_NOT_FOUND"));
        sale.setSaleDate(dto.getSaleDate());
        sale.setTotalAmount(dto.getTotalAmount());
        saleRepository.save(sale);
    }

    @Override
    public SaleDTO getSale(Long id) throws HmsException {
        return saleRepository.findById(id).map(Sale::toDTO).orElseThrow(()-> new HmsException("SALE_NOT_FOUND"));
    }

    @Override
    public SaleDTO getSaleByPrescriptionId(Long prescriptionId) throws HmsException {
       return saleRepository.findByPrescriptionId(prescriptionId).map(Sale::toDTO).orElseThrow(()-> new HmsException("SALE_NOT_FOUND"));
    }

    @Override
    public List<SaleDTO> getAllSales() throws HmsException {
        return saleRepository.findAll().stream().map(Sale::toDTO).toList();
    }
    
}
