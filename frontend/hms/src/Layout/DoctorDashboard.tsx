import Sidebar from '../Components/Doctor/Sidebar/Sidebar'
import Header from '../Components/Header/Header'
import { Outlet } from 'react-router-dom'
const DoctorDashboard = () => {
    return (
        <div className='flex'>
            <Sidebar />
            <div className='w-full overflow-hidden flex flex-col'>
                <Header />
                <Outlet />
            </div>
        </div>
    )
}

export default DoctorDashboard