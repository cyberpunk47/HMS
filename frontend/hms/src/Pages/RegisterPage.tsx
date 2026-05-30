import { Button, PasswordInput, SegmentedControl, TextInput } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";
import { useForm } from '@mantine/form';
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../Service/UserService";
import { errorNotification, successNotification } from "../Utility/NotificationUtil";
import { useState } from "react";

const RegisterPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false)
    const form = useForm({
        initialValues: {
            role: 'PATIENT',
            name: "",
            email: '',
            password: '',
            confirmPassword: '',
        },

        validate: {
            name: (value) => (!value ? "Name is required" : null),
            email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value) => !value
                ? "Password is required"
                : !/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value)
                    ? "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
                    : null,

            confirmPassword: (value, values) => (value === values.password ? null : "Password dont match"),
        },
    });

    const handleSubmit = (values: typeof form.values) => {
        setLoading(true)
        registerUser(values).then((_data) => {
            successNotification("Registered Successfully")
            navigate("/login");
        })
            .catch((error) => {
                errorNotification(error?.response?.data?.errorMessage || "Failed to register. Please check your connection.")
            }).finally(() => setLoading(false))
    };

    return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-[#072c2b] via-[#165955] to-[#072c2b] flex flex-col items-center justify-center py-10 px-4">
            <div className="py-4 text-pink-400 flex gap-2 items-center animate-pulse">
                <IconHeartbeat size={48} stroke={2.5} />
                <span className="font-heading font-semibold text-4xl text-white tracking-wide">Pulse</span>
            </div>

            <div className="w-full max-w-[450px] bg-white/10 backdrop-blur-lg p-8 rounded-2xl border border-white/20 shadow-2xl">
                <form className="flex flex-col gap-6" onSubmit={form.onSubmit(handleSubmit)}>
                    <div className="self-center font-semibold font-heading text-white text-2xl tracking-wide mb-2">Create Account</div>
                    
                    <SegmentedControl
                        fullWidth
                        size="md"
                        radius="lg"
                        data={[
                            { label: 'Patient', value: 'PATIENT' },
                            { label: 'Doctor', value: 'DOCTOR' },
                            { label: 'Admin', value: 'ADMIN' }
                        ]}
                        {...form.getInputProps('role')}
                        styles={{
                            root: {
                                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                padding: '4px',
                            },
                            indicator: {
                                backgroundColor: '#1fad9f',
                                boxShadow: '0 4px 12px rgba(31, 173, 159, 0.3)',
                            },
                            control: {
                                border: 'none',
                            }
                        }}
                        classNames={{
                            root: 'backdrop-blur-sm',
                            label: 'text-white font-sans font-medium text-sm transition-all',
                        }}
                    />

                    <TextInput
                        label="Full Name"
                        placeholder="Enter your full name"
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
                        key={form.key('name')}
                        {...form.getInputProps('name')}
                    />

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
                        placeholder="Create a password"
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

                    <PasswordInput
                        label="Confirm Password"
                        placeholder="Re-enter your password"
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
                        key={form.key('confirmPassword')}
                        {...form.getInputProps('confirmPassword')}
                    />

                    <Button 
                        loading={loading} 
                        type="submit" 
                        radius="lg" 
                        size="lg"
                        className="w-full bg-[#1fad9f] hover:bg-[#168b82] text-white font-semibold font-sans py-3 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border-none mt-2"
                    >
                        Register
                    </Button>

                    <div className="text-white/60 text-sm self-center mt-2">
                        Have an account? <Link to="/login" className="text-white hover:text-emerald-300 font-semibold underline underline-offset-4 transition-all">Login</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default RegisterPage;