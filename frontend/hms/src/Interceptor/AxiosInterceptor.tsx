import axios, { type InternalAxiosRequestConfig } from 'axios'
const axiosInstance = axios.create({
    baseURL: "http://localhost:9000"
})

axiosInstance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // console.log("interceptor: ", config)
        const token = localStorage.getItem("token");
        if(token && config.headers){
            config.headers.Authorization = `Bearer ${token}`
        }
        return config;
    }
)

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;