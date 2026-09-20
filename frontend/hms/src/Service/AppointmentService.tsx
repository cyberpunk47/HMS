import axiosInstance from "../Interceptor/AxiosInterceptor"

const scheduleAppointment = async (data: any) => {
    return axiosInstance.post("/appointment/schedule", data)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const cancelAppointment = async (id: any) => {
    return axiosInstance.put(`/appointment/cancel/${id}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const getAppointment = async (id: any) => {
    return axiosInstance.get(`/appointment/get/${id}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const getAppointmentDetails = async (id: any) => {
    return axiosInstance.get(`/appointment/get/details/${id}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const getAppointmentsByPatient = async (patientId: any) => {
    return axiosInstance.get(`/appointment/getAllByPatient/${patientId}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

// /getAllByDoctor/{doctorId}

const getAppointmentsByDoctor = async (doctorId: any) => {
    return axiosInstance.get(`/appointment/getAllByDoctor/${doctorId}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const createAppointmentReport = async (data: any) => {
    return axiosInstance.post(`/appointment/report/create`, data)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const isReportExists = async (appointmentId: any) => {
    return axiosInstance.get(`/appointment/report/isRecordExists/${appointmentId}`)
        .then((response: any) => response.data)
        .catch((error) => { throw error })
}

const getReportsByPatientId = async (patientId: any) => {
    return axiosInstance.get(`/appointment/report/getRecordsByPatientId/${patientId}`)
        .then((response: any) => response.data)
        .catch((error) => { throw error })
}

const getPrescriptionsByPatientId = async (patientId: any) => {
    return axiosInstance.get(`/appointment/report/getPrescriptionsByPatientId/${patientId}`)
        .then((response: any) => response.data)
        .catch((error) => { throw error })
}

const getAllPrescriptions = async () => {
    return axiosInstance.get("/appointment/report/getAllPrescriptions")
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const getMedicinesByPrescriptionId = async (prescriptionId: any) => {
    return axiosInstance.get(`/appointment/report/getMedicinesByPrescriptionId/${prescriptionId}`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const countAppointmentsByPatient = async (patientId: any) =>{
    return axiosInstance.get(`/appointment/countByPatient/${patientId}`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const countAppointmentsByDoctor = async (doctorId: any) =>{
    return axiosInstance.get(`/appointment/countByDoctor/${doctorId}`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const countAllAppointments = async () =>{
    return axiosInstance.get(`/appointment/visitCount`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const countReasonsByPatient = async(patientId: any) => { 
    return axiosInstance.get(`/appointment/countReasonByPatient/${patientId}`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const countReasonsByDoctor = async (doctorId: any) =>{
    return axiosInstance.get(`/appointment/countReasonByDoctor/${doctorId}`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const countAllReasons = async () =>{
    return axiosInstance.get(`/appointment/countReasons`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const getMedicinesConsumedByPatient = async(patientId: any) => { 
    return axiosInstance.get(`/appointment/getMedicinesByPatient/${patientId}`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const getTodaysAppointments = async () =>{
    return axiosInstance.get(`/appointment/today`)
        .then((response:any) => response.data)
        .catch((error:any) => {throw error;})
}

const getPatientIdsByDoctor = async (doctorId: any) => {
    return axiosInstance.get(`/appointment/patients/doctor/${doctorId}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const getUniquePatientCountsByDoctor = async (doctorId: any) => {
    return axiosInstance.get(`/appointment/patients/doctor/${doctorId}/metrics`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}
const getUniquePatientDataForEachDoctor = async (doctorId: number) => {
    return axiosInstance
        .get(`/appointment/patients/doctor/${doctorId}/dropdown`)
        .then((response: any) => response.data)
        .catch((error: any) => {
            throw error;
        })
}

// Admin: every appointment in HMS, paginated.
// params: { page, size, status?, from?, to?, doctorId?, patientId?, sort?: 'asc' | 'desc' }
const getAllAppointmentsAdmin = async (params: Record<string, any>) => {
    const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    return axiosInstance.get(`/appointment/all`, { params: clean })
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

const getAppointmentStatusCounts = async () => {
    return axiosInstance.get(`/appointment/all/status-counts`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

// Active (SCHEDULED/COMPLETED) appointment times of a doctor around a date (YYYY-MM-DD).
const getBookedSlots = async (doctorId: any, date: string) => {
    return axiosInstance.get(`/appointment/doctor/${doctorId}/booked-slots`, { params: { date } })
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

// Full report (symptoms, tests, referral, follow-up) + prescription with medicines for one appointment.
const getReportDetailsByAppointmentId = async (appointmentId: any) => {
    return axiosInstance.get(`/appointment/report/getDetailsByAppointmentId/${appointmentId}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; })
}

export { getAllAppointmentsAdmin, getAppointmentStatusCounts, getBookedSlots, getReportDetailsByAppointmentId };

export { scheduleAppointment, cancelAppointment, getAppointment, getAppointmentDetails, getAppointmentsByPatient, getAppointmentsByDoctor, createAppointmentReport, isReportExists, getReportsByPatientId, getPrescriptionsByPatientId, getAllPrescriptions, getMedicinesByPrescriptionId, countAppointmentsByPatient, countAppointmentsByDoctor, countAllAppointments, countReasonsByPatient, countReasonsByDoctor, countAllReasons, getMedicinesConsumedByPatient, getTodaysAppointments ,getPatientIdsByDoctor, getUniquePatientCountsByDoctor , getUniquePatientDataForEachDoctor }