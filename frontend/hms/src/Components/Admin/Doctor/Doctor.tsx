import { getAllDoctors } from "../../../Service/DoctorProfileService";
import DoctorCard from "./DoctorCard";
import { useQuery } from "@tanstack/react-query";

const Doctor = () => {

    const { data: doctors = [] , isLoading, isError } = useQuery({
        queryKey: ["doctors"],
        queryFn: getAllDoctors,
    });
    if (isLoading) return <div className="p-5 text-gray-500">Loading doctors...</div>;
    if (isError) return <div className="p-5 text-red-500">Failed to load doctors.</div>;
    return (
        <div>

            <div className="text-xl text-primary-500 font-semibold mb-5">Doctors</div>
            <div className="grid grid-cols-4 gap-5 ">
                {
                    doctors.map((doctor: any) => (
                        <DoctorCard key={doctor.id} {...doctor} />
                    ))
                }
            </div>


        </div>
    )
}

export default Doctor;