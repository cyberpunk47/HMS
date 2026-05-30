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

import com.hms.pharmacyMS.dto.ResponseDTO;
import com.hms.pharmacyMS.dto.SaleDTO;
import com.hms.pharmacyMS.dto.SaleItemDTO;
import com.hms.pharmacyMS.entity.SaleRequest;
import com.hms.pharmacyMS.exception.HmsException;
import com.hms.pharmacyMS.services.SaleItemService;
import com.hms.pharmacyMS.services.SaleService;

import lombok.RequiredArgsConstructor;

@RestController
@CrossOrigin
@RequestMapping("/pharmacy/sales")
@RequiredArgsConstructor
public class SaleAPI {
    private final SaleService saleService;
    private final SaleItemService saleItemService;

    @PostMapping("/create") // change SaleDTO to SaleRequest
    public ResponseEntity<Long> createSale(@RequestBody SaleRequest saleDTO) throws HmsException{
        return new ResponseEntity<>(saleService.createSale(saleDTO), HttpStatus.CREATED)  ;
    }

    @PutMapping("/update")
    public ResponseEntity<ResponseDTO> updateSale(@RequestBody SaleDTO dto) throws HmsException {
        saleService.updateSale(dto);
        return new ResponseEntity<>(new ResponseDTO("Sale updated Successfully"), HttpStatus.OK);
    }

    @GetMapping("/getSaleItems/{saleId}")
    public ResponseEntity<List<SaleItemDTO>> getSaleItems(@PathVariable Long saleId) throws HmsException {
        List<SaleItemDTO> saleItems = saleItemService.getSaleItemsBySaleId(saleId);
        return  new ResponseEntity<>(saleItems, HttpStatus.OK);
    }

    @GetMapping("/get/{id}")
    public ResponseEntity<SaleDTO> getSale(@PathVariable Long id) throws HmsException {
        SaleDTO sale = saleService.getSale(id);
        return new ResponseEntity<>(sale, HttpStatus.OK);
    }

    @GetMapping("/getAll")
    public ResponseEntity<List<SaleDTO>> getAllSales() throws  HmsException{
        List<SaleDTO> sales = saleService.getAllSales();
        return  new ResponseEntity<>(sales, HttpStatus.OK);
    }

}
