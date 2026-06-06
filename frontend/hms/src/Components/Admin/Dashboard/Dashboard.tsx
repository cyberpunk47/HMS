import Appointments from "./Appointment";
import DiseaseChart from "./DiseaseChart";
import Doctors from "./Doctors";
import Medicines from "./Medicines";
import Patients from "./Patients";
import Topcards from "./Topacards";

const Dashboard = () => {
    return (
        <div className="flex flex-col gap-6">
            {/* Stat cards */}
            <Topcards />

            {/* Disease chart + Appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DiseaseChart />
                <Appointments />
            </div>

            {/* Medicines */}
            <Medicines />

            {/* Patients + Doctors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Patients />
                <Doctors />
            </div>
        </div>
    );
};

export default Dashboard;