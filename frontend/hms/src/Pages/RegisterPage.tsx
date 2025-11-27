import { Button, PasswordInput, SegmentedControl, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form';
import { IconHeartbeat } from '@tabler/icons-react'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../Service/UserService';
import { errorNotification, successNotification } from '../Utility/NotificationUtil';

const RegisterPage = () => {

      const [loading, setloading] = useState(false);
    
    const navigate = useNavigate();



    const form = useForm({
        initialValues: {
            name: '',
            role: 'PATIENT',
            email: '',
            password: '',
            confirmPassword: '',
        },

        validate: {
            name : (value: string) => (value.trim().length > 0 ? null : 'Name is required'),
            email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
            password: (value: string) =>
                !value
                    ? 'Password is required'
                    : /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,15}$/.test(value)
                        ? null
                        : 'Password must be 8-15 chars, include upper, lower, digit, special char, and no spaces',
            confirmPassword: (value: string, values: any) => (value !== values.password ? 'Passwords do not match' : null),

        },
    });

    const handleSubmit = (values: typeof form.values) => {
        setloading(true);
        registerUser(values).then((data)=>{
            successNotification("Registration successful");
            navigate('/login');
        }).catch((error)=>{
            errorNotification(error.response.data.errorMessage);
        }).finally(()=>{
            setloading(false);
        });
    };

    return (
        <div style={{ background: 'url("/bg.png")' }} className='h-screen w-screen !bg-cover !bg-center !bg-no-repeat flex flex-col justify-center items-center'>

            <div className='py-3 text-primary-300  drop-shadow-xs shadow-neutral-900 shadow-lg flex gap-1 items-center'>
                <IconHeartbeat size={45} stroke={2} />
                <span className='font-heading font-semibold text-4xl'>Pulse</span>
            </div>

            <div className='w-[450px] backdrop-blur-md p-10 py-8  rounded-lg'>
                <form onSubmit={form.onSubmit(handleSubmit)}
                    className='flex flex-col gap-5 [&_input]:placeholder-neutral-100 [&_.mantine-Input-input]:!border-white   focus-within:[&_.mantine-Input-input]:!border-primary-400  [&_.mantine-Input-input]:!border [&_input]:!pl-2 [&_svg]:text-white [&_input]:!text-white'>
                    <div className='self-center font-medium font-heading text-white text-xl'>Register</div>

                    <SegmentedControl {...form.getInputProps('role')} fullWidth size="md" radius="md" bg='none' className='[&_*]:!text-white border border-white' color='primary' data={[{label:'Patient', value:'PATIENT'}, {label:'Doctor', value:'DOCTOR'}, {label:'Admin', value:'ADMIN'}]} />

                    <TextInput  {...form.getInputProps('name')} className='transition duration-300' variant='unstyled' size='md' radius={'md'} placeholder='Name'
                    />


                    <TextInput  {...form.getInputProps('email')} className='transition duration-300' variant='unstyled' size='md' radius={'md'} placeholder='Email' 
                    />
                    

                    <PasswordInput {...form.getInputProps('password')} className='transition duration-300' variant="unstyled" size="md" radius="md" placeholder="Password" />

                    <PasswordInput {...form.getInputProps('confirmPassword')} className='transition duration-300' variant="unstyled" size="md" radius="md" placeholder="Confirm Password" />

                    <Button loading={loading} radius={'md'} size='md' type='submit' color='primary'>Register</Button>

                    <div className='text-neutral-100 text-sm self-center'>
                        Have an account? <Link to='/login' className='hover:underline'>Login</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default RegisterPage