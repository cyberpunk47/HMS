import React from 'react'
import { IconCalendarCheck, IconHeartbeat, IconLayoutGrid, IconMoodHeart, IconUser, IconVaccine } from '@tabler/icons-react';
import { Avatar, Text } from '@mantine/core';
import { url } from 'inspector';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';

const links = [
    {
        name: "Dashboard", url: "/doctor/dashboard", icon: <IconLayoutGrid stroke={1.5} />
    },
    {
        name: "Profile", url: "/doctor/profile", icon: <IconUser stroke={1.5} />
    },
    {
        name: "Patients", url: "/doctor/patients",
        icon: <IconMoodHeart stroke={1.5} />
    },
    {
        name: "Appointments", url: "/doctor/appointments",
        icon: <IconCalendarCheck stroke={1.5} />
    },
    {
        name: "Pharmacy", url: "/doctor/pharmacy",
        icon: <IconVaccine stroke={1.5} />
    }
]

const Sidebar = () => {

    const user = useSelector((state: any) => state.user);

    return (
        
        <div className='flex'>
            <div className='w-64'></div>

        <div className='bg-dark fixed h-screen hide-scrollbar w-64 flex flex-col gap-7 items-center overflow-y-auto'>

            <div className='fixed z-[500] py-3 bg-dark text-primary-400 flex gap-1 items-center'>
                <IconHeartbeat size={40} stroke={2} />
                <span className='font-heading font-semibold text-3xl'>Pulse</span>
            </div>

            <div className='flex flex-col mt-20 gap-5'>

                <div className='flex flex-col gap-1 items-center'>
                    <div className='p-1 bg-white rounded-full shadow-lg'>
                        <Avatar variant='filled' src="/avatar.png" size='xl' alt="it's me" />
                    </div>
                    <span className='font-medium text-light'>{user.name}</span>
                    <Text c='dimmed' className='text-light' size='xs'>{user.role}</Text>
                </div>
                <div className='flex flex-col gap-1'>
                    {
                        links.map((link) => {
                            return <NavLink to={link.url} key={link.url} className={({ isActive }) => `flex items-center gap-3 w-full font-medium text-light  px-4 py-5 rounded-lg ${isActive ? 'bg-primary-400 text-dark' : 'hover:bg-gray-100 hover:text-dark'}`}>
                                {link.icon}
                                <span>{link.name}</span>
                            </NavLink>
                        })
                    }
                </div>
            </div>
        </div>
        </div>

    )
}

export default Sidebar