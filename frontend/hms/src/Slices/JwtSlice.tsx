import {createSlice} from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const getInitialToken = (): string => {
    const token = localStorage.getItem("token");
    if (!token) return "";
    try {
        const decoded: any = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            localStorage.removeItem("token");
            return "";
        }
        return token;
    } catch {
        localStorage.removeItem("token");
        return "";
    }
};

const jwtSlice = createSlice({
    name: "jwt",
    initialState: getInitialToken(),
    reducers:{
        setJwt: (state, action)=>{
            localStorage.setItem("token", action.payload);
            state = action.payload;
            return state;
        },
        removeJwt: (state) => {
            localStorage.removeItem("token");
            state = "";
            return state;
        }
    }

})

export const {setJwt, removeJwt} = jwtSlice.actions;
export default jwtSlice.reducer;