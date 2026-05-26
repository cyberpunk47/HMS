package com.hms.pharmacy.pharmacyMS.services;

import java.lang.foreign.Linker.Option;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.hms.pharmacy.pharmacyMS.dto.MedicineDTO;
import com.hms.pharmacy.pharmacyMS.entity.Medicine;
import com.hms.pharmacy.pharmacyMS.exception.HmsException;
import com.hms.pharmacy.pharmacyMS.repository.MedicineRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MedicineServiceImpl implements MedicineService{

    private final MedicineRepository medicineRepository;

    
    @Override
    public Long addMedicine(MedicineDTO medicineDTO) throws HmsException {
        // 1. DTO → Entity convert karo
        // 2. Repository se save karo
        // 3. Saved entity ka ID return karo
        Boolean medicineExists = medicineRepository.existsByName(medicineDTO.getName());

        if(medicineExists){
            throw new HmsException("MEDICINE_ALREADY_EXISTS");
        }
        Medicine medicine = medicineDTO.toEntity();
        return medicineRepository.save(medicine).getId();
    }


    @Override
    public MedicineDTO findMedicine(Long id) throws HmsException {
        //1. Take the id use optional to find if exists
        // Send the DTO
        // else throw the exeption
        Optional<Medicine> medicine = medicineRepository.findById(id);
        if(medicine.isPresent()){
            return medicine.get().toDTO();
        }
        throw new HmsException("MEDICINE_NOT_FOUND");
    }


    @Override
    public void updateMedicine(MedicineDTO medicineDTO) throws HmsException {
        // TODO Auto-generated method stub
        Medicine medicine = medicineRepository.findById(medicineDTO.getId()).orElseThrow(()-> new HmsException("MEDICINE_NOT_FOUND"));
        medicine.setName(medicineDTO.getName());
        medicine.setManufacturer(medicineDTO.getManufacturer());
        medicine.setUnitPrice(medicineDTO.getUnitPrice());
        medicine.setStock(medicineDTO.getStock());
        medicine.setExpDate(medicineDTO.getExpDate());
        medicine.setCategory(medicineDTO.getCategory());
        medicine.setType(medicineDTO.getType());
        medicine.setNotes(medicineDTO.getNotes());

        medicineRepository.save(medicine);
    }


    @Override
    public List<MedicineDTO> getAllMedicines() throws HmsException {
        List<Medicine> medicines = medicineRepository.findAll();
        return medicines.stream().map(Medicine::toDTO).toList();
    }

    @Override
    public Integer getStockById(Long id) throws HmsException {
        Optional<Medicine> medicine = medicineRepository.findById(id);
        if(medicine.isPresent()){
            return medicine.get().getStock();
        }
        throw new HmsException("MEDICINE_NOT_FOUND");
        
    }

    @Override
    public Integer addStockById(Long id, Integer quantity) throws HmsException {
        // addStockById
// 1. id se medicine dhundo
// 2. nahi mili → exception
// 3. mili → current stock + quantity
// 4. save karo
// 5. updated stock return karo
        Medicine medicine = medicineRepository.findById(id).orElseThrow(()-> new HmsException("MEDICINE_NOT_FOUND"));
        medicine.setStock(medicine.getStock()+quantity);
        medicineRepository.save(medicine);
        return medicine.getStock();
    }

    @Override
    public Integer removeStockById(Long id, Integer quantity) throws HmsException {
        // removeStockById  
// 1. id se medicine dhundo
// 2. nahi mili → exception
// 3. check karo — quantity > current stock?
//    haan → exception "INSUFFICIENT_STOCK"
//    nahi → current stock - quantity
// 4. save karo
// 5. updated stock return karo
        Medicine medicine = medicineRepository.findById(id).orElseThrow(()->new HmsException("MEDICINE_NOT_FOUND"));
        if(quantity>medicine.getStock()){
            throw new HmsException("INSUFFICIENT_STOCK");
        }
        medicine.setStock(medicine.getStock()-quantity);
        medicineRepository.save(medicine);
        return medicine.getStock();

    }
} 