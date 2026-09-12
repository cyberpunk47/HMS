import React, { useState, useEffect } from 'react';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable, type DataTableFilterMeta } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ActionIcon, Button, LoadingOverlay, Modal, SegmentedControl, Select, Text, Textarea, Tooltip, Loader } from '@mantine/core';
import { Tag } from 'primereact/tag';
import { TextInput } from '@mantine/core';
import { IconEdit, IconEye, IconLayoutGrid, IconPlus, IconSearch, IconTable, IconTrash } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { getDoctorDropdown } from '../../../Service/DoctorProfileService';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { appointmentReasons } from '../../../data/DropdownData';
import { useSelector } from 'react-redux';
import { cancelAppointment, getAppointmentsByDoctor, scheduleAppointment, getUniquePatientDataForEachDoctor } from '../../../Service/AppointmentService';
import { errorNotification, successNotification } from '../../../Utility/NotificationUtil';
import { formatDateWithtime } from '../../../Utility/DateUtility';
import { modals } from '@mantine/modals';
import { Toolbar } from 'primereact/toolbar';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { useQuery } from '@tanstack/react-query';
import ApCard from './ApCard';

const Appointment = () => {
    const navigate = useNavigate();
    const [view, setView] = useState('table');
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<string>("Today");
    const [doctors, setDoctors] = useState<any[]>([]);
    const user = useSelector((state: any) => state.user);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        patientName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        reason: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        notes: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        status: { value: null, matchMode: FilterMatchMode.IN },
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
            case 'EXPIRED':
                return 'secondary';
            default:
                return null;
        }
    };

    useEffect(() => {
        fetchData();
        getDoctorDropdown().then((data) => {
            setDoctors(data.map((doctor: any) => ({
                value: "" + doctor.id,
                label: doctor.name,
            })));
        }).catch((err) => {
            console.error("error fetching doctors:", err);
        });
    }, []);

    const fetchData = () => {
        getAppointmentsByDoctor(user.profileId).then((data) => {
            setAppointments(data || []);
        }).catch((error) => {
            console.error("Error fetching appointments: ", error);
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
            doctorId: "",
            patientId: "",
            appointmentTime: new Date(),
            reason: "",
            notes: ""
        },
        validate: {
            doctorId: (value) => !value ? "Doctor is required" : undefined,
            patientId: (value) => !value ? "Patient is required" : undefined,
            appointmentTime: (value) => !value ? "Appointment time is required" : undefined,
            reason: (value) => !value ? "Reason for appointment is required" : undefined,
        },
    });

    // TanStack Query for patients based on selected doctor (lazy with enabled)
    const {
        data: patients = [],
        isFetching: patientsLoading
    } = useQuery({
        queryKey: ["doctorPreviousPatients", form.values.doctorId],
        queryFn: () => getUniquePatientDataForEachDoctor(Number(form.values.doctorId)),
        enabled: !!form.values.doctorId,
        select: (data) => data.map((patient: any) => ({
            value: String(patient.id),
            label: patient.name
        })),
    });

    const renderHeader = () => {
        return (
            <div className="flex flex-wrap gap-2 justify-between items-center">
                <Button leftSection={<IconPlus />} onClick={open} variant="filled">Schedule Appointment</Button>
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </div>
        );
    };

    const statusBodyTemplate = (rowData: any) => {
        return <Tag value={rowData.status} severity={getSeverity(rowData.status)} />;
    };

    const openDeleteModal = (rowData: any) =>
        modals.openConfirmModal({
            title: 'Are you Sure ?',
            centered: true,
            children: (
                <Text size="sm">
                    You want to cancel this appointment? This action cannot be undone!
                </Text>
            ),
            labels: { confirm: 'Cancel Appointment', cancel: "No, keep it" },
            confirmProps: { color: 'red' },
            onCancel: () => console.log('Cancel'),
            onConfirm: () => {
                cancelAppointment(rowData.id).then(() => {
                    successNotification("Appointment cancelled successfully");
                    setAppointments(appointments.map((appointment) =>
                        appointment.id === rowData.id ? { ...appointment, status: "CANCELLED" } : appointment
                    ));
                }).catch((error) => {
                    errorNotification(error.response?.data?.errorMessage || "Failed to cancel appointment");
                });
            },
        });

    const actionBodyTemplate = (rowData: any) => {
        const isActionable = rowData.status === 'SCHEDULED';

        return (
            <div className='flex gap-2'>
                <Tooltip label="View Details">
                    <ActionIcon variant="subtle">
                        <IconEye stroke={1.4} onClick={() => navigate("" + rowData.id)} />
                    </ActionIcon>
                </Tooltip>

                <Tooltip label={isActionable ? "Edit Appointment" : "Only scheduled appointments can be edited"}>
                    <ActionIcon
                        variant="subtle"
                        disabled={!isActionable}
                        style={{ opacity: isActionable ? 1 : 0.3, cursor: isActionable ? 'pointer' : 'not-allowed' }}
                    >
                        <IconEdit stroke={1.4} />
                    </ActionIcon>
                </Tooltip>

                <Tooltip label={isActionable ? "Cancel Appointment" : "Only scheduled appointments can be cancelled"}>
                    <ActionIcon
                        color='red'
                        variant="subtle"
                        disabled={!isActionable}
                        style={{ opacity: isActionable ? 1 : 0.3, cursor: isActionable ? 'pointer' : 'not-allowed' }}
                        onClick={() => isActionable && openDeleteModal(rowData)}
                    >
                        <IconTrash stroke={1.4} />
                    </ActionIcon>
                </Tooltip>
            </div>
        );
    };

    const handleSubmit = (values: any) => {
        const formattedValues = {
            ...values,
            appointmentTime: dayjs(values.appointmentTime).format("YYYY-MM-DDTHH:mm:ss")
        };

        setLoading(true);
        scheduleAppointment(formattedValues).then(() => {
            close();
            form.reset();
            fetchData();
            successNotification("Appointment scheduled successfully");
        }).catch((error) => {
            errorNotification(error.response?.data?.errorMessage || "Failed to schedule appointment");
        }).finally(() => {
            setLoading(false);
        });
    };

    const timeTemplate = (rowData: any) => {
        return <span>{formatDateWithtime(rowData.appointmentTime)}</span>;
    };

    const rightToolbarTemplate = () => {
        return (
            <div className='flex gap-5 items-center'>
                <SegmentedControl
                    value={view}
                    color='primary'
                    onChange={setView}
                    data={[
                        { label: <IconTable />, value: 'table' },
                        { label: <IconLayoutGrid />, value: 'card' },
                    ]}
                />
                <TextInput leftSection={<IconSearch />} fw={500} value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </div>
        );
    };

    const centerToolbarTemplate = () => {
        return (
            <SegmentedControl
                value={tab}
                onChange={setTab}
                variant='filled'
                color={tab === "Today" ? "blue" : tab === "Upcoming" ? "green" : "red"}
                data={["Today", "Upcoming", "Past"]}
            />
        );
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
            <Toolbar className="mb-4" start={centerToolbarTemplate} end={rightToolbarTemplate}></Toolbar>

            {view == "table" ? (
                <DataTable
                    value={filteredAppointments}
                    stripedRows
                    size='small'
                    paginator
                    rows={10}
                    paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                    rowsPerPageOptions={[10, 25, 50]}
                    dataKey="id"
                    filters={filters}
                    filterDisplay="menu"
                    globalFilterFields={['patientName', 'reason', 'notes', 'status']}
                    emptyMessage="No appointments found."
                    currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                >
                    <Column field="patientName" header="Patient" sortable filter filterPlaceholder="Search by name" style={{ minWidth: '14rem' }} />
                    <Column field="patientPhone" header="Phone" sortable filter filterPlaceholder="Search by phone" style={{ minWidth: '14rem' }} />
                    <Column field="appointmentTime" header="Appointment Time" sortable style={{ minWidth: '14rem' }} body={timeTemplate} />
                    <Column field="reason" header="Reason" sortable filter filterPlaceholder="Search by reason" style={{ minWidth: '14rem' }} />
                    <Column field="notes" header="Notes" sortable filter filterPlaceholder="Search by notes" style={{ minWidth: '14rem' }} />
                    <Column field="status" header="Status" sortable filterMenuStyle={{ width: '14rem' }} style={{ minWidth: '12rem' }} body={statusBodyTemplate} filter />
                    <Column headerStyle={{ width: '8rem', textAlign: 'center' }} bodyStyle={{ textAlign: 'center', overflow: 'visible' }} body={actionBodyTemplate} />
                </DataTable>
            ) : (
                <div className='grid grid-cols-4 gap-5'>
                    {filteredAppointments.map((appointment) => (
                        <ApCard key={appointment.id} {...appointment} />
                    ))}
                    {filteredAppointments.length === 0 && (
                        <div className='col-span-4 text-center text-gray-500'>No Appointment Found</div>
                    )}
                </div>
            )}

            <Modal
                opened={opened}
                size={"lg"}
                onClose={() => {
                    close();
                    form.reset();
                }}
                title={<div className='text-xl font-semibold text-primary-700'>Schedule Appointment</div>}
                centered
            >
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <form onSubmit={form.onSubmit(handleSubmit)} className='grid grid-cols-1 gap-5'>
                    <Select
                        {...form.getInputProps("doctorId")}
                        withAsterisk
                        data={doctors}
                        label="Doctor"
                        placeholder="Select Doctor"
                        onChange={(value : any) => {
                            form.setFieldValue("doctorId", value);
                            form.setFieldValue("patientId", "");
                        }}
                    />

                    <Select
                        {...form.getInputProps("patientId")}
                        withAsterisk
                        data={patients}
                        label="Patient"
                        placeholder={form.values.doctorId ? "Select Patient" : "Select Doctor first"}
                        disabled={!form.values.doctorId}
                        searchable
                        nothingFoundMessage="No previous patients found"
                        rightSection={patientsLoading ? <Loader size="xs" /> : null}
                    />

                    <DateTimePicker
                        minDate={new Date()}
                        {...form.getInputProps("appointmentTime")}
                        withAsterisk
                        label="Appointment Time"
                        placeholder="Pick date and time"
                    />

                    <Select
                        {...form.getInputProps("reason")}
                        data={appointmentReasons}
                        withAsterisk
                        label="Reason for appointment"
                        placeholder='Enter the reason for Appointment'
                    />

                    <Textarea
                        {...form.getInputProps("notes")}
                        label="Additional Notes"
                        placeholder='Enter any additional notes'
                    />

                    <Button type='submit' variant='filled' fullWidth>
                        Schedule Appointment
                    </Button>
                </form>
            </Modal>
        </div>
    );
};

export default Appointment;