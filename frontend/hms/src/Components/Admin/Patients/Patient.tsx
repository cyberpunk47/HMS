import { useEffect, useState } from "react";
import { getAllPatients } from "../../../Service/PatientProfileService";
import PatientCard from "./PatientCard";
import { useQuery } from "@tanstack/react-query";

const Patient = () => {

    const { data: patients = [], isLoading, isError } = useQuery({
        queryKey: ["patients"],
        queryFn: getAllPatients,
    });

    if (isLoading) return <div className="p-5 text-gray-500">Loading patients...</div>;
    if (isError) return <div className="p-5 text-red-500">Failed to load patients.</div>;
    return (
        <div>

            <div className="text-xl text-primary-500 font-semibold mb-5">Patients</div>
            <div className="grid grid-cols-4 gap-5 ">
                {
                    patients.map((patient: any) => (
                        <PatientCard key={patient.id} {...patient} />
                    ))
                }
            </div>


        </div>
    )
}

export default Patient;