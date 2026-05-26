package com.hms.pharmacy.pharmacyMS.utility;

import java.time.LocalDateTime;
import java.util.stream.Collectors;


import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.hms.pharmacy.pharmacyMS.exception.HmsException;


@RestControllerAdvice
public class ExceptionControllerAdvice {
    @Autowired
    //Environment is used to access the properties file, here we use 
    Environment environment;    
    // this will handle the generic exception, all unexpected exceptions will come here
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorInfo> exceptionHandler(Exception e){
        ErrorInfo errorInfo = new ErrorInfo("Some error occurred ", HttpStatus.INTERNAL_SERVER_ERROR.value(), LocalDateTime.now());
        return new ResponseEntity<>(errorInfo, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    //Handler for HmsException for example following exceptions comes under this 
    // 
    @ExceptionHandler(HmsException.class)
    public ResponseEntity<ErrorInfo> hmsExceptionHandler(HmsException e){
        ErrorInfo errorInfo = new ErrorInfo(environment.getProperty(e.getMessage()),HttpStatus.INTERNAL_SERVER_ERROR.value(), LocalDateTime.now());
        return new ResponseEntity<>(errorInfo, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    @ExceptionHandler({MethodArgumentNotValidException.class, ConstraintViolationException.class})
    public ResponseEntity<ErrorInfo> handleValidationExceptions(Exception e){
        String errmsg = null;
        if(e instanceof MethodArgumentNotValidException manv){
            errmsg = manv.getBindingResult().getAllErrors().stream().map(ObjectError::getDefaultMessage).collect(Collectors.joining(","));
        }
        else{
            ConstraintViolationException cve = (jakarta.validation.ConstraintViolationException) e;
            errmsg = cve.getConstraintViolations().stream().map(ConstraintViolation::getMessage)
                    .collect(Collectors.joining(","));
        } 
        ErrorInfo error = new ErrorInfo(errmsg, HttpStatus.BAD_REQUEST.value(), LocalDateTime.now());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
  
    }

    
}
