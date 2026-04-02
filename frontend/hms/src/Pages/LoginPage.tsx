import { Button, PasswordInput, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form';
import { IconHeartbeat } from '@tabler/icons-react'
import React, { useState } from 'react'
import { Link } from 'react-router-dom';
import { loginUser } from '../Service/UserService';
import { errorNotification, successNotification } from '../Utility/NotificationUtil';
import { useDispatch } from 'react-redux';
import { setJwt } from '../Slices/JwtSlice';
import { jwtDecode } from 'jwt-decode';
import { setUser } from '../Slices/UserSlice';

const LoginPage = () => {

  const dispatch = useDispatch();


  const [loading, setloading] = useState(false);


  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },

    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value: string) => (!value ? 'Password is required' : null)
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    setloading(true);
    loginUser(values).then((_data) => {
      successNotification("Logged in Successfully");
      dispatch(setJwt(_data));
      dispatch(setUser(jwtDecode(_data)));
    }).catch((error) => {
      errorNotification(error?.response?.data?.errorMessage);

    }).finally(() => {
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
          <div className='self-center font-medium font-heading text-white text-xl'>Login</div>

          <TextInput  {...form.getInputProps('email')} className='transition duration-300' variant='unstyled' size='md' radius={'md'} placeholder='Email' />

          <PasswordInput {...form.getInputProps('password')} className='transition duration-300' variant="unstyled" size="md" radius="md" placeholder="Password" />

          <Button loading={loading} radius={'md'} size='md' type='submit' color='primary'>Login</Button>

          <div className='text-neutral-100 text-sm self-center'>
            Don't have an account? <Link to='/register' className='hover:underline'>Register</Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LoginPage