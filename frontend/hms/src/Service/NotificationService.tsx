import axiosInstance from "../Interceptor/AxiosInterceptor"

export const getPatientNotification = async (userId: any) => {
    if (!userId || userId === "undefined") return [];
    return axiosInstance.get(`/notification/patient/${userId}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; });
}

export const getDoctorNotification = async (userId: any) => {
    if (!userId || userId === "undefined") return [];
    return axiosInstance.get(`/notification/doctor/${userId}`)
        .then((response: any) => response.data)
        .catch((error: any) => { throw error; });
}
