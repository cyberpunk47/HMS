import { ActionIcon, Button, TextInput } from '@mantine/core';
import { IconEye, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { Column } from 'primereact/column'
import { DataTable, DataTableFilterMeta } from 'primereact/datatable'
import React, { use, useEffect } from 'react';
import { useState } from 'react';
import { getPrescriptionsByPatientId } from '../../../Service/AppointmentService';
import { formatDate } from '../../../Utility/DateUtility';
import { useNavigate } from 'react-router-dom';


const Prescriptions = ({appointment} : any) => {
    const [data, setData] = useState<any[]>([]);
    const navigate = useNavigate();
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS }});
    const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            let _filters: any = { ...filters };
    
            _filters['global'].value = value;
    
            setFilters(_filters);
            setGlobalFilterValue(value);
        };
    useEffect (() =>{
        if (!appointment?.patientId) return;
        getPrescriptionsByPatientId(appointment?.patientId).then((res)=>{
            console.log("Prescriptions: ", res);
            setData(res);
        }).catch((err)=>{
            console.log("Error fetching prescriptions: ", err);
        });
    },[appointment?.patientId])
    const renderHeader = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-end items-center">
                
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        return <div className='flex gap-2 justify-center'>
            <ActionIcon onClick={() => navigate("/doctor/appointments/"+rowData.appointmentId)}>
                <IconEye size={20} stroke={1.5} />
            </ActionIcon>
        </div>;
    };

    const header = renderHeader();

    const filteredAppointments: any[] = [];

    return (
        <div>
            <DataTable header={renderHeader()}  stripedRows value={data} size='small' paginator rows={10}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                rowsPerPageOptions={[10, 25, 50]} dataKey="id"

                filters={filters} filterDisplay="menu" globalFilterFields={['doctorName', 'notes']}
                emptyMessage="No appointment found." currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries">

                <Column field="doctorName" header="Doctor" sortable />

                <Column field="prescriptionDate" header="Prescription Date" sortable body={(rowData) => formatDate(rowData.prescriptionDate)}/>
                

                <Column field='medicine' header="Medicine" sortable body={(rowData) => rowData.medicines?.length ?? 0} />

                <Column field="notes" header="Notes" sortable style={{ minWidth: '14rem' }} />

                <Column headerStyle={{ width: '5rem', textAlign: 'center' }} bodyStyle={{ textAlign: 'center', overflow: 'visible' }} body={actionBodyTemplate} />
            </DataTable>
        </div>
    )
}

export default Prescriptions





// {
//     "id": 1,
//     "patientId": 5,
//     "doctorId": 3,
//     "doctorName": "Aman",
//     "appointmentId": 2,
//     "prescriptionDate": "2025-10-05",
//     "notes": "Take medicines after food.",
//     "medicines": [
//         {
//             "id": 1,
//             "name": "Paracetamol",
//             "medicineId": 1,
//             "dosage": "500mg",
//             "frequency": "Twice a day",
//             "duration": 5,
//             "route": "Oral",
//             "type": "Tablet",
//             "instructions": "After meals",
//             "prescriptionId": 1
//         },
//         {
//             "id": 2,
//             "name": "Cough Syrup",
//             "medicineId": 2,
//             "dosage": "10ml",
//             "frequency": "Thrice a day",
//             "duration": 7,
//             "route": "Oral",
//             "type": "Liquid",
//             "instructions": "Shake well before use",
//             "prescriptionId": 1
//         }
//     ]
// }