import React, { useState, useEffect } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';

import { Tag } from 'primereact/tag';
import { ActionIcon, Button, Center, LoadingOverlay, Modal, SegmentedControl, Select, Text, Textarea, TextInput } from '@mantine/core';

import { useDisclosure } from '@mantine/hooks';
import { getDoctorDropdown } from '../../../Service/DoctorProfileService';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { appointmentReasons } from '../../../Data/DropdownData';
import { useSelector } from 'react-redux';
import { cancelAppointment, getAppointmentsByDoctor, scheduleAppointment } from '../../../Service/AppointmentService';
import { errorNotification, successNotification } from '../../../Utility/NotificationUtil';
import { formatDateWithTime } from '../../../Utility/DateUtility';
import { modals } from '@mantine/modals';
import { Toolbar } from 'primereact/toolbar';
import { IconEdit, IconEye, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
// import 'primereact/resources/themes/lara-light-blue/theme.css';

interface Country {
    name: string;
    code: string;
}

interface Representative {
    name: string;
    image: string;
}

interface Customer {
    id: number;
    name: string;
    country: Country;
    company: string;
    date: string | Date;
    status: string;
    verified: boolean;
    activity: number;
    representative: Representative;
    balance: number;
}

const Appointment = () => {
    const navigate  = useNavigate();
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [tab, setTab] = useState<string>("Today");
    const [doctors, setDoctors] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const user = useSelector((state: any) => state.user);
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        patientName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        reason: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        notes: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    });
    const [globalFilterValue, setGlobalFilterValue] = useState<string>('');


    const getSeverity = (status: string) => {
        switch (status) {
            case 'CANCELLED':
                return 'danger';

            case 'COMPLETED':
                return 'success';

            case 'SCHEDULED':
                return 'info';

            case 'negotiation':
                return 'warning';

            default:
                return null;
        }
    };

    const fetchData = () => {
        getAppointmentsByDoctor(user.profileId).then((data) => {
            setAppointments(getCustomers(data));
        }).catch((error) => {
            console.error("Error fetching appointments:", error);
        });
    }

    useEffect(() => {

        fetchData();

        getDoctorDropdown().then((data) => {
            setDoctors(data.map((doctor: any) => ({
                value: "" + doctor.id,
                label: doctor.name
            })));

        }).catch((error) => {
            console.error("Error fetching doctors:", error);
        });
    }, []);

    const getCustomers = (data: Customer[]) => {
        return [...(data || [])].map((d) => {
            d.date = new Date(d.date);

            return d;
        });
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        let _filters: any = { ...filters };

        _filters['global'].value = value;

        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const form = useForm({

        initialValues: {
            doctorId: '',
            patientId: user.profileId,
            appointmentTime: new Date(),
            reason: '',
            notes: "",
        },

        validate: {
            doctorId: (value: any) => !value ? 'Doctor is required' : undefined,
            appointmentTime: (value: any) => !value ? 'Appointment Time is required' : undefined,
            reason: (value: any) => !value ? 'Reason is required' : undefined,
        },
    });

    const renderHeader = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-between items-center">
                <Button leftSection={<IconPlus />} onClick={open} variant='filled'>Schedule Appointment</Button>
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </div>
        );
    };


    const statusBodyTemplate = (rowData: Customer) => {
        return <Tag value={rowData.status} severity={getSeverity(rowData.status)} />;
    };


    const handleDelete = (rowData: any) => {
        modals.openConfirmModal({
            title: <span className='text-xl font-serif font-semibold'>Are you sure ?</span>,
            centered: true,
            children: (
                <Text size="sm">
                    Do you want to cancel this appointment? This action cannot be undone.
                </Text>
            ),
            labels: { confirm: 'Confirm', cancel: 'Cancel' },

            onConfirm: () => {
                // setLoading(true);
                cancelAppointment(rowData.id).then(() => {
                    successNotification("Appointment cancelled successfully");
                    setAppointments(appointments.map((appointment) => appointment.id == rowData.id ? { ...appointment, status: 'CANCELLED' } : appointment));
                }).catch((error) => {
                    errorNotification(error.response?.data?.message || "Failed to cancel appointment");
                });
            },
        });
    }
    const actionBodyTemplate = (rowData: any) => {
        return <div className='flex gap-2 justify-center'>
            <ActionIcon onClick={() => navigate(""+rowData.id)}>
                <IconEye size={20} stroke={1.5} />
            </ActionIcon>
            <ActionIcon color='red' onClick={() => handleDelete(rowData)}>
                <IconTrash size={20} stroke={1.5} />
            </ActionIcon>
        </div>;
    };

    const header = renderHeader();

    const handleSubmit = (values: any) => {
        values.appointmentTime = new Date(values.appointmentTime).toISOString();
        console.log(values);
        form.validate();
        fetchData();
        setLoading(true);
        scheduleAppointment(values).then((data) => {
            close();
            form.reset();
            successNotification("Appointment scheduled successfully");

        }).catch((error) => {
            errorNotification(error.response?.data?.message || "Failed to schedule appointment");
        }).finally(() => {
            setLoading(false);
        });
    };

    const timeTemplate = (rowData: any) => {
        return <span>{formatDateWithTime(rowData.appointmentTime)}</span>
    }
    const leftToolbarTemplate = () => {
        return (
            <Button leftSection={<IconPlus />} onClick={open} variant='filled'>Schedule Appointment</Button>
        );
    };

    const rightToolbarTemplate = () => {
        return <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />;
    };
    const centerToolbarTemplate = () => {
        return <SegmentedControl
            value={tab}
            variant='filled'
            color={tab === "Today" ? 'blue' : tab === "Upcoming" ? 'green' : 'red'}
            onChange={setTab}
            data={["Today", "Upcoming", "Past"]}
        />
    };
    const filteredAppointments = appointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.appointmentTime);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const appointmentDay = new Date(appointmentDate);
        appointmentDay.setHours(0, 0, 0, 0);
        if (tab === "Today") {
            return appointmentDay.getTime() === today.getTime();
        } else if (tab === "Upcoming") {
            return appointmentDay.getTime() > today.getTime();
        } else if (tab === "Past") {
            return appointmentDay.getTime() < today.getTime();
        }
        return true;
    });
    return (
        <div className="card">
            <Toolbar className="mb-4" 
                start={centerToolbarTemplate} end={rightToolbarTemplate}></Toolbar>

            <DataTable stripedRows value={filteredAppointments} size='small' paginator rows={10}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                rowsPerPageOptions={[10, 25, 50]} dataKey="id"

                filters={filters} filterDisplay="menu" globalFilterFields={['patientName', 'reason', 'notes', 'status']}
                emptyMessage="No appointment found." currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries">
                <Column field="patientName" header="Patient" sortable filter filterPlaceholder="Search by name" style={{ minWidth: '14rem' }} />
                <Column field="patientPhone" header="Phone Number"  style={{ minWidth: '14rem' }} />
                <Column field="patientEmail" header="Email"  style={{ minWidth: '14rem' }} />

                <Column field="appointmentTime" header="Appointment Time" sortable style={{ minWidth: '14rem' }} body={timeTemplate} />
                <Column field="reason" header="Reason" sortable filter filterPlaceholder="Search by Reason" style={{ minWidth: '14rem' }} />

                <Column field="notes" header="Notes" sortable filter filterPlaceholder="Search by Notes" style={{ minWidth: '14rem' }} />
                <Column field="status" header="Status" sortable filterMenuStyle={{ width: '14rem' }} style={{ minWidth: '12rem' }} body={statusBodyTemplate} filter />

                <Column headerStyle={{ width: '5rem', textAlign: 'center' }} bodyStyle={{ textAlign: 'center', overflow: 'visible' }} body={actionBodyTemplate} />
            </DataTable>


            <Modal opened={opened} size={'lg'} onClose={close} title={<div className='text-xl font-semibold text-primary-500'>Schedule Appointment</div>} centered>
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <form onSubmit={form.onSubmit(handleSubmit)} className='grid grid-cols-1 gap-5'>
                    <Select {...form.getInputProps('doctorId')} withAsterisk data={doctors} label="Doctor" placeholder='Select a doctor' />
                    <DateTimePicker minDate={new Date()} {...form.getInputProps('appointmentTime')} withAsterisk label="Appointment Time" placeholder='Pick date and time' />
                    <Select {...form.getInputProps('reason')} withAsterisk data={appointmentReasons} label="Reason for Appointment" placeholder='Select reason for appointment' />
                    <Textarea {...form.getInputProps('notes')} label="Additional Notes" placeholder='Enter any additional notes' />
                    <Button type='submit' fullWidth mt={10} variant='filled'>Submit</Button>
                </form>
            </Modal>
        </div>
    );
}

export default Appointment;