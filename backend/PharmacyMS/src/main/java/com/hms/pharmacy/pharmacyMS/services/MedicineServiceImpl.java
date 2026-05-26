package com.hms.pharmacy.pharmacyMS.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
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
        Boolean medicineExists = medicineRepository.existsById(medicineDTO.getId());

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
        throw new UnsupportedOperationException("Unimplemented method 'updateMedicine'");
    }


    @Override
    public List<MedicineDTO> getAllMedicines() throws HmsException {
        // TODO Auto-generated method stub

    }

    
} 