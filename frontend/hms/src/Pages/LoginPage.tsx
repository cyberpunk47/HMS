import { Button, PasswordInput, TextInput } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";
import { useForm } from '@mantine/form';
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../Service/UserService";
import { errorNotification, successNotification } from "../Utility/NotificationUtil";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { setJwt } from "../Slices/JwtSlice";
import { jwtDecode } from 'jwt-decode'
import { setUser } from "../Slices/UserSlice";

const LoginPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false)
    const form = useForm({
        initialValues: {
            email: '',
            password: '',
        },

        validate: {
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => (!value ? "Password is required" : null),
        },
    });

    const handleSubmit = (values: typeof form.values) => {
        setLoading(true)
        loginUser(values).then((_data) => {
            successNotification("Logged in Successfully")
            dispatch(setJwt(_data))
            dispatch(setUser(jwtDecode(_data)))
        }).catch((error) => {
            errorNotification(error?.response?.data?.errorMessage || "Failed to login. Please check your credentials.")
        }).finally(() => {
            setLoading(false)
        })
    };

    return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-[#072c2b] via-[#165955] to-[#072c2b] flex flex-col items-center justify-center py-10 px-4">
            <div className="py-4 text-pink-400 flex gap-2 items-center animate-pulse">
                <IconHeartbeat size={48} stroke={2.5} />
                <span className="font-heading font-semibold text-4xl text-white tracking-wide">Pulse</span>
            </div>

            <div className="w-full max-w-[450px] bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 shadow-2xl">
                <form className="flex flex-col gap-6" onSubmit={form.onSubmit(handleSubmit)}>
                    <div className="self-center font-semibold font-heading text-white text-2xl tracking-wide mb-2">Welcome Back</div>

                    <TextInput
                        label="Email Address"
                        placeholder="Enter your email"
                        styles={{
                            input: {
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                transition: 'all 0.2s ease',
                            },
                            label: {
                                color: 'rgba(255, 255, 255, 0.9)',
                                marginBottom: '6px',
                            }
                        }}
                        classNames={{
                            input: 'focus:border-[#1fad9f] focus:bg-white/15 placeholder-white/30 rounded-xl text-white py-2.5 px-4 font-sans text-sm',
                            label: 'font-sans font-medium text-xs',
                        }}
                        size="md"
                        key={form.key('email')}
                        {...form.getInputProps('email')}
                    />

                    <PasswordInput
                        label="Password"
                        placeholder="Enter your password"
                        styles={{
                            input: {
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#ffffff',
                                transition: 'all 0.2s ease',
                            },
                            label: {
                                color: 'rgba(255, 255, 255, 0.9)',
                                marginBottom: '6px',
                            },
                            innerInput: {
                                color: '#ffffff',
                            }
                        }}
                        classNames={{
                            input: 'focus:border-[#1fad9f] focus:bg-white/15 placeholder-white/30 rounded-xl text-white py-2.5 px-4 font-sans text-sm',
                            label: 'font-sans font-medium text-xs',
                        }}
                        size="md"
                        key={form.key('password')}
                        {...form.getInputProps('password')}
                    />

                    <Button 
                        loading={loading} 
                        type="submit" 
                        radius="lg" 
                        size="lg"
                        className="w-full bg-[#1fad9f] hover:bg-[#168b82] text-white font-semibold font-sans py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none mt-2"
                    >
                        Login
                    </Button>

                    <div className="text-white/60 text-sm self-center mt-2">
                        Don't have an account? <Link to="/register" className="text-white hover:text-emerald-300 font-semibold underline underline-offset-4 transition-all">Register</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default LoginPage;