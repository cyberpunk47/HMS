import Appointments from "./Appointment";
import DiseaseChart from "./DiseaseChart";
import Metrices from "./Metrices";
import PatientMetrics from "./PatientMetrics";
import Patients from "./Patients";
import Welcome from "./Welcome";

const Dashboard = () => {
    return (
        <div className="flex flex-col gap-6">
            {/* Welcome + Appointment metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Welcome />
                <Metrices />
            </div>

            {/* Disease chart + Patient trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DiseaseChart />
                <div className="lg:col-span-2">
                    <PatientMetrics />
                </div>
            </div>

            {/* Patient list + Today's appointments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Patients />
                <Appointments />
            </div>
        </div>
    );
};

export default Dashboard;