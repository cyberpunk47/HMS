import {createSlice} from "@reduxjs/toolkit";
import { jwtDecode } from "jwt-decode";

const getInitialUser = (): any => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    try {
        const decoded: any = jwtDecode(token);
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            return {};
        }
        return decoded;
    } catch {
        return {};
    }
};

const userSlice = createSlice({
    name: "user",
    initialState: getInitialUser(),
    reducers:{
        setUser: (state, action)=>{ 
            state = action.payload;
            return state;
        },
        removeUser: (state) => { 
            state = {};
            return state;
        }
    }

})

export const {setUser, removeUser} = userSlice.actions;
export default userSlice.reducer;